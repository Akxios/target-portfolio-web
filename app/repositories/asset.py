from pymongo.common import RETRY_READS

from app.core.database import get_db
from app.models.assets import Asset

COLLECTION = "assets"


async def get_all_assets() -> list[Asset]:
    db = get_db()
    cursor = db[COLLECTION].find({})

    assets = []
    async for doc in cursor:
        doc.pop("_id", None)
        assets.append(Asset(**doc))

    return assets


async def add_or_update_asset(asset: Asset) -> None:
    db = get_db()
    await db[COLLECTION].update_one(
        {"ticker": asset.ticker},
        {
            "$set": {
                "type": asset.type,
                "target_qty": asset.target_qty,
                "current_qty": asset.current_qty,
            }
        },
        upsert=True,
    )


async def update_asset_qty(ticker: str, qty: int) -> None:
    db = get_db()
    result = await db[COLLECTION].update_one(
        {"ticker": ticker.upper()},
        {"$set": {"current_qty": qty}},
    )

    if result.matched_count == 0:
        raise ValueError("Актив не найден")


async def delete_asset(ticker: str) -> bool:
    db = get_db()
    result = await db[COLLECTION].delete_one({"ticker": ticker.upper()})
    return result.deleted_count > 0


async def update_target(ticker: str, target_qty: int) -> bool:
    db = get_db()
    result = await db[COLLECTION].update_one(
        {"ticker": ticker.upper()},
        {"$set": {"target_qty": target_qty}},
    )
    return result.matched_count > 0


async def update_current(ticker: str, current_qty: int) -> bool:
    db = get_db()
    result = await db[COLLECTION].update_one(
        {"ticker": ticker.upper()},
        {"$set": {"current_qty": current_qty}},
    )
    return result.matched_count > 0
