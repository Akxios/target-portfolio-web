from typing import Optional

from pydantic import BaseModel, Field


class MoexShareOut(BaseModel):
    ticker: str = Field(..., examples=["SBER"])
    name: str = Field(..., examples=["Сбербанк"])
    price: Optional[float] = Field(None, description="Текущая цена акции")
