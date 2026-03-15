from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class MoexCurrencyOut(BaseModel):
    ticker: str = Field(examples=["CNYRUB_TOM", "USDCB"])
    short_name: str = Field(examples=["Юань", "Доллар США"])
    name: Optional[str] = Field(None, examples=["Юань/Рубль"])
    price: Optional[Decimal] = Field(
        None,
        description="Текущая цена валюты (может отсутствовать)",
    )
