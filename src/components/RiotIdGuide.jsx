import { motion } from "framer-motion";
import {
  HelpCircle,
  ChevronDown,
  Gamepad2,
  MousePointerClick,
  ClipboardPaste,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "../lib/i18n";

// "Onde encontro o meu Riot ID?" — a ajuda que vive dentro do formulário de
// ligar conta (ver AccountManager.jsx).
//
// O formulário pede UM dado só, mas é um dado que está noutro programa: quem
// nunca o procurou não sabe que o Riot ID tem duas partes nem onde é que o
// cliente do jogo o mostra. Antes disto havia duas linhas de texto cinzento a
// dizer o formato — chegava para quem já sabia e não ajudava quem não sabia.
//
// Três decisões:
//   - abre-se aqui dentro, não noutro modal: para se poder ler e escrever ao
//     mesmo tempo, sem tapar o campo que se está a preencher;
//   - tem um desenho do canto do cliente (ver "mock" nos estilos) em vez de
//     só descrever o sítio — "canto superior direito" lê-se e esquece-se,
//     um desenho reconhece-se quando se olha para o jogo;
//   - diz também o que a app NÃO precisa (password, ligar a conta Riot), que
//     é a pergunta seguinte de quem está a escrever o seu nome numa app de
//     fora do jogo.
//
// Sem AnimatePresence, como no resto da app (ver nota no ConfirmDialog sobre
// o AnimatePresence ficar preso com o React 19 aqui): fechar é instantâneo.
export default function RiotIdGuide({ open, onToggle }) {
  const { t } = useLanguage();

  const steps = [
    { icon: Gamepad2, title: t("riotid_guide_step1_title"), body: t("riotid_guide_step1_body") },
    {
      icon: MousePointerClick,
      title: t("riotid_guide_step2_title"),
      body: t("riotid_guide_step2_body"),
    },
    {
      icon: ClipboardPaste,
      title: t("riotid_guide_step3_title"),
      body: t("riotid_guide_step3_body"),
    },
  ];

  return (
    <div style={styles.wrap}>
      <button onClick={onToggle} style={styles.toggle} aria-expanded={open}>
        <HelpCircle size={13} strokeWidth={2.25} style={{ flexShrink: 0 }} />
        <span style={styles.toggleLabel}>{t("riotid_guide_open")}</span>
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.16s ease",
          }}
        />
      </button>

      {open && (
        <motion.div
          style={styles.body}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
        >
          {/* O desenho vem antes dos passos: é o que faz "ah, é aquilo" em
              quem já tem o cliente aberto ao lado. */}
          <div style={styles.mock} aria-hidden="true">
            <div style={styles.mockBar}>
              <span style={styles.mockTabs}>
                <span style={styles.mockTab} />
                <span style={styles.mockTab} />
                <span style={styles.mockTab} />
              </span>
              <span style={styles.mockId}>
                <span style={styles.mockIdName}>{t("riotid_mock_name")}</span>
                <span style={styles.mockIdTag}>#EUW</span>
              </span>
              <span style={styles.mockAvatar} />
            </div>
            <div style={styles.mockStage} />
          </div>
          <div style={styles.mockCaption}>{t("riotid_mock_caption")}</div>

          <ol style={styles.steps}>
            {steps.map((s, i) => (
              <li key={i} style={styles.step}>
                <span style={styles.stepNum}>
                  <s.icon size={13} strokeWidth={2.25} />
                </span>
                <div style={styles.stepText}>
                  <div style={styles.stepTitle}>{s.title}</div>
                  <div style={styles.stepBody}>{s.body}</div>
                </div>
              </li>
            ))}
          </ol>

          <div style={styles.note}>
            <span style={styles.noteIcon}>
              <Globe size={12} strokeWidth={2.25} />
            </span>
            <div>
              <span style={styles.noteTitle}>{t("riotid_guide_web_title")}</span>{" "}
              <span style={styles.noteBody}>{t("riotid_guide_web_body")}</span>
            </div>
          </div>

          <div style={{ ...styles.note, ...styles.noteCalm }}>
            <span style={{ ...styles.noteIcon, ...styles.noteIconCalm }}>
              <ShieldCheck size={12} strokeWidth={2.25} />
            </span>
            <div>
              <span style={styles.noteTitle}>{t("riotid_guide_privacy_title")}</span>{" "}
              <span style={styles.noteBody}>{t("riotid_guide_privacy_body")}</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Fonte de leitura (não a Cinzel de display da interface) em tudo o que é
// frase: são parágrafos para ler, não etiquetas para reconhecer.
const READING = "system-ui, -apple-system, Segoe UI, sans-serif";

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 8 },

  toggle: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    width: "100%",
    padding: "8px 11px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--accent-rgb),0.28)",
    background: "rgba(var(--accent-rgb),0.08)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 700,
    fontFamily: "Cinzel, serif",
    textAlign: "left",
  },

  toggleLabel: { flex: 1, minWidth: 0 },

  body: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "12px 13px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--accent-rgb),0.15)",
  },

  // ---- desenho do canto do cliente ----
  mock: {
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
    border: "1px solid rgba(var(--border-rgb),0.45)",
    background: "rgba(var(--panel-deep-rgb),0.95)",
  },

  mockBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 9px",
    borderBottom: "1px solid rgba(var(--border-rgb),0.35)",
  },

  mockTabs: { display: "flex", gap: 5, flex: 1 },

  // Barras cinzentas no lugar das abas do cliente: dão a forma do ecrã sem
  // competir com a única coisa que aqui interessa, que é o ID.
  mockTab: {
    width: 22,
    height: 5,
    borderRadius: 3,
    background: "rgba(var(--soft-rgb),0.18)",
  },

  mockId: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: 1,
    padding: "3px 7px",
    borderRadius: "var(--radius-sm)",
    background: "rgba(var(--accent-rgb),0.18)",
    border: "1px solid rgba(var(--accent-rgb),0.55)",
    boxShadow: "0 0 0 3px rgba(var(--accent-rgb),0.12)",
  },

  mockIdName: { fontSize: 10.5, fontWeight: 700, color: "var(--accent-text)" },

  mockIdTag: { fontSize: 10.5, fontWeight: 700, color: "var(--accent-text)", opacity: 0.7 },

  mockAvatar: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "rgba(var(--soft-rgb),0.22)",
    flexShrink: 0,
  },

  mockStage: { height: 26, background: "rgba(var(--soft-rgb),0.05)" },

  mockCaption: {
    fontSize: 10.5,
    lineHeight: 1.5,
    color: "var(--text-muted)",
    fontFamily: READING,
    marginTop: -4,
  },

  // ---- passos ----
  steps: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 9,
  },

  step: { display: "flex", gap: 9 },

  stepNum: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    flexShrink: 0,
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--accent-rgb),0.14)",
    border: "1px solid rgba(var(--accent-rgb),0.3)",
    color: "var(--accent-text)",
  },

  stepText: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },

  stepTitle: { fontSize: 11.5, fontWeight: 700, color: "var(--text-body)" },

  stepBody: {
    fontSize: 11,
    lineHeight: 1.55,
    color: "var(--text-muted)",
    fontFamily: READING,
  },

  // ---- notas de pé ----
  note: {
    display: "flex",
    gap: 8,
    padding: "9px 11px",
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--accent-rgb),0.08)",
    border: "1px solid rgba(var(--accent-rgb),0.22)",
  },

  // A nota de privacidade não é um aviso nem uma dica a seguir — é só uma
  // garantia. Fica no cinzento do painel para não puxar a vista ao destaque.
  noteCalm: {
    background: "rgba(var(--soft-rgb),0.06)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  noteIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    flexShrink: 0,
    borderRadius: "var(--radius-sm)",
    background: "rgba(var(--accent-rgb),0.14)",
    color: "var(--accent-text)",
  },

  noteIconCalm: { background: "rgba(var(--soft-rgb),0.1)", color: "var(--text-secondary)" },

  noteTitle: { fontSize: 11, fontWeight: 700, color: "var(--text-body)", fontFamily: READING },

  noteBody: {
    fontSize: 11,
    lineHeight: 1.55,
    color: "var(--text-muted)",
    fontFamily: READING,
  },
};
