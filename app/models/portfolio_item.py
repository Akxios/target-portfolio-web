from datetime import datetime

from pydantic import BaseModel, Field
from pymoex.models.enums import InstrumentType


class PortfolioItem(BaseModel):
    ticker: str = Field(..., examples=["SBER"])
    type: InstrumentType

    price: float = Field(..., description="Текущая цена")
    updated_at: datetime = Field(..., description="Время обновления котировки")

    current_qty: int = Field(..., ge=0)
    target_qty: int = Field(..., ge=0)

    value: float = Field(..., description="Текущая стоимость позиции")
    progress_percent: float = Field(..., ge=0, le=100)
    remaining_qty: int = Field(..., ge=0)
