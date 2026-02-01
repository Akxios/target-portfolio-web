from fastapi import APIRouter, HTTPException
from pymoex.models.enums import InstrumentType
from starlette import status

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
async def api_get_portfolio():
    return await build_portfolio()


@router.post("/positions", status_code=status.HTTP_201_CREATED)
async def api_add_position(payload: PositionCreate):
    ticker = payload.ticker.upper()

    if payload.type == InstrumentType.SHARE:
        instrument = await get_moex_share(ticker)
    elif payload.type == InstrumentType.BOND:
        instrument = await get_moex_bond(ticker)
    else:
        raise HTTPException(400, "Invalid instrument type")

    if not instrument:
        raise HTTPException(404, "Instrument not found on MOEX")

    position = Position(
        ticker=ticker,
        type=payload.type,
        target_qty=payload.target_qty,
        current_qty=payload.current_qty,
    )

    await add_position_service(position)

    return {
        "status": "created",
        "ticker": ticker,
    }


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
