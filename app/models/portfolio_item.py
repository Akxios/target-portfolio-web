from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field
from pymoex.models.enums import InstrumentType


class PortfolioItem(BaseModel):
    ticker: str = Field(examples=["SBER"])
    name: str = Field(examples=["Сбербанк"])
    type: InstrumentType

    price: Decimal | None = Field(
        None,
        description="Текущая цена (может отсутствовать)",
    )
    updated_at: datetime = Field(
        ...,
        description="Время обновления котировки",
    )

    current_qty: int = Field(..., ge=0)
    target_qty: int = Field(..., ge=0)

    value: Decimal | None = Field(
        None,
        description="Текущая стоимость позиции (может отсутствовать)",
    )
    progress_percent: Decimal = Field(..., ge=0)
    remaining_qty: int = Field(..., ge=0)
