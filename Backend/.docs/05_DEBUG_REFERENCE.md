# 📖 NeuralVault Backend — Quick Reference for Debugging

> **Generated:** 2026-06-15 | **Purpose:** One-page cheat sheet for tracing bugs and understanding data flow.

---

## 🔍 "Where Does X Happen?" Quick Lookup

| Question | File | Line(s) |
|----------|------|---------|
| Where is the FastAPI app created? | `main.py` | L26-31 |
| Where are routes registered? | `main.py` | L33-37 |
| Where is CORS configured? | `main.py` | L39-45 |
| Where is the DB initialized? | `app/db/database.py` | L28-46 |
| Where is the DB URL built? | `app/db/database.py` | L20-26 (Neon) |
| Where are env vars loaded? | `app/core/config.py` | L6-46 |
| Where is the Qdrant client created? | `app/utils/qdrant_client.py` | L9-44 |
| Where are embeddings initialized? | `app/utils/embeddings.py` | L7-10 |
| Where is PDF loaded? | `app/rag/ingestion_pipeline.py` | L18-34 |
| Where is text chunked? | `app/rag/ingestion_pipeline.py` | L59-75 |
| Where is chunk metadata added? | `app/rag/metadata_enricher.py` | L5-27 |
| Where are chunks stored in Qdrant? | `app/rag/ingestion_pipeline.py` | L78-90 |
| Where are chunks stored in BM25? | `app/rag/ingestion_pipeline.py` | L94-101 |
| Where is BM25 pickle saved? | `app/rag/bm25_retriever.py` | L19-21 |
| Where is vector search done? | `app/rag/retrieval_pipeline.py` | L9-19 |
| Where is LLM called? | `app/rag/llm_service.py` | L42-47 |
| Where is the prompt template? | `app/rag/llm_service.py` | L13-31 |
| Where is document status updated? | `app/services/metadata_service.py` | L45-78 |
| Where are files saved to disk? | `app/utils/save_file.py` | L8-27 |
| Where is file upload handled? | `app/api/routes/ingest.py` | L17-28 |

---

## 🗄️ Database Tables

| Table | ORM Class | File | Columns |
|-------|-----------|------|---------|
| `documents` | `Document` | `schemas/document_schema.py` | id, doc_id, job_id, file_name, file_path, file_size_mb, total_pages, total_chunks, status, uploaded_at |
| `rag_config` | `RAGConfig` | `schemas/config_schema.py` | id, top_k, search_category, reranker, temperature, stream, is_active, created_at |
| `settings` | `Setting` | `models/setting_model.py` | id, chunk_size, chunk_overlap, top_k, search_category, reranker, temperature, stream, created_at |

---

## 🌐 API Endpoint Map

| Method | Path | Handler | Service | Auth |
|--------|------|---------|---------|------|
| `GET` | `/` | `main.root()` | — | ❌ |
| `GET` | `/health/` | `health.health_check()` | — | ❌ |
| `GET` | `/documents/` | `document.get_all_documents()` | `document_service.all_documents()` | ❌ |
| `DELETE` | `/documents/{doc_id}` | `document.delete_document()` | `document_service.delete_document_id()` | ❌ |
| `POST` | `/ingest/` | `ingest.ingest_document()` | `ingestion_service.document_ingestion()` | ❌ |
| `GET` | `/ingest/status/{job_id}` | `ingest.get_ingestion_status()` | `ingestion_service.ingestion_status()` | ❌ |
| `POST` | `/query/` | `query.execute_query()` | `retrieval_service.document_retrieval_output_generation()` | ❌ |
| `GET` | `/config/` | `config.get_active_config()` | `config_service.active_config()` | ❌ |
| `POST` | `/config/` | `config.create_setting()` | `config_service.create_config()` | ❌ |
| `POST` | `/config/default` | `config.create_default_setting()` | `config_service.create_default_config()` | ❌ |

---

## 🐛 Known Bugs Quick Reference

| ID | Severity | One-liner | File:Line |
|----|----------|-----------|-----------|
| BUG-1 | 🔴 | Root endpoint missing `@` decorator | `main.py:47` |
| BUG-2 | 🔴 | POST /config/ ignores request body | `routes/config.py:22` |
| BUG-3 | 🔴 | DELETE returns tuple, not HTTPException | `routes/document.py:25` |
| BUG-4 | 🔴 | `vector_db_path` attribute doesn't exist | `services/document_service.py:33` |
| BUG-5 | 🔴 | `create_chroma_client()` wrong arg count | `services/document_service.py:33` |
| BUG-6 | 🔴 | Async ops on sync session | `routes/setting.py:19,50,51` |
| BUG-7 | 🟠 | Duplicate `/config` route prefix | `routes/config.py` + `routes/setting.py` |
| BUG-8 | 🔴 | Background task uses closed DB session | `routes/ingest.py:21` |
| BUG-9 | 🔴 | metadata_service closes shared session | `services/metadata_service.py:42,78` |
| BUG-10 | 🔴 | Unbound vars in error handler | `rag/ingestion_pipeline.py:141` |

---

## 📊 Config Values Reference

| Setting | Value | Source |
|---------|-------|--------|
| Chunk size | 1000 chars | `core/config.py:17` |
| Chunk overlap | 200 chars | `core/config.py:18` |
| Chat model | `llama-3.1-8b-instant` | `core/config.py:14` |
| Embedding model | `BAAI/bge-small-en` | `utils/embeddings.py:9` |
| Embedding dimensions | 384 | `utils/qdrant_client.py:26` |
| Sparse embedding | `Qdrant/bm25` | `utils/qdrant_client.py:13` |
| Distance metric | Cosine | `utils/qdrant_client.py:27` |
| DB pool size | 10 | `db/database.py:34` |
| DB max overflow | 0 | `db/database.py:35` |
| BM25 k | 10 | `rag/bm25_retriever.py:44` |
| Default top_k | 5 | Various config schemas |
| Default temperature | 0.2 | Various config schemas |
| Default retrieval mode | HYBRID | `utils/qdrant_client.py:40` |

---

## 🔗 Data Flow: Document Lifecycle

```
1. UPLOAD      User uploads PDF
                    │
2. SAVE        save_file.py → app/db/docs/{filename}
                    │
3. RECORD      metadata_service → INSERT into `documents` (status=processing)
                    │
4. LOAD        PyPDFLoader → List[Document]
                    │
5. SPLIT       RecursiveCharacterTextSplitter → List[Document chunks]
                    │              │
                    │         UPDATE documents SET status=splitted
                    │
6. ENRICH      metadata_enricher → adds doc_id, filename, chunk_nos to each chunk
                    │
7. BM25        BM25RetrieverClass.add_documents() → bm25_retriever.pkl
                    │              │
                    │         UPDATE documents SET status=chunked
                    │
8. EMBED       QdrantVectorStore.add_documents() → Qdrant Cloud
                    │              │
                    │         UPDATE documents SET status=indexed
                    │
9. QUERY       User asks question
                    │
10. RETRIEVE   Qdrant similarity_search() → relevant chunks
                    │
11. GENERATE   ChatGroq.invoke() → answer from context
                    │
12. RESPOND    Return {"answer": "..."} to client
```
