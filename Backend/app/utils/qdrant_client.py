from langchain_qdrant import QdrantVectorStore, RetrievalMode, FastEmbedSparse
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, VectorParams, SparseVectorParams
from app.core.config import settings
from .embeddings import create_embeddings

def qdrant_client():
    dense_vector_name = settings.QDRANT_DENSE_VECTOR_NAME
    sparse_vector_name = settings.QDRANT_SPARSE_VECTOR_NAME

    sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")

    client = QdrantClient(
        url=settings.QDRANT_CLUSTER_ENDPOINT,
        api_key=settings.QDRANT_DB_API_KEY,
    )

    if not client.collection_exists(settings.QDRANT_COLLECTION_NAME):
        print(f"Qdrant collection '{settings.QDRANT_COLLECTION_NAME}' does not exist, creating...")
        client.create_collection(
            collection_name=settings.QDRANT_COLLECTION_NAME,
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

    # Ensure payload index on metadata.id exists
    try:
        collection_info = client.get_collection(settings.QDRANT_COLLECTION_NAME)
        if not collection_info.payload_schema or "metadata.id" not in collection_info.payload_schema:
            print("Creating Qdrant payload index for metadata.id...")
            client.create_payload_index(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                field_name="metadata.id",
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
    except Exception as index_err:
        print(f"Error checking/creating Qdrant payload index: {index_err}")

    return QdrantVectorStore(
        client=client,
        collection_name=settings.QDRANT_COLLECTION_NAME,
        embedding=create_embeddings(),
        retrieval_mode=RetrievalMode.HYBRID,
        sparse_embedding=sparse_embeddings,
        vector_name=dense_vector_name,
        sparse_vector_name=sparse_vector_name,
    )
