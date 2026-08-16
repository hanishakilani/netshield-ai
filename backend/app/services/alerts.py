from datetime import datetime, timezone, timedelta
from bson import ObjectId
from app.db.mongodb import mongo_db
from app.db.postgres import SessionLocal
from app.models.user import User, UserRole
from app.services.notifications import send_email
from app.services.slack import maybe_send_slack_alert
from app.ws.manager import manager

ALERT_COLLECTION = "alerts"
CORRELATION_WINDOW_MINUTES = 5
ALERTABLE_LEVELS = {"high", "critical"}


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


def _get_admin_emails() -> list[str]:
    db = SessionLocal()
    try:
        admins = db.query(User).filter(User.role == UserRole.admin, User.is_active == True).all()
        return [a.email for a in admins]
    finally:
        db.close()


def _get_user_email(username: str) -> str | None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        return user.email if user else None
    finally:
        db.close()


def _notify_new_critical_alert(alert: dict):
    source_ip = alert["flow_details"].get("source_ip") or "unknown source"
    subject = f"[NetShield AI] CRITICAL alert: {alert.get('attack_type') or 'Unknown'} from {source_ip}"
    body = (
        f"A new critical-risk alert was created.\n\n"
        f"Attack type: {alert.get('attack_type')}\n"
        f"Risk score: {alert.get('risk_score')}\n"
        f"Source IP: {source_ip}\n"
        f"Detected at: {alert.get('created_at')}\n\n"
        f"View it in NetShield AI: http://localhost:3000/alerts"
    )
    for email in _get_admin_emails():
        send_email(email, subject, body)


async def create_alert_from_prediction(prediction: dict, source: str) -> dict | None:
    risk_level = prediction.get("risk_level")
    if risk_level not in ALERTABLE_LEVELS:
        return None

    flow_details = {
        "source_ip": prediction.get("source_ip"),
        "dest_ip": prediction.get("dest_ip"),
        "src_port": prediction.get("src_port"),
        "dst_port": prediction.get("dst_port"),
        "protocol": prediction.get("protocol"),
        "actual_label": prediction.get("actual_label"),
    }
    attack_type = prediction.get("attack_type")
    now = datetime.now(timezone.utc)
    collection = mongo_db[ALERT_COLLECTION]

    existing = None
    if flow_details["source_ip"] is not None:
        existing = await collection.find_one({
            "status": {"$in": ["open", "acknowledged"]},
            "attack_type": attack_type,
            "flow_details.source_ip": flow_details["source_ip"],
            "last_seen": {"$gte": now - timedelta(minutes=CORRELATION_WINDOW_MINUTES)},
        })

    if existing:
        new_risk_score = max(existing["risk_score"], prediction["risk_score"])
        new_risk_level = prediction["risk_level"] if prediction["risk_score"] > existing["risk_score"] else existing["risk_level"]
        await collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {"last_seen": now, "risk_score": new_risk_score, "risk_level": new_risk_level},
                "$inc": {"occurrence_count": 1},
            },
        )
        updated = await collection.find_one({"_id": existing["_id"]})
        serialized = _serialize(updated)
        await manager.broadcast({"type": "alert_updated", "alert": serialized})
        return serialized

    doc = {
        "created_at": now,
        "last_seen": now,
        "source": source,
        "risk_score": prediction["risk_score"],
        "risk_level": prediction["risk_level"],
        "attack_type": attack_type,
        "attack_type_confidence": prediction.get("attack_type_confidence"),
        "status": "open",
        "assigned_to": None,
        "occurrence_count": 1,
        "notes": [],
        "flow_details": flow_details,
        "slack_notified": False,
    }
    result = await collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    serialized = _serialize(doc)

    if serialized["risk_level"] == "critical":
        _notify_new_critical_alert(serialized)

    slack_sent = await maybe_send_slack_alert(serialized)
    if slack_sent:
        await collection.update_one({"_id": result.inserted_id}, {"$set": {"slack_notified": True}})
        serialized["slack_notified"] = True

    await manager.broadcast({"type": "alert_created", "alert": serialized})
    return serialized


async def list_alerts(status: str | None = None, risk_level: str | None = None, limit: int = 100) -> list[dict]:
    collection = mongo_db[ALERT_COLLECTION]
    query = {}
    if status:
        query["status"] = status
    if risk_level:
        query["risk_level"] = risk_level

    cursor = collection.find(query).sort("last_seen", -1).limit(limit)
    return [_serialize(doc) async for doc in cursor]


async def get_alert(alert_id: str) -> dict | None:
    collection = mongo_db[ALERT_COLLECTION]
    doc = await collection.find_one({"_id": ObjectId(alert_id)})
    return _serialize(doc) if doc else None


async def update_alert_status(alert_id: str, status: str, note: str | None, author: str) -> dict | None:
    collection = mongo_db[ALERT_COLLECTION]
    now = datetime.now(timezone.utc)

    update: dict = {"$set": {"status": status}}
    if note:
        update["$push"] = {"notes": {"text": note, "author": author, "at": now}}

    await collection.update_one({"_id": ObjectId(alert_id)}, update)
    doc = await collection.find_one({"_id": ObjectId(alert_id)})
    if not doc:
        return None

    serialized = _serialize(doc)
    await manager.broadcast({"type": "alert_updated", "alert": serialized})
    return serialized


async def assign_alert(alert_id: str, assigned_to: str) -> dict | None:
    collection = mongo_db[ALERT_COLLECTION]
    await collection.update_one({"_id": ObjectId(alert_id)}, {"$set": {"assigned_to": assigned_to}})
    doc = await collection.find_one({"_id": ObjectId(alert_id)})
    if not doc:
        return None

    serialized = _serialize(doc)
    email = _get_user_email(assigned_to)
    if email:
        subject = f"[NetShield AI] Alert assigned to you: {serialized.get('attack_type') or 'Unknown'}"
        body = (
            f"An alert has been assigned to you.\n\n"
            f"Attack type: {serialized.get('attack_type')}\n"
            f"Risk level: {serialized.get('risk_level')}\n"
            f"Source IP: {serialized['flow_details'].get('source_ip')}\n\n"
            f"View it: http://localhost:3000/alerts"
        )
        send_email(email, subject, body)

    await _log_notification(
        assigned_to,
        f"You were assigned a {serialized['risk_level']} alert: {serialized.get('attack_type') or 'Unknown'}",
        alert_id=serialized["id"],
    )

    await manager.broadcast({"type": "alert_updated", "alert": serialized})
    return serialized

NOTIFICATIONS_COLLECTION = "notifications"


async def _log_notification(username: str, message: str, alert_id: str | None = None):
    await mongo_db[NOTIFICATIONS_COLLECTION].insert_one({
        "username": username,
        "message": message,
        "alert_id": alert_id,
        "created_at": datetime.now(timezone.utc),
        "read": False,
    })


async def get_notifications(username: str, limit: int = 50) -> list[dict]:
    cursor = (
        mongo_db[NOTIFICATIONS_COLLECTION]
        .find({"username": username})
        .sort("created_at", -1)
        .limit(limit)
    )
    results = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        results.append(doc)
    return results


async def mark_notifications_read(username: str):
    await mongo_db[NOTIFICATIONS_COLLECTION].update_many(
        {"username": username, "read": False},
        {"$set": {"read": True}},
    )

async def alert_counts() -> dict:
    collection = mongo_db[ALERT_COLLECTION]
    return {
        "open": await collection.count_documents({"status": "open"}),
        "critical_open": await collection.count_documents({"status": "open", "risk_level": "critical"}),
        "total": await collection.count_documents({}),
    }


async def threat_intelligence_report() -> dict:
    collection = mongo_db[ALERT_COLLECTION]

    attack_type_pipeline = [
        {"$group": {"_id": "$attack_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    attack_types = [
        {"attack_type": doc["_id"] or "Unknown", "count": doc["count"]}
        async for doc in collection.aggregate(attack_type_pipeline)
    ]

    source_ip_pipeline = [
        {"$match": {"flow_details.source_ip": {"$ne": None}}},
        {"$group": {
            "_id": "$flow_details.source_ip",
            "count": {"$sum": 1},
            "max_risk": {"$max": "$risk_score"},
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    top_sources = [
        {"source_ip": doc["_id"], "alert_count": doc["count"], "max_risk_score": doc["max_risk"]}
        async for doc in collection.aggregate(source_ip_pipeline)
    ]

    status_pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    status_breakdown = {doc["_id"]: doc["count"] async for doc in collection.aggregate(status_pipeline)}

    risk_pipeline = [{"$group": {"_id": "$risk_level", "count": {"$sum": 1}}}]
    risk_breakdown = {doc["_id"]: doc["count"] async for doc in collection.aggregate(risk_pipeline)}

    return {
        "top_attack_types": attack_types,
        "top_source_ips": top_sources,
        "status_breakdown": status_breakdown,
        "risk_level_breakdown": risk_breakdown,
        "total_alerts": await collection.count_documents({}),
    }