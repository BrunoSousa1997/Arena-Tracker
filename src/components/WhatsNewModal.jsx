import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useLanguage } from "../lib/i18n";
import { pickLanguageSection } from "../lib/patchNotes";

// Mostra o corpo da release do GitHub (HTML, vindo do electron-updater), já
// filtrado para o idioma ativo (ver pickLanguageSection).
export default function WhatsNewModal({ version, notesHtml, onClose }) {
  const { t, lang } = useLanguage();
  const notes = pickLanguageSection(notesHtml, lang);

  return createPortal(
    <motion.div
      style={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        style={styles.panel}
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={styles.title}>
          {t("whats_new_title")}
          {version ? ` — v${version}` : ""}
        </h3>

        {notes ? (
          <div
            style={styles.notes}
            className="scrollArea"
            dangerouslySetInnerHTML={{ __html: notes }}
          />
        ) : (
          <div style={styles.notesEmpty}>{t("whats_new_empty")}</div>
        )}

        <div style={styles.actions}>
          <button onClick={onClose} style={styles.closeBtn}>
            {t("close_btn")}
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
    zIndex: 99999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  panel: {
    width: 440,
    maxHeight: "70vh",
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

  // --info: o título anuncia uma novidade, não é uma ação. O botão de fechar
  // abaixo é que é, e fica no acento — ver a regra no index.css.
  title: {
    margin: 0,
    fontSize: 16,
    color: "var(--info)",
  },

  // overflow / padding-right / scrollbar vêm da classe .scrollArea (index.css).
  notes: {
    fontSize: 13,
    lineHeight: 1.6,
    color: "var(--text-body)",
  },

  notesEmpty: {
    fontSize: 13,
    color: "var(--text-secondary)",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
  },

  closeBtn: {
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
};
