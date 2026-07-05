from sqlalchemy import select

from app.models.document_model import Document
from app.rag.bm25_retriever import BM25RetrieverClass
from app.core.config import settings
from app.utils.qdrant_client import qdrant_client
from qdrant_client import models

def all_documents(db_session):
    try:
        documents_query = db_session.execute(select(Document))
        documents = documents_query.scalars().all()
        return documents
    except Exception as e:
        print(f"Error fetching documents: {e}")
        raise e


def delete_document_id(db_session, doc_id: str):
    try:
        document = db_session.execute(
            select(Document).where(Document.id == doc_id)
        )
        document = document.scalar_one_or_none()
        # if document is None:
        #     return False
        
        actual_doc_id = str(document.doc_id)
        
        db_session.delete(document)
        db_session.commit()

        # Delete chunks from Qdrant DB
        try:
            vector_db = qdrant_client()
            vector_db.client.delete(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                points_selector=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="metadata.id",
                            match=models.MatchValue(value=actual_doc_id),
                        )
                    ]
                )
            )
            print(f"Deleted chunks from Qdrant for doc_id: {actual_doc_id}")
        except Exception as q_err:
            print(f"Failed to delete chunks from Qdrant: {q_err}")

        # Delete chunks from BM25 retriever
        try:
            bm25_retriever = BM25RetrieverClass()
            bm25_retriever.delete_document(doc_id=actual_doc_id)
            print(f"Deleted chunks from BM25 for doc_id: {actual_doc_id}")
        except Exception as bm25_err:
            print(f"Failed to delete chunks from BM25: {bm25_err}")

        return True
    except Exception as e:
        db_session.rollback()
        print(f"Error deleting document: {e}")
        raise e