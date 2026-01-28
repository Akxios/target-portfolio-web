from app.exceptions import AssetNotFoundError, InvalidQuantityError
from app.models.position import Position
from app.repositories.portfolio import (
    remove_position,
    set_current_qty,
    set_target_qty,
    upsert_position,
)


def remaining_qty(position: Position) -> int:
    """Сколько акций осталось докупить"""
    return max(position.target_qty - position.current_qty, 0)


def progress_percent(position: Position) -> float:
    """Процент выполнения цели"""
    if position.target_qty == 0:
        return 0.0
    return round(position.current_qty / position.target_qty * 100, 2)


def is_target_reached(position: Position) -> bool:
    """Достигнута ли цель"""
    return position.current_qty >= position.target_qty


async def add_position_service(position: Position) -> None:
    if position.target_qty < 0 or position.current_qty < 0:
        raise InvalidQuantityError("Количество не может быть отрицательным")

    normalized = Position(
        ticker=position.ticker.upper(),
        type=position.type,
        target_qty=position.target_qty,
        current_qty=position.current_qty,
    )

    await upsert_position(normalized)


async def set_position_target(ticker: str, target_qty: int) -> None:
    if target_qty < 0:
        raise InvalidQuantityError("Цель не может быть отрицательной")

    try:
        await set_target_qty(ticker, target_qty)
    except ValueError:
        raise AssetNotFoundError(f"Позиция {ticker} не найдена")


async def set_position_current(ticker: str, current_qty: int) -> None:
    if current_qty < 0:
        raise InvalidQuantityError("Значение не может быть отрицательным")

    try:
        await set_current_qty(ticker, current_qty)
    except ValueError:
        raise AssetNotFoundError(f"Позиция {ticker} не найдена")


async def remove_position_service(ticker: str) -> None:
    try:
        await remove_position(ticker)
    except ValueError:
        raise AssetNotFoundError(f"Позиция {ticker} не найдена")
