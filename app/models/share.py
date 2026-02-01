from pydantic import BaseModel, Field


class MoexShareOut(BaseModel):
    ticker: str = Field(..., examples=["SBER"])
    name: str = Field(..., examples=["Сбербанк"])
    price: float | None = Field(
        None,
        description="Текущая цена акции (может отсутствовать)",
    )
