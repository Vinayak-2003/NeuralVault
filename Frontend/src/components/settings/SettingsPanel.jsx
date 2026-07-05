import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toggle, Btn, Spinner } from "../ui";
import { useConfig } from "../../hooks/useConfig";
import { API_BASE_URL } from "../../services/api";

/* ── Icons ──────────────────────────────────────────────── */
const IconCpu = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    <rect x="9" y="9" width="6" height="6"/>
    <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
    <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
    <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
    <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
  </svg>
);
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const IconSparkles = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
  </svg>
);
const IconCode = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);
const IconBook = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const IconInfo = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

/* ── Models & types ─────────────────────────────────────── */
const MODELS = [
  { value: "groq/llama-3.3-70b",  label: "Groq · LLaMA 3.3 70B  (Recommended)" },
  { value: "groq/mixtral-8x7b",   label: "Groq · Mixtral 8×7B" },
  { value: "ollama/mistral",       label: "Ollama · Mistral 7B  (Local, free)" },
  { value: "ollama/llama3",        label: "Ollama · LLaMA 3 8B  (Local, free)" },
];

const SEARCH_TYPES = [
  { value: "hybrid", label: "Hybrid — Vector + BM25  (Recommended)" },
  { value: "vector", label: "Vector only — Semantic similarity" },
  { value: "bm25",   label: "BM25 only — Keyword matching" },
];

const API_DOCS = [
  { method: "POST",   path: "/ingest/",                  desc: "Upload files · multipart/form-data field 'files' → { job_id }" },
  { method: "GET",    path: "/ingest/status/{job_id}",   desc: "Poll progress → { status, progress: 0-100, doc_id }" },
  { method: "GET",    path: "/documents/",               desc: "List all docs with metadata" },
  { method: "DELETE", path: "/documents/{id}",           desc: "Remove from Qdrant + PostgreSQL" },
  { method: "POST",   path: "/query/",                   desc: "{ query, top_k, doc_filter } → { answer, sources, latency_ms }" },
  { method: "GET",    path: "/config/",                  desc: "Get current pipeline configuration" },
  { method: "POST",   path: "/config/",                  desc: "Save pipeline configuration" },
  { method: "GET",    path: "/health/",                  desc: "Backend + Qdrant + model health status" },
];

const METHOD_COLOR  = { GET: "var(--green)", POST: "var(--amber)", DELETE: "var(--red)" };
const METHOD_BG     = { GET: "var(--green-dim)", POST: "var(--amber-dim)", DELETE: "var(--red-dim)" };

/* ── Section divider ────────────────────────────────────── */
function Section({ title, icon: Icon }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      margin: "28px 0 14px",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "var(--radius-sm)",
        background: "var(--bg-raised)",
        border: "1px solid var(--border-base)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-secondary)", flexShrink: 0,
      }}>
        <Icon />
      </div>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
        color: "var(--text-primary)", textTransform: "uppercase",
        fontFamily: "var(--font-display)",
      }}>
        {title}
      </div>
      <div style={{
        flex: 1, height: 1,
        background: "linear-gradient(90deg, var(--border-strong), transparent)",
      }} />
    </div>
  );
}

/* ── Inline tooltip ─────────────────────────────────────── */
function InfoTip({ hint }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: "relative", display: "inline-flex", cursor: "help" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ color: "var(--text-disabled)", lineHeight: 1 }}><IconInfo /></span>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}  
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
              transform: "translateX(-50%)", zIndex: 999,
              background: "var(--bg-overlay)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius)",
              padding: "8px 12px",
              fontSize: 11.5, color: "var(--text-secondary)",
              maxWidth: 260, lineHeight: 1.55,
              boxShadow: "var(--shadow)",
              fontFamily: "var(--font-body)",
              whiteSpace: "normal",
            }}
          >
            {hint}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Config Row ─────────────────────────────────────────── */
function Row({ label, hint, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ borderColor: "var(--border-base)" }}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        background: "var(--bg-raised)", border: "1px solid var(--border-dim)",
        borderRadius: "var(--radius)", padding: "14px 18px",
        flexWrap: "wrap", rowGap: 10,
        transition: "border-color var(--transition), box-shadow var(--transition)",
      }}
    >
      <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8 }}>
        <div>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 600,
            fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.3,
          }}>
            {label}
          </div>
        </div>
        {hint && <InfoTip hint={hint} />}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </motion.div>
  );
}

const fieldBase = {
  background: "var(--bg-subtle)", border: "1px solid var(--border-base)",
  color: "var(--text-primary)", borderRadius: "var(--radius-sm)",
  padding: "7px 12px", fontSize: 13, outline: "none",
  fontFamily: "var(--font-mono)", transition: "border-color var(--transition)",
};

function Num({ value, onChange, step = 1, min, max }) {
  return (
    <input
      type="number" value={value} step={step} min={min} max={max}
      onChange={e => onChange(Number(e.target.value))}
      style={{ ...fieldBase, width: 100, textAlign: "center" }}
      onFocus={e => (e.target.style.borderColor = "var(--border-accent)")}
      onBlur={e  => (e.target.style.borderColor = "var(--border-base)")}
    />
  );
}

function Sel({ value, onChange, options }) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      style={{ ...fieldBase, cursor: "pointer", minWidth: 220 }}
      onFocus={e => (e.target.style.borderColor = "var(--border-accent)")}
      onBlur={e  => (e.target.style.borderColor = "var(--border-base)")}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export default function SettingsPanel() {
  const { local, update, save, saving, saved, error } = useConfig();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100dvh", minWidth: 0 }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        padding: "0 24px",
        height: "var(--header-height, 56px)",
        borderBottom: "1px solid var(--border-dim)",
        background: "rgba(4,4,10,0.9)", backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>
            Pipeline Configuration
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1, fontFamily: "var(--font-body)" }}>
            Tune ingestion, retrieval, and generation ·{" "}
            <code style={{ color: "var(--accent-bright)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
              {API_BASE_URL}
            </code>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {error && <span style={{ fontSize: 11.5, color: "var(--red)", fontFamily: "var(--font-body)" }}>⚠ {error}</span>}
          <Btn onClick={save} disabled={saving} variant={saved ? "success" : "primary"}>
            {saving ? <><Spinner size={13} color="#fff" /> Saving…</> : saved ? (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Saved!</>
            ) : (
              <>Save Config</>
            )}
          </Btn>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 60px", background: "var(--bg-base)" }}>
        <div style={{ maxWidth: 760 }}>

          {/* Ingestion */}
          <Section title="Ingestion" icon={IconCpu} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Row label="Chunk Size" hint="Characters per text chunk. 400–800 is optimal for most document types. Smaller chunks = more precise embeddings but more entries.">
              <Num value={local.chunk_size} onChange={v => update("chunk_size", v)} step={50} min={100} max={2000} />
            </Row>
            <Row label="Chunk Overlap" hint="Characters shared between consecutive chunks. Preserves context across chunk boundaries and prevents information loss at split points.">
              <Num value={local.chunk_overlap} onChange={v => update("chunk_overlap", v)} step={10} min={0} max={500} />
            </Row>
          </div>

          {/* Retrieval */}
          <Section title="Retrieval" icon={IconSearch} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Row label="Top K" hint="Number of chunks retrieved before the reranker scores them. Higher K = more candidates + more context, but slightly slower.">
              <Num value={local.top_k} onChange={v => update("top_k", v)} min={1} max={20} />
            </Row>
            <Row label="Search Strategy" hint="Hybrid combines semantic vector search with BM25 keyword matching for the best coverage. Each approach fills the other's blind spots.">
              <Sel value={local.search_type} onChange={v => update("search_type", v)} options={SEARCH_TYPES} />
            </Row>
            <Row label="CrossEncoder Reranker" hint="Reads the query and each chunk together for precise relevance scoring. Adds ~150–300ms latency but significantly improves answer accuracy.">
              <Toggle value={local.reranker} onChange={v => update("reranker", v)} />
            </Row>
          </div>

          {/* Generation */}
          <Section title="Generation" icon={IconSparkles} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Row label="LLM Model" hint="Language model that generates the final answer from retrieved context. Groq is fast + free-tier. Ollama runs fully locally with no API key.">
              <Sel value={local.model} onChange={v => update("model", v)} options={MODELS} />
            </Row>
            <Row label="Temperature" hint="Controls creativity. 0.0–0.3 produces factual, grounded answers. Higher values are more creative but may drift from source context.">
              <Num value={local.temperature} onChange={v => update("temperature", v)} step={0.1} min={0} max={1.5} />
            </Row>
            <Row label="Stream Responses" hint="Sends tokens to the frontend as they are generated for instant feedback. Makes the UI feel much faster. Requires FastAPI streaming support.">
              <Toggle value={local.stream} onChange={v => update("stream", v)} />
            </Row>
          </div>

          {/* API Reference */}
          <Section title="Backend API Reference" icon={IconCode} />
          <div style={{
            background: "var(--bg-raised)", border: "1px solid var(--border-dim)",
            borderRadius: "var(--radius-lg)", overflow: "hidden",
          }}>
            {API_DOCS.map(({ method, path, desc }, i) => (
              <motion.div
                key={i}
                whileHover={{ background: "var(--bg-overlay)" }}
                transition={{ duration: 0.12 }}
                style={{
                  display: "flex", gap: 12, padding: "12px 18px",
                  borderBottom: i < API_DOCS.length - 1 ? "1px solid var(--border-dim)" : "none",
                  alignItems: "flex-start", flexWrap: "wrap", rowGap: 5,
                }}
              >
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                  color: METHOD_COLOR[method],
                  background: METHOD_BG[method],
                  border: `1px solid ${METHOD_COLOR[method]}30`,
                  borderRadius: "var(--radius-sm)", padding: "2px 9px", flexShrink: 0,
                  fontFamily: "var(--font-mono)",
                }}>
                  {method}
                </span>
                <code style={{
                  fontSize: 12, color: "var(--accent-bright)",
                  fontFamily: "var(--font-mono)", flexShrink: 0, lineHeight: 1.9,
                }}>
                  {path}
                </code>
                <span style={{
                  fontSize: 12, color: "var(--text-tertiary)",
                  lineHeight: 1.9, fontFamily: "var(--font-body)",
                }}>
                  {desc}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Integration guide */}
          <Section title="Integration Guide" icon={IconBook} />
          <div style={{
            background: "var(--accent-dim)",
            border: "1px solid rgba(124,111,247,0.2)",
            borderRadius: "var(--radius-lg)", padding: "20px 22px",
          }}>
            <div style={{
              fontFamily: "var(--font-display)", fontWeight: 700,
              fontSize: 14, color: "var(--accent-bright)", marginBottom: 16,
            }}>
              5 steps to connect your FastAPI backend
            </div>

            {[
              { file: "src/services/api.js",         action: "Change API_BASE_URL to your server URL" },
              { file: "src/store/AppContext.jsx",     action: "Uncomment REAL block in init() — loads docs + config" },
              { file: "src/hooks/useUpload.js",       action: "Uncomment REAL blocks in upload() and deleteDoc()" },
              { file: "src/hooks/useChat.js",         action: "Uncomment REAL block in send() — calls /query endpoint" },
              { file: "src/hooks/useConfig.js",       action: "Uncomment REAL block in save() — calls /config endpoint" },
            ].map(({ file, action }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: "rgba(124,111,247,0.15)",
                  border: "1px solid rgba(124,111,247,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10.5, fontWeight: 700, color: "var(--accent-bright)",
                  fontFamily: "var(--font-display)",
                }}>
                  {i + 1}
                </span>
                <div>
                  <code style={{
                    color: "var(--text-primary)", fontFamily: "var(--font-mono)",
                    fontSize: 11.5, background: "rgba(0,0,0,0.2)", padding: "1px 6px",
                    borderRadius: 4,
                  }}>
                    {file}
                  </code>
                  <span style={{
                    color: "var(--text-secondary)", marginLeft: 8,
                    fontSize: 12, fontFamily: "var(--font-body)",
                  }}>
                    — {action}
                  </span>
                </div>
              </motion.div>
            ))}

            {/* CORS snippet */}
            <div style={{
              marginTop: 16, padding: "14px 16px",
              background: "rgba(0,0,0,0.3)", borderRadius: "var(--radius)",
              border: "1px solid var(--border-dim)",
              fontFamily: "var(--font-mono)", fontSize: 11.5,
              color: "var(--text-secondary)", lineHeight: 1.8, whiteSpace: "pre",
            }}>
{`# Add CORS to your FastAPI main.py:
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware,
  allow_origins=["http://localhost:3000"],
  allow_methods=["*"], allow_headers=["*"])`}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
