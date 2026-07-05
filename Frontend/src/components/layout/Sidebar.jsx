import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PulseDot } from "../ui";
import { useApp } from "../../store/AppContext";
import logo from "../../assets/logo.png";

/* ── SVG Icons ─────────────────────────────────────────── */
const IconChat = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconDocs = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const IconSettings = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93l-1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2"/>
  </svg>
);
const IconServer = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
    <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
  </svg>
);
const IconDatabase = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);

const TABS = [
  { id: "chat",     Icon: IconChat,     label: "Chat",     sub: "Ask questions" },
  { id: "docs",     Icon: IconDocs,     label: "Library",  sub: "Manage docs" },
  { id: "settings", Icon: IconSettings, label: "Pipeline", sub: "Configure RAG" },
];

/* ── Animated Count ─────────────────────────────────────── */
function AnimatedStat({ value, label, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: "var(--bg-overlay)",
        border: "1px solid var(--border-dim)",
        borderRadius: "var(--radius)",
        padding: "12px 14px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle colored top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 2, background: `linear-gradient(90deg, ${color}, transparent)`,
        borderRadius: "var(--radius) var(--radius) 0 0",
      }} />
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800,
        color, lineHeight: 1, letterSpacing: "-0.04em",
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 9, color: "var(--text-tertiary)",
        letterSpacing: "0.14em", marginTop: 6,
        fontFamily: "var(--font-display)", fontWeight: 600,
      }}>
        {label}
      </div>
    </motion.div>
  );
}

/* ── Service Status Row ─────────────────────────────────── */
function ServiceRow({ label, online, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
      <span style={{ color: online ? "var(--green)" : "var(--text-disabled)", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 11, color: "var(--text-secondary)", flex: 1, fontFamily: "var(--font-body)" }}>
        {label}
      </span>
      <PulseDot color={online ? "var(--green)" : "var(--text-disabled)"} size={6} />
    </div>
  );
}

export default function Sidebar({ tab, setTab, open, setOpen }) {
  const { state } = useApp();
  const { docs, health, ready } = state;

  const indexed     = docs.filter(d => d.status === "indexed").length;
  const totalChunks = docs.reduce((a, d) => a + (d.total_chunks || d.chunk_count || 0), 0);
  const isOnline    = health?.status === "ok";

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="mobile-only"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(8px)",
              zIndex: 40,
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        className={open ? "" : "desktop-only"}
        style={{
          width: "var(--sidebar-width, 270px)",
          flexShrink: 0,
          background: "var(--glass-bg)",
          backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)",
          borderRight: "1px solid var(--glass-border)",
          display: "flex", flexDirection: "column",
          height: "100dvh", overflow: "hidden",
          zIndex: 50,
          position: open ? "fixed" : "relative",
          left: 0, top: 0, bottom: 0,
          boxShadow: "var(--shadow-xl), inset -1px 0 0 var(--border-dim)",
        }}
      >

        {/* ── Logo header */}
        <div style={{ padding: "22px 20px 0" }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}
          >
            {/* Logo */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <img
                src={logo}
                alt="NeuralVault"
                style={{
                  width: 40, height: 40, borderRadius: 11,
                  objectFit: "cover", position: "relative", zIndex: 1,
                  border: "1px solid var(--border-base)",
                }}
              />
            </div>
            
            <div>
              <div className="text-gradient" style={{
                fontFamily: "var(--font-display)", fontWeight: 800,
                fontSize: 18, letterSpacing: "-0.03em", lineHeight: 1.1,
              }}>
                NeuralVault
              </div>
              <div style={{
                fontSize: 9.5, color: "var(--text-tertiary)",
                letterSpacing: "0.12em", marginTop: 3,
                fontFamily: "var(--font-body)", fontWeight: 500,
              }}>
                KNOWLEDGE · RAG
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>
            <AnimatedStat
              label="INDEXED" color="var(--green)"
              value={ready ? indexed : "–"}
            />
            <AnimatedStat
              label="CHUNKS" color="var(--text-primary)"
              value={ready ? (totalChunks > 999 ? `${(totalChunks/1000).toFixed(1)}k` : totalChunks) : "–"}
            />
          </div>
        </div>

        {/* ── Navigation */}
        <nav style={{ padding: "0 14px", flex: 1 }}>
          <div className="section-label" style={{ padding: "0 8px", marginBottom: 10 }}>
            CONSOLE
          </div>

          <div style={{ position: "relative" }}>
            {TABS.map(({ id, Icon, label, sub }, i) => {
              const active = tab === id;
              return (
                <motion.button
                  key={id}
                  onClick={() => { setTab(id); setOpen(false); }}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.05, ease: "easeOut" }}
                  whileHover={!active ? { x: 3 } : {}}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 14px",
                    borderRadius: "var(--radius)",
                    marginBottom: 4,
                    border: active ? "1px solid var(--border-accent)" : "1px solid transparent",
                    background: active
                      ? "var(--accent-dim)"
                      : "transparent",
                    color: active ? "var(--text-primary)" : "var(--text-secondary)",
                    cursor: "pointer", textAlign: "left",
                    fontFamily: "var(--font-display)",
                    boxShadow: "none",
                    position: "relative",
                    transition: "background var(--transition), border-color var(--transition), color var(--transition)",
                  }}
                >
                  {/* Active left bar */}
                  {active && (
                    <motion.div
                      layoutId="sidebar-active-bar"
                      style={{
                        position: "absolute", left: 0, top: "25%", bottom: "25%",
                        width: 3, borderRadius: "0 3px 3px 0",
                        background: "var(--accent)",
                        boxShadow: "none",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}

                  {/* Icon */}
                  <span style={{
                    flexShrink: 0,
                    opacity: active ? 1 : 0.5,
                    color: active ? "var(--accent)" : "currentColor",
                    transition: "opacity var(--transition), color var(--transition)",
                  }}>
                    <Icon />
                  </span>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13.5, fontWeight: active ? 700 : 500,
                      lineHeight: 1.2, letterSpacing: "-0.01em",
                    }}>
                      {label}
                    </div>
                    <div style={{
                      fontSize: 10.5,
                      color: active ? "rgba(168,159,255,0.7)" : "var(--text-disabled)",
                      marginTop: 2,
                      fontFamily: "var(--font-body)",
                    }}>
                      {sub}
                    </div>
                  </div>

                  {/* Active dot indicator */}
                  {active && (
                    <div style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: "var(--accent-bright)",
                      boxShadow: "0 0 8px var(--accent-glow)",
                      flexShrink: 0,
                    }} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </nav>

        {/* ── Status footer */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border-dim)" }}>
          <div style={{
            background: isOnline ? "rgba(0,229,160,0.06)" : "rgba(255,77,106,0.06)",
            border: `1px solid ${isOnline ? "rgba(0,229,160,0.18)" : "rgba(255,77,106,0.18)"}`,
            borderRadius: "var(--radius)", padding: "12px 14px",
          }}>
            {/* Status header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <PulseDot color={isOnline ? "var(--green)" : "var(--red)"} size={7} />
              <span style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em",
                color: isOnline ? "var(--green)" : "var(--red)",
                fontFamily: "var(--font-display)",
                flex: 1,
              }}>
                {isOnline ? "SYSTEM ONLINE" : "BACKEND OFFLINE"}
              </span>
            </div>

            {/* Service rows */}
            {isOnline ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <ServiceRow label="FastAPI Server" online={true} icon={<IconServer />} />
                <ServiceRow label="Qdrant" online={true} icon={<IconDatabase />} />
                <ServiceRow label="Hybrid Search" online={true} icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                } />
              </div>
            ) : (
              <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", lineHeight: 1.6, fontFamily: "var(--font-mono)" }}>
                Start FastAPI server<br />
                <span style={{ color: "var(--amber)" }}>uvicorn main:app --reload</span>
              </div>
            )}
          </div>

          {/* Version tag */}
          <div style={{
            textAlign: "center", marginTop: 10,
            fontSize: 9.5, color: "var(--text-disabled)",
            letterSpacing: "0.1em", fontFamily: "var(--font-mono)",
          }}>
            NeuralVault v1.0 · LangChain · Qdrant
          </div>
        </div>
      </motion.aside>
    </>
  );
}
