import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Spinner, SourceChip, Btn } from "../ui";
import { useChat } from "../../hooks/useChat";
import { useApp } from "../../store/AppContext";
import logo from "../../assets/logo.png";

const SUGGESTIONS = [
  { icon: "🔍", text: "What is RAG and how does the pipeline work?" },
  { icon: "⚡", text: "Explain the difference between MMR and similarity search" },
  { icon: "🎯", text: "How does the CrossEncoder reranker improve accuracy?" },
  { icon: "✂️", text: "What types of text splitters are available in LangChain?" },
  { icon: "🗄️", text: "Compare vector store vs vector database" },
];

/* ── AI Thinking Animation ──────────────────────────────── */
function ThinkingAnimation() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
      <div style={{ display: "flex", gap: 5 }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ y: [0, -7, 0], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.22, ease: "easeInOut" }}
            style={{
              width: 7, height: 7, borderRadius: "50%",
              background: `linear-gradient(135deg, var(--accent), var(--accent-secondary))`,
            }}
          />
        ))}
      </div>
      <span style={{
        fontSize: 11.5, color: "var(--text-tertiary)",
        fontFamily: "var(--font-body)",
        display: "flex", alignItems: "center", gap: 5,
      }}>
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Retrieving context
        </motion.span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ color: "var(--accent-bright)", opacity: 0.7 }}>Generating answer</span>
      </span>
    </div>
  );
}

/* ── Markdown Renderer ──────────────────────────────────── */
const mdComponents = {
  p:    ({ children }) => <p style={{ margin: "0 0 9px", lineHeight: 1.75, color: "var(--text-primary)" }}>{children}</p>,
  h1:   ({ children }) => <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, margin: "16px 0 10px", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{children}</h1>,
  h2:   ({ children }) => <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, margin: "14px 0 8px", color: "var(--text-primary)", letterSpacing: "-0.015em" }}>{children}</h2>,
  h3:   ({ children }) => <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, margin: "12px 0 6px", color: "var(--accent-bright)" }}>{children}</h3>,
  strong:({ children }) => <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>{children}</strong>,
  em:   ({ children }) => <em style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>{children}</em>,
  code: ({ inline, children }) => inline
    ? <code style={{ background: "var(--bg-muted)", border: "1px solid var(--border-base)", borderRadius: 5, padding: "1px 7px", fontSize: 11.5, color: "var(--accent-bright)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{children}</code>
    : <pre style={{ background: "var(--bg-base)", border: "1px solid var(--border-base)", borderRadius: "var(--radius-sm)", padding: "14px 16px", overflowX: "auto", margin: "10px 0", boxShadow: "inset 0 1px 0 var(--border-dim)" }}><code style={{ fontSize: 11.5, color: "var(--text-secondary)", fontFamily: "var(--font-mono)", lineHeight: 1.7 }}>{children}</code></pre>,
  ul:   ({ children }) => <ul style={{ paddingLeft: 20, margin: "6px 0 10px" }}>{children}</ul>,
  ol:   ({ children }) => <ol style={{ paddingLeft: 20, margin: "6px 0 10px" }}>{children}</ol>,
  li:   ({ children }) => <li style={{ margin: "4px 0", color: "var(--text-secondary)", lineHeight: 1.65 }}>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: "3px solid var(--accent)", paddingLeft: 14, margin: "10px 0",
      color: "var(--text-secondary)", background: "var(--accent-dim)",
      borderRadius: "0 var(--radius-sm) var(--radius-sm) 0", padding: "8px 14px",
    }}>
      {children}
    </blockquote>
  ),
  hr: () => <hr style={{ border: "none", borderTop: "1px solid var(--border-dim)", margin: "12px 0" }} />,
};

/* ── Copy Button ────────────────────────────────────────── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <motion.button
      onClick={copy}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      style={{
        background: copied ? "var(--green-dim)" : "var(--bg-muted)",
        border: `1px solid ${copied ? "rgba(0,229,160,0.25)" : "var(--border-base)"}`,
        color: copied ? "var(--green)" : "var(--text-tertiary)",
        borderRadius: "var(--radius-sm)", padding: "4px 10px",
        fontSize: 10.5, cursor: "pointer", letterSpacing: "0.04em",
        display: "flex", alignItems: "center", gap: 5,
        transition: "all var(--transition)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {copied ? (
        <><span>✓</span> Copied</>
      ) : (
        <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</>
      )}
    </motion.button>
  );
}

/* ── Message Bubble ─────────────────────────────────────── */
function Bubble({ msg }) {
  const isUser = msg.role === "user";
  const time = msg.ts ? new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      style={{
        display: "flex", gap: 12,
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        background: isUser
          ? "linear-gradient(135deg, var(--accent) 0%, var(--accent-secondary) 100%)"
          : "var(--bg-overlay)",
        border: `1.5px solid ${isUser ? "rgba(124,111,247,0.4)" : "var(--border-base)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13,
        color: isUser ? "#fff" : "var(--accent-bright)",
        boxShadow: isUser ? "var(--glow-sm)" : "none",
        overflow: "hidden", position: "relative",
      }}>
        {isUser ? "V" : (
          <>
            <img src={logo} alt="AI" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {msg.loading && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "2px solid transparent",
                borderTopColor: "var(--accent-bright)",
                animation: "spin 1s linear infinite",
              }} />
            )}
          </>
        )}
      </div>

      {/* Content */}
      <div style={{ maxWidth: "78%", minWidth: 80 }}>
        <div style={{
          background: isUser
            ? "linear-gradient(135deg, rgba(124,111,247,0.12), rgba(224,86,199,0.06))"
            : "var(--bg-raised)",
          border: `1px solid ${isUser ? "rgba(124,111,247,0.22)" : "var(--border-dim)"}`,
          borderRadius: isUser ? "18px 5px 18px 18px" : "5px 18px 18px 18px",
          padding: "13px 17px",
          color: "var(--text-primary)", fontSize: 13, lineHeight: 1.7,
          boxShadow: isUser ? "none" : "var(--shadow-xs)",
          position: "relative",
        }}>
          {msg.loading ? <ThinkingAnimation /> : (
            <ReactMarkdown components={mdComponents}>{msg.text}</ReactMarkdown>
          )}
        </div>

        {/* ── Bottom meta row */}
        <div style={{
          display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
          alignItems: "center", gap: 10, marginTop: 6, paddingInline: 4,
          flexWrap: "wrap", rowGap: 4,
        }}>
          {/* Timestamp */}
          {time && (
            <span style={{ fontSize: 10, color: "var(--text-disabled)", fontFamily: "var(--font-mono)" }}>
              {time}
            </span>
          )}

          {/* Confidence + latency */}
          {msg.score != null && (
            <span style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>
              Confidence{" "}
              <span style={{
                color: msg.score > 0.75 ? "var(--green)" : "var(--amber)",
                fontWeight: 700,
              }}>
                {Math.round(msg.score * 100)}%
              </span>
            </span>
          )}
          {msg.latency_ms != null && (
            <span style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>
              ⏱ {msg.latency_ms}ms
            </span>
          )}

          {/* Copy button (AI only) */}
          {!isUser && !msg.loading && msg.text && (
            <CopyBtn text={msg.text} />
          )}
        </div>

        {/* ── Source citations */}
        {msg.sources?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ease: "easeOut" }}
            style={{ marginTop: 8, paddingInline: 2 }}
          >
            <div style={{
              fontSize: 9.5, color: "var(--text-disabled)",
              letterSpacing: "0.1em", fontWeight: 700,
              fontFamily: "var(--font-display)", marginBottom: 6,
            }}>
              SOURCES
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {msg.sources.map((s, i) => (
                <SourceChip key={i} file={s.file} page={s.page} score={s.score} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Empty / Welcome State ──────────────────────────────── */
function WelcomeState({ onSuggest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 24px", gap: 32, textAlign: "center",
      }}
    >
      {/* Animated orb */}
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", inset: -4,
            borderRadius: "50%",
            border: "1px dashed rgba(124,111,247,0.3)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,111,247,0.25) 0%, rgba(224,86,199,0.1) 60%, transparent 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid rgba(124,111,247,0.3)",
            boxShadow: "0 0 40px rgba(124,111,247,0.2)",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#grad1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a89fff"/>
                <stop offset="100%" stopColor="#e056c7"/>
              </linearGradient>
            </defs>
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
        </motion.div>
      </div>

      {/* Heading */}
      <div>
        <h1 className="text-gradient" style={{
          fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: 26, letterSpacing: "-0.03em", marginBottom: 10,
        }}>
          Ask your knowledge base
        </h1>
        <p style={{
          fontSize: 13.5, color: "var(--text-tertiary)",
          maxWidth: 420, lineHeight: 1.7, fontFamily: "var(--font-body)",
        }}>
          Upload documents in the Library tab, then ask questions here.
          NeuralVault uses hybrid retrieval and AI to surface the exact answer.
        </p>
      </div>

      {/* Feature pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {["Hybrid BM25 + Vector Search", "CrossEncoder Reranker", "Source Citations", "Streaming Answers"].map(f => (
          <span key={f} style={{
            padding: "5px 14px", borderRadius: 99,
            background: "var(--accent-dim)",
            border: "1px solid rgba(124,111,247,0.2)",
            fontSize: 11.5, color: "var(--accent-bright)",
            fontFamily: "var(--font-body)", fontWeight: 500,
          }}>
            {f}
          </span>
        ))}
      </div>

      {/* Suggestions */}
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div className="section-label" style={{ marginBottom: 12, textAlign: "center" }}>
          TRY ASKING
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {SUGGESTIONS.slice(0, 4).map((s, i) => (
            <motion.button
              key={i}
              onClick={() => onSuggest(s.text)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              whileHover={{ y: -2, borderColor: "var(--border-accent)" }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: "var(--bg-raised)", border: "1px solid var(--border-dim)",
                borderRadius: "var(--radius)", padding: "12px 14px",
                cursor: "pointer", textAlign: "left",
                transition: "all var(--transition)",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
              <span style={{
                fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5,
                fontFamily: "var(--font-body)",
              }}>
                {s.text}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Chat Panel (Main) ──────────────────────────────────── */
export default function ChatPanel() {
  const { state }  = useApp();
  const { docs, config } = state;
  const { messages, send, clearChat, loading } = useChat(config);

  const [input,  setInput] = useState("");
  const [filter, setFilter] = useState("all");
  const bottomRef = useRef(null);
  const textRef   = useRef(null);
  const showWelcome = messages.length <= 1;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || loading) return;
    send(input.trim(), filter);
    setInput("");
    if (textRef.current) textRef.current.style.height = "auto";
  }, [input, loading, send, filter]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  const indexedDocs = docs.filter(d => d.status === "indexed");
  const canSend = !!input.trim() && !loading;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100dvh", minWidth: 0 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        padding: "0 24px",
        height: "var(--header-height, 56px)",
        borderBottom: "1px solid var(--border-dim)",
        background: "rgba(4,4,10,0.9)",
        backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", gap: 12,
        flexShrink: 0, flexWrap: "wrap", rowGap: 6,
      }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: 15, letterSpacing: "-0.02em",
          }}>
            Knowledge Chat
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1, fontFamily: "var(--font-body)" }}>
            {indexedDocs.length} doc{indexedDocs.length !== 1 ? "s" : ""}{" "}
            · Hybrid retrieval · CrossEncoder reranker
          </div>
        </div>

        {/* Doc filter - custom styled */}
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            padding: "6px 12px", fontSize: 12, cursor: "pointer",
            borderRadius: "var(--radius-sm)", maxWidth: 200,
            background: "var(--bg-raised)",
            border: "1px solid var(--border-base)",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-body)",
          }}
        >
          <option value="all">All documents</option>
          {indexedDocs.map(d => (
            <option key={d.id} value={d.id}>{d.filename}</option>
          ))}
        </select>

        {messages.length > 1 && (
          <Btn variant="ghost" size="sm" onClick={clearChat}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            Clear
          </Btn>
        )}
      </div>

      {/* ── Messages area ──────────────────────────────────────── */}
      <div
        className="grid-texture"
        style={{
          flex: 1, overflowY: "auto", background: "var(--bg-base)",
          display: "flex", flexDirection: "column",
        }}
      >
        {showWelcome ? (
          <WelcomeState onSuggest={setInput} />
        ) : (
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
            <AnimatePresence initial={false}>
              {messages.map(m => <Bubble key={m.id} msg={m} />)}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input strip ────────────────────────────────────────── */}
      <div style={{
        padding: "10px 20px",
        borderTop: "1px solid var(--border-dim)",
        background: "rgba(4,4,10,0.97)",
        backdropFilter: "blur(20px)",
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          background: "var(--bg-raised)",
          border: `1.5px solid ${input ? "var(--border-accent)" : "var(--border-base)"}`,
          borderRadius: "var(--radius-lg)",
          padding: "7px 8px 7px 16px",
          boxShadow: input
            ? "0 0 0 3px var(--accent-dim), var(--shadow-sm)"
            : "var(--shadow-sm)",
          transition: "border-color var(--transition), box-shadow var(--transition)",
        }}>
          <textarea
            ref={textRef}
            value={input}
            onChange={handleTextChange}
            onKeyDown={handleKey}
            placeholder="Ask anything about your documents…"
            rows={1}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "var(--text-primary)", fontSize: 13.5, lineHeight: 1.5,
              resize: "none", maxHeight: 140, overflowY: "auto",
              fontFamily: "var(--font-body)", padding: "3px 0", boxShadow: "none",
            }}
          />

          {/* Send button */}
          <motion.button
            onClick={handleSend}
            disabled={!canSend}
            animate={{
              background: canSend
                ? ["linear-gradient(135deg, #7c6ff7, #e056c7)", "linear-gradient(135deg, #e056c7, #7c6ff7)"]
                : "var(--bg-muted)",
            }}
            transition={{ duration: 2, repeat: canSend ? Infinity : 0, repeatType: "reverse" }}
            whileHover={canSend ? { scale: 1.08 } : {}}
            whileTap={canSend ? { scale: 0.92 } : {}}
            style={{
              width: 34, height: 34, borderRadius: "var(--radius)",
              border: "none", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 15,
              boxShadow: canSend ? "var(--glow-sm)" : "none",
              cursor: canSend ? "pointer" : "not-allowed",
              opacity: canSend ? 1 : 0.4,
            }}
          >
            {loading ? <Spinner size={15} color="#fff" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
            )}
          </motion.button>
        </div>

        {/* Footer hint */}
        <div style={{
          fontSize: 10, color: "var(--text-disabled)",
          marginTop: 6, textAlign: "center",
          letterSpacing: "0.04em", fontFamily: "var(--font-mono)",
        }}>
          LangChain · ChromaDB · CrossEncoder Reranker
          <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
          Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
