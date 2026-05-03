# MyKnowledgeRAG — Backend

[![FastAPI](https://img.shields.io/badge/FastAPI-0.135+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![LangChain](https://img.shields.io/badge/LangChain-1.2+-1C3C3C?style=flat-square&logo=langchain&logoColor=white)](https://langchain.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![uv](https://img.shields.io/badge/uv-package_manager-DE5FE9?style=flat-square)](https://docs.astral.sh/uv/)

FastAPI backend powering the MyKnowledgeRAG system. Handles PDF ingestion, hybrid vector + BM25 retrieval, and LLM-driven answer generation over a personal knowledge base.

---

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Running](#setup--running)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [RAG Pipeline](#rag-pipeline)
- [Data Models](#data-models)
- [Database Migrations](#database-migrations)
- [Configuration Settings](#configuration-settings)

---

## Architecture

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────────────────┐
│                    FastAPI App                       │
│                    (main.py)                         │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐  │
│  │/documents│ │ /ingest  │ │ /query  │ │/config │  │
│  └────┬─────┘ └────┬─────┘ └────┬────┘ └───┬────┘  │
│       │            │            │           │       │
│       └────────────┴──────┬─────┴───────────┘       │
│                           │                         │
│              ┌────────────▼────────────┐            │
│              │       Services Layer     │            │
│              │  (business logic, DI)    │            │
│              └────────────┬────────────┘            │
│                           │                         │
│         ┌─────────────────┼──────────────────┐      │
│         ▼                 ▼                  ▼      │
│   ┌──────────┐   ┌──────────────┐   ┌─────────────┐ │
│   │PostgreSQL│   │   ChromaDB   │   │  Groq API   │ │
│   │(metadata)│   │(vector store)│   │  (Llama LLM)│ │
│   └──────────┘   └──────────────┘   └─────────────┘ │
│                         +                            │
│                  ┌──────────────┐                    │
│                  │  BM25 Index  │                    │
│                  │  (.pkl file) │                    │
│                  └──────────────┘                    │
└─────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Backend/
├── main.py                          # FastAPI app entry point, router registration, CORS
├── pyproject.toml                   # Project metadata and dependencies (uv)
├── uv.lock                          # Locked dependency tree
├── alembic.ini                      # Alembic migration configuration
├── .env.example                     # Environment variable template
├── .python-version                  # Python version pin (3.12)
├── Dockerfile                       # Multi-stage container build
│
├── alembic/                         # Database migrations
│   └── versions/                    # Auto-generated migration scripts
│
└── app/
    ├── api/
    │   └── routes/
    │       ├── document.py          # GET /documents, DELETE /documents/{id}
    │       ├── ingest.py            # POST /ingest/, GET /ingest/status/{job_id}
    │       ├── query.py             # POST /query/
    │       ├── config.py            # GET/POST /config/
    │       └── health.py            # GET /health
    │
    ├── core/
    │   └── config.py                # Pydantic Settings — loads from .env
    │
    ├── db/
    │   ├── database.py              # SQLAlchemy engine, session factory, Base
    │   ├── docs/                    # Uploaded PDF storage directory
    │   ├── chroma_db/               # ChromaDB persistent vector store
    │   └── bm25_retriever.pkl       # Serialised BM25 index (pickle)
    │
    ├── models/
    │   ├── document_model.py        # DocumentModel Pydantic schema + DocumentStatus enum
    │   ├── setting_model.py         # Setting SQLAlchemy ORM model
    │   ├── config_model.py          # ConfigModel
    │   └── query_model.py           # QueryModel Pydantic schema
    │
    ├── rag/
    │   ├── ingestion_pipeline.py    # PDF load → chunk → enrich → embed → BM25 + Chroma
    │   ├── retrieval_pipeline.py    # Hybrid retriever (Chroma + BM25 via EnsembleRetriever)
    │   ├── llm_service.py           # Prompt construction + Groq ChatLLM invocation
    │   ├── bm25_retriever.py        # BM25RetrieverClass — pickle-based persistent index
    │   └── metadata_enricher.py     # Enriches chunk metadata (doc_id, pages, file path)
    │
    ├── schemas/
    │   ├── document_schema.py       # DocumentStatus enum + request/response schemas
    │   └── setting_schema.py        # SettingCreate / SettingResponse Pydantic models
    │
    ├── services/
    │   ├── ingestion_service.py     # Orchestrates ingestion pipeline, handles file I/O
    │   ├── retrieval_service.py     # Calls hybrid retriever → LLM → returns answer
    │   ├── document_service.py      # DB queries for document list and deletion
    │   └── metadata_service.py      # DB writes for document status updates
    │
    └── utils/
        └── chroma_client.py         # Factory for creating/loading the ChromaDB client
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | ≥ 3.12 | [python.org](https://python.org) |
| uv | latest | `pip install uv` or [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) |
| PostgreSQL | ≥ 15 | [postgresql.org](https://postgresql.org) or use [Neon](https://neon.tech) (free cloud Postgres) |

---

## Setup & Running

### 1. Install dependencies

```bash
cd Backend
uv sync
```

### 2. Configure environment

```bash
cp .env.example .env
# Open .env and fill in your API keys and database credentials
```

### 3. Run database migrations

```bash
uv run alembic upgrade head
```

### 4. Start the development server

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API is now available at:
- **Base URL:** `http://localhost:8000`
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

### Running with Docker

```bash
# From the repo root
docker compose up backend postgres --build
```

---

## Environment Variables

Copy `.env.example` to `.env` and populate all required values:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ | — | Google Gemini API key (used for embeddings via `langchain-google-genai`) |
| `GROQ_API_KEY` | ✅ | — | Groq API key — drives the chat LLM (`llama-3.1-8b-instant` by default) |
| `HF_TOKEN` | ✅ | — | HuggingFace token for downloading embedding models |
| `DATABASE_USER` | ✅ | — | PostgreSQL username |
| `DATABASE_PASSWORD` | ✅ | — | PostgreSQL password |
| `DATABASE_NAME` | ✅ | — | PostgreSQL database name |
| `DATABASE_HOST` | ☑️ | `localhost` | PostgreSQL host |
| `DATABASE_PORT` | ☑️ | `5432` | PostgreSQL port |
| `NEON_USER` | ☑️ | — | Neon DB username (if using cloud Postgres) |
| `NEON_DB_PASSWORD` | ☑️ | — | Neon DB password |
| `NEON_DB_HOST` | ☑️ | — | Neon DB pooler host URL |
| `NEON_DB_NAME` | ☑️ | — | Neon DB name |
| `ALLOWED_ORIGINS` | ☑️ | `http://localhost:3000` | Comma-separated CORS allowed origins |

---

## API Reference

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Returns `{"status": "ok"}` — used by Docker healthcheck and monitoring |

---

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/documents/` | List all ingested documents with metadata |
| `DELETE` | `/documents/{doc_id}` | Delete a document by its UUID |

**`GET /documents/` — Response**
```json
[
  {
    "id": "uuid",
    "doc_id": "uuid",
    "job_id": "uuid",
    "file_name": "azure_guide.pdf",
    "file_path": "app/db/docs/azure_guide.pdf",
    "file_size_mb": 1.83,
    "total_pages": 42,
    "total_chunks": 87,
    "status": "indexed",
    "uploaded_at": "2026-05-03T09:00:00+00:00"
  }
]
```

---

### Ingestion

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ingest/` | Upload a PDF file to begin ingestion (non-blocking background task) |
| `GET` | `/ingest/status/{job_id}` | Poll ingestion job status by job UUID |

**`POST /ingest/` — Request**
```
Content-Type: multipart/form-data
Body: document=<PDF file>
```

**`POST /ingest/` — Response**
```json
{
  "job_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "message": "Document ingestion started in the background."
}
```

**Ingestion status values:** `pending` → `processing` → `splitted` → `chunked` → `indexed` | `failed`

---

### Query

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/query/` | Submit a natural language question, receive an LLM answer grounded in your documents |

**`POST /query/` — Request**
```json
{
  "query": "What are the key differences between Azure App Service and Function Apps?"
}
```

**`POST /query/` — Response**
```json
{
  "answer": "Based on the documents, Azure App Service is best suited for..."
}
```

---

### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/config/` | Get the current RAG configuration (most recently saved settings) |
| `POST` | `/config/` | Save a new configuration snapshot |

**`POST /config/` — Request**
```json
{
  "top_k": 5,
  "search_category": "Hybrid",
  "reranker": false,
  "temperature": 0.2,
  "stream": false
}
```

**`search_category` options:** `"Semantic"` | `"Keyword"` | `"Hybrid"`

---

## RAG Pipeline

### Ingestion Pipeline

When a PDF is uploaded to `POST /ingest/`, it runs as a **background task** in 5 stages:

```
┌────────────────────────────────────────────────────────────────┐
│  Stage 0  │  Create DB record with status = processing         │
├────────────────────────────────────────────────────────────────┤
│  Stage 1  │  Load PDF using PyPDFLoader                        │
├────────────────────────────────────────────────────────────────┤
│  Stage 2  │  Split into chunks (RecursiveCharacterTextSplitter) │
│           │  Default: chunk_size=1000, chunk_overlap=200        │
│           │  DB status → splitted                              │
├────────────────────────────────────────────────────────────────┤
│  Stage 3  │  Enrich chunk metadata (doc_id, file_path, pages)  │
│           │  Add to BM25 pickle index                          │
│           │  DB status → chunked                              │
├────────────────────────────────────────────────────────────────┤
│  Stage 4  │  Embed and upsert chunks into ChromaDB             │
│           │  DB status → indexed                               │
└────────────────────────────────────────────────────────────────┘
```

### Retrieval & Answer Generation Pipeline

```
User Query
    │
    ├──► ChromaDB (dense similarity search, k=top_k)
    │         Embedding: Google Gemini models/gemini-embedding-001
    │
    └──► BM25 (sparse keyword search, k=10)
              Loaded from pickled index on disk
    │
    ▼
EnsembleRetriever (weights: 0.5 Chroma, 0.5 BM25)
    │
    ▼
Retrieved context concatenated
    │
    ▼
PromptTemplate — strict document-based QA instructions
    │
    ▼
ChatGroq (llama-3.1-8b-instant, temperature from config)
    │
    ▼
Answer returned to client
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Hybrid retrieval (50/50)** | Dense vectors excel at semantic similarity; BM25 catches exact keyword matches — combining both maximises recall |
| **BM25 persisted as pickle** | Stateless deployment friendly; the index rebuilds from the pickle on every request, no external service required |
| **Background ingestion** | Large PDFs can take 10–30s to process; returning a `job_id` immediately keeps the API responsive |
| **Strict prompt** | LLM is instructed to only use the retrieved context, minimising hallucination risk for a personal KB |

---

## Data Models

### Document

Tracks every ingested PDF document in PostgreSQL.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Internal row identifier |
| `doc_id` | UUID | Document identifier (used to key BM25 and Chroma) |
| `job_id` | UUID | Background job identifier |
| `file_name` | string | Original filename |
| `file_path` | string | Path on disk where the PDF is stored |
| `file_size_mb` | float | File size in megabytes |
| `total_pages` | int | Total pages extracted |
| `total_chunks` | int | Number of text chunks created |
| `status` | enum | `pending` `processing` `splitted` `chunked` `indexed` `failed` |
| `uploaded_at` | datetime | Timezone-aware upload timestamp |

### Setting

Stores runtime RAG configuration snapshots. The latest row is always used.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID (PK) | auto | Row identifier |
| `chunk_size` | int | 512 | Text chunk size in characters |
| `chunk_overlap` | int | 50 | Overlap between consecutive chunks |
| `top_k` | int | 5 | Number of documents to retrieve |
| `search_category` | enum | `Hybrid` | `Semantic` / `Keyword` / `Hybrid` |
| `reranker` | bool | false | Whether to apply a re-ranking step |
| `temperature` | float | 0.2 | LLM sampling temperature |
| `stream` | bool | false | Stream LLM response |
| `created_at` | datetime | `now()` | When this config was saved |

---

## Database Migrations

This project uses [Alembic](https://alembic.sqlalchemy.org/) for schema migrations.

```bash
# Apply all pending migrations
uv run alembic upgrade head

# Roll back one migration
uv run alembic downgrade -1

# Create a new auto-generated migration
uv run alembic revision --autogenerate -m "add reranker column"

# View migration history
uv run alembic history --verbose
```

Migration scripts are stored in `alembic/versions/`.

---

## Configuration Settings

All application settings are managed via `app/core/config.py` using **Pydantic Settings**. Values are automatically loaded from the `.env` file.

| Setting | Default | Configurable via |
|---------|---------|-----------------|
| `groq_chat_model` | `llama-3.1-8b-instant` | `.env` or `Settings` subclass |
| `gemini_embedding_model` | `models/gemini-embedding-001` | `.env` or `Settings` subclass |
| `chunk_size` | `1000` | `.env` |
| `chunk_overlap` | `200` | `.env` |
| `document_path` | `app/db/docs` | `.env` |
| `vector_db_path` | `app/db/chroma_db` | `.env` |
| `ALLOWED_ORIGINS` | `["http://localhost:3000"]` | `.env` (comma-separated list) |

> **Note:** Runtime settings (top_k, temperature, search_category) are stored in the `settings` database table and take precedence over the static config at query time.

---

## Development Tips

```bash
# Add a new dependency
uv add <package-name>

# Run the server with auto-reload
uv run uvicorn main:app --reload

# Open interactive API docs
open http://localhost:8000/docs

# Check ChromaDB vector count (from Python REPL)
from app.utils.chroma_client import create_chroma_client
db = create_chroma_client("app/db/chroma_db")
print(db._collection.count())
```
