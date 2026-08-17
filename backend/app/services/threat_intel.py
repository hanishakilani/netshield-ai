from app.db.mongodb import mongo_db

ALERT_COLLECTION = "alerts"
INCIDENT_COLLECTION = "incidents"


async def lookup_ip(ip_address: str) -> dict:
    alerts_collection = mongo_db[ALERT_COLLECTION]

    matching_alerts = await alerts_collection.find(
        {"flow_details.source_ip": ip_address}
    ).sort("last_seen", -1).to_list(length=50)

    for a in matching_alerts:
        a["id"] = str(a.pop("_id"))

    attack_types = {a.get("attack_type") for a in matching_alerts if a.get("attack_type")}
    max_risk = max((a["risk_score"] for a in matching_alerts), default=0)

    incidents_collection = mongo_db[INCIDENT_COLLECTION]
    related_incidents = await incidents_collection.find(
        {"affected_ips": ip_address}
    ).to_list(length=20)
    for inc in related_incidents:
        inc["id"] = str(inc.pop("_id"))

    return {
        "ip_address": ip_address,
        "internal": {
            "total_alerts": len(matching_alerts),
            "attack_types_seen": sorted(attack_types),
            "max_risk_score": max_risk,
            "recent_alerts": matching_alerts[:10],
            "related_incidents": [{"id": i["id"], "title": i["title"], "status": i["status"]} for i in related_incidents],
        },
        "external": {
            "status": "not_configured",
            "note": "External threat intelligence (VirusTotal, AbuseIPDB, etc.) is not yet integrated. This section is a placeholder for a future API connection.",
        },
    }