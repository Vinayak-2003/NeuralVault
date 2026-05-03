/**
 * Utility helpers used across the app
 */

/** Format bytes → human-readable MB/KB */
export function formatSize(bytes) {
  if (!bytes) return "—";
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

/** Format ISO date string → readable */
export function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Get file extension from filename */
export function getExt(filename = "") {
  return filename.split(".").pop().toLowerCase();
}

/** Truncate text to maxLen with ellipsis */
export function truncate(str = "", maxLen = 60) {
  return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
}

/** Format milliseconds nicely */
export function formatMs(ms) {
  if (!ms) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Clamp a number between min and max */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
