from datetime import datetime, timezone
from enum import Enum

from beanie import Document
from pydantic import Field


class ActionType(str, Enum):
    ADD_POSITION = "ADD_POSITION"
    REMOVE_POSITION = "REMOVE_POSITION"
    UPDATE_CURRENT_QTY = "UPDATE_CURRENT_QTY"
    UPDATE_TARGET_QTY = "UPDATE_TARGET_QTY"


class Transaction(Document):
    ticker: str = Field(..., examples=["SBER"])
    action: ActionType
    previous_qty: int = 0
    new_qty: int = 0
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "transactions"
        indexes = [
            "ticker",
            "-timestamp",  # Индекс для быстрой сортировки по дате (от новых к старым)
        ]
