from fastapi import APIRouter, Depends, HTTPException
from pymoex import MoexClient
from pymoex.models.enums import InstrumentType

from app.api.deps import get_moex_client
from app.services.moex import get_moex_bond, get_moex_share, search_moex_instruments

router = APIRouter(prefix="/moex", tags=["MOEX"])


@router.get("/instruments/{ticker}")
async def api_get_instrument(
    ticker: str, type: InstrumentType, client: MoexClient = Depends(get_moex_client)
):
    if type == InstrumentType.SHARE:
        return await get_moex_share(client, ticker)
    elif type == InstrumentType.BOND:
        return await get_moex_bond(client, ticker)

    raise HTTPException(status_code=400, detail="Invalid instrument type")


@router.get("/search")
async def api_search_moex(
    ticker: str, type: InstrumentType, client: MoexClient = Depends(get_moex_client)
):
    items = await search_moex_instruments(client, ticker, type)

    return [
        {
            "ticker": it.sec_id,
            "name": it.name,
            "short_name": it.short_name,
            "isin": it.isin,
            "type": "share" if type == InstrumentType.SHARE else "bond",
        }
        for it in items
    ]
