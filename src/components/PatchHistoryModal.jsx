import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLanguage } from "../lib/i18n";
import { pickLanguageSection } from "../lib/patchNotes";

// Lista todas as releases publicadas no GitHub (não só a última descarregada
// pelo auto-update, ver WhatsNewModal) — pedida ao processo principal em
// electron/updater.js, que lê o feed atom público do repositório.
export default function PatchHistoryModal({ onClose }) {
  const { t, lang } = useLanguage();
  const [state, setState] = useState({ loading: true, releases: [], error: null });

  useEffect(() => {
    let cancelled = false;

    window.electron?.getReleaseHistory?.().then((result) => {
      if (cancelled) return;
      setState(
        result?.ok
          ? { loading: false, releases: result.releases, error: null }
          : { loading: false, releases: [], error: result?.error || "unknown" }
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
        <div style={styles.header}>
          <h3 style={styles.title}>{t("patch_history_title")}</h3>
          <button onClick={onClose} style={styles.closeIconBtn}>
            <X size={15} strokeWidth={2.25} />
          </button>
        </div>

        <div style={styles.list} className="scrollArea">
          {state.loading && <div style={styles.hint}>{t("patch_history_loading")}</div>}

          {!state.loading && state.error && <div style={styles.hint}>{t("patch_history_error")}</div>}

          {!state.loading && !state.error && state.releases.length === 0 && (
            <div style={styles.hint}>{t("patch_history_empty")}</div>
          )}

          {state.releases.map((r) => {
            const notes = pickLanguageSection(r.notesHtml, lang);
            return (
              <div key={r.version} style={styles.entry}>
                <div style={styles.entryHeader}>
                  <span style={styles.entryVersion}>v{r.version}</span>
                  {r.publishedAt && (
                    <span style={styles.entryDate}>
                      {new Date(r.publishedAt).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-US")}
                    </span>
                  )}
                </div>

                {notes ? (
                  <div style={styles.entryNotes} dangerouslySetInnerHTML={{ __html: notes }} />
                ) : (
                  <div style={styles.entryNotesEmpty}>{t("whats_new_empty")}</div>
                )}
              </div>
            );
          })}
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
    width: 480,
    maxHeight: "76vh",
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

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // --info, como no WhatsNewModal: isto é histórico, não é uma ação. O botão
  // de fechar é que é, e fica no acento — ver a regra no index.css.
  title: {
    margin: 0,
    fontSize: 16,
    color: "var(--info)",
  },

  closeIconBtn: {
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "rgba(var(--soft-rgb),0.08)",
    color: "var(--accent-text)",
    cursor: "pointer",
    padding: 0,
  },

  // overflow / padding-right / scrollbar vêm da classe .scrollArea (index.css);
  // aqui fica só o layout e um teto de altura maior que os 45vh por omissão,
  // já que o histórico costuma ter várias versões.
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxHeight: "58vh",
  },

  hint: {
    fontSize: 13,
    color: "var(--text-secondary)",
  },

  entry: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "10px 12px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid var(--info-border)",
  },

  entryHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },

  entryVersion: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--info)",
  },

  entryDate: {
    fontSize: 11,
    color: "var(--text-muted)",
  },

  entryNotes: {
    fontSize: 12.5,
    lineHeight: 1.55,
    color: "var(--text-body)",
  },

  entryNotesEmpty: {
    fontSize: 12.5,
    color: "var(--text-muted)",
    fontStyle: "italic",
  },
};
