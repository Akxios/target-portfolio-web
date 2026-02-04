from pydantic import BaseModel, Field


class MoexBondOut(BaseModel):
    ticker: str = Field(..., examples=["OFZ26238"])
    name: str = Field(..., examples=["ОФЗ 26238"])

    price: float | None = Field(
        None,
        description="Текущая цена (может отсутствовать)",
    )
    effective_yield: float | None = Field(
        None,
        description="Доходность, % годовых (может отсутствовать)",
    )
    coupon_value: float | None = Field(
        None,
        description="Размер купона (может отсутствовать)",
    )
