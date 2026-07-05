from pydantic import BaseModel

class QueryModel(BaseModel):
    query: str
    top_k: int
    doc_filter: str | None