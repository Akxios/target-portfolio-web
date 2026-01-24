from fastapi import APIRouter, HTTPException
from pymoex import MoexClient
from starlette import status

from app.models.asset_create import AssetCreate
from app.models.assets import Asset
from app.models.share import ShareOut
from app.repositories.asset import add_or_update_asset
from app.services.moex import search_shares

router = APIRouter(prefix="/api/moex", tags=["MOEX"])


@router.get("/shares/{ticket}", response_model=ShareOut)
async def get_share_data(ticket: str):
    async with MoexClient() as client:
        share = await client.share(ticket)

        return ShareOut(
            ticker=share.sec_id,
            name=share.short_name,
            price=share.last_price,
        )


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


@router.get("/search")
async def search(query: str):
    return await search_shares(query)
