from langchain_chroma import Chroma
from app.utils.embeddings import create_embeddings

def create_chroma_client(chroma_db_path: str):
    return Chroma(
        embedding_function=create_embeddings(),
        persist_directory=chroma_db_path,
        collection_metadata={"hnsw:space": "cosine"}
    )