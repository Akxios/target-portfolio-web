from pydantic import BaseModel


class PortfolioItem(BaseModel):
    ticker: str
    type: str
    price: float
    updated_at: str

    current_qty: int
    target_qty: int

    value: float
    progress_percent: float
    remaining_qty: int
