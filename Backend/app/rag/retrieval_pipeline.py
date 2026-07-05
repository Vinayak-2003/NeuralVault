from app.core.config import settings
from app.utils.qdrant_client import qdrant_client

def hybrid_retriever(query: str):
    try:
        qdrant_db = qdrant_client()
        retrievers_response = qdrant_db.similarity_search(query)

        retrieved_docs = "\n\n".join([doc.page_content for doc in retrievers_response])
        print("__________retrieved docs_____________", retrieved_docs)
        return retrieved_docs
    except Exception as e:
        print(f"Error fetching from Chroma DB: {e}")
        return "Sorry, I am having trouble retrieving the relevant documents at the moment."
