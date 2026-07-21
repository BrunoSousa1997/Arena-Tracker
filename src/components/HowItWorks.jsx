import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  X,
  Rocket,
  RotateCw,
  Radio,
  LayoutGrid,
  Swords,
  MonitorDown,
  Wrench,
} from "lucide-react";
import { useLanguage } from "../lib/i18n";
import { HOW_IT_WORKS_SECTIONS } from "../lib/howItWorks";

// "Como funciona" — o percurso todo da app num sítio só, do ligar a conta até
// às ferramentas de manutenção.
//
// Navegação por secções na lateral em vez de um único texto corrido: quem
// abre isto de propósito quer ler tudo, mas quem volta cá quer uma coisa
// específica ("como é que ligo o arranque automático?") e não deve ter de
// percorrer o resto para lá chegar.
//
// Sem AnimatePresence, tal como o ConfirmDialog e os toasts — ver a nota lá
// sobre o AnimatePresence ficar preso com o React 19 nesta app. Portal para
// document.body porque abre a partir de dentro do modal de Definições, que
// tem "transform" no style e criaria um containing block para o position:
// fixed deste.
const ICONS = {
  rocket: Rocket,
  sync: RotateCw,
  live: Radio,
  tabs: LayoutGrid,
  swords: Swords,
  background: MonitorDown,
  wrench: Wrench,
};

export default function HowItWorks({ onClose }) {
  const { t, lang } = useLanguage();
  const [activeId, setActiveId] = useState(HOW_IT_WORKS_SECTIONS[0].id);

  const active = HOW_IT_WORKS_SECTIONS.find((s) => s.id === activeId) || HOW_IT_WORKS_SECTIONS[0];
  const ActiveIcon = ICONS[active.icon] || Rocket;

  const index = HOW_IT_WORKS_SECTIONS.findIndex((s) => s.id === active.id);
  const prev = HOW_IT_WORKS_SECTIONS[index - 1];
  const next = HOW_IT_WORKS_SECTIONS[index + 1];

  return createPortal(
    <motion.div
      style={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        style={styles.panel}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>{t("how_it_works_title")}</h2>
          <button onClick={onClose} style={styles.closeBtn} aria-label={t("how_it_works_close")}>
            <X size={15} strokeWidth={2.25} />
          </button>
        </div>

        <div style={styles.body}>
          <nav style={styles.nav}>
            {HOW_IT_WORKS_SECTIONS.map((s) => {
              const Icon = ICONS[s.icon] || Rocket;
              const on = s.id === active.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  style={{ ...styles.navBtn, ...(on ? styles.navBtnActive : null) }}
                >
                  <Icon size={13} strokeWidth={2.25} style={{ flexShrink: 0 }} />
                  <span style={styles.navLabel}>{s.title[lang] || s.title.pt}</span>
                </button>
              );
            })}
          </nav>

          <div className="mainScroll" style={styles.content}>
            <div style={styles.contentHead}>
              <span style={styles.contentIcon}>
                <ActiveIcon size={16} strokeWidth={2.25} />
              </span>
              <h3 style={styles.contentTitle}>{active.title[lang] || active.title.pt}</h3>
            </div>

            {(active.body[lang] || active.body.pt).map((p, i) => (
              <p key={i} style={styles.para}>
                {p}
              </p>
            ))}

            <div style={styles.pager}>
              <button
                onClick={() => prev && setActiveId(prev.id)}
                disabled={!prev}
                style={{ ...styles.pagerBtn, opacity: prev ? 1 : 0.35 }}
              >
                ← {prev ? prev.title[lang] || prev.title.pt : ""}
              </button>
              <button
                onClick={() => next && setActiveId(next.id)}
                disabled={!next}
                style={{ ...styles.pagerBtn, opacity: next ? 1 : 0.35 }}
              >
                {next ? next.title[lang] || next.title.pt : ""} →
              </button>
            </div>
          </div>
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
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(3px)",
    zIndex: 99998,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  panel: {
    width: 760,
    maxWidth: "100%",
    height: 520,
    maxHeight: "88vh",
    borderRadius: "var(--radius-2xl)",
    padding: 24,
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
    paddingBottom: 12,
    borderBottom: "1px solid rgba(var(--border-rgb),0.35)",
    flexShrink: 0,
  },

  title: { color: "var(--accent-text)", fontSize: 20, margin: 0, letterSpacing: 0.3 },

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
    padding: 0,
  },

  body: { display: "flex", gap: 16, flex: 1, minHeight: 0 },

  nav: {
    width: 210,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    overflowY: "auto",
  },

  navBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 11px",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "Cinzel, serif",
    textAlign: "left",
    transition: "background 0.15s ease, color 0.15s ease",
  },

  navBtnActive: { background: "rgba(var(--accent-rgb),0.18)", color: "var(--accent-text)" },

  navLabel: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" },

  content: {
    flex: 1,
    minWidth: 0,
    overflowY: "auto",
    padding: "14px 16px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--accent-rgb),0.15)",
  },

  contentHead: { display: "flex", alignItems: "center", gap: 9, marginBottom: 10 },

  contentIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    flexShrink: 0,
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--accent-rgb),0.14)",
    border: "1px solid rgba(var(--accent-rgb),0.3)",
    color: "var(--accent-text)",
  },

  contentTitle: { margin: 0, fontSize: 15, color: "var(--accent-text)" },

  // Texto corrido em fonte de leitura, não na Cinzel do resto da interface —
  // a Cinzel é de display e cansa em parágrafos longos.
  para: {
    margin: "0 0 11px",
    fontSize: 12.5,
    lineHeight: 1.65,
    color: "var(--text-body)",
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
  },

  pager: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid rgba(var(--border-rgb),0.25)",
  },

  pagerBtn: {
    padding: "6px 10px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "Cinzel, serif",
    maxWidth: "48%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
