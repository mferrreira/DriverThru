from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "DriverThru API"
    APP_ENV: str = "development"
    APP_DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    API_ROOT_PATH: str = "/api"

    DATABASE_URL: str
    SQLALCHEMY_ECHO: bool = False

    MINIO_ENDPOINT: str
    MINIO_ROOT_USER: str
    MINIO_ROOT_PASSWORD: str
    MINIO_BUCKET: str
    MINIO_SECURE: bool = False
    MINIO_STARTUP_STRICT: bool = False
    DOCUMENTS_DIR: str = "../documents"
    GENERATED_DOCUMENTS_PREFIX: str = "generated-documents"
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    AUTH_COOKIE_NAME: str = "driverthru_access_token"
    AUTH_COOKIE_SECURE: bool = False
    AUTH_COOKIE_SAMESITE: str = "lax"
    AUTH_USERS_JSON: str

    OCR_PROVIDER: str = "anthropic"
    OCR_ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    ANTHROPIC_API_KEY: str | None = None

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
