import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

// Substitui alert() nativo (usado antes para o resultado da exportação) por
// um aviso temático, no canto, que desaparece sozinho. Tal como o
// ConfirmDialog, sem AnimatePresence de propósito — ver nota lá sobre o
// AnimatePresence ficar preso com React 19 nesta app; aqui o desaparecer é
// só o componente deixar de ser renderizado pelo pai (sem animação de saída).
export default function Toast({ message, kind = "success", onDismiss, duration = 5000 }) {
  useEffect(() => {
    if (!duration) return;
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ ...styles.toast, ...(kind === "error" ? styles.toastError : styles.toastSuccess) }}
      onClick={onDismiss}
      role="status"
    >
      {message}
    </motion.div>,
    document.body
  );
}

const styles = {
  toast: {
    position: "fixed",
    left: "50%",
    bottom: 24,
    transform: "translateX(-50%)",
    zIndex: 999998,
    maxWidth: 420,
    padding: "12px 16px",
    borderRadius: "var(--radius-lg)",
    fontSize: 12.5,
    fontWeight: 600,
    lineHeight: 1.4,
    boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
    cursor: "pointer",
    fontFamily: "Cinzel, serif",
  },

  toastSuccess: {
    background: "var(--surface-float)",
    border: "1px solid rgba(var(--accent-rgb),0.4)",
    color: "var(--text-body)",
  },

  toastError: {
    background: "rgba(226,85,95,0.16)",
    border: "1px solid rgba(226,85,95,0.5)",
    color: "#e2555f",
  },
};
