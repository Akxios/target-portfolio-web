from pymoex import MoexClient
from pymoex.models.enums import InstrumentType

from app.core.config import settings
from app.models.bond import MoexBondOut
from app.models.currency import MoexCurrencyOut
from app.models.share import MoexShareOut

moex_url = settings.MOEX_BASE_URL


async def get_moex_share(client: MoexClient, ticker: str) -> MoexShareOut:

    share = await client.share(ticker)

    return MoexShareOut(
        ticker=share.sec_id,
        short_name=share.short_name,
        name=share.name,
        price=share.last_price or share.prev_price,
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


async def get_moex_fund(client: MoexClient, ticker: str) -> MoexShareOut:
    fund = await client.fund(ticker)
    return MoexShareOut(
        ticker=fund.sec_id,
        short_name=fund.short_name,
        name=fund.name,
        price=fund.last_price or fund.prev_price,
    )


async def get_moex_currency(client: MoexClient, ticker: str) -> MoexCurrencyOut:
    currency = await client.currency(ticker)
    return MoexCurrencyOut(
        ticker=currency.sec_id,
        short_name=currency.short_name,
        name=currency.name,
        price=currency.last_price,
    )


async def search_moex_instruments(
    client: MoexClient, ticker: str, type: InstrumentType
):
    result = await client.find(ticker, type)

    return result
