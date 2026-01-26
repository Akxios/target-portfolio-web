from fastapi import APIRouter, HTTPException
from starlette import status

from app.models.asset_create import AssetCreate
from app.models.assets import Asset
from app.models.portfolio_item import PortfolioItem
from app.repositories.asset import add_or_update_asset
from app.services.portfolio_aggregate import build_portfolio

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.get("", response_model=list[PortfolioItem])
async def get_portfolio():
    return await build_portfolio()


@router.post("/add_assets", status_code=status.HTTP_201_CREATED)
async def add_assets(payload: AssetCreate):
    asset = Asset(
        ticker=payload.ticker.upper(),
        target_qty=payload.target_qty,
        current_qty=payload.current_qty,
    )

    try:
        await add_or_update_asset(asset)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "ok", "ticker": asset.ticker}
