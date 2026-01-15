from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


class MongoDB:
    client: AsyncIOMotorClient | None = None


mongodb = MongoDB()


async def connect_to_mongo():
    mongodb.client = AsyncIOMotorClient(settings.MONGODB_URL)

    db = mongodb.client[settings.MONGODB_DB_NAME]
    await db["assets"].create_index("ticker", unique=True)


async def close_mongo_connection():
    mongodb.client.close()


def get_db():
    return mongodb.client[settings.MONGODB_DB_NAME]
