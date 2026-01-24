import httpx
from pymoex import MoexClient

from app.core.config import settings

moex_url = settings.MOEX_BASE_URL


async def get_ticker(ticker: str):
    async with MoexClient() as client:
        share = await client.share(ticker)
        print(share)
        return share


async def search_shares(query: str, limit: int = 10) -> list[dict]:
    url = f"{moex_url}/securities.json"

    params = {
        "q": query,
        "iss.only": "securities",
        "iss.meta": "off",
        "limit": limit,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        data = r.json()

    rows = data["securities"]["data"]
    columns = data["securities"]["columns"]

    results = []
    for row in rows:
        item = dict(zip(columns, row))

        # ФИЛЬТРУЕМ ТОЛЬКО АКЦИИ ПО ТИКЕРУ
        secid = item.get("SECID", "")
        if not secid:
            continue

        # акции Мосбиржи — обычно КОРОТКИЕ тикеры
        if len(secid) <= 5:
            results.append(
                {
                    "ticker": secid,
                    "name": item.get("NAME"),
                    "short_name": item.get("SHORTNAME"),
                }
            )

    return results
