from fastapi import APIRouter, Depends, HTTPException
from pymoex import MoexClient
from pymoex.models.enums import InstrumentType
from starlette import status

from app.api.deps import get_moex_client
from app.exceptions import AssetNotFoundError, InvalidQuantityError
from app.models.portfolio_item import PortfolioItem
from app.models.position import Position, PositionCreate
from app.services.moex import get_moex_bond, get_moex_share
from app.services.portfolio import (
    add_position_service,
    remove_position_service,
    set_position_current,
    set_position_target,
)
from app.services.portfolio_aggregate import build_portfolio

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.get("", response_model=list[PortfolioItem])
async def api_get_portfolio(client: MoexClient = Depends(get_moex_client)):
    return await build_portfolio(client)


@router.post("/positions", status_code=status.HTTP_201_CREATED, response_model=Position)
async def api_add_position(
    payload: PositionCreate, client: MoexClient = Depends(get_moex_client)
):
    ticker = payload.ticker.upper()

    # 1. Загружаем данные (SDK)
    if payload.type == InstrumentType.SHARE:
        instrument = await get_moex_share(client, ticker)
    elif payload.type == InstrumentType.BOND:
        instrument = await get_moex_bond(client, ticker)
    else:
        raise HTTPException(400, "Invalid instrument type")

    if not instrument:
        raise HTTPException(404, "Instrument not found on MOEX")

    # 2. Создаем позицию (Logic)
    # Используем instrument.short_name как страховку, если полного имени нет
    safe_name = instrument.name or instrument.short_name

    position = Position(
        ticker=ticker,
        name=safe_name,  # Гарантированно строка
        short_name=instrument.short_name,
        type=payload.type,
        target_qty=payload.target_qty,
        current_qty=payload.current_qty,
    )

    # 3. Сохраняем (Service)
    await add_position_service(position)

    # 4. Возвращаем объект (FastAPI сам сделает JSON)
    return position


@router.patch("/assets/{ticker}/target")
async def api_set_target_qty(ticker: str, target_qty: int):
    try:
        await set_position_target(ticker, target_qty)
        return {
            "status": "target_updated",
            "ticker": ticker.upper(),
            "target_qty": target_qty,
        }
    except AssetNotFoundError as e:
        raise HTTPException(404, str(e))
    except InvalidQuantityError as e:
        raise HTTPException(400, str(e))


@router.patch("/assets/{ticker}/current")
async def api_set_current_qty(ticker: str, current_qty: int):
    try:
        await set_position_current(ticker, current_qty)
        return {
            "status": "current_updated",
            "ticker": ticker.upper(),
            "current_qty": current_qty,
        }
    except AssetNotFoundError as e:
        raise HTTPException(404, str(e))
    except InvalidQuantityError as e:
        raise HTTPException(400, str(e))


@router.delete("/assets/{ticker}")
async def api_remove_position(ticker: str):
    try:
        await remove_position_service(ticker)
        return {
            "status": "deleted",
            "ticker": ticker.upper(),
        }
    except AssetNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
