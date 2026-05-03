/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  NeuralVault API Service                                     ║
 * ║                                                              ║
 * ║  HOW TO CONNECT YOUR BACKEND:                                ║
 * ║  1. Set API_BASE_URL to your FastAPI server URL              ║
 * ║  2. Each function here maps to one FastAPI endpoint          ║
 * ║  3. Mock responses are used when backend is offline          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─── CHANGE THIS TO YOUR FASTAPI SERVER URL ──────────────────────
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// ─── API KEY (if you add auth to FastAPI) ────────────────────────
const API_KEY = import.meta.env.VITE_API_KEY || "";

// ─── Base request helper ─────────────────────────────────────────
async function request(method, path, body = null, isFormData = false) {
  const headers = {};
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[${res.status}] ${text}`);
  }
  return res.json();
}

// ════════════════════════════════════════════════════════════════
// DOCUMENTS
// ════════════════════════════════════════════════════════════════

/**
 * GET /documents
 * Returns all documents with their metadata.
 *
 * Expected response from FastAPI:
 * [
 *   {
 *     id: string,           // UUID — permanent document ID
 *     filename: string,
 *     size_mb: number,
 *     page_count: number | null,
 *     chunk_count: number,
 *     status: "indexed" | "processing" | "failed" | "pending",
 *     uploaded_at: string,  // "2025-04-06"
 *     error_message: string | null
 *   }
 * ]
 */
export function getDocuments() {
  return request("GET", "/documents");
}

/**
 * DELETE /documents/:id
 * Removes document from ChromaDB (all chunks with this doc_id)
 * AND from PostgreSQL documents table.
 *
 * Expected response: { success: true }
 */
export function deleteDocument(docId) {
  return request("DELETE", `/documents/${docId}`);
}

// ════════════════════════════════════════════════════════════════
// INGESTION
// ════════════════════════════════════════════════════════════════

/**
 * POST /ingest
 * Uploads one or more files for processing.
 * FastAPI receives them as multipart/form-data with field "files".
 *
 * Expected response: { job_id: string }
 *
 * After this, poll getIngestStatus(job_id) until status === "indexed"
 */
export function uploadFiles(files) {
  const form = new FormData();
  // Backend expects a single file named "document"
  if (files && files.length > 0) {
    form.append("document", files[0]);
  }
  return request("POST", "/ingest", form, true);
}

/**
 * GET /ingest/status/:job_id
 * Poll this after uploadFiles() to track progress.
 *
 * Expected response:
 * {
 *   job_id: string,
 *   status: "pending" | "processing" | "indexed" | "failed",
 *   progress: number,       // 0–100
 *   doc_id: string | null,  // set when status === "indexed"
 *   error_message: string | null
 * }
 */
export function getIngestStatus(jobId) {
  return request("GET", `/ingest/status/${jobId}`);
}

/**
 * Polls /ingest/status until done or failed.
 * Calls onProgress(0-100) on each tick.
 * Returns the final status response.
 */
export function pollUntilDone(jobId, onProgress, intervalMs = 1500) {
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const data = await getIngestStatus(jobId);
        
        // Defensive check: if backend returns null or empty response
        if (!data) return;

        onProgress(data.progress ?? 0, data.status);
        
        if (data.status === "indexed" || data.status === "failed") {
          clearInterval(timer);
          resolve(data);
        }
      } catch (err) {
        clearInterval(timer);
        reject(err);
      }
    }, intervalMs);
  });
}

// ════════════════════════════════════════════════════════════════
// QUERY
// ════════════════════════════════════════════════════════════════

/**
 * POST /query
 * Runs a RAG query against your indexed documents.
 *
 * Request body:
 * {
 *   query: string,
 *   top_k: number,           // how many chunks to retrieve
 *   doc_filter: string|null, // doc_id to search within one doc only
 *   stream: false            // set true for streaming (use streamQuery instead)
 * }
 *
 * Expected response:
 * {
 *   answer: string,
 *   sources: [
 *     {
 *       file: string,         // filename
 *       page: number | null,  // page number from metadata
 *       chunk_preview: string,// first 200 chars of the chunk
 *       score: number         // relevance score 0.0–1.0
 *     }
 *   ],
 *   latency_ms: number
 * }
 */
export async function sendQuery(query, topK, docFilter) {
  const data = await request("POST", "/query", {
    query,
    top_k: topK,
    doc_filter: docFilter === "all" ? null : docFilter,
    stream: false,
  });

  // Backend might return { answer: "..." } or { response: "..." }
  // We normalize it here so the UI components don't need to check both.
  return {
    answer: data.answer || data.response || "",
    sources: data.sources || [],
    latency_ms: data.latency_ms || 0
  };
}

/**
 * Streaming version of sendQuery.
 * FastAPI must return text/event-stream with SSE events:
 *   data: {"type":"token","text":"..."}    ← each token
 *   data: {"type":"done","sources":[...]}  ← final metadata
 */
export async function streamQuery(query, topK, docFilter, onToken, onDone) {
  const res = await fetch(`${API_BASE_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(API_KEY ? { "X-API-Key": API_KEY } : {}) },
    body: JSON.stringify({ query, top_k: topK, doc_filter: docFilter === "all" ? null : docFilter, stream: true }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      try {
        const json = JSON.parse(line.slice(5).trim());
        if (json.type === "token") onToken(json.text);
        if (json.type === "done")  onDone(json);
      } catch (_) {}
    }
  }
}

// ════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════

/**
 * GET /config
 * Returns current pipeline configuration.
 *
 * Expected response:
 * {
 *   chunk_size: number,
 *   chunk_overlap: number,
 *   top_k: number,
 *   search_type: "hybrid" | "vector" | "bm25",
 *   reranker: boolean,
 *   temperature: number,
 *   model: string,
 *   stream: boolean
 * }
 */
export function getConfig() {
  return request("GET", "/config");
}

/**
 * POST /config
 * Saves pipeline configuration.
 * Same shape as GET /config response.
 */
export function saveConfig(config) {
  return request("POST", "/config", config);
}

// ════════════════════════════════════════════════════════════════
// HEALTH
// ════════════════════════════════════════════════════════════════

/**
 * GET /health
 * Expected response:
 * {
 *   status: "ok" | "error",
 *   chroma_connected: boolean,
 *   model_loaded: boolean,
 *   doc_count: number
 * }
 */
export function getHealth() {
  return request("GET", "/health");
}
