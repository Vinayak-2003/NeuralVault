from sqlalchemy import Column, Integer, Boolean, Float, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
import enum
from app.db.database import Base

class SearchCategory(enum.Enum):
    Semantic = "Semantic"
    Keyword = "Keyword"
    Hybrid = "Hybrid"

class Setting(Base):
    __tablename__ = "settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    chunk_size = Column(Integer, nullable=False, default=512)
    chunk_overlap = Column(Integer, nullable=False, default=50)
    top_k = Column(Integer, nullable=False, default=5)
    search_category = Column(Enum(SearchCategory), nullable=False, default=SearchCategory.Hybrid)
    reranker = Column(Boolean, nullable=False, default=False)
    temperature = Column(Float, nullable=False, default=0.2)
    stream = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
