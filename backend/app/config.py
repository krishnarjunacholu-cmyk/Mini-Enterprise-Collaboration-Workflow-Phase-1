"""
Configuration module for the FastAPI application.
Loads environment variables and provides settings.
"""

from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """
    Application settings loaded from .env file.
    Uses pydantic-settings for environment variable management.
    """
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    # Database
    DATABASE_URL: str = "sqlite:///./mini_enterprise.db"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # App
    DEBUG: bool = True
    APP_NAME: str = "Mini Enterprise Collaboration API"
    APP_VERSION: str = "1.0.0"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value: Any) -> Any:
        """
        Accept common environment names because system env vars can override
        .env values. For example, DEBUG=release should mean False.
        """
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production"}:
                return False
            if normalized in {"debug", "dev", "development"}:
                return True
        return value
    
@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings instance.
    Returns the same Settings object on multiple calls.
    """
    return Settings()
