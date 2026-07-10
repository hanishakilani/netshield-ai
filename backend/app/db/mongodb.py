from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import MONGO_URL, MONGO_DB_NAME

client = AsyncIOMotorClient(MONGO_URL)
mongo_db = client[MONGO_DB_NAME]


async def check_mongo_connection() -> bool:
    try:
        await client.admin.command("ping")
        return True
    except Exception:
        return False