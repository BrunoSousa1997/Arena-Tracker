import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "./i18n";
import AccountManager from "./AccountManager";

const TABS = [
  { key: "general", labelKey: "settings_tab_general" },
  { key: "accounts", labelKey: "settings_tab_accounts" },
];

// Modal único de Definições — antes "Idioma", "Tema", "Compactar cabeçalho"
// e "Gerir contas" eram 4 botões soltos no cluster de ícones do cabeçalho;
// agora vivem todos aqui, em abas, para o cabeçalho ficar só com as ações
// realmente frequentes (sync) e um único ⚙ para todo o resto.
export default function Settings({
  onClose,
  initialTab = "general",
  lang,
  setLang,
  theme,
  setTheme,
  headerCompact,
  setHeaderCompact,
  accounts,
  activeAccount,
  onSwitch,
  onCreate,
  onUpdateRiotAccount,
  onDelete,
}) {
  const { t } = useLanguage();
  const [tab, setTab] = useState(initialTab);

  return (
    <motion.div
      style={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        style={styles.panel}
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>{t("settings_title")}</h2>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        <div style={styles.tabRow}>
          {TABS.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              style={{
                ...styles.tabBtn,
                ...(tab === tb.key ? styles.tabBtnActive : null),
              }}
            >
              {t(tb.labelKey)}
            </button>
          ))}
        </div>

        {tab === "general" && (
          <div style={styles.generalList}>
            <div style={styles.generalHint}>{t("settings_general_hint")}</div>
            <div style={styles.row}>
              <div style={styles.rowLabel}>{t("language_label")}</div>
              <div style={styles.segGroup}>
                <button
                  onClick={() => setLang("pt")}
                  style={{ ...styles.segBtn, ...(lang === "pt" ? styles.segBtnActive : null) }}
                >
                  PT
                </button>
                <button
                  onClick={() => setLang("en")}
                  style={{ ...styles.segBtn, ...(lang === "en" ? styles.segBtnActive : null) }}
                >
                  EN
                </button>
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.rowLabel}>{t("settings_theme_label")}</div>
              <div style={styles.segGroup}>
                <button
                  onClick={() => setTheme("dark")}
                  style={{ ...styles.segBtn, ...(theme === "dark" ? styles.segBtnActive : null) }}
                >
                  {t("settings_theme_dark")}
                </button>
                <button
                  onClick={() => setTheme("light")}
                  style={{ ...styles.segBtn, ...(theme === "light" ? styles.segBtnActive : null) }}
                >
                  {t("settings_theme_light")}
                </button>
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.rowLabel}>{t("settings_header_label")}</div>
              <div style={styles.segGroup}>
                <button
                  onClick={() => setHeaderCompact(false)}
                  style={{ ...styles.segBtn, ...(!headerCompact ? styles.segBtnActive : null) }}
                >
                  {t("settings_header_expanded_opt")}
                </button>
                <button
                  onClick={() => setHeaderCompact(true)}
                  style={{ ...styles.segBtn, ...(headerCompact ? styles.segBtnActive : null) }}
                >
                  {t("settings_header_compact_opt")}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "accounts" && (
          <AccountManager
            accounts={accounts}
            activeAccount={activeAccount}
            onSwitch={onSwitch}
            onCreate={onCreate}
            onUpdateRiotAccount={onUpdateRiotAccount}
            onDelete={onDelete}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(3px)",
    zIndex: 99997,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  panel: {
    width: 540,
    maxHeight: "84vh",
    overflowY: "auto",
    borderRadius: "var(--radius-2xl)",
    padding: 26,
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.98), rgba(var(--panel-deep-rgb),0.99))",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    fontFamily: "Cinzel, serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottom: "1px solid rgba(var(--border-rgb),0.35)",
  },

  title: {
    color: "var(--accent-text)",
    fontSize: 20,
    margin: 0,
    letterSpacing: 0.3,
  },

  closeBtn: {
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
    fontSize: 13,
    lineHeight: 1,
    padding: 0,
  },

  tabRow: {
    display: "flex",
    gap: 4,
    padding: 3,
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.5)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  tabBtn: {
    flex: 1,
    padding: "7px 14px",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 700,
    fontFamily: "Cinzel, serif",
    transition: "color 0.15s ease, background 0.15s ease",
  },

  tabBtnActive: {
    background: "rgba(var(--accent-rgb),0.18)",
    color: "var(--accent-text)",
  },

  generalList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  generalHint: {
    fontSize: 11,
    color: "var(--text-muted)",
    marginBottom: -2,
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(var(--accent-rgb),0.15)",
  },

  rowLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text-body)",
  },

  segGroup: {
    display: "flex",
    gap: 2,
    padding: 2,
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  segBtn: {
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "Cinzel, serif",
    transition: "background 0.15s ease, color 0.15s ease",
  },

  segBtnActive: {
    background: "var(--accent-solid)",
    color: "var(--accent-solid-text)",
  },
};
