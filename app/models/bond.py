from pydantic import BaseModel


class BondOut(BaseModel):
    ticker: str
    name: str
    price: float | None
    yield_percent: float | None
    coupon_value: float | None
