import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import AchievementIcon from "./AchievementIcon";
import { useLanguage } from "../lib/i18n";

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

export default function AchievementToasts({ toasts, onDismiss, onInviteResponse }) {
  if (!toasts.length) return null;

  return createPortal(
    <div style={styles.stack}>
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onInviteResponse={onInviteResponse}
        />
      ))}
    </div>,
    document.body
  );
}

function ToastItem({ toast, onDismiss, onInviteResponse }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);

  // Um convite de desafio pede uma DECISÃO — desaparecer sozinho ao fim de 6s
  // seria perder o convite sem sequer o ter respondido. Por isso, e só nesse
  // caso, o toast fica até se carregar em Aceitar/Recusar (ou no X). Todos os
  // outros continuam efémeros como sempre.
  const invite = toast.action?.kind === "invite" && onInviteResponse ? toast.action : null;

  useEffect(() => {
    if (invite) return;
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss, invite]);

  const respond = async (accepted) => {
    if (busy) return;
    setBusy(true);
    await onInviteResponse(toast, accepted);
    onDismiss(toast.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      // Com botões lá dentro, um clique em qualquer sítio a dispensar o toast
      // faria o convite desaparecer no caminho para o "Aceitar".
      onClick={invite ? undefined : () => onDismiss(toast.id)}
      role="status"
      style={{
        ...styles.toast,
        cursor: invite ? "default" : "pointer",
        borderColor: `color-mix(in srgb, ${toast.color} 55%, transparent)`,
        boxShadow: `0 10px 26px rgba(0,0,0,0.4), 0 0 18px color-mix(in srgb, ${toast.color} 22%, transparent)`,
      }}
    >
      <div style={styles.main}>
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

        {invite && (
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            style={styles.dismissBtn}
            aria-label={t("chal_invite_dismiss")}
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {invite && (
        <div style={styles.actions}>
          <button
            type="button"
            disabled={busy}
            onClick={() => respond(true)}
            style={{ ...styles.actionBtn, ...styles.acceptBtn, opacity: busy ? 0.6 : 1 }}
          >
            <Check size={12} strokeWidth={2.5} />
            {t("chal_accept")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => respond(false)}
            style={{ ...styles.actionBtn, ...styles.declineBtn, opacity: busy ? 0.6 : 1 }}
          >
            {t("chal_decline")}
          </button>
        </div>
      )}
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

  // Coluna: a linha de sempre (ícone + texto) em cima e, só nos convites, a
  // fila de botões por baixo — ver "actions".
  toast: {
    display: "flex",
    flexDirection: "column",
    gap: 9,
    width: 270,
    padding: "11px 13px",
    borderRadius: "var(--radius-lg)",
    border: "1px solid",
    background: "var(--surface-float)",
    // O contentor é "none" para não bloquear cliques no resto da app; cada
    // toast repõe-nos para poder ser dispensado (ou respondido) ao clique.
    pointerEvents: "auto",
  },

  main: {
    display: "flex",
    alignItems: "center",
    gap: 11,
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

  dismissBtn: {
    width: 20,
    height: 20,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "rgba(var(--soft-rgb),0.08)",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: 0,
  },

  actions: {
    display: "flex",
    gap: 6,
  },

  actionBtn: {
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: "6px 10px",
    borderRadius: "var(--radius-md)",
    border: "1px solid",
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 700,
    fontFamily: "Cinzel, serif",
  },

  acceptBtn: {
    borderColor: "transparent",
    background: "var(--accent-solid)",
    color: "var(--accent-solid-text)",
  },

  declineBtn: {
    borderColor: "rgba(var(--border-rgb),0.5)",
    background: "transparent",
    color: "var(--text-secondary)",
  },
};
