from datetime import datetime, timezone
from collections import Counter
from bson import ObjectId
from app.db.mongodb import mongo_db

INCIDENT_COLLECTION = "incidents"
ALERT_COLLECTION = "alerts"

VALID_STATUSES = {"open", "investigating", "contained", "resolved", "closed"}


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def create_incident(alert_ids: list[str], title: str, created_by: str) -> dict:
    alerts_collection = mongo_db[ALERT_COLLECTION]
    object_ids = [ObjectId(a) for a in alert_ids]
    alerts = await alerts_collection.find({"_id": {"$in": object_ids}}).to_list(length=None)

    if not alerts:
        raise ValueError("No matching alerts found for the given IDs")

    affected_ips = sorted({
        a["flow_details"].get("source_ip")
        for a in alerts
        if a["flow_details"].get("source_ip")
    })
    attack_types = [a.get("attack_type") for a in alerts if a.get("attack_type")]
    attack_category = Counter(attack_types).most_common(1)[0][0] if attack_types else "Unknown"

    risk_order = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    severity = max((a["risk_level"] for a in alerts), key=lambda r: risk_order.get(r, 0))

    first_detected = min(a["created_at"] for a in alerts)
    last_detected = max(a["last_seen"] for a in alerts)

    now = datetime.now(timezone.utc)
    doc = {
        "title": title,
        "severity": severity,
        "attack_category": attack_category,
        "affected_ips": affected_ips,
        "related_alert_ids": [str(a["_id"]) for a in alerts],
        "status": "open",
        "assigned_to": None,
        "first_detected": first_detected,
        "last_detected": last_detected,
        "created_by": created_by,
        "created_at": now,
        "timeline": [{"event": f"Incident created from {len(alerts)} alert(s)", "author": created_by, "at": now}],
    }

    collection = mongo_db[INCIDENT_COLLECTION]
    result = await collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


async def list_incidents(status: str | None = None, limit: int = 100) -> list[dict]:
    collection = mongo_db[INCIDENT_COLLECTION]
    query = {"status": status} if status else {}
    cursor = collection.find(query).sort("last_detected", -1).limit(limit)
    return [_serialize(doc) async for doc in cursor]


async def get_incident(incident_id: str) -> dict | None:
    collection = mongo_db[INCIDENT_COLLECTION]
    doc = await collection.find_one({"_id": ObjectId(incident_id)})
    if not doc:
        return None

    related_alerts = await mongo_db[ALERT_COLLECTION].find(
        {"_id": {"$in": [ObjectId(a) for a in doc["related_alert_ids"]]}}
    ).to_list(length=None)
    for a in related_alerts:
        a["id"] = str(a.pop("_id"))

    serialized = _serialize(doc)
    serialized["alerts"] = related_alerts
    return serialized


async def update_incident_status(incident_id: str, status: str, note: str | None, author: str) -> dict | None:
    if status not in VALID_STATUSES:
        raise ValueError(f"Status must be one of {VALID_STATUSES}")

    collection = mongo_db[INCIDENT_COLLECTION]
    now = datetime.now(timezone.utc)
    event_text = f"Status changed to {status}" + (f" — {note}" if note else "")

    await collection.update_one(
        {"_id": ObjectId(incident_id)},
        {
            "$set": {"status": status},
            "$push": {"timeline": {"event": event_text, "author": author, "at": now}},
        },
    )
    doc = await collection.find_one({"_id": ObjectId(incident_id)})
    return _serialize(doc) if doc else None


async def assign_incident(incident_id: str, assigned_to: str, author: str) -> dict | None:
    collection = mongo_db[INCIDENT_COLLECTION]
    now = datetime.now(timezone.utc)

    await collection.update_one(
        {"_id": ObjectId(incident_id)},
        {
            "$set": {"assigned_to": assigned_to},
            "$push": {"timeline": {"event": f"Assigned to {assigned_to}", "author": author, "at": now}},
        },
    )
    doc = await collection.find_one({"_id": ObjectId(incident_id)})
    return _serialize(doc) if doc else None