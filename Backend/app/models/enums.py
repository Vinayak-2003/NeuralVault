import enum

class SearchCategory(enum.Enum):
    Hybrid = "Hybrid"
    Semantic = "Semantic"
    Keyword = "Keyword"

class DocumentStatus(enum.Enum):
    pending = "pending"
    processing = "processing"
    splitted = "splitted"
    chunked = "chunked"
    indexed = "indexed"
    failed = "failed"