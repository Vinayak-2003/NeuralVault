from langchain_huggingface import HuggingFaceEmbeddings

from app.core.config import Settings

settings = Settings()

def create_embeddings():
    return HuggingFaceEmbeddings(
        model_name="BAAI/bge-small-en",
    )