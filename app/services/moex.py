from pymoex import MoexClient
from pymoex.models.enums import InstrumentType

from app.core.config import settings
from app.models.bond import MoexBondOut
from app.models.share import MoexShareOut

moex_url = settings.MOEX_BASE_URL


async def get_moex_share(ticker: str) -> MoexShareOut:
    async with MoexClient() as client:
        share = await client.share(ticker)

        return MoexShareOut(
            ticker=share.sec_id,
            name=share.short_name,
            price=share.last_price,
        )


async def get_moex_bond(ticker: str) -> MoexBondOut:
    async with MoexClient() as client:
        bond = await client.bond(ticker)

        return MoexBondOut(
            ticker=bond.sec_id,
            name=bond.short_name,
            price=bond.last_price,
            yield_percent=bond.yield_percent,
            coupon_value=bond.coupon_value,
        )


async def search_moex_instruments(ticker: str, type: InstrumentType):
    async with MoexClient() as client:
        result = await client.find(ticker, type)

        return result
