from encodings.rot_13 import rot13

from fastapi import APIRouter, HTTPException
from starlette import status

from app.models.asset_create import AssetCreate
from app.models.assets import Asset
from app.repositories.asset import add_or_update_asset
from app.services.moex import get_ticker

router = APIRouter(
    prefix="/api/moex",
    tags=["MOEX"]
)


@router.get("shares/{ticket}")
async def get_share_data(ticket: str):
    try:
        return await get_ticker(ticket.upper())
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_asset(payload: AssetCreate):
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