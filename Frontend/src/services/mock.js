// Mock data — used when backend is not yet connected.
// Once you uncomment the real API calls, this file is no longer used.

export const MOCK_DOCUMENTS = [
  {
    id: "doc-001",
    filename: "LangChain_Complete_Guide.pdf",
    size_mb: 2.4,
    page_count: 68,
    chunk_count: 312,
    status: "indexed",
    uploaded_at: "2025-04-02",
    error_message: null,
  },
  {
    id: "doc-002",
    filename: "FastAPI_Documentation.pdf",
    size_mb: 1.1,
    page_count: 34,
    chunk_count: 148,
    status: "indexed",
    uploaded_at: "2025-04-03",
    error_message: null,
  },
  {
    id: "doc-003",
    filename: "RAG_Architecture_Notes.txt",
    size_mb: 0.2,
    page_count: null,
    chunk_count: 44,
    status: "processing",
    uploaded_at: "2025-04-05",
    error_message: null,
  },
  {
    id: "doc-004",
    filename: "ChromaDB_Internals.md",
    size_mb: 0.5,
    page_count: null,
    chunk_count: 87,
    status: "indexed",
    uploaded_at: "2025-04-06",
    error_message: null,
  },
];

export const MOCK_CONFIG = {
  chunk_size: 512,
  chunk_overlap: 50,
  top_k: 5,
  search_type: "hybrid",
  reranker: true,
  temperature: 0.2,
  model: "groq/llama-3.3-70b",
  stream: false,
};

export function mockAnswer(query) {
  return {
    answer: `## Answer\n\nBased on your indexed documents, here is what I found regarding **"${query}"**:\n\nThe retrieval-augmented generation pipeline in your system works by first **indexing your documents** — splitting them into overlapping chunks of ~512 characters, generating dense vector embeddings using a sentence transformer, and storing them in ChromaDB with metadata (doc_id, filename, page_number) attached to every chunk.\n\nAt **query time**, your question is embedded using the same model. The hybrid retriever combines **vector similarity search** (semantic meaning) with **BM25 keyword search** (exact term matching) using an EnsembleRetriever. The top-k results are then passed through a **CrossEncoder reranker** which reads the query and each chunk together to produce precise relevance scores.\n\nThe top chunks are assembled into a context window and passed to the LLM with a grounding prompt that instructs it to answer strictly from the provided context.`,
    sources: [
      { file: "LangChain_Complete_Guide.pdf", page: 22, chunk_preview: "RAG combines retrieval with generation...", score: 0.94 },
      { file: "LangChain_Complete_Guide.pdf", page: 47, chunk_preview: "The retriever fetches relevant documents...", score: 0.88 },
      { file: "RAG_Architecture_Notes.txt",   page: null, chunk_preview: "Hybrid search uses both vector and BM25...", score: 0.81 },
    ],
    latency_ms: 923,
  };
}

export function mockNewDoc(file) {
  return {
    id: `doc-${Date.now()}`,
    filename: file.name,
    size_mb: parseFloat((file.size / 1024 / 1024).toFixed(2)),
    page_count: Math.floor(Math.random() * 80) + 5,
    chunk_count: Math.floor(Math.random() * 300) + 40,
    status: "indexed",
    uploaded_at: new Date().toISOString().split("T")[0],
    error_message: null,
  };
}
