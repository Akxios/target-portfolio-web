from pathlib import Path
from pydantic_settings import  BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    MOEX_BASE_URL: str
    MONGODB_URL: str
    MONGODB_DB_NAME: str

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
    )

settings = Settings()
