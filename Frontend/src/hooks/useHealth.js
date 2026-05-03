import { useEffect, useCallback } from "react";
import * as api from "../services/api";
import { useApp } from "../store/AppContext";

/**
 * useHealth — polls /health every 30s and updates global state
 * Mount this once at the App level.
 */
export function useHealth() {
  const { actions } = useApp();

  const check = useCallback(async () => {
    try {
      const data = await api.getHealth();
      actions.setHealth(data);
    } catch {
      actions.setHealth({ status: "error", chroma_connected: false, model_loaded: false, doc_count: 0 });
    }
  }, [actions]);

  useEffect(() => {
    check(); // initial check
    const timer = setInterval(check, 30_000); // poll every 30s
    return () => clearInterval(timer);
  }, [check]);
}
