# 🏗️ Strategy Pattern: Swappable Vector Store Design

> **Purpose:** Understand why switching from Chroma to Qdrant was painful, and how to structure the code so you NEVER face this problem again — for vector stores, LLMs, embeddings, or any other component.

---

## The Problem You Faced

When you switched from ChromaDB to Qdrant, you had to touch **every file** that referenced the vector store:

```
Files you had to modify when switching Chroma → Qdrant:
  ❌ app/utils/chroma_client.py        → created qdrant_client.py (new file)
  ❌ app/rag/ingestion_pipeline.py     → changed import from chroma to qdrant (line 1, 5)
  ❌ app/rag/retrieval_pipeline.py     → changed import from chroma to qdrant (line 2)
  ❌ app/services/document_service.py  → FORGOT to update (still imports chroma_client!)
  ❌ Comments still say "Chroma" everywhere (lines 79, 81, 85, 89 in ingestion)
```

And you **still have leftover Chroma references** in your code right now:

| File | Line | The Problem |
|------|------|-------------|
| `ingestion_pipeline.py` | L1 | `from langchain_chroma import Chroma` — unused import |
| `ingestion_pipeline.py` | L79 | Comment: `# add chunks to the chroma db` |
| `ingestion_pipeline.py` | L81 | Print: `adding chunks to chroma db` |
| `ingestion_pipeline.py` | L85 | Print: `Chunks added to Chroma database` |
| `retrieval_pipeline.py` | L18 | Print: `Error fetching from Chroma DB` |
| `document_service.py` | L4 | `from app.utils.chroma_client import create_chroma_client` |
| `document_service.py` | L33 | `chroma_db = create_chroma_client(...)` — **active bug!** |
| `pyproject.toml` | L14 | `langchain-chroma>=1.1.0` — unused dependency |
| `requirements.txt` | L6 | `langchain-chroma>=1.1.0` — unused dependency |

**This is exactly the problem design patterns solve.** If your code depended on an *abstraction* instead of a *concrete implementation*, switching would've been a **one-line config change**.

---

## The Pattern: Strategy + Dependency Injection

The design pattern you were recommended is a combination of:

1. **Strategy Pattern** — Define a common interface, swap implementations
2. **Dependency Injection (DI)** — Don't create dependencies inside functions, receive them from outside
3. **Dependency Inversion Principle (DIP)** — High-level modules shouldn't depend on low-level modules; both should depend on abstractions

### The Concept Visually

```
❌ YOUR CURRENT CODE (Tight Coupling):

  ingestion_pipeline.py ──────► qdrant_client.py ──────► Qdrant Cloud
  retrieval_pipeline.py ──────► qdrant_client.py ──────► Qdrant Cloud
  document_service.py ─────────► chroma_client.py ─────► ChromaDB (💥 BROKEN)

  To switch: change EVERY file that imports the client


✅ WITH STRATEGY PATTERN (Loose Coupling):

  ingestion_pipeline.py ──┐
  retrieval_pipeline.py ──┼──► VectorStoreInterface ◄──┬── QdrantStore
  document_service.py ────┘        (abstract)          ├── ChromaStore
                                                        └── PineconeStore (future)

  To switch: change ONE line in a factory or config
```

---

## How to Implement It — Step by Step

### Step 1: Define the Abstract Interface

```python
# app/utils/vector_store/base.py

from abc import ABC, abstractmethod
from langchain_core.documents import Document
from typing import List


class VectorStoreBase(ABC):
    """
    Abstract interface for all vector store implementations.
    
    Any new vector store (Chroma, Qdrant, Pinecone, Weaviate, etc.)
    must implement these methods. The rest of the app only talks
    to this interface — never to a specific implementation.
    """

    @abstractmethod
    def add_documents(self, documents: List[Document]) -> None:
        """Store document chunks with embeddings."""
        ...

    @abstractmethod
    def similarity_search(self, query: str, k: int = 5) -> List[Document]:
        """Retrieve the top-k most similar documents."""
        ...

    @abstractmethod
    def delete_by_doc_id(self, doc_id: str) -> bool:
        """Delete all chunks belonging to a specific document."""
        ...

    @abstractmethod
    def as_retriever(self, **kwargs):
        """Return a LangChain-compatible Retriever for use in LCEL chains."""
        ...
```

### Step 2: Implement Concrete Strategies

```python
# app/utils/vector_store/qdrant_store.py

from langchain_qdrant import QdrantVectorStore, RetrievalMode, FastEmbedSparse
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, VectorParams, SparseVectorParams
from langchain_core.documents import Document
from typing import List

from app.utils.vector_store.base import VectorStoreBase
from app.utils.embeddings import create_embeddings
from app.core.config import settings


class QdrantStore(VectorStoreBase):
    """Qdrant Cloud implementation of the vector store interface."""

    def __init__(self):
        self._sparse_embeddings = FastEmbedSparse(model_name=settings.QDRANT_SPARSE_EMBEDDING)
        self._client = QdrantClient(
            url=settings.QDRANT_CLUSTER_ENDPOINT,
            api_key=settings.QDRANT_DB_API_KEY,
        )
        self._ensure_collection_exists()
        self._store = QdrantVectorStore(
            client=self._client,
            collection_name=settings.QDRANT_COLLECTION_NAME,
            embedding=create_embeddings(),
            retrieval_mode=RetrievalMode.HYBRID,
            sparse_embedding=self._sparse_embeddings,
            vector_name=settings.QDRANT_DENSE_VECTOR_NAME,
            sparse_vector_name=settings.QDRANT_SPARSE_VECTOR_NAME,
        )

    def _ensure_collection_exists(self):
        if not self._client.collection_exists(settings.QDRANT_COLLECTION_NAME):
            self._client.create_collection(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                vectors_config={
                    settings.QDRANT_DENSE_VECTOR_NAME: VectorParams(
                        size=384, distance=Distance.COSINE
                    )
                },
                sparse_vectors_config={
                    settings.QDRANT_SPARSE_VECTOR_NAME: SparseVectorParams(
                        index=models.SparseIndexParams(on_disk=False)
                    )
                },
            )

    def add_documents(self, documents: List[Document]) -> None:
        self._store.add_documents(documents=documents)

    def similarity_search(self, query: str, k: int = 5) -> List[Document]:
        return self._store.similarity_search(query, k=k)

    def delete_by_doc_id(self, doc_id: str) -> bool:
        # Qdrant-specific deletion by metadata filter
        self._client.delete(
            collection_name=settings.QDRANT_COLLECTION_NAME,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[models.FieldCondition(
                        key="metadata.id",
                        match=models.MatchValue(value=doc_id)
                    )]
                )
            )
        )
        return True

    def as_retriever(self, **kwargs):
        return self._store.as_retriever(**kwargs)
```

```python
# app/utils/vector_store/chroma_store.py

from langchain_chroma import Chroma
from langchain_core.documents import Document
from typing import List
import os

from app.utils.vector_store.base import VectorStoreBase
from app.utils.embeddings import create_embeddings
from app.core.config import settings


class ChromaStore(VectorStoreBase):
    """ChromaDB implementation of the vector store interface."""

    def __init__(self):
        db_path = settings.chroma_db_path
        if not os.path.exists(db_path):
            os.makedirs(db_path, exist_ok=True)

        self._store = Chroma(
            embedding_function=create_embeddings(),
            persist_directory=db_path,
            collection_metadata={"hnsw:space": "cosine"},
        )

    def add_documents(self, documents: List[Document]) -> None:
        self._store.add_documents(documents=documents)

    def similarity_search(self, query: str, k: int = 5) -> List[Document]:
        return self._store.similarity_search(query, k=k)

    def delete_by_doc_id(self, doc_id: str) -> bool:
        self._store._collection.delete(where={"id": doc_id})
        return True

    def as_retriever(self, **kwargs):
        return self._store.as_retriever(**kwargs)
```

### Step 3: Factory to Choose the Right One

```python
# app/utils/vector_store/factory.py

from functools import lru_cache
from app.utils.vector_store.base import VectorStoreBase
from app.core.config import settings


@lru_cache(maxsize=1)  # ← SINGLETON: created once, reused everywhere
def get_vector_store() -> VectorStoreBase:
    """
    Factory function that returns the configured vector store.
    
    Change VECTOR_STORE_PROVIDER in .env to switch implementations.
    The rest of the codebase doesn't need to change.
    """
    provider = getattr(settings, "VECTOR_STORE_PROVIDER", "qdrant").lower()

    if provider == "qdrant":
        from app.utils.vector_store.qdrant_store import QdrantStore
        return QdrantStore()
    
    elif provider == "chroma":
        from app.utils.vector_store.chroma_store import ChromaStore
        return ChromaStore()
    
    else:
        raise ValueError(f"Unknown vector store provider: {provider}")
```

### Step 4: Add Config Setting

```python
# In app/core/config.py, add one line:

class Settings(BaseSettings):
    # ... existing settings ...
    
    VECTOR_STORE_PROVIDER: str = "qdrant"  # Options: "qdrant", "chroma"
```

```bash
# In .env, add:
VECTOR_STORE_PROVIDER=qdrant
```

### Step 5: Use It Everywhere (The Payoff)

```python
# app/rag/ingestion_pipeline.py — BEFORE vs AFTER

# ❌ BEFORE (tight coupling):
from app.utils.qdrant_client import qdrant_client     # hardcoded to Qdrant

def add_chunks_to_vector_db(chunks):
    vector_db = qdrant_client()                        # creates new instance every call
    vector_db.add_documents(documents=chunks)


# ✅ AFTER (loose coupling):
from app.utils.vector_store.factory import get_vector_store  # depends on abstraction

def add_chunks_to_vector_db(chunks):
    vector_store = get_vector_store()                  # singleton, provider from config
    vector_store.add_documents(documents=chunks)
```

```python
# app/rag/retrieval_pipeline.py — BEFORE vs AFTER

# ❌ BEFORE:
from app.utils.qdrant_client import qdrant_client

def hybrid_retriever(query: str):
    qdrant_db = qdrant_client()                        # new connection per call!
    results = qdrant_db.similarity_search(query)
    return "\n\n".join([doc.page_content for doc in results])


# ✅ AFTER:
from app.utils.vector_store.factory import get_vector_store

def hybrid_retriever(query: str, top_k: int = 5):
    vector_store = get_vector_store()                  # cached singleton
    results = vector_store.similarity_search(query, k=top_k)
    return "\n\n".join([doc.page_content for doc in results])
```

```python
# app/services/document_service.py — BEFORE vs AFTER

# ❌ BEFORE (BROKEN — still uses chroma):
from app.utils.chroma_client import create_chroma_client

def delete_document_id(db_session, doc_id):
    chroma_db = create_chroma_client(settings.vector_db_path)  # 💥 crashes
    chroma_db._collection.delete(where={"id": str(doc_id)})    # private API


# ✅ AFTER (works with ANY provider):
from app.utils.vector_store.factory import get_vector_store

def delete_document_id(db_session, doc_id):
    vector_store = get_vector_store()
    vector_store.delete_by_doc_id(doc_id)              # clean public API
```

---

## The New Folder Structure

```
app/utils/
├── vector_store/              # ← NEW folder
│   ├── __init__.py
│   ├── base.py                #   Abstract interface (VectorStoreBase)
│   ├── qdrant_store.py        #   Qdrant implementation
│   ├── chroma_store.py        #   ChromaDB implementation
│   └── factory.py             #   Factory + singleton (get_vector_store)
├── embeddings.py              #   HuggingFace embedding factory (keep)
└── save_file.py               #   File upload handler (keep)

# DELETE these:
├── chroma_client.py           #   ❌ Replaced by chroma_store.py
└── qdrant_client.py           #   ❌ Replaced by qdrant_store.py
```

---

## Now Switching is ONE Line

```bash
# .env — Switch to ChromaDB:
VECTOR_STORE_PROVIDER=chroma

# .env — Switch to Qdrant:
VECTOR_STORE_PROVIDER=qdrant

# .env — In the future, add Pinecone:
VECTOR_STORE_PROVIDER=pinecone
```

**Zero code changes.** Just restart the server.

---

## Apply the Same Pattern to Other Swappable Components

This isn't just for vector stores. The same problem exists for:

| Component | Current Code | Problem | Strategy Solution |
|-----------|-------------|---------|-------------------|
| **Vector Store** | `qdrant_client()` hardcoded | Can't switch without editing 3+ files | `VectorStoreBase` + factory |
| **LLM Provider** | `ChatGroq()` hardcoded in `llm_service.py` | Can't switch to Gemini/OpenAI | `LLMProviderBase` + factory |
| **Embedding Model** | `HuggingFaceEmbeddings("BAAI/bge-small-en")` hardcoded | Can't switch models | `EmbeddingProviderBase` + factory |
| **Document Loader** | `PyPDFLoader` hardcoded | Can't support DOCX, TXT | `DocumentLoaderBase` + factory by file extension |

### Example: LLM Provider Strategy

```python
# app/utils/llm/base.py
from abc import ABC, abstractmethod

class LLMProviderBase(ABC):
    @abstractmethod
    def generate(self, messages: list, temperature: float) -> str: ...

    @abstractmethod
    def stream(self, messages: list, temperature: float): ...


# app/utils/llm/groq_provider.py
class GroqProvider(LLMProviderBase):
    def generate(self, messages, temperature):
        model = ChatGroq(model=settings.groq_chat_model, temperature=temperature)
        return model.invoke(messages).content


# app/utils/llm/gemini_provider.py
class GeminiProvider(LLMProviderBase):
    def generate(self, messages, temperature):
        model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=temperature)
        return model.invoke(messages).content


# Switch via config:
LLM_PROVIDER=groq    # or gemini, or openai
```

---

## Why This Matters for Your Resume

This pattern demonstrates understanding of:

- **SOLID Principles** — specifically the **O** (Open/Closed) and **D** (Dependency Inversion)
- **Strategy Pattern** — one of the Gang of Four design patterns
- **Clean Architecture** — business logic doesn't depend on infrastructure
- **Testability** — you can inject a `MockVectorStore` in tests

### Resume bullet point:
> *"Designed a pluggable RAG pipeline using the Strategy Pattern with abstract interfaces for vector stores, LLM providers, and embedding models — enabling provider switching (Qdrant ↔ ChromaDB ↔ Pinecone) via environment configuration with zero code changes."*

---

## Quick Decision Chart

```
"Should I use an abstract interface for this component?"

  Is there more than one possible implementation?
    │
    ├─ YES (Qdrant vs Chroma, Groq vs Gemini) → ✅ Use Strategy Pattern
    │
    └─ NO (only ever one way to do it)
        │
        Could there be in the future?
        │
        ├─ YES → ✅ Use Strategy Pattern (future-proof)
        └─ NO  → ❌ Direct usage is fine (e.g., PyPDFLoader for PDFs)
```
