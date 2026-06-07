from langchain_chroma import Chroma
from app.utils.embeddings import create_embeddings
from app.core.config import Settings
import os

settings = Settings()

def create_chroma_client():
    chroma_db_path = settings.chroma_db_path

    if not os.path.exists(chroma_db_path):
        raise FileNotFoundError(f"Directory not found: {chroma_db_path}")
    
    return Chroma(
        embedding_function=create_embeddings(),
        persist_directory=chroma_db_path,
        collection_metadata={"hnsw:space": "cosine"}
    )