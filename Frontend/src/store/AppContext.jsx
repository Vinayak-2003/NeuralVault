import React, { createContext, useContext, useReducer, useEffect, useMemo } from "react";
import * as api from "../services/api";
import { MOCK_DOCUMENTS, MOCK_CONFIG } from "../services/mock";

const Ctx = createContext(null);

const init = {
  docs:    [],
  config:  { chunk_size:512, chunk_overlap:50, top_k:5, search_type:"hybrid", reranker:true, temperature:0.2, model:"groq/llama-3.3-70b", stream:false },
  health:  null,
  ready:   false,
};

function reducer(s, a) {
  switch (a.type) {
    case "INIT":            return { ...s, docs: a.docs, config: a.config, health: a.health, ready: true };
    case "ADD_DOCS":        return { ...s, docs: [...s.docs, ...a.docs] };
    case "REMOVE_DOC":      return { ...s, docs: s.docs.filter(d => d.id !== a.id) };
    case "UPDATE_DOC":      return { ...s, docs: s.docs.map(d => d.id === a.id ? { ...d, ...a.patch } : d) };
    case "SET_DOCS":         return { ...s, docs: a.docs };
    case "SET_CONFIG":      return { ...s, config: a.config };
    case "SET_HEALTH":      return { ...s, health: a.health };
    default:                return s;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init);

  useEffect(() => {
    async function load() {
      try {
        // ── REAL: uncomment when backend is ready ─────────────────
        const [docs, config, health] = await Promise.all([
          api.getDocuments(),
          api.getConfig(),
          api.getHealth(),
        ]);
        dispatch({ type: "INIT", docs, config, health });

        // ── MOCK: remove when backend is connected ─────────────────
        // await new Promise(r => setTimeout(r, 500));
        // dispatch({ type: "INIT", docs: MOCK_DOCUMENTS, config: MOCK_CONFIG, health: { status: "ok", chroma_connected: true, model_loaded: true, doc_count: MOCK_DOCUMENTS.length } });
      } catch {
        dispatch({ type: "INIT", docs: MOCK_DOCUMENTS, config: MOCK_CONFIG, health: null });
      }
    }
    load();
  }, []);

  const actions = useMemo(() => ({
    addDocs:    (docs)  => dispatch({ type: "ADD_DOCS",   docs }),
    removeDoc:  (id)    => dispatch({ type: "REMOVE_DOC", id }),
    setDocs:    (docs)  => dispatch({ type: "SET_DOCS",   docs }),
    updateDoc:  (id, patch) => dispatch({ type: "UPDATE_DOC", id, patch }),
    setConfig:  (config)=> dispatch({ type: "SET_CONFIG", config }),
    setHealth:  (health)=> dispatch({ type: "SET_HEALTH", health }),
  }), [dispatch]);

  return <Ctx.Provider value={{ state, actions }}>{children}</Ctx.Provider>;
}

export const useApp = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
};
