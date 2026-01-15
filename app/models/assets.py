from pydantic import BaseModel


class Asset(BaseModel):
    ticker: str
    target_qty: int
    current_qty: int
