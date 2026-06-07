from langchain_qdrant import QdrantVectorStore, RetrievalMode, FastEmbedSparse
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, VectorParams, SparseVectorParams
from app.core.config import Settings
from .embeddings import create_embeddings

settings = Settings()

def qdrant_client():
    dense_vector_name = settings.QDRANT_DENSE_VECTOR_NAME
    sparse_vector_name = settings.QDRANT_SPARSE_VECTOR_NAME

    sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")

    client = QdrantClient(
        url=settings.QDRANT_CLUSTER_ENDPOINT,
        api_key=settings.QDRANT_DB_API_KEY,
    )

    if not client.collection_exists(settings.QDRANT_COLLECTION_NAME):
        print("Qdrant client does not exists !!")
        client.create_collection(
            collection_name="neural-vault-docs",
            vectors_config={
                dense_vector_name: VectorParams(
                    size=384,
                    distance=Distance.COSINE
                )
            },
            sparse_vectors_config={
                sparse_vector_name: SparseVectorParams(
                    index=models.SparseIndexParams(on_disk=False))
            },
        )

    return QdrantVectorStore(
        client=client,
        collection_name=settings.QDRANT_COLLECTION_NAME,
        embedding=create_embeddings(),
        retrieval_mode=RetrievalMode.HYBRID,
        sparse_embedding=sparse_embeddings,
        vector_name=dense_vector_name,
        sparse_vector_name=sparse_vector_name,
    )
