from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List
import os

class Settings(BaseSettings):
    GEMINI_API_KEY: str
    GROQ_API_KEY: str
    HF_TOKEN: str

    document_path: str = "app/db/docs"
    vector_db_path: str = "app/db/chroma_db"

    groq_chat_model: str = "llama-3.1-8b-instant"
    gemini_embedding_model: str = "models/gemini-embedding-001"

    chunk_size: int = 1000
    chunk_overlap: int = 200

    database_user: str
    database_password: str
    database_name: str
    database_port: int = 5432
    database_host: str = "localhost"

    neon_db_user: str = Field(validation_alias="NEON_USER")
    neon_db_password: str
    neon_db_host: str = Field(validation_alias="NEON_DB_HOST")
    neon_db_name: str

    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "https://neural-vault-sooty.vercel.app", "https://neural-vault-sooty.vercel.app/"]


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()