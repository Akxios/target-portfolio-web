from pymoex import MoexClient
from pymoex.services.search import InstrumentType

from app.core.config import settings

moex_url = settings.MOEX_BASE_URL


async def get_ticker(ticker: str):
    async with MoexClient() as client:
        share = await client.share(ticker)
        print(share)
        return share


async def search(ticker: str, type: InstrumentType):
    async with MoexClient() as client:
        result = await client.find(ticker, type)

        return result
