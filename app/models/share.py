from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class MoexShareOut(BaseModel):
    ticker: str = Field(examples=["SBER"])
    short_name: str = Field(examples=["ОФЗ"])
    name: Optional[str] = Field(examples=["Сбербанк"])
    price: Optional[Decimal] = Field(
        None,
        description="Текущая цена акции (может отсутствовать)",
    )
