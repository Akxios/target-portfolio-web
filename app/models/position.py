from enum import Enum

from pydantic import BaseModel, Field


class InstrumentType(str, Enum):
    share = "share"
    bond = "bond"


class Position(BaseModel):
    ticker: str
    type: InstrumentType
    target_qty: int
    current_qty: int


class PositionCreate(BaseModel):
    ticker: str = Field(..., examples=["SBER"])
    type: InstrumentType = Field(..., examples=["share"])
    target_qty: int = Field(..., ge=0)
    current_qty: int = Field(0, ge=0)
