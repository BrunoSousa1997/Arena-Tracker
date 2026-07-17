import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useLanguage } from "../lib/i18n";

// Substitui window.confirm() nativo (fora do tema, sem estilo) por um modal
// próprio, para ações destrutivas (ex: apagar conta) não quebrarem a
// identidade visual da app. Sem AnimatePresence de propósito — descobrimos
// que o AnimatePresence do framer-motion (v12) não completa a animação de
// saída com React 19 nesta app, deixando o modal "preso" no DOM mesmo com o
// estado já a false (ver Settings.jsx). Fecha instantaneamente em vez disso.
// Portal para document.body: este diálogo pode ser aberto a partir de
// dentro de outro modal já animado (ex: apagar conta dentro de Definições)
// — um ecrã-pai com "transform" (o framer-motion deixa isso sempre no
// style, mesmo já parado) cria um novo "containing block" para
// position:fixed, e o backdrop deste diálogo deixaria de cobrir a janela
// toda. O portal evita esse problema por completo.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useLanguage();

  return createPortal(
    <motion.div
      style={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onCancel}
    >
      <motion.div
        style={styles.panel}
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h3 style={styles.title}>{title}</h3>}
        <div style={styles.message}>{message}</div>
        <div style={styles.actions}>
          <button onClick={onCancel} style={styles.cancelBtn}>
            {cancelLabel || t("cancel_btn")}
          </button>
          <button onClick={onConfirm} style={danger ? styles.dangerBtn : styles.confirmBtn}>
            {confirmLabel || t("remove_btn")}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(3px)",
    zIndex: 99998,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  panel: {
    width: 380,
    padding: 22,
    borderRadius: "var(--radius-2xl)",
    background: "var(--surface-float)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    fontFamily: "Cinzel, serif",
  },

  title: {
    margin: 0,
    fontSize: 16,
    color: "var(--accent-text)",
  },

  message: {
    fontSize: 13,
    lineHeight: 1.5,
    color: "var(--text-body)",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },

  cancelBtn: {
    padding: "8px 14px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--soft-rgb),0.15)",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "Cinzel, serif",
  },

  confirmBtn: {
    padding: "8px 14px",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "var(--accent-gradient)",
    color: "var(--accent-solid-text)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "Cinzel, serif",
  },

  dangerBtn: {
    padding: "8px 14px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(226,85,95,0.45)",
    background: "rgba(226,85,95,0.18)",
    color: "#e2555f",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "Cinzel, serif",
  },
};
