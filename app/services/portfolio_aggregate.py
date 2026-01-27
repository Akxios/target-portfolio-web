from datetime import datetime

from pymoex.services.search import InstrumentType

from app.models.portfolio_item import PortfolioItem
from app.repositories.asset import get_all_assets
from app.services.moex import get_bond, get_share
from app.services.portfolio import (
    progress_percent,
    remaining_qty,
)


async def build_portfolio() -> list[PortfolioItem]:
    assets = await get_all_assets()
    result: list[PortfolioItem] = []

    for asset in assets:
        if asset.type == InstrumentType.SHARE:
            quote = await get_share(asset.ticker)
        elif asset.type == InstrumentType.BOND:
            quote = await get_bond(asset.ticker)
        else:
            raise ValueError(f"Неизвестный тип инструмента {asset.type}")

        price = quote.price

        if price is None:
            raise ValueError(f"Нет цены для тикера {asset.ticker}")

        item = PortfolioItem(
            ticker=asset.ticker,
            type=asset.type,
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
