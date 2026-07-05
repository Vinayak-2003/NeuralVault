from pydantic import BaseModel, AwareDatetime, ConfigDict
from uuid import UUID
from app.models.enums import DocumentStatus

class DocumentModel(BaseModel):
    id: UUID
    doc_id: UUID
    job_id: UUID
    file_name: str
    file_path: str
    file_size_mb: float
    total_pages: int
    total_chunks: int
    status: DocumentStatus
    uploaded_at: AwareDatetime

    model_config = ConfigDict(from_attributes=True)
