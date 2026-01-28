from datetime import datetime

from pymoex.services.search import InstrumentType

from app.models.portfolio_item import PortfolioItem
from app.repositories.portfolio import list_positions
from app.services.moex import get_moex_bond, get_moex_share
from app.services.portfolio import progress_percent, remaining_qty


async def build_portfolio() -> list[PortfolioItem]:
    positions = await list_positions()
    result: list[PortfolioItem] = []

    for position in positions:
        if position.type == InstrumentType.SHARE:
            quote = await get_moex_share(position.ticker)
        elif position.type == InstrumentType.BOND:
            quote = await get_moex_bond(position.ticker)
        else:
            raise ValueError(f"Неизвестный тип инструмента {position.type}")

        if quote.price is None:
            raise ValueError(f"Нет цены для тикера {position.ticker}")

        item = PortfolioItem(
            ticker=position.ticker,
            type=position.type,
            price=quote.price,
            updated_at=datetime.utcnow(),
            current_qty=position.current_qty,
            target_qty=position.target_qty,
            value=round(position.current_qty * quote.price, 2),
            progress_percent=progress_percent(position),
            remaining_qty=remaining_qty(position),
        )

        result.append(item)

    return result
