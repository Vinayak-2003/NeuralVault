from fastapi import UploadFile
from uuid import UUID

from sqlalchemy import select
import asyncio

from app.utils.save_file import store_file
from app.rag.ingestion_pipeline import ingestion_pipeline

from app.schemas.document_schema import Document, DocumentStatus


async def document_ingestion(document: UploadFile, job_id: UUID, db):
    try:
        filename = document.filename

        # Step 1: Store file in doc directory
        store_file_response = await store_file(document=document)
        print("File Stored for further processing")

        file_path = store_file_response.get("path")

        await asyncio.to_thread(
            ingestion_pipeline, 
            uploaded_file_path=file_path, 
            job_id=job_id,
            db_session=db
        )

        print("Ingestion pipeline completed.")

        return {"status": "Ingestion completed successfully", "file_path": file_path}
    except Exception as e:
        print(f"Error in document ingestion: {e}")
        return {"status": "Ingestion failed", "error": str(e)}


async def ingestion_status(job_id: UUID, db_session):
    try:
        document_status = db_session.execute(select(Document.status).filter(Document.job_id == job_id))
        status = document_status.scalar_one_or_none()
        print(f"Fetched document status of type {type(document_status)} from DB: {document_status}")
        
        # Convert Enum to string
        if status is not None:
            status = status.value

        print(f"Fetched document status: {status}")

        if not status:
            return {"status": "pending", "progress": 0}
        
        document_status_map = {
            "pending": 0,
            "processing": 10,
            "splitted": 40,
            "chunked": 70,
            "indexed": 100,
            "failed": 0
        }

        print(f"Returning ingestion status for job_id {job_id}: {status} with progress {document_status_map.get(status, 0)}%")

        return {"status": status, "progress": document_status_map.get(status, 0)}
    except Exception as e:
        print(f"Error fetching ingestion status: {e}")
        raise e