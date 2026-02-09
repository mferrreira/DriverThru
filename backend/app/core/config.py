from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MINIO_ENDPOINT: str
    MINIO_ROOT_USER: str
    MINIO_ROOT_PASSWORD: str
    MINIO_BUCKET: str

    class Config:
        env_file = ".env"


settings = Settings()