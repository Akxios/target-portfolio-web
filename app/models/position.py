from pydantic import BaseModel, Field
from pymoex.models.enums import InstrumentType


class Position(BaseModel):
    ticker: str
    type: InstrumentType

    target_qty: int = Field(..., ge=0)
    current_qty: int = Field(..., ge=0)


class PositionCreate(BaseModel):
    ticker: str = Field(..., examples=["SBER"])
    type: InstrumentType = Field(..., examples=["share"])

    target_qty: int = Field(..., ge=0)
    current_qty: int = Field(0, ge=0)
