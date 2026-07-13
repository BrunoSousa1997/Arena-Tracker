import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function UpdateNotifier() {
  const [status, setStatus] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!window.electron?.onUpdaterStatus) return;

    const unsubscribe = window.electron.onUpdaterStatus((payload) => {
      setStatus(payload?.status || null);
      setData(payload?.data || null);
    });

    return () => unsubscribe && unsubscribe();
  }, []);

  if (!window.electron?.onUpdaterStatus) return null;

  const visible = status === "available" || status === "downloading" || status === "downloaded";
  if (!visible) return null;

  const label =
    status === "available"
      ? `Nova versão encontrada${data?.version ? ` (${data.version})` : ""}. A descarregar...`
      : status === "downloading"
      ? `A descarregar atualização... ${Math.round(data?.percent || 0)}%`
      : `Atualização pronta${data?.version ? ` (${data.version})` : ""}. Reinicia para aplicar.`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        style={styles.banner}
      >
        <span style={styles.text}>{label}</span>

        {status === "downloaded" && (
          <button
            onClick={() => window.electron.installUpdate()}
            style={styles.btn}
          >
            Reiniciar agora
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

const styles = {
  banner: {
    position: "fixed",
    top: 38,
    right: 14,
    zIndex: 99998,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 10,
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.96), rgba(var(--panel-deep-rgb),0.98))",
    border: "1px solid rgba(var(--accent-rgb),0.35)",
    color: "var(--accent-text)",
    fontFamily: "Cinzel, serif",
    fontSize: 12,
    boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
  },

  text: {
    whiteSpace: "nowrap",
  },

  btn: {
    padding: "5px 10px",
    borderRadius: 8,
    border: "none",
    background: "#7c3aed",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },
};
