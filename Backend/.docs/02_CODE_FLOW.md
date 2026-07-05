# 🔄 NeuralVault Backend — Code Flow Documentation

> **Generated:** 2026-06-15 | **Purpose:** Trace every request path for debugging and understanding.

---

## Table of Contents

- [Application Startup](#1-application-startup)
- [POST /ingest/ — Document Ingestion](#2-post-ingest--document-ingestion-flow)
- [GET /ingest/status/{job_id} — Ingestion Status](#3-get-ingeststatusjob_id--ingestion-status)
- [POST /query/ — Question Answering](#4-post-query--question-answering-flow)
- [GET /documents/ — List Documents](#5-get-documents--list-all-documents)
- [DELETE /documents/{doc_id} — Delete Document](#6-delete-documentsdoc_id--delete-document)
- [GET /config/ — Get Active Config](#7-get-config--get-active-configuration)
- [POST /config/ — Create Config](#8-post-config--create-new-configuration)
- [GET /health/ — Health Check](#9-get-health--health-check)
- [Dependency Injection Flow](#10-dependency-injection-flow)

---

## 1. Application Startup

```
uvicorn main:app
    │
    ▼
main.py
    │
    ├─ Settings() instantiated ─────────────►  app/core/config.py
    │   └─ Reads .env file via pydantic-settings
    │   └─ Validates all env vars (GEMINI_API_KEY, GROQ_API_KEY, DB creds, etc.)
    │
    ├─ lifespan(app) context manager triggers:
    │   └─ init_db() ─────────────────────────►  app/db/database.py
    │       ├─ neon_db_url() builds PostgreSQL connection string
    │       ├─ create_engine(url, pool_size=10, max_overflow=0)
    │       ├─ sessionmaker(bind=engine, autocommit=False, autoflush=False)
    │       └─ Prints "Database connection pool initialized successfully."
    │
    ├─ Registers routers:
    │   ├─ document_router  → /documents    ─►  app/api/routes/document.py
    │   ├─ ingest_router    → /ingest       ─►  app/api/routes/ingest.py
    │   ├─ query_router     → /query        ─►  app/api/routes/query.py
    │   ├─ setting_router   → /config       ─►  app/api/routes/config.py
    │   └─ health_router    → /health       ─►  app/api/routes/health.py
    │
    ├─ CORSMiddleware configured:
    │   └─ allow_origins from settings.ALLOWED_ORIGINS
    │
    └─ Root endpoint: GET / → {"message": "Welcome to MyKnowledgeRAG API!"}
       ⚠️ BUG: Missing @decorator — `app.get("/")` not `@app.get("/")`
```

---

## 2. POST /ingest/ — Document Ingestion Flow

This is the most complex flow in the application. It runs as a **background task**.

```
Client uploads PDF (multipart/form-data)
    │
    ▼
app/api/routes/ingest.py :: ingest_document()
    │
    ├─ Generate job_id = uuid4()
    ├─ background_task.add_task(document_ingestion, document, job_id, db)
    │   └─ ⚠️ WARNING: db session passed to background task — session lifecycle issue
    └─ Return {"job_id": "...", "message": "Document ingestion started..."}
         (Response sent immediately — ingestion continues in background)
    │
    ▼
app/services/ingestion_service.py :: document_ingestion()
    │
    ├─ Step 1: store_file(document) ───────────►  app/utils/save_file.py
    │   ├─ Reads document.filename
    │   ├─ Validates doc_path exists (app/db/docs/)
    │   ├─ Writes file to: app/db/docs/{filename}
    │   └─ Returns {"status": "...", "path": file_path}
    │
    ├─ Step 2: asyncio.to_thread(ingestion_pipeline, ...)
    │   └─ Offloads CPU-heavy work to a thread pool
    │
    ▼
app/rag/ingestion_pipeline.py :: ingestion_pipeline()
    │
    ├─ Step 0: Generate doc id = uuid4()
    │   └─ document_metadata_service(db, id, path, PROCESSING, job_id)
    │       └─► app/services/metadata_service.py
    │           ├─ Creates Document ORM record
    │           ├─ db.add() → db.commit() → db.refresh()
    │           └─ db.close()  ⚠️ closes session prematurely
    │
    ├─ Step 1: load_pdf_document(file_path) ───►  PyPDFLoader
    │   ├─ Validates file exists
    │   ├─ pdf_loader = PyPDFLoader(file_path)
    │   └─ documents = pdf_loader.load()    # Returns list of LangChain Documents
    │
    ├─ Step 2: split_documents(documents)
    │   ├─ RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    │   ├─ chunks = text_splitter.split_documents(documents)
    │   └─ Returns list of chunked Documents
    │
    │   └─ update_document_metadata_service(db, id, SPLITTED)
    │       └─► metadata_service.py → Updates status to "splitted"
    │           └─ db.close()  ⚠️ closes session again
    │
    ├─ Step 3: split_document_enricher(chunks, id, file_path)
    │   └─► app/rag/metadata_enricher.py
    │       ├─ For each chunk, adds metadata:
    │       │   ├─ id (doc UUID)
    │       │   ├─ file_name (basename)
    │       │   ├─ file_path (full path)
    │       │   ├─ file_size_mb (bytes / 1024 / 1024)
    │       │   ├─ chunk_nos ("chunk_0", "chunk_1", ...)
    │       │   └─ uploaded_at (UTC ISO timestamp)
    │       └─ Returns enriched chunks list
    │
    │   └─ bm25_ingestion(doc_id, enriched_chunks)
    │       └─► BM25RetrieverClass (app/rag/bm25_retriever.py)
    │           ├─ self.store[doc_id] = chunks
    │           └─ pickle.dump(self.store) → app/db/bm25_retriever.pkl
    │
    │   └─ update_document_metadata_service(db, id, CHUNKED, pages, chunks)
    │       └─ db.close()  ⚠️ closes session again
    │
    ├─ Step 4: add_chunks_to_vector_db(enriched_chunks)
    │   └─► qdrant_client() ─────────────────►  app/utils/qdrant_client.py
    │       ├─ FastEmbedSparse(model_name="Qdrant/bm25")
    │       ├─ QdrantClient(url=..., api_key=...)
    │       ├─ If collection doesn't exist → create_collection()
    │       │   ├─ Dense vectors: size=384, COSINE distance
    │       │   └─ Sparse vectors: SparseIndexParams(on_disk=False)
    │       ├─ Returns QdrantVectorStore(retrieval_mode=HYBRID)
    │       │   └─ embedding = HuggingFaceEmbeddings("BAAI/bge-small-en")
    │       │       └─► app/utils/embeddings.py :: create_embeddings()
    │       └─ vector_db.add_documents(chunks)  # Embeds + upserts
    │
    └─ update_document_metadata_service(db, id, INDEXED)
        └─ Final status update — document is now searchable

    On Error:
    └─ update_document_metadata_service(db, id, FAILED)
       ⚠️ RISK: total_pages/total_chunks may be undefined if error occurs before Step 3
```

### Ingestion Status State Machine

```
pending ──► processing ──► splitted ──► chunked ──► indexed
                 │                                      │
                 └──────────── failed ◄─────────────────┘
```

---

## 3. GET /ingest/status/{job_id} — Ingestion Status

```
Client polls with job_id
    │
    ▼
app/api/routes/ingest.py :: get_ingestion_status()
    │
    └─ ingestion_status(job_id, db) ──────────►  app/services/ingestion_service.py
        ├─ SELECT status FROM documents WHERE job_id = {job_id}
        ├─ status.value (Enum → string)
        ├─ Map status to progress percentage:
        │   ├─ pending     →   0%
        │   ├─ processing  →  10%
        │   ├─ splitted    →  40%
        │   ├─ chunked     →  70%
        │   ├─ indexed     → 100%
        │   └─ failed      →   0%
        └─ Return {"status": "...", "progress": N}
```

---

## 4. POST /query/ — Question Answering Flow

```
Client sends: {"query": "...", "top_k": 5, "doc_filter": null}
    │
    ▼
app/api/routes/query.py :: execute_query()
    │
    ├─ Extracts query.query
    │   ⚠️ NOTE: query.top_k and query.doc_filter are NEVER USED
    │
    └─ document_retrieval_output_generation(query, db)
        └─► app/services/retrieval_service.py
            │
            ├─ Step 1: active_config(db) ─────►  app/services/config_service.py
            │   ├─ SELECT * FROM rag_config WHERE is_active = True LIMIT 1
            │   └─ Returns FetchConfig (Pydantic model)
            │
            ├─ Step 2: hybrid_retriever(query)
            │   └─► app/rag/retrieval_pipeline.py
            │       ├─ qdrant_client() ──────►  Creates new Qdrant connection EVERY call
            │       │   └─ Full setup: sparse embed init, client connect, collection check
            │       ├─ qdrant_db.similarity_search(query)
            │       │   └─ Qdrant handles HYBRID search (dense + sparse)
            │       ├─ Join all page_content with "\n\n"
            │       └─ Return concatenated text
            │
            │   ⚠️ NOTE: config.top_k is fetched but NEVER passed to similarity_search
            │   ⚠️ NOTE: config.search_category is fetched but NEVER used to switch modes
            │
            └─ Step 3: output_generation(retrieved_docs, query, temperature)
                └─► app/rag/llm_service.py
                    ├─ Build PromptTemplate with context + query
                    ├─ Format prompt string
                    ├─ Messages:
                    │   ├─ SystemMessage: "You answer strictly from provided context."
                    │   └─ HumanMessage: formatted prompt (duplicates system instruction)
                    ├─ ChatGroq(model="llama-3.1-8b-instant", temperature=...)
                    ├─ response = model.invoke(messages)
                    ├─ messages.append(AIMessage(...))  ⚠️ USELESS — list is local, discarded
                    └─ Return response.content (string)
```

---

## 5. GET /documents/ — List All Documents

```
Client sends GET /documents/
    │
    ▼
app/api/routes/document.py :: get_all_documents()
    │
    └─ all_documents(db) ─────────────────────►  app/services/document_service.py
        ├─ SELECT * FROM documents
        └─ Return list of Document ORM objects
           ⚠️ No pagination — returns ALL documents
           ⚠️ No response_model defined — raw ORM objects serialized
```

---

## 6. DELETE /documents/{doc_id} — Delete Document

```
Client sends DELETE /documents/{doc_id}
    │
    ▼
app/api/routes/document.py :: delete_document()
    │
    └─ delete_document_id(db, doc_id) ────────►  app/services/document_service.py
        ├─ SELECT * FROM documents WHERE id = {doc_id}
        ├─ If not found → return False
        ├─ db.delete(document) → db.commit()
        │
        ├─ create_chroma_client(settings.vector_db_path)
        │   └─ ⚠️ RUNTIME ERROR: Settings has no `vector_db_path` attr
        │      (field is named `chroma_db_path`)
        │
        ├─ chroma_db._collection.delete(where={"id": doc_id})
        │   └─ ⚠️ Accesses private API (_collection)
        │
        └─ BM25RetrieverClass().delete_document(doc_id)
            └─ Removes from pickle store + re-saves

    ⚠️ BUG: Route returns tuple (dict, 404) instead of raising HTTPException
```

---

## 7. GET /config/ — Get Active Configuration

```
Client sends GET /config/
    │
    ▼
app/api/routes/config.py :: get_active_config()
    │
    └─ active_config(db) ─────────────────────►  app/services/config_service.py
        ├─ SELECT * FROM rag_config WHERE is_active = True LIMIT 1
        └─ Return FetchConfig.model_validate(active_config)
           ⚠️ RISK: If no active config → active_config is None →
                     model_validate(None) raises ValidationError (unhandled)
```

---

## 8. POST /config/ — Create New Configuration

```
Client sends config JSON body
    │
    ▼
app/api/routes/config.py :: create_setting()
    │
    ├─ Receives config_data: BaseConfig
    │   ⚠️ BUG: config_data is never passed to create_config()
    │
    └─ create_config(db)  ← called with ONLY db, ignores config_data
        └─► app/services/config_service.py :: create_config()
            ├─ UPDATE rag_config SET is_active = False (deactivate all)
            ├─ new_config = RAGConfig(**config_data.model_dump(), is_active=True)
            │   ⚠️ BUG: config_data param is db session, not BaseConfig
            ├─ db.add() → db.commit() → db.refresh()
            └─ Return BaseConfig.model_validate(new_config)
```

---

## 9. GET /health/ — Health Check

```
Client sends GET /health/
    │
    ▼
app/api/routes/health.py :: health_check()
    │
    └─ Return {"status": "ok"}
       (No actual dependency checks — DB, Qdrant, etc.)
```

---

## 10. Dependency Injection Flow

```
Every request that needs a DB session:
    │
    ├─ db: Annotated[Session, Depends(get_db_session)]
    │   └─► app/db/database.py :: get_db_session()
    │       ├─ db = session_factory()   # Creates new session
    │       ├─ yield db                 # Provides to route handler
    │       └─ finally: db.close()      # Cleans up after response
    │
    └─ Session is synchronous (not async)
       ⚠️ Some routes declare `async def` but use sync Session
       ⚠️ setting.py route uses `await db.execute()` — will fail at runtime
```

### Settings Instantiation Pattern

```
⚠️ ANTI-PATTERN: Settings() is instantiated in EVERY module:

main.py                     → settings = Settings()
app/core/config.py          → settings = Settings()     ← canonical singleton
app/db/database.py          → settings = Settings()
app/utils/chroma_client.py  → settings = Settings()
app/utils/embeddings.py     → settings = Settings()
app/utils/qdrant_client.py  → settings = Settings()
app/utils/save_file.py      → settings = Settings()
app/rag/ingestion_pipeline.py → settings = Settings()
app/rag/retrieval_pipeline.py → settings = Settings()
app/rag/llm_service.py      → settings = Settings()
app/services/document_service.py → settings = Settings()

TOTAL: 11 separate instantiations (reads .env file 11 times)
SHOULD BE: 1 singleton imported from app/core/config.py
```
