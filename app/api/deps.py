from typing import AsyncGenerator

from pymoex import MoexClient


async def get_moex_client() -> AsyncGenerator[MoexClient, None]:
    async with MoexClient() as client:
        yield client
