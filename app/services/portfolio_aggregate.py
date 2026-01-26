from datetime import datetime

from app.models.portfolio_item import PortfolioItem
from app.repositories.asset import get_all_assets
from app.services.moex import get_ticker
from app.services.portfolio import (
    progress_percent,
    remaining_qty,
)


async def build_portfolio() -> list[PortfolioItem]:
    assets = await get_all_assets()

    result: list[PortfolioItem] = []

    for asset in assets:
        quote = await get_ticker(asset.ticker)

        price = quote.last_price

        item = PortfolioItem(
            ticker=asset.ticker,
            price=price,
            updated_at=str(datetime.now()),
            current_qty=asset.current_qty,
            target_qty=asset.target_qty,
            value=round(asset.current_qty * price, 2),
            progress_percent=progress_percent(asset),
            remaining_qty=remaining_qty(asset),
        )

        result.append(item)

    return result
