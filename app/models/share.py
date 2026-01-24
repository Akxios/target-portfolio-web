from pydantic import BaseModel


class ShareOut(BaseModel):
    ticker: str
    name: str
    price: float | None
