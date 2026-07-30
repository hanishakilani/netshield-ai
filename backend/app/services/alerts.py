from datetime import datetime, timezone, timedelta
from bson import ObjectId
from app.db.mongodb import mongo_db

ALERT_COLLECTION = "alerts"
CORRELATION_WINDOW_MINUTES = 5
ALERTABLE_LEVELS = {"high", "critical"}


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


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
        return _serialize(updated)

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
    }
    result = await collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


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
    return _serialize(doc) if doc else None


async def assign_alert(alert_id: str, assigned_to: str) -> dict | None:
    collection = mongo_db[ALERT_COLLECTION]
    await collection.update_one({"_id": ObjectId(alert_id)}, {"$set": {"assigned_to": assigned_to}})
    doc = await collection.find_one({"_id": ObjectId(alert_id)})
    return _serialize(doc) if doc else None


async def alert_counts() -> dict:
    collection = mongo_db[ALERT_COLLECTION]
    return {
        "open": await collection.count_documents({"status": "open"}),
        "critical_open": await collection.count_documents({"status": "open", "risk_level": "critical"}),
        "total": await collection.count_documents({}),
    }