from pydantic import BaseModel, ConfigDict, model_validator
from uuid import UUID
from datetime import datetime
from app.models.enums import SearchCategory


class BaseConfig(BaseModel):
    chunk_size: int
    chunk_overlap: int
    top_k: int
    search_category: SearchCategory
    reranker: bool
    temperature: float
    stream: bool

    @model_validator(mode='before')
    @classmethod
    def map_search_type(cls, data):
        if isinstance(data, dict):
            # Map search_type (frontend) to search_category (backend)
            if "search_type" in data and "search_category" not in data:
                st = data["search_type"]
                if st == "hybrid":
                    data["search_category"] = SearchCategory.Hybrid
                elif st == "vector":
                    data["search_category"] = SearchCategory.Semantic
                elif st == "bm25":
                    data["search_category"] = SearchCategory.Keyword
            
            if "search_category" not in data:
                data["search_category"] = SearchCategory.Semantic
        return data


class FetchConfig(BaseConfig):
    id: UUID
    is_active: bool
    created_at: datetime
    search_type: str = "hybrid"

    @model_validator(mode='before')
    @classmethod
    def set_search_type(cls, data):
        # Retrieve search_category from model attribute or dictionary
        sc = None
        if hasattr(data, "search_category"):
            sc = getattr(data, "search_category")
        elif isinstance(data, dict) and "search_category" in data:
            sc = data.get("search_category")
            
        if sc is not None:
            if hasattr(sc, "value"):
                sc = sc.value
            
            st = "hybrid"
            if sc == "Semantic":
                st = "vector"
            elif sc == "Keyword":
                st = "bm25"
            elif sc == "Hybrid":
                st = "hybrid"

            if isinstance(data, dict):
                data["search_type"] = st
            else:
                setattr(data, "search_type", st)
        return data

    model_config = ConfigDict(from_attributes=True)