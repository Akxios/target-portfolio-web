from pydantic import BaseModel


class Asset(BaseModel):
    ticker: str
    type: str
    target_qty: int
    current_qty: int
