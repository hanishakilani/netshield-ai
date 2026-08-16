import httpx
from app.db.mongodb import mongo_db

SETTINGS_COLLECTION = "settings"
SLACK_CONFIG_ID = "slack_config"

SEVERITY_ORDER = {"low": 0, "medium": 1, "high": 2, "critical": 3}


async def get_slack_config() -> dict:
    doc = await mongo_db[SETTINGS_COLLECTION].find_one({"_id": SLACK_CONFIG_ID})
    if not doc:
        return {"webhook_url": None, "enabled": False, "min_severity": "high"}
    return doc


async def get_slack_config_public() -> dict:
    config = await get_slack_config()
    return {
        "enabled": config.get("enabled", False),
        "min_severity": config.get("min_severity", "high"),
        "webhook_configured": bool(config.get("webhook_url")),
    }


async def update_slack_config(webhook_url: str | None, enabled: bool, min_severity: str) -> dict:
    collection = mongo_db[SETTINGS_COLLECTION]
    existing = await get_slack_config()

    update_doc = {
        "enabled": enabled,
        "min_severity": min_severity,
        "webhook_url": webhook_url if webhook_url else existing.get("webhook_url"),
    }
    await collection.update_one(
        {"_id": SLACK_CONFIG_ID},
        {"$set": update_doc},
        upsert=True,
    )
    return await get_slack_config_public()


def _format_slack_message(alert: dict) -> dict:
    source_ip = alert["flow_details"].get("source_ip") or "unknown"
    dest_ip = alert["flow_details"].get("dest_ip") or "unknown"
    protocol = alert["flow_details"].get("protocol") or "unknown"
    severity_emoji = "🚨" if alert["risk_level"] == "critical" else "⚠️"

    text = (
        f"NetShield AI\n"
        f"{severity_emoji} {alert['risk_level'].upper()} SEVERITY THREAT DETECTED\n\n"
        f"Threat: {alert.get('attack_type') or 'Unknown'}\n"
        f"Source: {source_ip}\n"
        f"Destination: {dest_ip}\n"
        f"Protocol: {protocol}\n"
        f"Risk Score: {alert['risk_score']}/100\n"
        f"Severity: {alert['risk_level'].upper()}\n"
        f"Time: {alert['created_at']}\n\n"
        f"View Alert -> http://localhost:3000/alerts"
    )
    return {"text": text}


async def maybe_send_slack_alert(alert: dict) -> bool:
    if alert.get("slack_notified"):
        return False

    config = await get_slack_config()
    if not config.get("enabled") or not config.get("webhook_url"):
        print(f"\n[SLACK - dev mode, not configured/enabled]\n{_format_slack_message(alert)['text']}\n")
        return False

    min_level = config.get("min_severity", "high")
    if SEVERITY_ORDER.get(alert["risk_level"], 0) < SEVERITY_ORDER.get(min_level, 2):
        return False

    payload = _format_slack_message(alert)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(config["webhook_url"], json=payload)
            response.raise_for_status()
    except Exception as e:
        print(f"[SLACK ERROR] Failed to send: {e}")
        return False

    return True