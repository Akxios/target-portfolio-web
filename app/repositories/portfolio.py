from app.core.constants import PORTFOLIO_COLLECTION
from app.core.database import get_db
from app.models.position import Position

COLLECTION = PORTFOLIO_COLLECTION


async def list_positions() -> list[Position]:
    db = get_db()
    cursor = db[COLLECTION].find({})

    positions = []
    async for doc in cursor:
        doc.pop("_id", None)
        positions.append(Position(**doc))

    return positions


async def upsert_position(position: Position) -> None:
    db = get_db()
    await db[COLLECTION].update_one(
        {"ticker": position.ticker},
        {
            "$set": {
                "name": position.name,
                "short_name": position.short_name,
                "type": position.type,
                "target_qty": position.target_qty,
                "current_qty": position.current_qty,
            }
        },
        upsert=True,
    )


async def set_current_qty(ticker: str, qty: int) -> None:
    db = get_db()
    result = await db[COLLECTION].update_one(
        {"ticker": ticker.upper()},
        {"$set": {"current_qty": qty}},
    )

    if result.matched_count == 0:
        raise ValueError("Позиция не найдена")


async def set_target_qty(ticker: str, qty: int) -> None:
    db = get_db()
    result = await db[COLLECTION].update_one(
        {"ticker": ticker.upper()},
        {"$set": {"target_qty": qty}},
    )

    if result.matched_count == 0:
        raise ValueError("Позиция не найдена")


async def remove_position(ticker: str) -> None:
    db = get_db()
    result = await db[COLLECTION].delete_one({"ticker": ticker.upper()})

    if result.deleted_count == 0:
        raise ValueError("Позиция не найдена")
