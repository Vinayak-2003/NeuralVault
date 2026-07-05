import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileIcon, StatusBadge, Btn, ProgressBar, Empty, Spinner } from "../ui";
import { useUpload, useDeleteDoc } from "../../hooks/useUpload";
import { useApp } from "../../store/AppContext";

const ALLOWED = [".pdf", ".txt", ".docx", ".md", ".csv"];

const FILE_TYPE_COLORS = {
  pdf:  { bg: "var(--red-dim)",    border: "rgba(239,68,68,0.18)",  text: "var(--red)" },
  txt:  { bg: "var(--accent-dim)", border: "rgba(99,102,241,0.18)", text: "var(--accent-bright)" },
  docx: { bg: "var(--green-dim)",  border: "rgba(16,185,129,0.18)", text: "var(--green)" },
  md:   { bg: "var(--amber-dim)",  border: "rgba(245,158,11,0.18)", text: "var(--amber)" },
  csv:  { bg: "var(--blue-dim)",   border: "rgba(59,130,246,0.18)", text: "var(--blue)" },
};

/* ── Pipeline Steps ───────────────────────────────────────────────── */
const STEPS = [
  { key: "pending",    label: "Uploaded",  icon: "↑" },
  { key: "processing", label: "Loading",   icon: "📄" },
  { key: "splitted",   label: "Splitting", icon: "✂️" },
  { key: "chunked",    label: "Embedding", icon: "⚡" },
  { key: "indexed",    label: "Indexed",   icon: "✓" },
];

function PipelineStepper({ status, progress }) {
  const currentIdx = STEPS.findIndex(s => s.key === status);

  return (
    <div>
      {/* Step row */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 16 }}>
        {STEPS.map((step, i) => {
          const done   = i < currentIdx;
          const active = i === currentIdx;
          const color  = done || active ? (done ? "var(--green)" : "var(--accent-bright)") : "var(--text-disabled)";

          return (
            <React.Fragment key={step.key}>
              {/* Step node */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
                <motion.div
                  animate={active ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: done ? "var(--green-dim)" : active ? "var(--accent-dim)" : "var(--bg-muted)",
                    border: `1.5px solid ${done ? "rgba(16,185,129,0.4)" : active ? "var(--border-accent)" : "var(--border-dim)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: done ? 13 : 14,
                    boxShadow: "none",
                    color,
                    animation: done ? "step-complete 0.4s ease" : "none",
                  }}
                >
                  {done ? "✓" : step.icon}
                </motion.div>
                <div style={{
                  fontSize: 9.5, color, fontWeight: active ? 700 : 500,
                  letterSpacing: "0.06em", whiteSpace: "nowrap",
                  fontFamily: "var(--font-display)",
                }}>
                  {step.label}
                </div>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 1.5, position: "relative",
                  background: i < currentIdx ? "var(--green)" : "var(--border-dim)",
                  marginBottom: 22, marginInline: 4,
                  borderRadius: 1,
                  transition: "background 0.4s",
                  overflow: "hidden",
                }}>
                  {i === currentIdx - 1 && (
                    <div
                      style={{
                        position: "absolute", inset: 0,
                        background: "var(--green)",
                        opacity: 0.8,
                      }}
                    />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress bar */}
      <ProgressBar value={progress} label={
        STEPS.find(s => s.key === status)?.label || "Processing"
      } />
    </div>
  );
}

/* ── Drop Zone ────────────────────────────────────────────────────── */
function DropZone({ onFiles, uploading }) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef(null);

  const handle = (raw) => {
    const files = Array.from(raw).filter(f => ALLOWED.some(e => f.name.toLowerCase().endsWith(e)));
    if (files.length) onFiles(files);
  };

  return (
    <motion.div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
      onClick={() => !uploading && ref.current?.click()}
      animate={{
        borderColor: dragging ? "var(--accent)" : "var(--border-base)",
        background: dragging ? "var(--bg-subtle)" : "var(--bg-raised)",
      }}
      transition={{ duration: 0.2 }}
      style={{
        border: "2px dashed var(--border-base)",
        borderRadius: "var(--radius-xl)",
        padding: "36px 24px",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 16,
        cursor: uploading ? "not-allowed" : "pointer",
        textAlign: "center",
        boxShadow: "none",
        transition: "border-color 0.2s, background 0.2s",
        position: "relative", overflow: "hidden",
      }}
    >
      <input
        ref={ref} type="file"
        accept={ALLOWED.join(",")}
        multiple
        style={{ display: "none" }}
        onChange={e => handle(e.target.files)}
      />

      {/* Icon */}
      <motion.div
        animate={{
          scale: dragging ? 1.15 : uploading ? [1, 1.03, 1] : 1,
          rotate: dragging ? [0, -5, 5, 0] : 0,
        }}
        transition={{
          scale: uploading ? { duration: 1.2, repeat: Infinity } : {},
          rotate: { duration: 0.4 },
        }}
        style={{
          width: 64, height: 64, borderRadius: "var(--radius-lg)",
          background: dragging ? "var(--accent-dim)" : "var(--bg-muted)",
          border: `1px solid ${dragging ? "var(--border-accent)" : "var(--border-dim)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
          boxShadow: "none",
          transition: "all 0.2s",
        }}
      >
        {uploading ? (
          <Spinner size={24} color="var(--accent-bright)" />
        ) : dragging ? "📥" : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="url(#uploadGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="uploadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a89fff"/>
                <stop offset="100%" stopColor="#e056c7"/>
              </linearGradient>
            </defs>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        )}
      </motion.div>

      <div>
        <div style={{
          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
          color: "var(--text-primary)", marginBottom: 6,
        }}>
          {uploading ? "Processing your documents…" : dragging ? "Release to upload" : "Upload Documents"}
        </div>
        <div style={{
          fontSize: 12.5, color: "var(--text-tertiary)", lineHeight: 1.6,
          fontFamily: "var(--font-body)",
        }}>
          {uploading
            ? "Chunking → Embedding → Storing in ChromaDB"
            : "Drag & drop or click to browse"
          }
        </div>
      </div>

      {/* File type pills */}
      {!uploading && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {ALLOWED.map(ext => {
            const key = ext.replace(".", "");
            const c = FILE_TYPE_COLORS[key] || FILE_TYPE_COLORS.txt;
            return (
              <span key={ext} style={{
                padding: "3px 10px", borderRadius: 99, fontSize: 11,
                background: c.bg, border: `1px solid ${c.border}`,
                color: c.text, fontFamily: "var(--font-mono)", fontWeight: 600,
              }}>
                {ext.toUpperCase()}
              </span>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ── Document Card ────────────────────────────────────────────────── */
const DocCard = React.forwardRef(({ doc, onDelete, isDeleting }, ref) => {
  const [hover, setHover] = useState(false);
  const ext   = (doc.file_name || doc.filename || "").split(".").pop().toLowerCase();
  const color = (FILE_TYPE_COLORS[ext] || FILE_TYPE_COLORS.txt).text;

  const chunkPct = doc.status === "indexed" && doc.total_chunks
    ? 100
    : doc.status === "chunked" ? 75
    : doc.status === "splitted" ? 50
    : doc.status === "processing" ? 25 : 0;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.96 }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      style={{
        background: hover ? "var(--bg-overlay)" : "var(--bg-raised)",
        border: `1px solid ${hover ? "var(--border-base)" : "var(--border-dim)"}`,
        borderRadius: "var(--radius-lg)", padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 14,
        transition: "all var(--transition)",
        boxShadow: hover ? "var(--shadow-sm)" : "none",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Colored type accent — left bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0,
        width: 3, background: color, borderRadius: "var(--radius-lg) 0 0 var(--radius-lg)",
        opacity: 0.7,
      }} />

      <FileIcon filename={doc.file_name || doc.filename} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="truncate" title={doc.file_name || doc.filename} style={{
          fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14,
          color: "var(--text-primary)", marginBottom: 5,
        }}>
          {doc.file_name || doc.filename}
        </div>

        {/* Meta row */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "3px 12px",
          fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-body)",
        }}>
          <span>{(doc.file_size_mb || doc.size_mb)?.toFixed(2)} MB</span>
          {(doc.total_pages || doc.page_count) ? <span>{doc.total_pages || doc.page_count} pages</span> : null}
          <span>{doc.total_chunks ?? doc.chunk_count ?? 0} chunks</span>
          <span style={{ color: "var(--text-disabled)" }}>{doc.uploaded_at}</span>
        </div>

        {/* Mini progress bar (for non-indexed) */}
        {doc.status !== "indexed" && doc.status !== "failed" && (
          <div style={{ marginTop: 8 }}>
            <div style={{
              height: 2, background: "var(--bg-muted)", borderRadius: 1,
              overflow: "hidden", width: "100%",
            }}>
              <motion.div
                animate={{ width: `${chunkPct}%` }}
                transition={{ ease: "easeOut", duration: 0.4 }}
                style={{
                  height: "100%", borderRadius: 1,
                  background: "linear-gradient(90deg, var(--accent), var(--accent-secondary))",
                  boxShadow: "0 0 6px var(--accent-glow)",
                }}
              />
            </div>
          </div>
        )}

        {doc.error_message && (
          <div style={{ fontSize: 11, color: "var(--red)", marginTop: 5 }}>
            ⚠ {doc.error_message}
          </div>
        )}
      </div>

      <StatusBadge status={doc.status} />

      {/* Delete button — slides in on hover */}
      <AnimatePresence>
        {(hover || isDeleting) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => onDelete(doc.id)}
            disabled={isDeleting}
            whileHover={!isDeleting ? { scale: 1.1 } : {}}
            whileTap={!isDeleting ? { scale: 0.9 } : {}}
            style={{
              width: 32, height: 32, borderRadius: "var(--radius-sm)",
              background: "var(--red-dim)",
              color: "var(--red)", cursor: isDeleting ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            {isDeleting ? <Spinner size={12} color="var(--red)" /> : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
DocCard.displayName = "DocCard";

/* ── Docs Panel ───────────────────────────────────────────────────── */
export default function DocsPanel() {
  const { state } = useApp();
  const { docs } = state;
  const { upload, uploading, progress, status, error, clearError } = useUpload();
  const { deleteDoc, deleting } = useDeleteDoc();
  const [search, setSearch] = useState("");

  const filtered = (docs || []).filter(d => {
    const name = d.file_name || d.filename || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const totalChunks = docs.reduce((a, d) => a + (d.total_chunks || d.chunk_count || 0), 0);
  const totalPages  = docs.reduce((a, d) => a + (d.total_pages  || d.page_count  || 0), 0);
  const totalSizeMb = docs.reduce((a, d) => a + (d.file_size_mb || d.size_mb || 0), 0);
  const indexedCount= docs.filter(d => d.status === "indexed").length;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100dvh", minWidth: 0 }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        padding: "0 24px",
        height: "var(--header-height, 56px)",
        borderBottom: "1px solid var(--border-dim)",
        background: "rgba(4,4,10,0.9)", backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", gap: 12,
        flexShrink: 0, flexWrap: "wrap", rowGap: 6,
      }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>
            Document Library
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1, fontFamily: "var(--font-body)" }}>
            {docs.length} docs · {indexedCount} indexed · {totalChunks} chunks · {totalPages} pages · {totalSizeMb.toFixed(1)} MB
          </div>
        </div>

        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" style={{ position: "absolute", left: 10, pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            style={{
              width: 200, paddingLeft: 32, paddingRight: 12,
              paddingBlock: 7, fontSize: 12,
              borderRadius: "var(--radius-sm)", fontFamily: "var(--font-body)",
            }}
          />
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "22px", background: "var(--bg-base)" }}>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: "var(--red-dim)", border: "1px solid rgba(255,77,106,0.3)",
                borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 16,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: 13, color: "var(--red)", overflow: "hidden",
              }}
            >
              <span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 7, verticalAlign: "middle" }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </span>
              <button
                onClick={clearError}
                style={{ background: "none", border: "none", color: "var(--red)", fontSize: 18, cursor: "pointer" }}
              >×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop Zone */}
        <div style={{ marginBottom: 20 }}>
          <DropZone onFiles={upload} uploading={uploading} />
        </div>

        {/* Pipeline stepper */}
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden", marginBottom: 20 }}
            >
              <div style={{
                background: "var(--bg-raised)",
                border: "1px solid var(--border-accent)",
                borderRadius: "var(--radius-lg)",
                padding: "20px 22px",
                boxShadow: "var(--glow-sm), var(--shadow-sm)",
              }}>
                <PipelineStepper status={status} progress={progress} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document list */}
        {filtered.length > 0 ? (
          <motion.div layout style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <AnimatePresence mode="popLayout">
              {filtered.map(doc => (
                <DocCard key={doc.id} doc={doc} onDelete={deleteDoc} isDeleting={deleting === doc.id} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : docs.length > 0 && search ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", color: "var(--text-tertiary)", padding: 48, fontSize: 13 }}
          >
            No documents match "{search}"
          </motion.div>
        ) : !uploading && docs.length === 0 ? (
          <Empty
            icon={
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#emptyGrad)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="emptyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a89fff" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#e056c7" stopOpacity="0.5"/>
                  </linearGradient>
                </defs>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/> <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            }
            title="No documents yet"
            body="Upload a PDF, TXT, DOCX, Markdown, or CSV to start building your knowledge base."
          />
        ) : null}
      </div>
    </div>
  );
}
