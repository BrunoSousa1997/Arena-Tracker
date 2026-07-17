import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useLanguage } from "../lib/i18n";
import AccountManager from "../components/AccountManager";
import PatchHistoryModal from "../components/PatchHistoryModal";

const TABS = [
  { key: "general", labelKey: "settings_tab_general" },
  { key: "accounts", labelKey: "settings_tab_accounts" },
];

// Resoluções mais comuns — filtradas em runtime (ver maxSize/useEffect
// abaixo) para nunca mostrar uma maior do que o próprio ecrã suporta.
// minWidth/minHeight da BrowserWindow (ver electron/window.js) já impõe
// 900x600 como mínimo absoluto, por isso não há nenhuma opção abaixo disso.
const RESOLUTION_PRESETS = [
  { width: 900, height: 600 },
  { width: 1024, height: 700 },
  { width: 1152, height: 768 },
  { width: 1280, height: 800 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1600, height: 900 },
  { width: 1600, height: 1000 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
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
  const [showPatchHistory, setShowPatchHistory] = useState(false);

  // ================= RESOLUÇÃO / ECRÃ INTEIRO =================
  // "maxSize" é a área útil do ecrã onde a janela está agora (não sempre o
  // ecrã principal, ver window:getDisplayWorkArea em electron/window.js) —
  // usada para nunca oferecer uma resolução maior do que o monitor suporta.
  const [maxSize, setMaxSize] = useState(null);
  const [currentSize, setCurrentSize] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!window.electron?.getDisplayWorkArea) return;

    window.electron.getDisplayWorkArea().then(setMaxSize);
    window.electron.getSize?.().then((size) => {
      setCurrentSize(size);
      setIsFullScreen(size.isFullScreen);
    });

    // O F11/Escape (ver electron/window.js) também alternam full screen —
    // sem isto, o toggle aqui ficava dessincronizado do estado real da
    // janela sempre que a mudança não viesse deste botão.
    const unsubscribe = window.electron.onFullScreenChanged?.(setIsFullScreen);
    return unsubscribe;
  }, []);

  const availableResolutions = maxSize
    ? RESOLUTION_PRESETS.filter((r) => r.width <= maxSize.width && r.height <= maxSize.height)
    : [];

  // O valor pré-selecionado é sempre um dos presets — nunca o tamanho real
  // em pixels da janela (ex: maximizada raramente bate certo com um preset,
  // ver createWindow em electron/window.js). Escolhe o preset mais próximo
  // do tamanho atual (menor diferença de área), para a seleção inicial
  // fazer sentido sem expor um valor "estranho" fora da lista.
  const closestPreset = useMemo(() => {
    if (!currentSize || !availableResolutions.length) return null;
    const currentArea = currentSize.width * currentSize.height;
    return availableResolutions.reduce((closest, r) => {
      const diff = Math.abs(r.width * r.height - currentArea);
      const closestDiff = Math.abs(closest.width * closest.height - currentArea);
      return diff < closestDiff ? r : closest;
    }, availableResolutions[0]);
  }, [currentSize, availableResolutions]);

  const [selectedResolution, setSelectedResolution] = useState(null);
  const selectedValue = selectedResolution
    ? `${selectedResolution.width}x${selectedResolution.height}`
    : closestPreset
    ? `${closestPreset.width}x${closestPreset.height}`
    : "";

  const applyResolution = (width, height) => {
    window.electron?.setResolution?.({ width, height });
    setSelectedResolution({ width, height });
  };

  const applyFullScreen = (value) => {
    window.electron?.setFullScreen?.(value);
    setIsFullScreen(value);
  };

  return (
    <motion.div
      style={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="mainScroll"
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
            <X size={15} strokeWidth={2.25} />
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

            {window.electron && (
              <>
                <div style={styles.row}>
                  <div style={styles.rowLabel}>{t("settings_display_mode_label")}</div>
                  <div style={styles.segGroup}>
                    <button
                      onClick={() => applyFullScreen(false)}
                      style={{ ...styles.segBtn, ...(!isFullScreen ? styles.segBtnActive : null) }}
                    >
                      {t("settings_display_windowed_opt")}
                    </button>
                    <button
                      onClick={() => applyFullScreen(true)}
                      style={{ ...styles.segBtn, ...(isFullScreen ? styles.segBtnActive : null) }}
                    >
                      {t("settings_display_fullscreen_opt")}
                    </button>
                  </div>
                </div>

                <div style={styles.row}>
                  <div style={styles.rowLabel}>{t("settings_resolution_label")}</div>
                  <select
                    disabled={isFullScreen || !availableResolutions.length}
                    value={isFullScreen ? "" : selectedValue}
                    onChange={(e) => {
                      const [width, height] = e.target.value.split("x").map(Number);
                      applyResolution(width, height);
                    }}
                    style={styles.resolutionSelect}
                  >
                    {isFullScreen && (
                      <option value="" disabled>
                        {t("settings_resolution_disabled_fullscreen")}
                      </option>
                    )}
                    {availableResolutions.map((r) => (
                      <option key={`${r.width}x${r.height}`} value={`${r.width}x${r.height}`}>
                        {r.width} × {r.height}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.row}>
                  <div style={styles.rowLabel}>{t("settings_patch_history_label")}</div>
                  <button onClick={() => setShowPatchHistory(true)} style={styles.linkBtn}>
                    {t("settings_patch_history_btn")}
                  </button>
                </div>
              </>
            )}
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

      {showPatchHistory && <PatchHistoryModal onClose={() => setShowPatchHistory(false)} />}
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

  // Mesmo tratamento do champCard em MatchReports.jsx: --panel-deep-rgb, o
  // nível "recuado" da hierarquia (ver index.css). Era um preto fixo, que só
  // recua por cima de um tema escuro — no claro dava #bfbfbf, mais escuro que
  // a própria página.
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
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

  linkBtn: {
    padding: "6px 14px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--accent-rgb),0.35)",
    background: "rgba(var(--accent-rgb),0.12)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "Cinzel, serif",
  },

  resolutionSelect: {
    padding: "6px 10px",
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    color: "var(--text-body)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
};
