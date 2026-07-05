# 🔴 NeuralVault Backend — Production Readiness Audit

> **Generated:** 2026-06-15 | **Purpose:** Comprehensive code quality review with actionable improvements.
> **Verdict:** The codebase demonstrates strong RAG fundamentals but has several **critical bugs**, **architectural inconsistencies**, and **missing production essentials** that would prevent deployment to production.

---

## Table of Contents

- [Executive Summary & Scorecard](#executive-summary--scorecard)
- [🔴 Critical Bugs (Must Fix)](#-critical-bugs-must-fix)
- [🟠 Architecture Issues](#-architecture-issues)
- [🟡 Code Quality Issues](#-code-quality-issues)
- [🟢 What's Done Well](#-whats-done-well)
- [Missing Production Essentials](#missing-production-essentials)
- [Recommended Architecture Pattern](#recommended-architecture-pattern)
- [Recommended Folder Structure](#recommended-folder-structure)
- [File-by-File Review](#file-by-file-review)
- [Dependency Audit](#dependency-audit)
- [Resume Talking Points](#resume-talking-points)

---

## Executive Summary & Scorecard

| Category               | Score  | Status |
|------------------------|--------|--------|
| Functionality          | 6/10   | 🟡 Core flow works but multiple runtime bugs |
| Architecture           | 5/10   | 🟠 Layer separation attempted but confused naming |
| Error Handling         | 3/10   | 🔴 Bare except blocks, no custom exceptions |
| Security               | 3/10   | 🔴 No auth, file upload unvalidated, pickle deserialization |
| Testing                | 0/10   | 🔴 Zero tests |
| Logging                | 2/10   | 🔴 All print() statements, no structured logging |
| Documentation          | 8/10   | 🟢 Excellent README |
| Type Safety            | 5/10   | 🟡 Some type hints, inconsistent |
| Configuration          | 4/10   | 🟠 Settings class exists but instantiated 11 times |
| Database               | 5/10   | 🟡 Alembic present but session management issues |
| **Overall**            | **4.1/10** | **🟠 Needs significant work for production** |

---

## 🔴 Critical Bugs (Must Fix)

### BUG-1: Root endpoint decorator missing `@`

**File:** `main.py:47`

```python
# ❌ Current — this is a function CALL, not a decorator
app.get("/")
def root():
    return {"message": "Welcome to MyKnowledgeRAG API!"}

# ✅ Fix
@app.get("/")
def root():
    return {"message": "Welcome to MyKnowledgeRAG API!"}
```

**Impact:** The root endpoint `/` never registers. `app.get("/")` is called and its return value is discarded. `root()` is never reachable via HTTP.

---

### BUG-2: POST /config/ ignores request body

**File:** `app/api/routes/config.py:20-22`

```python
# ❌ Current — config_data is received but NEVER passed
@router.post("/")
def create_setting(config_data: BaseConfig, db: ...):
    return create_config(db)  # ← config_data silently dropped!

# ✅ Fix
@router.post("/")
def create_setting(config_data: BaseConfig, db: ...):
    return create_config(config_data, db)  # ← pass config_data
```

**Impact:** Every POST /config/ call will crash because `create_config()` in the service expects `config_data` as the first argument, but receives the db session instead.

---

### BUG-3: DELETE endpoint returns tuple instead of HTTPException

**File:** `app/api/routes/document.py:19-25`

```python
# ❌ Current — FastAPI ignores the 404 in the tuple
@router.delete("/{doc_id}")
async def delete_document(doc_id: str, db: ...):
    success = delete_document_id(db, doc_id)
    if success:
        return {"message": "Document deleted successfully"}
    else:
        return {"message": "Document not found"}, 404  # ← Returns 200 with a tuple!

# ✅ Fix
from fastapi import HTTPException
@router.delete("/{doc_id}")
async def delete_document(doc_id: str, db: ...):
    success = delete_document_id(db, doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}
```

**Impact:** Client always receives HTTP 200, even when document is not found. The response body becomes a 2-element array `[{...}, 404]`.

---

### BUG-4: `settings.vector_db_path` doesn't exist

**File:** `app/services/document_service.py:33`

```python
# ❌ Current — AttributeError at runtime
chroma_db = create_chroma_client(settings.vector_db_path)

# ✅ Fix — the field is named `chroma_db_path` in Settings
chroma_db = create_chroma_client(settings.chroma_db_path)
```

**Impact:** Every DELETE /documents/{id} call crashes with `AttributeError: 'Settings' object has no attribute 'vector_db_path'`.

---

### BUG-5: `create_chroma_client()` called with wrong signature

**File:** `app/services/document_service.py:33` + `app/utils/chroma_client.py:8`

```python
# chroma_client.py defines:
def create_chroma_client():     # ← takes 0 arguments

# document_service.py calls:
create_chroma_client(settings.vector_db_path)  # ← passes 1 argument
```

**Impact:** Even after fixing BUG-4, this will crash with `TypeError: create_chroma_client() takes 0 positional arguments but 1 was given`.

---

### BUG-6: `setting.py` uses async session operations with sync session

**File:** `app/api/routes/setting.py:17-52`

```python
# ❌ Uses `await db.execute()` and `await db.commit()` 
# but get_db_session() returns a SYNC Session, not AsyncSession
result = await db.execute(query)     # ← RuntimeError
await db.commit()                    # ← RuntimeError
await db.refresh(new_setting)        # ← RuntimeError
```

**Impact:** This entire route file will crash at runtime. However, it appears to be dead code (the `config.py` route already handles `/config/`).

---

### BUG-7: Duplicate `/config` route prefix

**Files:** `app/api/routes/config.py` and `app/api/routes/setting.py`

Both files register routes under `/config` prefix. In `main.py`, only `config.py` is imported as `setting_router`, but `setting.py` also has `prefix="/config"`. If both were registered, FastAPI would have conflicting route handlers.

---

### BUG-8: Background task uses yielded DB session

**File:** `app/api/routes/ingest.py:18-21`

```python
@router.post("/")
async def ingest_document(document: UploadFile, background_task: BackgroundTasks, db: ...):
    background_task.add_task(document_ingestion, document=document, job_id=job_id, db=db)
```

**Problem:** The `db` session is created by `get_db_session()` which is a generator. When the response is sent, FastAPI's dependency cleanup calls `db.close()`. The background task then tries to use a **closed session**.

**Impact:** All database operations in the background ingestion task may fail with `Session is closed` errors.

---

### BUG-9: `metadata_service.py` closes session prematurely

**File:** `app/services/metadata_service.py:42, 78`

```python
# Called multiple times during ingestion pipeline:
def document_metadata_service(db_session, ...):
    ...
    finally:
        db_session.close()  # ← Closes the shared session!

def update_document_metadata_service(db_session, ...):
    ...
    finally:
        db_session.close()  # ← Closes again!
```

**Impact:** After the first metadata call, all subsequent calls in the same pipeline execution will operate on a closed session. Combined with BUG-8, this creates cascading failures.

---

### BUG-10: Unbound variables in error handler

**File:** `app/rag/ingestion_pipeline.py:141`

```python
except Exception as e:
    update_document_metadata_service(db_session, id, DocumentStatus.failed, total_pages, total_chunks)
    # ← If error occurs BEFORE step 3, `total_pages` and `total_chunks` are undefined
    # ← Raises NameError, masking the original exception
```

---

## 🟠 Architecture Issues

### ARCH-1: Inverted `models/` and `schemas/` naming

The conventional FastAPI pattern is:
- **`models/`** = SQLAlchemy ORM models (database tables)
- **`schemas/`** = Pydantic models (request/response DTOs)

Your project has it **backwards**:
- `models/` contains Pydantic models
- `schemas/` contains SQLAlchemy ORM models

This will confuse any developer familiar with FastAPI conventions.

---

### ARCH-2: Settings instantiated 11 times

Every module does `settings = Settings()` at module level. This:
1. Reads and parses `.env` file 11 times on import
2. Creates 11 separate objects (no guarantee of consistency if env changes)
3. Violates the Singleton pattern

**Fix:** Import the singleton from `app/core/config.py`:
```python
from app.core.config import settings  # Already defined at module level
```

---

### ARCH-3: `SearchCategory` enum defined 3 times

The same enum exists in three separate files:
- `app/models/config_model.py:5-8`
- `app/schemas/config_schema.py:7-10`
- `app/models/setting_model.py:7-10`

**Fix:** Define once in a shared location, e.g., `app/models/enums.py`.

---

### ARCH-4: `DocumentStatus` enum defined 2 times

- `app/models/document_model.py:5-11`
- `app/schemas/document_schema.py:8-14`

---

### ARCH-5: Qdrant client created per-request

**File:** `app/rag/retrieval_pipeline.py:11` and `app/rag/ingestion_pipeline.py:83`

Every query/ingestion call creates a new:
1. `FastEmbedSparse` instance (loads BM25 model)
2. `QdrantClient` connection
3. Checks if collection exists
4. `QdrantVectorStore` wrapper
5. `HuggingFaceEmbeddings` instance (loads ML model)

This adds **seconds** of overhead per request.

**Fix:** Initialize once at startup, use dependency injection.

---

### ARCH-6: Mixed async/sync confusion

| File | Declared | Actually Uses |
|------|----------|---------------|
| `routes/document.py` | `async def` | sync `db.execute()` |
| `routes/ingest.py` | `async def` | sync session via `asyncio.to_thread` |
| `routes/query.py` | `def` (sync) | sync — ✅ correct |
| `routes/config.py` | `def` (sync) | sync — ✅ correct |
| `routes/setting.py` | `async def` | `await db.execute()` — 💥 crashes |
| `routes/health.py` | `async def` | no I/O — ✅ harmless |

---

### ARCH-7: Dead code and unused features

| Feature | Where Referenced | Actually Implemented |
|---------|-----------------|---------------------|
| `query.top_k` | `QueryModel` | ❌ Never used in retrieval |
| `query.doc_filter` | `QueryModel` | ❌ Never used |
| `config.search_category` | Config schema | ❌ Always does hybrid search |
| `config.reranker` | Config schema | ❌ No reranking logic exists |
| `config.stream` | Config schema | ❌ No streaming implementation |
| `setting.py` route | File exists | ❌ Never imported in main.py |
| `load_directory()` | ingestion_pipeline | ❌ Never called |
| `BM25RetrieverClass.bm25_retriever()` | bm25_retriever.py | ❌ Never called in retrieval |
| `BM25RetrieverClass` ingestion | ingestion_pipeline | ✅ Used for ingestion, ❌ NOT used in retrieval |
| ChromaDB references | README, comments | ❌ Code uses Qdrant, not Chroma |

---

### ARCH-8: BM25 ingested but never used for retrieval

The ingestion pipeline stores chunks in both Qdrant AND BM25 pickle. However, `retrieval_pipeline.py` **only queries Qdrant**. The BM25 retriever is built and stored but never queried at search time.

---

## 🟡 Code Quality Issues

### QC-1: All logging uses `print()` statements

```python
# Found throughout the codebase:
print("___________document loading_____________")
print("___________document splitting_____________")
print("___________adding chunks to chroma db_____________")
print(f"__________{fetch_doc}_____________")
```

**Fix:** Use Python's `logging` module with structured logging:
```python
import logging
logger = logging.getLogger(__name__)
logger.info("Document loading started", extra={"file_path": file_path})
```

---

### QC-2: No custom exception classes

Every error is caught with bare `except Exception as e` and re-raised. No domain-specific exceptions exist.

**Recommended exceptions:**
```python
class DocumentNotFoundError(Exception): ...
class IngestionError(Exception): ...
class ConfigurationError(Exception): ...
class VectorStoreError(Exception): ...
```

---

### QC-3: No input validation on file uploads

**File:** `app/utils/save_file.py`

```python
# ❌ No checks for:
# - File type (is it actually a PDF?)
# - File size limit
# - Filename sanitization (path traversal attack: "../../etc/passwd")
# - Duplicate filenames (overwrites existing)
```

---

### QC-4: No docstrings anywhere

Not a single function, class, or module has a docstring.

---

### QC-5: Hardcoded collection name in Qdrant

**File:** `app/utils/qdrant_client.py:23`
```python
# Uses config for the check but hardcodes during creation:
if not client.collection_exists(settings.QDRANT_COLLECTION_NAME):
    client.create_collection(
        collection_name="neural-vault-docs",  # ← hardcoded, should use settings
    )
```

---

### QC-6: Inconsistent status naming

```python
# "splitted" is not a real English word
DocumentStatus.splitted = "splitted"   # ← should be "split" or "chunking"
```

---

### QC-7: `.gitignore` is malformed

```
# Current .gitignore has issues:
.envapp/db/chroma_db/    # ← concatenated entries on one line
".env"                    # ← quotes don't belong in .gitignore
"app/db/chroma_db/"       # ← quotes don't belong
```

---

### QC-8: Pickle file is a security risk

**File:** `app/rag/bm25_retriever.py`

`pickle.load()` can execute arbitrary code. If the `.pkl` file is ever corrupted or tampered with, this is a remote code execution vulnerability.

**Fix:** Use JSON serialization or a proper database for BM25 storage.

---

### QC-9: No response models on most routes

Most routes return raw dicts or ORM objects without `response_model`, losing:
- Automatic validation
- OpenAPI documentation
- Consistent response format

---

## 🟢 What's Done Well

| Aspect | Details |
|--------|---------|
| **README** | Excellent, comprehensive README with architecture diagrams, API reference, setup instructions |
| **Background tasks** | Correct use of FastAPI `BackgroundTasks` for long-running ingestion |
| **Pydantic Settings** | Proper use of `pydantic-settings` for env var loading |
| **Alembic migrations** | Database schema versioning is in place with 7 migration scripts |
| **RAG design** | Good conceptual design — hybrid retrieval, metadata enrichment, status tracking |
| **Database constraints** | `CheckConstraint` on RAGConfig for validation (top_k > 0, temperature range) |
| **Project tooling** | Using `uv` for dependency management — modern and fast |
| **Separation of concerns** | Clear attempt to separate routes, services, and RAG pipeline |
| **Hybrid search intent** | Qdrant configured for hybrid (dense + sparse) retrieval |

---

## Missing Production Essentials

### Must-Have for Production

| Category | What's Missing | Priority |
|----------|---------------|----------|
| **Authentication** | No auth on any endpoint — anyone can upload, query, delete | 🔴 Critical |
| **Rate Limiting** | No rate limiting — vulnerable to abuse | 🔴 Critical |
| **Testing** | Zero unit tests, zero integration tests | 🔴 Critical |
| **Logging** | No structured logging, all `print()` | 🔴 Critical |
| **Error Handling** | No global exception handler, no custom exceptions | 🔴 Critical |
| **Input Validation** | File uploads not validated (type, size, name) | 🔴 Critical |
| **Health Check** | No actual dependency checks (DB, Qdrant connectivity) | 🟠 High |
| **HTTPS** | No TLS configuration | 🟠 High |
| **Pagination** | GET /documents returns all rows | 🟠 High |
| **Dockerfile** | Referenced in README but doesn't exist | 🟠 High |
| **CI/CD** | No GitHub Actions or pipeline config | 🟠 High |
| **Monitoring** | No metrics, no tracing, no alerting | 🟠 High |
| **API versioning** | No `/api/v1/` prefix | 🟡 Medium |
| **Request validation** | No request ID tracking | 🟡 Medium |
| **Caching** | No caching for repeated queries | 🟡 Medium |
| **File cleanup** | Uploaded PDFs never deleted from disk | 🟡 Medium |
| **Retry logic** | No retries on external API calls (Groq, Qdrant) | 🟡 Medium |
| **Graceful shutdown** | Lifespan only prints, doesn't close connections | 🟡 Medium |

---

## Recommended Architecture Pattern

### Current vs Recommended

```
CURRENT (confused naming):              RECOMMENDED (standard FastAPI):
├── models/     ← Pydantic DTOs         ├── models/     ← SQLAlchemy ORM
├── schemas/    ← SQLAlchemy ORM         ├── schemas/    ← Pydantic DTOs
└── (no enums/)                          ├── enums/      ← Shared enums
                                         └── exceptions/ ← Custom exceptions
```

### Recommended Clean Architecture

```
app/
├── api/
│   ├── dependencies.py         # Shared FastAPI dependencies (get_db, get_current_user)
│   ├── middleware/
│   │   ├── error_handler.py    # Global exception handler middleware
│   │   ├── request_id.py       # Request ID injection
│   │   └── auth.py             # Authentication middleware
│   └── v1/
│       └── routes/
│           ├── documents.py
│           ├── ingestion.py
│           ├── query.py
│           ├── config.py
│           └── health.py
│
├── core/
│   ├── config.py               # Pydantic Settings (singleton)
│   ├── logging.py              # Structured logging setup
│   ├── security.py             # Auth utilities
│   └── exceptions.py           # Custom exception classes
│
├── models/                     # SQLAlchemy ORM models
│   ├── base.py                 # Base = declarative_base()
│   ├── document.py
│   └── config.py
│
├── schemas/                    # Pydantic request/response DTOs
│   ├── document.py
│   ├── config.py
│   ├── query.py
│   └── common.py               # Shared response wrappers
│
├── services/                   # Business logic
│   ├── document_service.py
│   ├── ingestion_service.py
│   ├── retrieval_service.py
│   └── config_service.py
│
├── rag/                        # RAG-specific pipeline logic
│   ├── ingestion/
│   │   ├── loader.py
│   │   ├── splitter.py
│   │   └── enricher.py
│   ├── retrieval/
│   │   ├── hybrid_retriever.py
│   │   └── reranker.py
│   └── generation/
│       ├── llm_client.py
│       └── prompt_templates.py
│
├── db/
│   ├── session.py              # Engine + session factory
│   └── migrations/             # Alembic versions
│
├── repositories/               # Data access layer (optional)
│   ├── document_repo.py
│   └── config_repo.py
│
└── utils/
    ├── vector_store.py         # Qdrant client (singleton)
    ├── embeddings.py           # Embedding model factory
    └── file_handler.py         # File I/O with validation
```

---

## Recommended Folder Structure

```
Backend/
├── .docs/                      # Project documentation (gitignored)
├── .github/
│   └── workflows/
│       ├── ci.yml              # Linting + tests on PR
│       └── deploy.yml          # Deploy to cloud
├── tests/
│   ├── conftest.py             # Shared fixtures
│   ├── unit/
│   │   ├── test_ingestion.py
│   │   ├── test_retrieval.py
│   │   └── test_config.py
│   └── integration/
│       ├── test_api_documents.py
│       └── test_api_query.py
├── app/
│   └── (see architecture above)
├── main.py
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

## File-by-File Review

### `main.py`
| Aspect | Assessment |
|--------|-----------|
| Router registration | ✅ Clean, organized |
| CORS middleware | ✅ Properly configured |
| Lifespan handler | 🟡 Only initializes DB, should also init Qdrant, embeddings |
| Root endpoint | 🔴 Missing `@` decorator (BUG-1) |
| Unused import | 🟡 `get_db_session` imported but not used in main.py |

### `app/core/config.py`
| Aspect | Assessment |
|--------|-----------|
| Pydantic Settings | ✅ Proper usage |
| All env vars typed | ✅ Good |
| Neon DB fields | 🟡 Should be Optional for local dev |
| ALLOWED_ORIGINS | 🟡 Hardcoded production URL as default |
| Qdrant settings | ✅ Good, with defaults |

### `app/db/database.py`
| Aspect | Assessment |
|--------|-----------|
| Engine init | ✅ Pool size configured |
| Global mutable state | 🟠 `engine, async_session_factory = None, None` but `async_session_factory` never used |
| `init_db()` uses `global session_factory` | 🟠 `session_factory` not declared in globals line (declares `async_session_factory`) |
| Hardcoded to Neon DB | 🟡 `local_pgsql_db_url()` defined but never called |
| `echo=True` | 🔴 SQL queries logged to stdout in production |

### `app/utils/qdrant_client.py`
| Aspect | Assessment |
|--------|-----------|
| Hybrid setup | ✅ Dense + sparse vectors configured |
| Collection auto-creation | ✅ Good defensive coding |
| No connection pooling | 🟠 New client per call |
| Hardcoded collection name | 🟡 Line 23 vs settings |
| Hardcoded vector size 384 | 🟡 Should match embedding model |

### `app/rag/ingestion_pipeline.py`
| Aspect | Assessment |
|--------|-----------|
| Pipeline stages | ✅ Well-structured sequential flow |
| Status tracking | ✅ Good granular status updates |
| Error handling | 🔴 Unbound variables in except block (BUG-10) |
| No transaction management | 🟠 Each metadata update is a separate commit |
| Unused `load_directory()` | 🟡 Dead code |

### `app/rag/llm_service.py`
| Aspect | Assessment |
|--------|-----------|
| Prompt template | ✅ Clear, strict QA instructions |
| ChatGroq usage | ✅ Correct |
| Unused AIMessage append | 🟡 Memory management for multi-turn not implemented |
| No token counting | 🟡 Context might exceed model limits |
| Error returns string | 🟠 Should raise, not return error string |

### `app/rag/bm25_retriever.py`
| Aspect | Assessment |
|--------|-----------|
| Pickle persistence | 🔴 Security risk |
| Class design | ✅ Clean API |
| Thread safety | 🟠 No locking for concurrent pickle writes |
| Never used in retrieval | 🔴 Ingested but wasted (ARCH-8) |

### `app/services/metadata_service.py`
| Aspect | Assessment |
|--------|-----------|
| CRUD operations | ✅ Proper SQLAlchemy usage |
| Session close in finally | 🔴 Premature session closure (BUG-9) |
| Rollback on error | ✅ Good |

---

## Dependency Audit

| Package | Used For | Issue |
|---------|----------|-------|
| `langchain-chroma` | ChromaDB integration | 🔴 **Unused** — code uses Qdrant now |
| `langchain-classic` | Legacy LangChain | 🟡 May be unnecessary |
| `langchain-google-genai` | Gemini embeddings | 🟡 **Unused** — code uses HuggingFace BGE |
| `fastembed` | Sparse embeddings | ✅ Used via Qdrant |
| `asyncpg` | Async PostgreSQL | 🔴 **Unused** — sync `psycopg2` is used |
| `sentence-transformers` | HuggingFace models | ✅ Used via embeddings.py |
| `gunicorn` | Production WSGI | ✅ Good for production |
| `langchain-qdrant` | Qdrant integration | ✅ Actively used |
| `python-multipart` | File uploads | ✅ Required by FastAPI |

### Missing Dependencies

| Package | Why Needed |
|---------|-----------|
| `uvicorn[standard]` | ASGI server (currently installed via langchain deps) |
| `python-dotenv` | Explicit .env loading (pydantic-settings handles this) |
| `httpx` | Async HTTP client for health checks |
| `pytest`, `pytest-asyncio` | Testing framework |
| `ruff` or `black` | Code formatting |
| `mypy` | Type checking |

---

## Resume Talking Points

> Use these bullet points to describe this project on your resume and in interviews.

### Strong Points to Highlight

1. **"Built a production RAG backend with hybrid retrieval (dense + sparse) using FastAPI, Qdrant, and LangChain"** — demonstrates understanding of modern IR techniques

2. **"Implemented background document processing pipeline with real-time status tracking via job IDs"** — shows async architecture knowledge

3. **"Designed database schema with Alembic migrations for document metadata and configuration versioning"** — shows database management skills

4. **"Used Pydantic Settings for type-safe environment configuration with validation"** — shows best practices awareness

5. **"Integrated multiple LLM providers (Groq/Llama) with configurable temperature and strict RAG prompting"** — shows LLM integration experience

### Improvements That Would Level Up Your Resume

| What to Add | Resume Impact |
|-------------|--------------|
| **Unit + integration tests** | "Achieved 80%+ test coverage with pytest" |
| **Docker + CI/CD** | "Containerized with Docker, automated testing via GitHub Actions" |
| **Authentication** | "Implemented JWT-based auth with role-based access control" |
| **Structured logging** | "Added observability with structured logging and request tracing" |
| **Streaming responses** | "Implemented SSE streaming for real-time LLM response delivery" |
| **Reranking** | "Added cross-encoder reranking for improved retrieval precision" |
| **Multi-format support** | "Extended ingestion to support PDF, DOCX, and TXT formats" |
| **Caching layer** | "Added Redis caching for repeated queries, reducing latency by 60%" |
| **Rate limiting** | "Implemented rate limiting with token bucket algorithm" |
| **Evaluation metrics** | "Built RAG evaluation pipeline measuring faithfulness, relevance, and recall" |

---

## Priority Action Plan

### Phase 1: Fix Critical Bugs (1-2 days)
1. Fix the `@app.get("/")` decorator (BUG-1)
2. Fix POST /config/ to pass config_data (BUG-2)
3. Fix DELETE response to use HTTPException (BUG-3)
4. Fix `vector_db_path` → `chroma_db_path` (BUG-4, BUG-5)
5. Remove or fix `setting.py` dead code (BUG-6, BUG-7)
6. Fix background task session management (BUG-8, BUG-9)
7. Fix unbound variables in error handler (BUG-10)
8. Fix `.gitignore` malformed entries

### Phase 2: Architecture Cleanup (3-5 days)
1. Swap `models/` ↔ `schemas/` naming to match conventions
2. Create a single Settings singleton (remove 10 duplicate instantiations)
3. Consolidate duplicate enums into shared module
4. Initialize Qdrant client once at startup
5. Add proper structured logging (replace all `print()`)
6. Remove unused dependencies (langchain-chroma, asyncpg, langchain-google-genai)

### Phase 3: Production Readiness (1-2 weeks)
1. Add pytest test suite (unit + integration)
2. Add authentication (JWT or API key)
3. Add global exception handler middleware
4. Add input validation for file uploads
5. Add pagination to document listing
6. Create Dockerfile and docker-compose.yml
7. Add GitHub Actions CI/CD pipeline
8. Actually use BM25 in the retrieval pipeline
9. Use config settings (top_k, search_category) in retrieval
10. Implement streaming response support
