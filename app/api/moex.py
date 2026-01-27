from fastapi import APIRouter
from pymoex.services.search import InstrumentType

from app.models.bond import BondOut
from app.models.share import ShareOut
from app.services.moex import get_bond, get_share, search_instruments

router = APIRouter(prefix="/api/moex", tags=["MOEX"])


@router.get("/shares/{ticker}", response_model=ShareOut)
async def get_share_data(ticker: str):
    return await get_share(ticker)


@router.get("/bonds/{ticker}", response_model=BondOut)
async def get_bond_data(ticker: str):
    return await get_bond(ticker)


@router.get("/search")
async def search(ticker: str, type: InstrumentType):
    return await search_instruments(ticker, type)
