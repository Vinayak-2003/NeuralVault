import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

import { AppProvider }  from "./store/AppContext";
import { useHealth }    from "./hooks/useHealth";
import Sidebar          from "./components/layout/Sidebar";
import ChatPanel        from "./components/chat/ChatPanel";
import DocsPanel        from "./components/documents/DocsPanel";
import SettingsPanel    from "./components/settings/SettingsPanel";
import "./styles/globals.css";

const TAB_LABELS = { chat: "Chat", docs: "Library", settings: "Pipeline" };
const TAB_ICONS  = {
  chat: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  docs: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2"/>
    </svg>
  ),
};

function HealthWatcher() {
  useHealth();
  return null;
}

function Layout() {
  const [tab,     setTab]     = useState("chat");
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-shell noise">
      {/* Sidebar */}
      <Sidebar tab={tab} setTab={setTab} open={navOpen} setOpen={setNavOpen} />

      {/* Main area */}
      <main style={{
        flex: 1, display: "flex", flexDirection: "column",
        minWidth: 0, position: "relative", overflow: "hidden",
      }}>

        {/* ── Mobile top bar */}
        <div
          className="mobile-only"
          style={{
            position: "sticky", top: 0, zIndex: 30,
            height: 54, flexShrink: 0,
            background: "rgba(4,4,10,0.97)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border-dim)",
            display: "flex", alignItems: "center", gap: 14, padding: "0 18px",
          }}
        >
          <motion.button
            onClick={() => setNavOpen(true)}
            whileTap={{ scale: 0.9 }}
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border-base)",
              color: "var(--text-secondary)",
              width: 36, height: 36, borderRadius: "var(--radius-sm)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 5, cursor: "pointer",
            }}
          >
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 16, height: 1.5, background: "currentColor", borderRadius: 1 }} />
            ))}
          </motion.button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <span style={{ color: "var(--accent-bright)", opacity: 0.8 }}>{TAB_ICONS[tab]}</span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>
              {TAB_LABELS[tab]}
            </span>
          </div>

          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14,
            letterSpacing: "-0.03em",
          }} className="text-gradient">
            NeuralVault
          </div>
        </div>

        {/* ── Tab panels */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            style={{ flex: 1, display: "flex", minWidth: 0, minHeight: 0, overflow: "hidden" }}
          >
            {tab === "chat"     && <ChatPanel />}
            {tab === "docs"     && <DocsPanel />}
            {tab === "settings" && <SettingsPanel />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global toast */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--bg-overlay)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-lg)",
            backdropFilter: "blur(16px)",
          },
          success: { iconTheme: { primary: "var(--green)",  secondary: "var(--bg-base)" } },
          error:   { iconTheme: { primary: "var(--red)",    secondary: "var(--bg-base)" } },
          duration: 3500,
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HealthWatcher />
      <Layout />
    </AppProvider>
  );
}
