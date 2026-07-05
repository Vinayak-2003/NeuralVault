from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from app.schemas.setting_schema import SearchCategory

class SettingBase(BaseModel):
    chunk_size: int
    chunk_overlap: int
    top_k: int
    search_category: SearchCategory = SearchCategory.Hybrid
    reranker: bool = False
    temperature: float = 0.2
    stream: bool = False

class SettingCreate(SettingBase):
    pass

class SettingResponse(SettingBase):
    id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
