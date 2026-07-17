import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import AchievementIcon from "./AchievementIcon";

// Aviso momentâneo, no canto, quando uma conquista sobe — a campainha guarda
// o histórico, isto é só para dar a novidade na hora (senão só se descobria
// indo lá ver de propósito, que é quando já não tem graça).
//
// Não usa AnimatePresence de propósito, tal como o Toast.jsx e o
// ConfirmDialog: ver a nota lá sobre o AnimatePresence ficar preso com o
// React 19 nesta app. Aqui só existe animação de ENTRADA; sair é apenas o
// componente deixar de ser renderizado.
//
// Vive num portal (document.body) porque o cabeçalho e a área de conteúdo têm
// antepassados com overflow — o mesmo corte que já escondeu o painel da
// campainha (ver NotificationBell.jsx) e que o Tooltip.jsx documenta.
const TOAST_DURATION_MS = 6000;

export default function AchievementToasts({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return createPortal(
    <div style={styles.stack}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={() => onDismiss(toast.id)}
      role="status"
      style={{
        ...styles.toast,
        borderColor: `color-mix(in srgb, ${toast.color} 55%, transparent)`,
        boxShadow: `0 10px 26px rgba(0,0,0,0.4), 0 0 18px color-mix(in srgb, ${toast.color} 22%, transparent)`,
      }}
    >
      <span
        style={{
          ...styles.iconWrap,
          borderColor: `color-mix(in srgb, ${toast.color} 45%, transparent)`,
          background: `color-mix(in srgb, ${toast.color} 14%, transparent)`,
        }}
      >
        <AchievementIcon iconId={toast.iconId} color={toast.color} size={22} />
      </span>

      <div style={styles.text}>
        <div style={styles.title}>{toast.title}</div>
        <div style={{ ...styles.body, color: toast.color }}>{toast.body}</div>
      </div>
    </motion.div>
  );
}

const styles = {
  // Canto inferior direito: o banner da partida ao vivo vive no topo e o
  // Toast.jsx (exportações) ao centro em baixo — assim nenhum tapa o outro.
  stack: {
    position: "fixed",
    right: 18,
    bottom: 18,
    zIndex: 999998,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    pointerEvents: "none",
  },

  toast: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    width: 270,
    padding: "11px 13px",
    borderRadius: "var(--radius-lg)",
    border: "1px solid",
    background: "var(--surface-float)",
    cursor: "pointer",
    // O contentor é "none" para não bloquear cliques no resto da app; cada
    // toast repõe-nos para poder ser dispensado ao clique.
    pointerEvents: "auto",
  },

  iconWrap: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: "var(--radius-md)",
    border: "1px solid",
  },

  text: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text-body)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  body: {
    fontSize: 10.5,
    fontWeight: 700,
    marginTop: 2,
  },
};
