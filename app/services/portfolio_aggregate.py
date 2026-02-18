import asyncio
from datetime import datetime, timezone

import httpx
from pymoex import MoexClient
from pymoex.models.enums import InstrumentType

from app.core.constants import MOEX_MAX_CONCURRENCY
from app.models.portfolio_item import PortfolioItem
from app.repositories.portfolio import list_positions
from app.services.moex import get_moex_bond, get_moex_share
from app.services.portfolio import progress_percent, remaining_qty

_SEMAPHORE = asyncio.Semaphore(MOEX_MAX_CONCURRENCY)


async def _load_quote(client: MoexClient, position):
    async with _SEMAPHORE:
        try:
            if position.type == InstrumentType.SHARE:
                quote = await get_moex_share(client, position.ticker)
            elif position.type == InstrumentType.BOND:
                quote = await get_moex_bond(client, position.ticker)
            else:
                return position, None

            return position, quote

        except (httpx.HTTPError, asyncio.TimeoutError):
            return position, None


async def build_portfolio(client: MoexClient) -> list[PortfolioItem]:
    positions = await list_positions()

    now = datetime.now(timezone.utc)

    tasks = [_load_quote(client, p) for p in positions]
    results = await asyncio.gather(*tasks)

    portfolio: list[PortfolioItem] = []

    for position, quote in results:
        price = quote.price if quote and quote.price else None

        item = PortfolioItem(
            ticker=position.ticker,
            name=position.name,
            type=position.type,
            price=price,
            updated_at=now,
            current_qty=position.current_qty,
            target_qty=position.target_qty,
            value=round(position.current_qty * price, 2) if price else None,
            progress_percent=await progress_percent(position),
            remaining_qty=await remaining_qty(position),
        )

        portfolio.append(item)

    return portfolio
