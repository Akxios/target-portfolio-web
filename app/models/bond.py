from decimal import Decimal

from pydantic import BaseModel, Field


class MoexBondOut(BaseModel):
    ticker: str = Field(examples=["OFZ26238"])
    short_name: str = Field(examples=["ОФЗ"])
    name: str = Field(..., examples=["ОФЗ 26238"])
    price: Decimal | None = Field(
        None,
        description="Текущая цена (может отсутствовать)",
    )
    effective_yield: Decimal | None = Field(
        None,
        description="Доходность, % годовых (может отсутствовать)",
    )
    coupon_value: Decimal | None = Field(
        None,
        description="Размер купона (может отсутствовать)",
    )
