import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   Sistema UI globale: Toast + Modale di conferma + Skeleton.
   API importabile da qualsiasi modulo senza prop drilling:

     import { toast, confirmDialog } from "../ui";
     toast.success("Salvato!");
     const ok = await confirmDialog({ title: "Sicuro?", message: "..." });

   Basta montare <UIProvider> una volta vicino alla radice.
   ============================================================ */

let pushToastFn = null;
let openConfirmFn = null;

export const toast = {
  success: (message, title) => pushToastFn && pushToastFn({ type: "success", message, title }),
  error: (message, title) => pushToastFn && pushToastFn({ type: "error", message, title }),
  info: (message, title) => pushToastFn && pushToastFn({ type: "info", message, title }),
};

export function confirmDialog(opts = {}) {
  return new Promise((resolve) => {
    if (openConfirmFn) openConfirmFn(opts, resolve);
    else resolve(window.confirm(opts.message || "Sei sicuro?"));
  });
}

const ICONS = { success: "✅", error: "⚠️", info: "✨" };

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const idRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  }, []);

  useEffect(() => {
    pushToastFn = (t) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => removeToast(id), 4200);
    };
    openConfirmFn = (opts, resolve) => setConfirmState({ opts, resolve });
    return () => { pushToastFn = null; openConfirmFn = null; };
  }, [removeToast]);

  const closeConfirm = (value) => {
    if (confirmState) confirmState.resolve(value);
    setConfirmState(null);
  };

  return (
    <>
      {children}

      {/* Toast stack */}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type} ${t.leaving ? "leaving" : ""}`} onClick={() => removeToast(t.id)}>
            <span className="toast-icon">{ICONS[t.type] || "✨"}</span>
            <div className="toast-body">
              {t.title && <div className="toast-title">{t.title}</div>}
              <div className="toast-msg">{t.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Modale di conferma */}
      {confirmState && (
        <div className="modal-overlay" onClick={() => closeConfirm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "42px", marginBottom: "10px" }}>
              {confirmState.opts.icon || (confirmState.opts.danger ? "🗑️" : "❓")}
            </div>
            <h3 style={{ fontSize: "20px", marginBottom: "8px" }}>
              {confirmState.opts.title || "Confermi?"}
            </h3>
            {confirmState.opts.message && (
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "22px" }}>
                {confirmState.opts.message}
              </p>
            )}
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button className="btn btn-secondary" onClick={() => closeConfirm(false)}>
                {confirmState.opts.cancelText || "Annulla"}
              </button>
              <button
                className={`btn ${confirmState.opts.danger ? "btn-danger" : "btn-primary"}`}
                onClick={() => closeConfirm(true)}
                autoFocus
              >
                {confirmState.opts.confirmText || "Conferma"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Confetti leggero senza dipendenze, per i momenti di festa 🎉 */
export function celebrate() {
  try {
    const colors = ["#7c3aed", "#d946ef", "#fb7185", "#34d399", "#fbbf24", "#818cf8"];
    const root = document.createElement("div");
    root.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:10000;overflow:hidden";
    document.body.appendChild(root);
    const N = 90;
    for (let i = 0; i < N; i++) {
      const p = document.createElement("div");
      const size = 6 + Math.round(Math.random() * 8);
      const left = Math.random() * 100;
      const color = colors[i % colors.length];
      p.style.cssText = `position:absolute;top:-20px;left:${left}vw;width:${size}px;height:${size * 0.5}px;background:${color};border-radius:2px;opacity:1`;
      root.appendChild(p);
      const xDrift = (Math.random() - 0.5) * 260;
      const rotate = Math.random() * 720;
      p.animate(
        [
          { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
          { transform: `translate(${xDrift}px, 105vh) rotate(${rotate}deg)`, opacity: 0.9 },
        ],
        { duration: 2200 + Math.random() * 1200, easing: "cubic-bezier(0.2,0.6,0.4,1)", fill: "forwards" }
      );
    }
    setTimeout(() => root.remove(), 3800);
  } catch { /* no-op */ }
}

/* Skeleton loader riutilizzabile */
export function Skeleton({ width = "100%", height = 12, radius = 8, style = {} }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

export function SkeletonCard() {
  return (
    <div className="glass-panel" style={{ padding: "18px" }}>
      <Skeleton width="40%" height={10} />
      <Skeleton width="75%" height={18} style={{ marginTop: 12 }} />
      <Skeleton width="55%" height={12} style={{ marginTop: 10 }} />
    </div>
  );
}
