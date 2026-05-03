from pydantic import BaseModel, AwareDatetime, ConfigDict
from uuid import UUID
import enum

class DocumentStatus(enum.Enum):
    pending = "pending"
    processing = "processing"
    splitted = "splitted"
    chunked = "chunked"
    indexed = "indexed"
    failed = "failed"

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
