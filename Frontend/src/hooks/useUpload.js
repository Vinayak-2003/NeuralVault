import { useState, useCallback } from "react";
import * as api from "../services/api";
import { mockNewDoc } from "../services/mock";
import { useApp } from "../store/AppContext";

const ALLOWED = [".pdf", ".txt", ".docx", ".md", ".csv"];
const MAX_MB  = 50;

export function useUpload() {
  const { actions } = useApp();
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [status,    setStatus]    = useState("");
  const [error,     setError]     = useState(null);

  const validate = (files) => {
    for (const f of files) {
      const ext = "." + f.name.split(".").pop().toLowerCase();
      if (!ALLOWED.includes(ext)) return `"${f.name}" — unsupported type. Allowed: ${ALLOWED.join(" ")}`;
      if (f.size / 1024 / 1024 > MAX_MB) return `"${f.name}" exceeds ${MAX_MB}MB limit`;
    }
    return null;
  };

  const upload = useCallback(async (files) => {
    const validErr = validate(files);
    if (validErr) { setError(validErr); return; }

    setUploading(true);
    setProgress(0);
    setStatus("pending");
    setError(null);

    try {
      // ── REAL: uncomment when backend is ready ─────────────────────
      const { job_id } = await api.uploadFiles(files);
      const result = await api.pollUntilDone(job_id, (p, s) => {
        setProgress(p);
        setStatus(s);
      });
      if (result.status === "failed") throw new Error(result.error_message);
      
      // Refresh the entire document list to update global counts (Sidebar stats)
      const freshDocs = await api.getDocuments();
      actions.setDocs(freshDocs);

      // ── MOCK: remove when backend is connected ─────────────────────
      // for (const step of [8, 20, 35, 52, 68, 84, 100]) {
      //   await new Promise(r => setTimeout(r, 380));
      //   setProgress(step);
      // }
      // actions.addDocs(files.map(f => mockNewDoc(f)));
      // ──────────────────────────────────────────────────────────────

    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 600);
    }
  }, [actions]);

  return { upload, uploading, progress, status, error, clearError: () => setError(null) };
}

export function useDeleteDoc() {
  const { actions } = useApp();
  const [deleting, setDeleting] = useState(null);

  const deleteDoc = useCallback(async (id) => {
    setDeleting(id);
    try {
      // ── REAL ───────────────────────────────────────────────────────
      await api.deleteDocument(id);

      // ──────────────────────────────────────────────────────────────

      actions.removeDoc(id);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(null);
    }
  }, [actions]);

  return { deleteDoc, deleting };
}
