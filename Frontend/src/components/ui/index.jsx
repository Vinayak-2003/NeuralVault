import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ══════════════════════════════════════════════════════════
   SPINNER — dual ring with gradient
══════════════════════════════════════════════════════════ */
export function Spinner({ size = 16, color = "var(--accent)" }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* Outer ring */}
      <div style={{
        position: "absolute", inset: 0,
        borderRadius: "50%",
        border: `2px solid ${color}18`,
        borderTop: `2px solid ${color}`,
        animation: "spin 0.7s linear infinite",
      }} />
      {/* Inner ring (opposite) */}
      <div style={{
        position: "absolute", inset: 3,
        borderRadius: "50%",
        border: `1.5px solid ${color}10`,
        borderBottom: `1.5px solid ${color}60`,
        animation: "spin-reverse 1.1s linear infinite",
      }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PULSE DOT — with outer ring animation
══════════════════════════════════════════════════════════ */
export function PulseDot({ color = "var(--green)", size = 8 }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0 }}>
      {/* Expanding ring */}
      <span style={{
        position: "absolute", inset: 0,
        borderRadius: "50%",
        background: color,
        opacity: 0.35,
        animation: "pulse-ring 2s ease-out infinite",
      }} />
      {/* Solid dot */}
      <span style={{
        position: "relative", width: size, height: size,
        borderRadius: "50%", background: color,
        boxShadow: `0 0 6px ${color}80`,
        animation: "pulse-dot 2s ease-in-out infinite",
      }} />
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   BADGE
══════════════════════════════════════════════════════════ */
export function Badge({ children, color = "var(--accent)", size = "sm" }) {
  const pad = size === "sm" ? "2px 9px" : "4px 14px";
  const fs  = size === "sm" ? 10 : 12;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: fs, fontWeight: 700, letterSpacing: "0.07em",
      textTransform: "uppercase", color,
      background: `${color}18`, border: `1px solid ${color}35`,
      borderRadius: 99, padding: pad, flexShrink: 0,
      whiteSpace: "nowrap", fontFamily: "var(--font-display)",
    }}>
      {children}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   STATUS BADGE
══════════════════════════════════════════════════════════ */
export function StatusBadge({ status }) {
  const map = {
    indexed:    { color: "var(--green)",        label: "Indexed"    },
    processing: { color: "var(--amber)",        label: "Processing" },
    splitted:   { color: "var(--amber)",        label: "Splitting"  },
    chunked:    { color: "var(--accent-bright)","label": "Chunking" },
    failed:     { color: "var(--red)",          label: "Failed"     },
    pending:    { color: "var(--text-tertiary)", label: "Pending"   },
  };
  const { color, label } = map[status] || map.pending;
  return <Badge color={color}>{label}</Badge>;
}

/* ══════════════════════════════════════════════════════════
   BUTTON
══════════════════════════════════════════════════════════ */
export function Btn({
  onClick, children, variant = "primary", size = "md",
  disabled, loading, icon, style: sx = {}, type = "button",
}) {
  const sizes = { sm: "6px 14px", md: "9px 20px", lg: "13px 30px" };
  const fsize = { sm: 11.5, md: 13, lg: 14 };

  const variants = {
    primary: {
      background: "linear-gradient(135deg, var(--accent) 0%, #5f50d9 100%)",
      border: "none", color: "#fff",
      boxShadow: "0 4px 20px var(--accent-glow)",
    },
    secondary: {
      background: "var(--bg-subtle)",
      border: "1px solid var(--border-base)", color: "var(--text-secondary)",
    },
    danger: {
      background: "var(--red-dim)",
      border: "1px solid rgba(255,77,106,0.3)", color: "var(--red)",
    },
    ghost: {
      background: "var(--bg-raised)",
      border: "1px solid var(--border-base)", color: "var(--text-secondary)",
    },
    success: {
      background: "linear-gradient(135deg, var(--green) 0%, #00be84 100%)",
      border: "none", color: "#fff",
    },
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02, opacity: 0.95 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: sizes[size],
        borderRadius: "var(--radius-sm)",
        fontSize: fsize[size], fontWeight: 600,
        cursor: (disabled || loading) ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "box-shadow var(--transition), opacity var(--transition)",
        fontFamily: "var(--font-display)",
        position: "relative", overflow: "hidden",
        letterSpacing: "-0.01em",
        ...variants[variant], ...sx,
      }}
    >
      {/* Shimmer sweep on primary */}
      {variant === "primary" && !disabled && (
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
          style={{
            position: "absolute", top: 0, left: 0, width: "60%", height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
            pointerEvents: "none",
          }}
        />
      )}
      {loading ? <Spinner size={fsize[size] - 1} color={variant === "primary" || variant === "success" ? "#fff" : "var(--accent)"} /> : (
        icon && <span style={{ fontSize: fsize[size] }}>{icon}</span>
      )}
      {children}
    </motion.button>
  );
}

/* ══════════════════════════════════════════════════════════
   TOGGLE
══════════════════════════════════════════════════════════ */
export function Toggle({ value, onChange }) {
  return (
    <motion.div
      onClick={() => onChange(!value)}
      whileTap={{ scale: 0.95 }}
      style={{
        width: 46, height: 26, borderRadius: 13, cursor: "pointer",
        background: value
          ? "linear-gradient(135deg, var(--accent), var(--accent-secondary))"
          : "var(--bg-muted)",
        border: `1.5px solid ${value ? "var(--border-accent)" : "var(--border-dim)"}`,
        position: "relative",
        transition: "background 0.25s, border-color 0.25s",
        boxShadow: value ? "var(--glow-sm)" : "none",
      }}
    >
      <motion.div
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        style={{
          position: "absolute", top: 2, width: 18, height: 18,
          borderRadius: "50%",
          background: value
            ? "#fff"
            : "var(--text-disabled)",
          boxShadow: "0 1px 5px rgba(0,0,0,0.5)",
        }}
      />
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   FILE ICON
══════════════════════════════════════════════════════════ */
export function FileIcon({ filename }) {
  const ext = (filename || "").split(".").pop().toLowerCase();
  const map = {
    pdf:  { color: "var(--red)",          bg: "rgba(255,77,106,0.1)"  },
    txt:  { color: "var(--accent-bright)", bg: "rgba(124,111,247,0.1)" },
    docx: { color: "var(--green)",        bg: "rgba(0,229,160,0.1)"   },
    md:   { color: "var(--amber)",        bg: "rgba(255,165,82,0.1)"  },
    csv:  { color: "var(--blue)",         bg: "rgba(77,171,247,0.1)"  },
  };
  const { color, bg } = map[ext] || map.txt;

  return (
    <div style={{
      width: 40, height: 50, borderRadius: "var(--radius-sm)", flexShrink: 0,
      background: bg,
      border: `1px solid ${color}25`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", position: "relative", overflow: "hidden",
    }}>
      {/* Top-right fold */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 0, height: 0,
        borderLeft: "9px solid transparent",
        borderTop: `9px solid ${color}60`,
      }} />
      {/* Page lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 2 }}>
        {[70, 50, 70].map((w, i) => (
          <div key={i} style={{
            width: w/10, height: 1.5, background: color,
            borderRadius: 1, opacity: 0.5,
          }} />
        ))}
      </div>
      {/* Extension label */}
      <span style={{
        fontSize: 8.5, fontWeight: 800, color,
        letterSpacing: "0.07em", fontFamily: "var(--font-mono)",
      }}>
        {ext.toUpperCase()}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PROGRESS BAR — animated gradient with shine sweep
══════════════════════════════════════════════════════════ */
export function ProgressBar({ value, label = "Processing…" }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 12.5, alignItems: "center" }}>
        <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>{label}</span>
        <span style={{ color: "var(--accent-bright)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
          {value}%
        </span>
      </div>
      <div style={{
        height: 5, background: "var(--bg-muted)",
        borderRadius: 99, overflow: "hidden",
        border: "1px solid var(--border-dim)",
      }}>
        <motion.div
          animate={{ width: `${value}%` }}
          transition={{ ease: "easeOut", duration: 0.4 }}
          style={{
            height: "100%", borderRadius: 99, position: "relative",
            background: "linear-gradient(90deg, var(--accent-dark), var(--accent-bright), var(--accent-secondary))",
            backgroundSize: "200% 100%",
            boxShadow: "0 0 10px var(--accent-glow)",
            animation: "progress-shine 2s linear infinite",
          }}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   INPUT
══════════════════════════════════════════════════════════ */
export function Input({ value, onChange, placeholder, type = "text", style: sx = {}, autoFocus }) {
  return (
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} autoFocus={autoFocus}
      style={{ padding: "8px 12px", fontSize: 13, ...sx }}
    />
  );
}

/* ══════════════════════════════════════════════════════════
   SOURCE CHIP — card style with confidence bar
══════════════════════════════════════════════════════════ */
export function SourceChip({ file, page, score }) {
  const [hover, setHover] = useState(false);
  const ext = (file || "").split(".").pop().toUpperCase();
  const conf = score != null ? Math.round(score * 100) : null;
  const confColor = conf > 75 ? "var(--green)" : conf > 50 ? "var(--amber)" : "var(--red)";

  return (
    <motion.span
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileHover={{ y: -1 }}
      title={`${file}${page ? ` — page ${page}` : ""}${conf ? ` — ${conf}% confidence` : ""}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 11, color: hover ? "var(--text-primary)" : "var(--text-secondary)",
        background: hover ? "var(--bg-overlay)" : "var(--bg-raised)",
        border: `1px solid ${hover ? "var(--border-base)" : "var(--border-dim)"}`,
        borderRadius: "var(--radius-sm)", padding: "4px 10px",
        cursor: "default", transition: "all var(--transition-fast)",
        maxWidth: 260, boxShadow: hover ? "var(--shadow-xs)" : "none",
      }}
    >
      {/* Ext badge */}
      <span style={{
        fontSize: 8.5, fontWeight: 800, letterSpacing: "0.06em",
        background: "var(--accent-dim)",
        border: "1px solid rgba(124,111,247,0.2)",
        color: "var(--accent-bright)",
        padding: "1px 5px", borderRadius: "var(--radius-xs)", flexShrink: 0,
        fontFamily: "var(--font-mono)",
      }}>
        {ext}
      </span>

      {/* File name */}
      <span className="truncate" style={{ maxWidth: 130, fontFamily: "var(--font-body)" }}>
        {file}
      </span>

      {/* Page */}
      {page && (
        <span style={{ color: "var(--text-tertiary)", flexShrink: 0, fontSize: 10 }}>
          p.{page}
        </span>
      )}

      {/* Confidence */}
      {conf != null && (
        <span style={{ color: confColor, flexShrink: 0, fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
          {conf}%
        </span>
      )}
    </motion.span>
  );
}

/* ══════════════════════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════════════════════ */
export function Empty({ icon, title, body, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 14, padding: "64px 24px", textAlign: "center",
      }}
    >
      {/* Icon with float animation */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 72, height: 72, borderRadius: "var(--radius-xl)",
          background: "var(--accent-dim)",
          border: "1px solid rgba(124,111,247,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 40px rgba(124,111,247,0.1)",
        }}
      >
        {typeof icon === "string"
          ? <span style={{ fontSize: 32, lineHeight: 1 }}>{icon}</span>
          : icon
        }
      </motion.div>

      <div style={{
        fontFamily: "var(--font-display)", fontWeight: 700,
        fontSize: 17, color: "var(--text-primary)", letterSpacing: "-0.02em",
      }}>
        {title}
      </div>

      {body && (
        <div style={{
          fontSize: 13, color: "var(--text-tertiary)",
          maxWidth: 340, lineHeight: 1.7, fontFamily: "var(--font-body)",
        }}>
          {body}
        </div>
      )}

      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   TOOLTIP
══════════════════════════════════════════════════════════ */
export function Tip({ children, label }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
              transform: "translateX(-50%)", whiteSpace: "nowrap",
              background: "var(--bg-overlay)", border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius)", padding: "5px 12px",
              fontSize: 11, color: "var(--text-secondary)", zIndex: 100,
              boxShadow: "var(--shadow)", fontFamily: "var(--font-body)",
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
