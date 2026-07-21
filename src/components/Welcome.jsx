import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { UserPlus, RotateCw, Radio } from "lucide-react";
import { useLanguage } from "../lib/i18n";

// Primeiro arranque, sem nenhuma conta ligada.
//
// Antes disto a app abria directamente o modal de Definições na aba Contas —
// tecnicamente o sítio certo, mas sem uma palavra sobre o que era aquilo nem
// sobre o que se ganha em preencher. Quem abre a app pela primeira vez cai num
// formulário, sem contexto.
//
// Aqui explica-se primeiro o que a app faz e o que é preciso (o Riot ID
// COMPLETO, com a tag — o erro mais comum é escrever só o nome), e só depois
// se manda para o formulário. Aparece uma única vez; a partir daí o mesmo
// conteúdo vive no guia (Definições → Como funciona).
export default function Welcome({ onAddAccount, onOpenGuide, onDismiss }) {
  const { t } = useLanguage();

  const steps = [
    { icon: UserPlus, title: t("welcome_step1_title"), body: t("welcome_step1_body") },
    { icon: RotateCw, title: t("welcome_step2_title"), body: t("welcome_step2_body") },
    { icon: Radio, title: t("welcome_step3_title"), body: t("welcome_step3_body") },
  ];

  return createPortal(
    <motion.div style={styles.backdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div
        style={styles.panel}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <div style={styles.head}>
          <h2 style={styles.title}>{t("welcome_title")}</h2>
          <p style={styles.subtitle}>{t("welcome_subtitle")}</p>
        </div>

        <div style={styles.steps}>
          {steps.map((s, i) => (
            <div key={i} style={styles.step}>
              <span style={styles.stepIcon}>
                <s.icon size={16} strokeWidth={2.25} />
              </span>
              <div style={styles.stepText}>
                <div style={styles.stepTitle}>{s.title}</div>
                <div style={styles.stepBody}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* O formato do Riot ID é o tropeção nº1 e por isso tem destaque
            próprio, com um exemplo literal em vez de só a descrição. */}
        <div style={styles.tip}>
          <span style={styles.tipLabel}>{t("welcome_tip_label")}</span>
          <span style={styles.tipText}>{t("welcome_tip_text")}</span>
        </div>

        <div style={styles.actions}>
          <button onClick={onOpenGuide} style={styles.ghostBtn}>
            {t("welcome_guide_btn")}
          </button>
          <div style={styles.actionsRight}>
            <button onClick={onDismiss} style={styles.ghostBtn}>
              {t("welcome_later_btn")}
            </button>
            <button onClick={onAddAccount} style={styles.primaryBtn}>
              <UserPlus size={13} strokeWidth={2.5} />
              {t("welcome_add_btn")}
            </button>
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
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(4px)",
    zIndex: 99996,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  panel: {
    width: 560,
    maxWidth: "100%",
    maxHeight: "88vh",
    overflowY: "auto",
    borderRadius: "var(--radius-2xl)",
    padding: 28,
    background: "var(--surface-float)",
    border: "1px solid rgba(var(--accent-rgb),0.3)",
    boxShadow: "0 24px 70px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    fontFamily: "Cinzel, serif",
  },

  head: { display: "flex", flexDirection: "column", gap: 6 },

  title: { margin: 0, fontSize: 23, color: "var(--accent-text)", letterSpacing: 0.3 },

  subtitle: {
    margin: 0,
    fontSize: 12.5,
    lineHeight: 1.6,
    color: "var(--text-secondary)",
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
  },

  steps: { display: "flex", flexDirection: "column", gap: 10 },

  step: {
    display: "flex",
    gap: 11,
    padding: "12px 14px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--accent-rgb),0.15)",
  },

  stepIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    flexShrink: 0,
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--accent-rgb),0.14)",
    border: "1px solid rgba(var(--accent-rgb),0.3)",
    color: "var(--accent-text)",
  },

  stepText: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0 },

  stepTitle: { fontSize: 12.5, fontWeight: 700, color: "var(--text-body)" },

  stepBody: {
    fontSize: 11.5,
    lineHeight: 1.55,
    color: "var(--text-muted)",
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
  },

  tip: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 7,
    padding: "10px 13px",
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--accent-rgb),0.1)",
    border: "1px solid rgba(var(--accent-rgb),0.28)",
  },

  tipLabel: { fontSize: 11, fontWeight: 700, color: "var(--accent-text)" },

  tipText: {
    fontSize: 11.5,
    lineHeight: 1.5,
    color: "var(--text-body)",
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
    flex: 1,
    minWidth: 200,
  },

  actions: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },

  actionsRight: { display: "flex", gap: 8 },

  ghostBtn: {
    padding: "8px 14px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "Cinzel, serif",
  },

  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 18px",
    borderRadius: "var(--radius-md)",
    border: "1px solid transparent",
    background: "var(--accent-solid)",
    color: "var(--accent-solid-text)",
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 700,
    fontFamily: "Cinzel, serif",
    boxShadow: "0 4px 14px rgba(var(--accent-rgb),0.35)",
  },
};
