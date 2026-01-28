from typing import Optional

from pydantic import BaseModel, Field


class MoexBondOut(BaseModel):
    ticker: str = Field(..., examples=["OFZ26238"])
    name: str = Field(..., examples=["ОФЗ 26238"])
    price: Optional[float] = Field(None, description="Текущая цена")
    yield_percent: Optional[float] = Field(None, description="Доходность, % годовых")
    coupon_value: Optional[float] = Field(None, description="Размер купона")
