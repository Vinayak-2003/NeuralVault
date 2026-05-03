from langchain_classic.retrievers.ensemble import EnsembleRetriever
import os

from app.core.config import Settings
from app.utils.chroma_client import create_chroma_client

from app.rag.bm25_retriever import BM25RetrieverClass

settings = Settings()


def hybrid_retriever(query: str, top_k: int):
    try:
        print("___________fetching from chroma db_____________")
        # load chroma db
        chroma_db_path: str = settings.vector_db_path

        if not os.path.exists(chroma_db_path):
            raise FileNotFoundError(f"Directory not found: {chroma_db_path}")

        chroma_db = create_chroma_client(chroma_db_path)
        print(f"_________________ChromaDB count: {chroma_db._collection.count()}")

        chroma_db_retriever = chroma_db.as_retriever(search_type="similarity", search_kwargs={"k": top_k})


        bm25_retriever = BM25RetrieverClass().bm25_retriever()

        ensemble_retriever = EnsembleRetriever(
            retrievers=[chroma_db_retriever, bm25_retriever],
            weights=[0.5, 0.5]
        )

        retrievers_response = ensemble_retriever.invoke(query)

        retrieved_docs = "\n\n".join([doc.page_content for doc in retrievers_response])
        print("__________retrieved docs_____________", retrieved_docs)
        return retrieved_docs
    except Exception as e:
        print(f"Error fetching from Chroma DB: {e}")
        return "Sorry, I am having trouble retrieving the relevant documents at the moment."
