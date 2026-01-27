from fastapi import APIRouter, HTTPException
from pymoex.services.search import InstrumentType
from starlette import status

from app.exceptions import AssetNotFoundError, InvalidQuantityError
from app.models.asset_create import AssetCreate
from app.models.assets import Asset
from app.models.portfolio_item import PortfolioItem
from app.repositories.asset import add_or_update_asset
from app.services.portfolio import change_current, change_target, remove_asset
from app.services.portfolio_aggregate import build_portfolio

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.get("", response_model=list[PortfolioItem])
async def api_get_portfolio():
    return await build_portfolio()


@router.post("/add_assets", status_code=status.HTTP_201_CREATED)
async def api_add_assets(payload: AssetCreate):
    asset = Asset(
        ticker=payload.ticker.upper(),
        type=payload.type,
        target_qty=payload.target_qty,
        current_qty=payload.current_qty,
    )

    await add_or_update_asset(asset)

    return {"status": "ok", "ticker": asset.ticker}


@router.delete("/assets/{ticker}")
async def api_remove_ticker(ticker: str):
    try:
        return await remove_asset(ticker)
    except AssetNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/assets/{ticker}/target")
async def api_change_target(ticker: str, target_qty: int):
    try:
        return await change_target(ticker, target_qty)
    except AssetNotFoundError as e:
        raise HTTPException(404, str(e))
    except InvalidQuantityError as e:
        raise HTTPException(400, str(e))


@router.patch("/assets/{ticker}/current")
async def api_update_current(ticker: str, current_qty: int):
    try:
        return await change_current(ticker, current_qty)
    except AssetNotFoundError as e:
        raise HTTPException(404, str(e))
    except InvalidQuantityError as e:
        raise HTTPException(400, str(e))
