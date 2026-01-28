from fastapi import APIRouter, HTTPException
from pymoex.services.search import InstrumentType

from app.services.moex import get_moex_bond, get_moex_share, search_moex_instruments

router = APIRouter(prefix="/api/moex", tags=["MOEX"])


@router.get("/instruments/{ticker}")
async def api_get_instrument(ticker: str, type: InstrumentType):
    if type == InstrumentType.SHARE:
        return await get_moex_share(ticker)
    elif type == InstrumentType.BOND:
        return await get_moex_bond(ticker)

    raise HTTPException(status_code=400, detail="Invalid instrument type")


@router.get("/search")
async def api_search_moex(ticker: str, type: InstrumentType):
    return await search_moex_instruments(ticker, type)
