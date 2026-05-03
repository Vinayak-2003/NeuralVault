from sqlalchemy import select

from app.schemas.document_schema import Document
from app.utils.chroma_client import create_chroma_client

from app.rag.bm25_retriever import BM25RetrieverClass

from app.core.config import Settings
settings = Settings()


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
        if document is None:
            return False
        db_session.delete(document)
        db_session.commit()

        chroma_db = create_chroma_client(settings.vector_db_path)
        chroma_db._collection.delete(
            where={"id": str(doc_id)}
        )

        bm25_retriever = BM25RetrieverClass()
        bm25_retriever.delete_document(doc_id=str(doc_id))

        return True
    except Exception as e:
        print(f"Error deleting document: {e}")
        raise e