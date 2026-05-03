from sqlalchemy import Column, String, Integer, Float, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
import enum

from app.db.database import Base

class DocumentStatus(enum.Enum):
    pending = "pending"
    processing = "processing"
    splitted = "splitted"
    chunked = "chunked"
    indexed = "indexed"
    failed = "failed"


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    doc_id = Column(UUID(as_uuid=True), nullable=False)
    job_id = Column(UUID(as_uuid=True), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size_mb = Column(Float, nullable=False)
    total_pages = Column(Integer, nullable=True)
    total_chunks = Column(Integer, nullable=True)
    status = Column(Enum(DocumentStatus), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
