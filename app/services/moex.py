from pymoex import MoexClient
from pymoex.models.enums import InstrumentType

from app.core.config import settings
from app.models.bond import MoexBondOut
from app.models.share import MoexShareOut

moex_url = settings.MOEX_BASE_URL


async def get_moex_share(client: MoexClient, ticker: str) -> MoexShareOut:

    share = await client.share(ticker)

    return MoexShareOut(
        ticker=share.sec_id,
        short_name=share.short_name,
        name=share.name,
        price=share.last_price,
    )


async def get_moex_bond(client: MoexClient, ticker: str) -> MoexBondOut:
    bond = await client.bond(ticker)

    return MoexBondOut(
        ticker=bond.sec_id,
        name=bond.name or bond.short_name,
        short_name=bond.short_name,
        price=bond.last_price,
        effective_yield=bond.effective_yield,
        coupon_value=bond.coupon_value,
    )


async def search_moex_instruments(
    client: MoexClient, ticker: str, type: InstrumentType
):
    result = await client.find(ticker, type)

    return result
