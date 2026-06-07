from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader, PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.utils.qdrant_client import qdrant_client
from uuid import uuid4, UUID
import os

from app.rag.metadata_enricher import split_document_enricher
from app.services.metadata_service import document_metadata_service, update_document_metadata_service
from app.schemas.document_schema import DocumentStatus
from app.rag.bm25_retriever import BM25RetrieverClass

from app.core.config import Settings
settings = Settings()


def load_pdf_document(file_path: str):
    try:
        print("___________document loading_____________")
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        pdf_loader = PyPDFLoader(file_path = file_path)

        # load documents from the directory
        documents = pdf_loader.load()

        print("PDF documents loaded from directory.")

        return documents
    except Exception as e:
        print(f"Error loading PDF document: {e}")
        raise


def load_directory(path: str = settings.document_path):
    try:
        print("___________document loading_____________")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Directory not found: {path}")

        directory_loader = PyPDFDirectoryLoader(
            path=path,
            glob="*.pdf"
        )

        # load documents from the directory
        documents = directory_loader.load()

        print("PDF documents loaded from directory.")

        return documents
    except Exception as e:
        print(f"Error loading PDF documents from directory: {e}")
        raise


def split_documents(documents):
    try:
        print("___________document splitting_____________")
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap
        )

        # split documents into chunks
        chunks = text_splitter.split_documents(documents)

        print(f"Number of chunks created: {len(chunks)}")

        return chunks
    except Exception as e:
        print(f"Error splitting documents into chunks: {e}")
        raise


def add_chunks_to_vector_db(chunks):
    # add chunks to the chroma db
    try:
        print("___________adding chunks to chroma db_____________")
                
        vector_db = qdrant_client()
        vector_db.add_documents(documents=chunks)
        print("_____________Chunks added to Chroma database______________")

        return vector_db
    except Exception as e:
        print(f"Error adding chunks to Chroma database: {e}")
        raise
    


def bm25_ingestion(doc_id, chunks):
    try:
        bm25_retriever = BM25RetrieverClass()
        bm25_retriever.add_documents(doc_id=doc_id, chunks=chunks)
        print("_____________Chunks added to BM25 retriever______________")
    except Exception as e:
        print(f"Error adding chunks to BM25 retriever: {e}")
        raise


def ingestion_pipeline(uploaded_file_path: str, job_id: UUID, db_session):
    try:
        id = uuid4()
        # step 0: Create document record in the database with status 'processing'
        document_metadata_service(db_session, id, uploaded_file_path, DocumentStatus.processing, job_id)
        
        # step 1: Load document from the doc directory
        loaded_document = load_pdf_document(file_path=uploaded_file_path)

        # Step 2: Split the document into chunks
        chunks = split_documents(documents=loaded_document)

        # Update document record in the database with status 'splitted'
        update_document_metadata_service(db_session, id, DocumentStatus.splitted)

        # step 3: Enrich the chunks with metadata
        metadata_enriched_chunks = split_document_enricher(chunks=chunks, id=str(id), file_path=uploaded_file_path)

        # extracting required information
        total_pages = metadata_enriched_chunks[0].metadata.get("total_pages")
        total_chunks = len(chunks)

        # Add chunks to BM25 retriever
        bm25_ingestion(doc_id=str(id), chunks=metadata_enriched_chunks)

        # Update document record in the database with status 'chunked'
        update_document_metadata_service(db_session, id, DocumentStatus.chunked, total_pages, total_chunks)

        # Step 4: Add the chunks to chroma db
        add_chunks_to_vector_db(chunks=metadata_enriched_chunks)

        # Update document record in the database with status 'indexed'
        update_document_metadata_service(db_session, id, DocumentStatus.indexed)

        return {"status": f"Document: '{uploaded_file_path}' ingested successfully"}
    except Exception as e:
        print(f"Error in ingestion pipeline: {e}")
        update_document_metadata_service(db_session, id, DocumentStatus.failed, total_pages, total_chunks)
        raise