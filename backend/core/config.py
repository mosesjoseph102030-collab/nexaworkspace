from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal, List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "NEXACHAT"
    ENV: Literal["dev", "staging", "prod"] = "dev"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./nexachat_dev.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # JWT
    SECRET_KEY: str = "change-me-in-production-use-32-char-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # AI
    AI_PROVIDER: Literal["openai", "anthropic"] = "openai"
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    AI_RATE_LIMIT_PER_HOUR: int = 30

    # Sentry
    SENTRY_DSN: str = ""


settings = Settings()
