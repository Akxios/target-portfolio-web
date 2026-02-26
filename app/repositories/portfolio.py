from typing import List

from app.models.position import Position
from app.models.transaction import ActionType, Transaction


async def get_all_positions() -> List[Position]:
    """Получить все позиции из базы"""
    return await Position.find_all().to_list()


async def upsert_position(position_data: Position) -> None:
    """Обновить или создать позицию"""
    # Ищем по тикеру
    existing = await Position.find_one(Position.ticker == position_data.ticker)

    if existing:
        old_current = existing.current_qty
        old_target = existing.target_qty
        # Обновляем поля, если нашли
        existing.current_qty = position_data.current_qty
        existing.target_qty = position_data.target_qty
        existing.name = position_data.name
        existing.short_name = position_data.short_name
        existing.type = position_data.type
        await existing.save()

        if old_current != position_data.current_qty:
            await Transaction(
                ticker=existing.ticker,
                action=ActionType.UPDATE_CURRENT_QTY,
                previous_qty=old_current,
                new_qty=position_data.current_qty,
            ).insert()

            # Логируем, если изменилась цель
        if old_target != position_data.target_qty:
            await Transaction(
                ticker=existing.ticker,
                action=ActionType.UPDATE_TARGET_QTY,
                previous_qty=old_target,
                new_qty=position_data.target_qty,
            ).insert()
    else:
        # Создаем новую
        await position_data.create()
        await Transaction(
            ticker=position_data.ticker,
            action=ActionType.ADD_POSITION,
            new_qty=position_data.current_qty,
        ).insert()


async def set_target_qty(ticker: str, target_qty: int) -> None:
    """Установить целевое количество"""
    position = await Position.find_one(Position.ticker == ticker)
    if not position:
        raise ValueError(f"Position {ticker} not found")

    old_target = position.target_qty

    if old_target != target_qty:
        position.target_qty = target_qty
        await position.save()

        await Transaction(
            ticker=ticker,
            action=ActionType.UPDATE_TARGET_QTY,
            previous_qty=old_target,
            new_qty=target_qty,
        ).insert()


async def set_current_qty(ticker: str, current_qty: int) -> None:
    """Установить текущее количество"""
    position = await Position.find_one(Position.ticker == ticker)
    if not position:
        raise ValueError(f"Position {ticker} not found")

    old_current = position.current_qty

    if old_current != current_qty:
        position.current_qty = current_qty
        await position.save()

        await Transaction(
            ticker=ticker,
            action=ActionType.UPDATE_CURRENT_QTY,
            previous_qty=old_current,
            new_qty=current_qty,
        ).insert()


async def remove_position(ticker: str) -> None:
    """Удалить позицию"""
    position = await Position.find_one(Position.ticker == ticker)
    if not position:
        raise ValueError(f"Position {ticker} not found")

    old_current = position.current_qty
    await position.delete()

    await Transaction(
        ticker=ticker,
        action=ActionType.REMOVE_POSITION,
        previous_qty=old_current,
        new_qty=0,
    ).insert()
