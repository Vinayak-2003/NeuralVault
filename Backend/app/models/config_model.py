from pydantic import BaseModel, AwareDatetime, ConfigDict
from uuid import UUID
from enum import Enum

class SearchCategory(str, Enum):
    Hybrid = "Hybrid"
    Semantic = "Semantic"
    Keyword = "Keyword"


class BaseConfig(BaseModel):
    top_k: int
    search_category: SearchCategory
    reranker: bool
    temperature: float
    stream: bool
    is_active: bool
    created_at: AwareDatetime

class FetchConfig(BaseConfig):
    id: UUID

    model_config = ConfigDict(from_attributes=True)