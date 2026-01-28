from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.constants import PORTFOLIO_COLLECTION


class MongoDB:
    client: AsyncIOMotorClient | None = None


mongodb = MongoDB()


async def connect_to_mongo():
    mongodb.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = mongodb.client[settings.MONGODB_DB_NAME]
    await db[PORTFOLIO_COLLECTION].create_index("ticker", unique=True)


async def close_mongo_connection():
    if mongodb.client is not None:
        mongodb.client.close()


def get_db():
    if mongodb.client is None:
        raise RuntimeError("MongoDB client is not initialized")
    return mongodb.client[settings.MONGODB_DB_NAME]
