from beanie import Document
from pydantic import BaseModel, Field
from pymoex.models.enums import InstrumentType


class Position(Document):
    ticker: str = Field(..., examples=["SBER"])
    name: str = Field(..., examples=["ОФЗ 26238"])
    short_name: str = Field(examples=["ОФЗ"])
    type: InstrumentType

    target_qty: int = Field(..., ge=0)
    current_qty: int = Field(..., ge=0)

    class Settings:
        name = "portfolio"
        indexes = [
            "ticker",
        ]


class PositionCreate(BaseModel):
    ticker: str = Field(..., examples=["SBER"])
    type: InstrumentType = Field(..., examples=["share"])

    target_qty: int = Field(..., ge=0)
    current_qty: int = Field(0, ge=0)
