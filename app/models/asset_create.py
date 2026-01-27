from pydantic import BaseModel, Field


class AssetCreate(BaseModel):
    ticker: str = Field(..., examples=["SBER"])
    type: str = Field(..., examples=["share", "bond"])
    target_qty: int = Field(..., ge=0)
    current_qty: int = Field(0, ge=0)
