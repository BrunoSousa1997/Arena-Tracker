import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useLanguage } from "../lib/i18n";
import { TAB_GUIDE } from "../lib/howItWorks";

// Visita guiada às tabs, logo a seguir a ligar a primeira conta.
//
// Em vez de desenhar setas e balões apontados a cada botão (frágil: depende
// de posições que mudam com o tamanho da janela, com o cabeçalho compacto e
// com o nº de tabs), isto faz uma coisa mais simples e mais útil — vai ABRINDO
// cada tab enquanto a descreve. Lê-se o texto e vê-se a tab real por trás, com
// os dados reais da conta, em vez de uma explicação abstracta.
//
// O cartão fica no fundo ao centro, longe do cabeçalho e das tabs (que é o que
// interessa ver por baixo) e do canto onde vivem os toasts.
export default function TabTour({ onSelectTab, onFinish, stepIndex, onStepChange }) {
  const { t, lang } = useLanguage();

  const step = TAB_GUIDE[stepIndex];
  const isLast = stepIndex === TAB_GUIDE.length - 1;

  // Cada passo abre a tab de que fala. É um efeito (e não parte do onClick)
  // para o primeiro passo também abrir a sua tab, sem precisar de um clique.
  useEffect(() => {
    if (step) onSelectTab(step.key);
  }, [step?.key]);

  if (!step) return null;

  return createPortal(
    <motion.div
      style={styles.wrap}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div style={styles.card}>
        <div style={styles.head}>
          <span style={styles.counter}>
            {stepIndex + 1}/{TAB_GUIDE.length}
          </span>
          <h3 style={styles.title}>{step.title[lang] || step.title.pt}</h3>
          <button onClick={onFinish} style={styles.closeBtn} aria-label={t("tour_skip")}>
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>

        <p style={styles.body}>{step.text[lang] || step.text.pt}</p>

        <div style={styles.dots}>
          {TAB_GUIDE.map((tb, i) => (
            <button
              key={tb.key}
              onClick={() => onStepChange(i)}
              aria-label={tb.title[lang] || tb.title.pt}
              style={{
                ...styles.dot,
                background: i === stepIndex ? "var(--accent-solid)" : "rgba(var(--soft-rgb),0.22)",
                width: i === stepIndex ? 18 : 6,
              }}
            />
          ))}
        </div>

        <div style={styles.actions}>
          <button onClick={onFinish} style={styles.ghostBtn}>
            {t("tour_skip")}
          </button>
          <div style={styles.actionsRight}>
            {stepIndex > 0 && (
              <button onClick={() => onStepChange(stepIndex - 1)} style={styles.ghostBtn}>
                {t("tour_prev")}
              </button>
            )}
            <button
              onClick={() => (isLast ? onFinish() : onStepChange(stepIndex + 1))}
              style={styles.primaryBtn}
            >
              {isLast ? t("tour_done") : t("tour_next")}
            </button>
          </div>
        </div>
      </div>
    </motion.div>,
    document.body
  );
}

const styles = {
  // Sem backdrop de propósito: o objectivo é ver a tab por trás, não escurecê-la.
  wrap: {
    position: "fixed",
    left: "50%",
    bottom: 24,
    transform: "translateX(-50%)",
    zIndex: 99995,
    pointerEvents: "none",
    width: "min(560px, calc(100vw - 40px))",
  },

  card: {
    pointerEvents: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 11,
    padding: "16px 18px",
    borderRadius: "var(--radius-xl)",
    background: "var(--surface-float)",
    border: "1px solid rgba(var(--accent-rgb),0.35)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
    fontFamily: "Cinzel, serif",
  },

  head: { display: "flex", alignItems: "center", gap: 10 },

  counter: {
    flexShrink: 0,
    padding: "3px 8px",
    borderRadius: "var(--radius-sm)",
    background: "rgba(var(--accent-rgb),0.16)",
    color: "var(--accent-text)",
    fontSize: 10.5,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },

  title: { margin: 0, flex: 1, fontSize: 15, color: "var(--accent-text)" },

  closeBtn: {
    width: 22,
    height: 22,
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

  body: {
    margin: 0,
    fontSize: 12.5,
    lineHeight: 1.6,
    color: "var(--text-body)",
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
  },

  dots: { display: "flex", alignItems: "center", gap: 5 },

  dot: {
    height: 6,
    borderRadius: 3,
    border: "none",
    padding: 0,
    cursor: "pointer",
    transition: "width 0.18s ease, background 0.18s ease",
  },

  actions: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },

  actionsRight: { display: "flex", gap: 7 },

  ghostBtn: {
    padding: "7px 13px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 600,
    fontFamily: "Cinzel, serif",
  },

  primaryBtn: {
    padding: "7px 18px",
    borderRadius: "var(--radius-md)",
    border: "1px solid transparent",
    background: "var(--accent-solid)",
    color: "var(--accent-solid-text)",
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 700,
    fontFamily: "Cinzel, serif",
  },
};
