# 🔗 Pipelines: Function Calls vs LangChain Chains (LCEL)

> **Purpose:** Understand what you have now, what LangChain chains are, and how to refactor — with exact code examples mapping your files.

---

## The Short Answer

**Your ingestion pipeline is fine as plain functions.** LangChain chains aren't designed for ingestion.

**Your retrieval pipeline SHOULD use LCEL chains.** You're manually doing what LangChain chains automate — and missing features because of it.

---

## What You Have Now (Plain Function Calls)

### Ingestion — Current Pattern

```
ingestion_pipeline()           ← You manually call each step
    ├─ load_pdf_document()     ← manual call
    ├─ split_documents()       ← manual call
    ├─ split_document_enricher()  ← manual call
    ├─ bm25_ingestion()        ← manual call
    └─ add_chunks_to_vector_db()  ← manual call
```

**This is actually the CORRECT approach.** LangChain doesn't have an "ingestion chain" because ingestion involves side effects (DB writes, status updates, file I/O) that don't fit the chain paradigm. Your step-by-step function calls with status tracking is the right pattern here.

### Retrieval — Current Pattern

```python
# retrieval_service.py — You manually glue 3 separate calls:
def document_retrieval_output_generation(query, db):
    config = active_config(db)                        # Step 1: get config
    retrieved_docs = hybrid_retriever(query=query)     # Step 2: retrieve
    return output_generation(retrieved_docs, query, config.temperature)  # Step 3: LLM

# retrieval_pipeline.py — Raw similarity search, manual string join:
def hybrid_retriever(query):
    qdrant_db = qdrant_client()
    results = qdrant_db.similarity_search(query)
    return "\n\n".join([doc.page_content for doc in results])  # ← manual formatting

# llm_service.py — Manual prompt building + model invocation:
def output_generation(retrieved_docs, query, temperature):
    prompt_template = PromptTemplate(template="...", input_variables=[...])
    prompt = prompt_template.format(retrieved_docs=retrieved_docs, query=query)  # ← manual
    messages = [SystemMessage(...), HumanMessage(content=prompt)]               # ← manual
    model = ChatGroq(...)                                                        # ← new instance every call
    response = model.invoke(messages)                                            # ← manual
    return response.content                                                      # ← manual extraction
```

**This is where the problem is.** You're manually doing what LCEL does automatically, and losing these benefits:
- No streaming support
- No automatic retry/fallback
- No async support
- No tracing/callbacks
- Harder to test, swap components, or modify the pipeline

---

## What LangChain Chains / LCEL Actually Are

**LCEL (LangChain Expression Language)** is a way to compose LangChain components using the `|` (pipe) operator. Each component implements `Runnable` with `.invoke()`, `.stream()`, `.ainvoke()`, `.batch()` — you get all these for free.

```python
# The pipe operator: output of left → input of right
chain = component_a | component_b | component_c

# Equivalent to:
result = component_c(component_b(component_a(input)))
```

Think of it like Unix pipes: `cat file.txt | grep "error" | wc -l`

---

## How Your Retrieval Pipeline Should Look with LCEL

### Option A: Simple RAG Chain (Recommended Start)

This replaces **3 of your files** (`retrieval_pipeline.py`, `llm_service.py`, and half of `retrieval_service.py`) with one composable chain:

```python
# app/rag/retrieval_chain.py

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq
from app.utils.qdrant_client import qdrant_client
from app.core.config import settings


# ── Prompt Template ──────────────────────────────────────
RAG_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are a strict document-based QA assistant. "
               "Use ONLY the provided context to answer. "
               "If the answer is not in context, say 'I don't know'."),
    ("human",  "Context:\n{context}\n\nQuestion: {question}\n\nAnswer:")
])


# ── Helper: format retrieved docs into a single string ───
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)


# ── Build the chain ──────────────────────────────────────
def create_rag_chain(temperature: float = 0.2, top_k: int = 5):
    """Creates a composable RAG chain using LCEL."""

    # 1. Retriever — wraps your Qdrant vector store
    retriever = qdrant_client().as_retriever(
        search_kwargs={"k": top_k}  # ← Now top_k actually works!
    )

    # 2. LLM
    llm = ChatGroq(
        model=settings.groq_chat_model,
        api_key=settings.GROQ_API_KEY,
        temperature=temperature,
    )

    # 3. Compose the chain with LCEL pipe syntax
    chain = (
        {
            "context": retriever | format_docs,   # query → retrieve → format
            "question": RunnablePassthrough()       # query passes through unchanged
        }
        | RAG_PROMPT        # dict → formatted prompt
        | llm               # prompt → LLM response
        | StrOutputParser()  # AIMessage → plain string
    )

    return chain
```

### How to use it in your service:

```python
# app/services/retrieval_service.py  (refactored)

from app.rag.retrieval_chain import create_rag_chain
from app.services.config_service import active_config


def document_retrieval_output_generation(query: str, db):
    config = active_config(db)
    if not config:
        raise Exception("No active config found")

    # Create chain with config values — NOW they're actually used!
    chain = create_rag_chain(
        temperature=config.temperature,
        top_k=config.top_k
    )

    # .invoke() — normal response
    answer = chain.invoke(query)
    return answer

    # .stream() — streaming (FREE! No extra code needed)
    # for chunk in chain.stream(query):
    #     yield chunk

    # .ainvoke() — async (FREE! No extra code needed)
    # answer = await chain.ainvoke(query)
```

---

## Visual Comparison: Before vs After

### BEFORE (your current code) — 3 files, ~90 lines

```
retrieval_service.py          retrieval_pipeline.py          llm_service.py
┌──────────────────┐         ┌──────────────────┐          ┌──────────────────┐
│ get config       │         │ create qdrant()  │          │ build template   │
│ call retriever()─┼────────►│ similarity_search│          │ format prompt    │
│ call llm()───────┼────┐    │ join strings     │          │ build messages   │
│ return content   │    │    │ return text      │          │ create ChatGroq  │
└──────────────────┘    │    └──────────────────┘          │ model.invoke()   │
                        └──────────────────────────────────►│ return .content  │
                                                           └──────────────────┘

Problems:
  ✗ top_k never passed to search
  ✗ search_category never used
  ✗ No streaming
  ✗ New Qdrant + embedding model on EVERY request
  ✗ No async support
  ✗ Manual string manipulation everywhere
```

### AFTER (LCEL chain) — 1 file, ~35 lines

```
retrieval_chain.py
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  query ──► retriever ──► format_docs ──► prompt ──► llm │
│            (Qdrant)       (auto)        (template)      │
│                                                         │
│  Built with:  retriever | format_docs | prompt | llm    │
│                                                         │
│  FREE features:                                         │
│    ✓ .invoke(query)     — sync                          │
│    ✓ .ainvoke(query)    — async                         │
│    ✓ .stream(query)     — token-by-token streaming      │
│    ✓ .batch([q1, q2])   — parallel queries              │
│    ✓ Callbacks/tracing  — LangSmith compatible          │
│    ✓ .with_fallbacks()  — auto-retry with backup LLM    │
│    ✓ .with_config()     — per-request config override   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Option B: Advanced RAG Chain (With Document Filtering & Search Mode)

Once you're comfortable with the basic chain, you can add the features your config promises but doesn't deliver:

```python
# app/rag/retrieval_chain.py — Advanced version

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq
from langchain_qdrant import RetrievalMode
from app.utils.qdrant_client import qdrant_client
from app.core.config import settings


RAG_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are a strict document-based QA assistant. "
               "Use ONLY the provided context. "
               "If the answer is not in context, say 'I don't know'. "
               "Reference source documents when possible."),
    ("human",  "Context:\n{context}\n\nQuestion: {question}\n\nAnswer:")
])


def format_docs(docs):
    formatted = []
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get("file_name", "Unknown")
        formatted.append(f"[Doc {i} — {source}]\n{doc.page_content}")
    return "\n\n---\n\n".join(formatted)


def create_rag_chain(
    temperature: float = 0.2,
    top_k: int = 5,
    search_category: str = "Hybrid",
    doc_filter: str | None = None
):
    """
    Creates a configurable RAG chain.

    Args:
        temperature: LLM sampling temperature (0.0 - 1.0)
        top_k: Number of documents to retrieve
        search_category: "Hybrid", "Semantic", or "Keyword"
        doc_filter: Optional document ID to filter results
    """
    # Map config search_category to Qdrant retrieval mode
    mode_map = {
        "Hybrid": RetrievalMode.HYBRID,
        "Semantic": RetrievalMode.DENSE,
        "Keyword": RetrievalMode.SPARSE,
    }

    # Build retriever from vector store
    vector_store = qdrant_client()  # ideally a cached singleton

    search_kwargs = {"k": top_k}
    if doc_filter:
        search_kwargs["filter"] = {"id": doc_filter}

    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs=search_kwargs
    )

    # Build LLM
    llm = ChatGroq(
        model=settings.groq_chat_model,
        api_key=settings.GROQ_API_KEY,
        temperature=temperature,
    )

    # LCEL chain
    chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough()
        }
        | RAG_PROMPT
        | llm
        | StrOutputParser()
    )

    return chain
```

---

## What About the Ingestion Pipeline?

**Keep it as function calls.** Here's why:

| Criteria | Retrieval Pipeline | Ingestion Pipeline |
|----------|-------------------|-------------------|
| **Data flow** | Input → transform → output (pure) | Side effects at every step (DB writes) |
| **Composability** | Each step's output feeds the next | Steps need external state (db_session, job_id) |
| **Streaming** | Yes — token-by-token LLM output | No — you can't stream file ingestion |
| **LangChain chain support** | ✅ PromptTemplate, Retriever, LLM | ❌ No chain for "save to DB" or "update status" |
| **Error handling** | Retry/fallback useful | Need granular status updates per step |

However, you can still **clean up** the ingestion pipeline using LangChain components more idiomatically:

```python
# Your current approach (correct pattern, just clean it up):

def ingestion_pipeline(file_path: str, job_id: UUID, db_session):
    """
    Pipeline: Load → Split → Enrich → Store

    This is intentionally NOT an LCEL chain because each step
    has side effects (DB status updates) that chains can't model.
    """
    doc_id = uuid4()

    # Step 1: Load (LangChain Loader — you already use this correctly)
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    # Step 2: Split (LangChain Splitter — you already use this correctly)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap
    )
    chunks = splitter.split_documents(documents)

    # Step 3: Enrich metadata
    enriched = enrich_metadata(chunks, doc_id, file_path)

    # Step 4: Store in vector DB (LangChain VectorStore — you already use this)
    vector_store = qdrant_client()
    vector_store.add_documents(enriched)

    # Each step updates DB status — this CAN'T be in a chain
    update_status(db_session, doc_id, DocumentStatus.indexed)
```

---

## Summary: What to Change

| Component | Current | Should Be | Why |
|-----------|---------|-----------|-----|
| **Ingestion pipeline** | Function calls | **Keep as function calls** ✅ | Side effects (DB writes, status tracking) don't fit LCEL |
| **Retrieval pipeline** | Manual function calls across 3 files | **LCEL chain** 🔄 | Gets you streaming, async, retry, tracing for free |
| **LLM service** | Manual prompt format + invoke | **Part of LCEL chain** 🔄 | Chain handles prompt → LLM → parse automatically |
| **Retriever setup** | New instance per request | **Singleton or DI** 🔄 | Avoid reloading ML models on every request |

### Files affected by refactoring to LCEL:

```
REPLACE with one chain:
  ├─ app/rag/retrieval_pipeline.py  → merged into retrieval_chain.py
  ├─ app/rag/llm_service.py         → merged into retrieval_chain.py
  └─ app/services/retrieval_service.py → simplified, calls chain.invoke()

KEEP as-is (clean up style only):
  ├─ app/rag/ingestion_pipeline.py  → keep function calls
  ├─ app/rag/bm25_retriever.py      → keep
  └─ app/rag/metadata_enricher.py   → keep
```

---

## Key LangChain Concepts to Understand

| Concept | What It Is | Your Code Equivalent |
|---------|-----------|---------------------|
| **Runnable** | Any component with `.invoke()` | Your plain functions |
| **LCEL `\|`** | Pipe operator to chain Runnables | Your manual `result = f(g(h(x)))` calls |
| **`RunnablePassthrough`** | Passes input through unchanged | You do this manually with the `query` variable |
| **`as_retriever()`** | Wraps VectorStore into a Retriever Runnable | Your `similarity_search()` call |
| **`StrOutputParser`** | Extracts `.content` from AIMessage | Your `return response.content` |
| **`ChatPromptTemplate`** | Chainable prompt template | Your `PromptTemplate.format()` + manual messages |
| **`.stream()`** | Token-by-token streaming | ❌ You don't have this |
| **`.with_fallbacks()`** | Auto-retry with backup model | ❌ You don't have this |
| **Callbacks** | Tracing, logging hooks | Your `print()` statements |
