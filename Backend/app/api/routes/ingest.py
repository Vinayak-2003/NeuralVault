import uuid

from fastapi import APIRouter, HTTPException, status, UploadFile, BackgroundTasks, Depends
from uuid import uuid4
from sqlalchemy.orm import Session
from typing import Annotated

from app.services.ingestion_service import document_ingestion, ingestion_status
from app.db.database import get_db_session

router = APIRouter(
    prefix="/ingest",
    tags=["Ingest"]
)


@router.post("/")
async def ingest_document(document: UploadFile, background_task: BackgroundTasks, db: Annotated[Session, Depends(get_db_session)]):
    try:
        job_id = uuid4()
        background_task.add_task(document_ingestion, document=document, job_id=job_id)
        return {"job_id": str(job_id),
                "message": "Document ingestion started in the background."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error occurred while ingesting document: {e}"
        )


@router.get("/status/{job_id}")
async def get_ingestion_status(job_id: str, db: Annotated[Session, Depends(get_db_session)]):
    return await ingestion_status(job_id=job_id, db_session=db)