import { useState, useEffect } from "react";
import * as api from "../services/api";
import { useApp } from "../store/AppContext";

/**
 * useConfig — manages pipeline configuration save/load
 * Used by SettingsPanel.
 */
export function useConfig() {
  const { state, actions } = useApp();
  const [local,   setLocal]   = useState(state.config);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState(null);

  // Keep local state in sync if global config changes externally
  useEffect(() => {
    setLocal(state.config);
  }, [state.config]);

  const update = (key, value) => setLocal(c => ({ ...c, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      // ── REAL: uncomment when backend is ready ─────────────────────
      await api.saveConfig(local);

      // ── MOCK: remove when backend is connected ─────────────────────
      // await new Promise(r => setTimeout(r, 700));
      // ──────────────────────────────────────────────────────────────

      actions.setConfig(local);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => setLocal(state.config);

  return { local, update, save, reset, saving, saved, error };
}
