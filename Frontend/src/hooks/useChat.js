import { useState, useCallback } from "react";
import * as api from "../services/api";
import { mockAnswer } from "../services/mock";

const WELCOME = {
  id: 0, role: "assistant",
  text: "Welcome to **NeuralVault**. Your personal knowledge base is ready.\n\nAsk me anything about your uploaded documents — I'll retrieve the most relevant context and generate a grounded answer with source citations.",
  sources: [], timestamp: Date.now(),
};

export function useChat(config) {
  const [messages, setMessages] = useState([WELCOME]);
  const [loading,  setLoading]  = useState(false);

  const updateLast = (patch) =>
    setMessages(m => m.map((msg, i) => i === m.length - 1 ? { ...msg, ...patch } : msg));

  const send = useCallback(async (query, docFilter = "all") => {
    if (!query.trim() || loading) return;

    const userMsg = { id: Date.now(), role: "user", text: query.trim(), timestamp: Date.now() };
    const botMsg  = { id: Date.now() + 1, role: "assistant", text: "", loading: true, sources: [], timestamp: Date.now() };

    setMessages(m => [...m, userMsg, botMsg]);
    setLoading(true);

    try {
      // ── REAL: uncomment when backend is ready ─────────────────────
      const data = await api.sendQuery(query, config?.top_k ?? 5, docFilter);
      updateLast({ loading: false, text: data.answer, sources: data.sources, score: data.sources?.[0]?.score, latency_ms: data.latency_ms });

      // ── MOCK: remove when backend is connected ─────────────────────
      // await new Promise(r => setTimeout(r, 1600 + Math.random() * 800));
      // const data = mockAnswer(query);
      // updateLast({ loading: false, text: data.answer, sources: data.sources, score: data.sources?.[0]?.score, latency_ms: data.latency_ms });
      // ──────────────────────────────────────────────────────────────

    } catch (err) {
      updateLast({ loading: false, text: `⚠️ **Backend unreachable**\n\nMake sure your FastAPI server is running at \`${api.API_BASE_URL}\`\n\nError: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, [loading, config]);

  const clearChat = useCallback(() => setMessages([{ ...WELCOME, id: Date.now() }]), []);

  return { messages, send, clearChat, loading };
}
