from fastapi import APIRouter, Depends
from app.models.query_model import QueryModel
from sqlalchemy.orm import Session
from typing import Annotated

from app.services.retrieval_service import document_retrieval_output_generation
from app.db.database import get_db_session

router = APIRouter(
    prefix="/query",
    tags=["Query"]
)


@router.post("/")
def execute_query(query: QueryModel, db: Annotated[Session, Depends(get_db_session)]):
    try:
        response = document_retrieval_output_generation(query=query.query, db=db)
        return {"answer": response}
    except Exception as e:
        return {"error": f"An error occurred while processing the query: {e}"}
    