import httpx

from app.core.config import settings

moex_url = settings.MOEX_BASE_URL


async def get_ticker(ticker: str) -> dict:
    url = f"{moex_url}/engines/stock/markets/shares/boards/TQBR/securities/{ticker}.json"

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url)
        r.raise_for_status()
        data = r.json()

    marketdata = data["marketdata"]["data"]
    columns = data["marketdata"]["columns"]

    if not marketdata:
        raise ValueError("Нет торговых данных")

    row = dict(zip(columns, marketdata[0]))

    last = row.get("LAST")
    prev = row.get("PREVPRICE")

    price = last if last not in (None, 0) else prev

    return {
        "ticker": ticker,
        "price": price,
        "updated_at": row.get("UPDATETIME"),
    }
