from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Annotated

from app.db.database import get_db_session

from app.services.document_service import all_documents, delete_document_id

router = APIRouter(
    prefix="/documents",
    tags=["Document"]
)

@router.get("/")
async def get_all_documents(db: Annotated[Session, Depends(get_db_session)]):
    return all_documents(db)


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, db: Annotated[Session, Depends(get_db_session)]):
    success = delete_document_id(db, doc_id)
    if success:
        return {"message": "Document deleted successfully"}
    else:
        return {"message": "Document not found"}, 404
    