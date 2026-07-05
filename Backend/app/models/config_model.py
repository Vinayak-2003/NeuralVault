from sqlalchemy import Column, String, Integer, Enum, Boolean, Float, DateTime, func, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from app.db.database import Base
from .enums import SearchCategory


class RAGConfig(Base):
    __tablename__ = "rag_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    chunk_size = Column(Integer, nullable=False, default=1000)
    chunk_overlap = Column(Integer, nullable=False, default=200)
    top_k = Column(Integer, nullable=False, default=5)
    search_category = Column(Enum(SearchCategory), nullable=False, default=SearchCategory.Semantic)
    reranker = Column(Boolean, nullable=False, default=False)
    temperature = Column(Float, nullable=False, default=0.2)
    stream = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint('top_k > 0', name='check_top_k_positive'),
        CheckConstraint('temperature >= 0.0', name='check_temperature_non_negative'),
        CheckConstraint('temperature <= 1.0', name='check_temperature_max'),
    )
