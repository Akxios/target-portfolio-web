# app/repositories/portfolio.py

from typing import List

from app.models.position import Position


async def get_all_positions() -> List[Position]:
    """Получить все позиции из базы"""
    return await Position.find_all().to_list()


async def upsert_position(position_data: Position) -> None:
    """Обновить или создать позицию"""
    # Ищем по тикеру
    existing = await Position.find_one(Position.ticker == position_data.ticker)

    if existing:
        # Обновляем поля, если нашли
        existing.current_qty = position_data.current_qty
        existing.target_qty = position_data.target_qty
        existing.name = position_data.name
        existing.short_name = position_data.short_name
        existing.type = position_data.type
        await existing.save()
    else:
        # Создаем новую
        await position_data.create()


async def set_target_qty(ticker: str, target_qty: int) -> None:
    """Установить целевое количество"""
    position = await Position.find_one(Position.ticker == ticker)
    if not position:
        raise ValueError(f"Position {ticker} not found")

    position.target_qty = target_qty
    await position.save()


async def set_current_qty(ticker: str, current_qty: int) -> None:
    """Установить текущее количество"""
    position = await Position.find_one(Position.ticker == ticker)
    if not position:
        raise ValueError(f"Position {ticker} not found")

    position.current_qty = current_qty
    await position.save()


async def remove_position(ticker: str) -> None:
    """Удалить позицию"""
    position = await Position.find_one(Position.ticker == ticker)
    if not position:
        raise ValueError(f"Position {ticker} not found")

    await position.delete()
