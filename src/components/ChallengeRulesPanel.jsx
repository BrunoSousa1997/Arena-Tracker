import { useState } from "react";
import { Check, Flame, HeartPulse, Scale, Shield, Skull, Sliders, Swords, Target, Users, Zap, Handshake } from "lucide-react";
import { useLanguage } from "../lib/i18n";
import { DEFAULT_RULES } from "../lib/challengeScoring";
import { ICON_STROKE } from "../lib/ui";

// ================= PAINEL DE CONFIGURAÇÕES DO DESAFIO =================
// As regras eram dois botões ("Básicas"/"Específicas") e, no segundo, três
// caixas de visto com legendas — ou seja: para saber o que o desafio ia
// contar era preciso ler três frases e fazer as contas de cabeça.
//
// Aqui há duas camadas, e a segunda é a que faltava:
//  1) três PREDEFINIÇÕES com nome e intenção ("Clássico", "Duelo puro",
//     "Personalizado") — a escolha que 90% das salas quer fazer, num clique;
//  2) o quadro "o que conta", que acende/apaga as categorias de pontuação
//     conforme as regras escolhidas. É a resposta visual imediata a cada
//     interruptor, e deixa de ser preciso confiar na memória.
//
// O formato guardado na base de dados NÃO mudou: continua a ser
// rules ("basic"|"custom") + rules_config (ver createRoom). As predefinições
// são só uma leitura mais humana desse par.

const KDA_PRESET = { ...DEFAULT_RULES, onlyKda: true };

function sameRules(a, b) {
  return (
    !!a.classHandicap === !!b.classHandicap &&
    !!a.onlyKda === !!b.onlyKda &&
    !!a.onlySoloGames === !!b.onlySoloGames
  );
}

// Que predefinição é que este par (rules, rulesConfig) representa. Usado para
// arrancar com o cartão certo aceso quando o painel volta a montar (ex: voltar
// atrás no assistente de criação).
function presetOf(rules, rulesConfig) {
  if (rules !== "custom") return "classic";
  if (sameRules({ ...DEFAULT_RULES, ...rulesConfig }, KDA_PRESET)) return "kda";
  return "custom";
}

// O par a guardar para cada predefinição. "custom" mantém o que lá estava —
// trocar de "Duelo puro" para "Personalizado" não deve apagar as escolhas.
function rulesForPreset(preset, currentConfig) {
  if (preset === "classic") return { rules: "basic", rulesConfig: { ...DEFAULT_RULES } };
  if (preset === "kda") return { rules: "custom", rulesConfig: { ...KDA_PRESET } };
  return { rules: "custom", rulesConfig: { ...DEFAULT_RULES, ...currentConfig } };
}

// ================= INTERRUPTOR =================
// Substitui a caixa de visto do browser: o mesmo gesto, mas com o botão a
// deslizar e a mudar de cor — é o que faz um painel de opções parecer um
// painel de opções de jogo em vez de um formulário.
function Switch({ checked, onChange, icon: Icon, label, hint }) {
  return (
    <button type="button" onClick={onChange} style={styles.switchRow} aria-pressed={checked}>
      <span style={{ ...styles.switchTrack, ...(checked ? styles.switchTrackOn : null) }}>
        <span style={{ ...styles.switchKnob, ...(checked ? styles.switchKnobOn : null) }} />
      </span>
      <span style={styles.switchText}>
        <span style={{ ...styles.switchLabel, ...(checked ? styles.switchLabelOn : null) }}>
          {Icon && <Icon size={12} strokeWidth={ICON_STROKE} />}
          {label}
        </span>
        <span style={styles.switchHint}>{hint}</span>
      </span>
    </button>
  );
}

// ================= O QUE CONTA =================
// Cada categoria de pontuação como um chip aceso (conta) ou apagado (não
// conta neste desafio). O que antes se tinha de deduzir das legendas.
function ScoringMatrix({ config }) {
  const { t } = useLanguage();
  const extras = !config.onlyKda;

  const chips = [
    { icon: Swords, label: t("chal_kills"), on: true },
    { icon: Skull, label: t("chal_deaths"), on: true },
    { icon: Handshake, label: t("chal_assists"), on: true },
    { icon: Flame, label: t("chal_stat_streaks"), on: true },
    { icon: Flame, label: t("stat_damage_dealt"), on: extras },
    { icon: HeartPulse, label: t("stat_healing"), on: extras },
    { icon: Shield, label: t("stat_damage_taken"), on: extras },
    { icon: Zap, label: t("chal_multikills"), on: extras },
    { icon: Scale, label: t("chal_rule_class_handicap"), on: !!config.classHandicap },
    { icon: Users, label: t("chal_rule_only_solo_short"), on: !!config.onlySoloGames },
  ];

  return (
    <div style={styles.matrixWrap}>
      <div style={styles.matrixTitle}>
        <Target size={12} strokeWidth={ICON_STROKE} /> {t("chal_what_counts")}
      </div>
      <div style={styles.matrixGrid}>
        {chips.map((c) => (
          <span
            key={c.label}
            style={{ ...styles.chip, ...(c.on ? styles.chipOn : styles.chipOff) }}
            title={c.on ? t("chal_counts_yes") : t("chal_counts_no")}
          >
            <c.icon size={11} strokeWidth={ICON_STROKE} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ChallengeRulesPanel({ rules, rulesConfig, onChange }) {
  const { t } = useLanguage();
  // A predefinição escolhida vive aqui e não no pai: o pai só precisa de
  // saber o par (rules, rulesConfig) que vai para a base de dados. É este
  // estado que decide se os interruptores aparecem — sem ele, mexer num
  // interruptor até ao ponto de a configuração calhar igual a um preset
  // fechava o painel na cara de quem estava a afiná-lo.
  const [preset, setPreset] = useState(() => presetOf(rules, rulesConfig));

  const config = { ...DEFAULT_RULES, ...rulesConfig };

  const choose = (next) => {
    setPreset(next);
    onChange(rulesForPreset(next, config));
  };

  const toggle = (key) =>
    onChange({ rules: "custom", rulesConfig: { ...config, [key]: !config[key] } });

  const presets = [
    {
      key: "classic",
      icon: Swords,
      title: t("chal_preset_classic"),
      desc: t("chal_preset_classic_desc"),
    },
    { key: "kda", icon: Target, title: t("chal_preset_kda"), desc: t("chal_preset_kda_desc") },
    {
      key: "custom",
      icon: Sliders,
      title: t("chal_preset_custom"),
      desc: t("chal_preset_custom_desc"),
    },
  ];

  return (
    <div>
      <div style={styles.presetGrid}>
        {presets.map((p) => {
          const active = preset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => choose(p.key)}
              className="at-chal-preset"
              style={{ ...styles.presetCard, ...(active ? styles.presetCardActive : null) }}
            >
              <span style={{ ...styles.presetIcon, ...(active ? styles.presetIconActive : null) }}>
                <p.icon size={15} strokeWidth={ICON_STROKE} />
              </span>
              <span style={styles.presetBody}>
                <span style={styles.presetTitle}>{p.title}</span>
                <span style={styles.presetDesc}>{p.desc}</span>
              </span>
              {active && (
                <span style={styles.presetCheck}>
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {preset === "custom" && (
        <div className="at-chal-reveal" style={styles.switchBox}>
          <Switch
            checked={config.classHandicap}
            onChange={() => toggle("classHandicap")}
            icon={Scale}
            label={t("chal_rule_class_handicap")}
            hint={t("chal_rule_class_handicap_hint")}
          />
          <Switch
            checked={config.onlyKda}
            onChange={() => toggle("onlyKda")}
            icon={Target}
            label={t("chal_rule_only_kda")}
            hint={t("chal_rule_only_kda_hint")}
          />
          <Switch
            checked={config.onlySoloGames}
            onChange={() => toggle("onlySoloGames")}
            icon={Users}
            label={t("chal_rule_only_solo")}
            hint={t("chal_rule_only_solo_hint")}
          />
        </div>
      )}

      <ScoringMatrix config={preset === "classic" ? DEFAULT_RULES : config} />
    </div>
  );
}

const styles = {
  presetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 8,
  },

  presetCard: {
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    padding: "11px 12px",
    textAlign: "left",
    borderRadius: "var(--radius-lg)",
    border: "1px solid rgba(var(--border-rgb),0.45)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    color: "var(--text-body)",
    cursor: "pointer",
    overflow: "hidden",
  },

  presetCardActive: {
    borderColor: "rgba(var(--accent-rgb),0.75)",
    background: "linear-gradient(135deg, rgba(var(--accent-rgb),0.16), rgba(var(--panel-deep-rgb),0.9))",
  },

  presetIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    flexShrink: 0,
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--soft-rgb),0.07)",
    color: "var(--text-secondary)",
    transition: "background-color 0.15s ease, color 0.15s ease",
  },

  presetIconActive: {
    background: "rgba(var(--accent-rgb),0.2)",
    color: "var(--accent-text)",
  },

  presetBody: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },

  presetTitle: { fontSize: 12.5, fontWeight: 800 },

  presetDesc: { fontSize: 10.5, lineHeight: 1.35, color: "var(--text-muted)" },

  presetCheck: {
    position: "absolute",
    top: 7,
    right: 7,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "var(--accent-gradient)",
    color: "var(--accent-solid-text)",
  },

  switchBox: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  switchRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "7px 6px",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "transparent",
    textAlign: "left",
    cursor: "pointer",
    color: "inherit",
  },

  switchTrack: {
    position: "relative",
    width: 32,
    height: 18,
    flexShrink: 0,
    marginTop: 1,
    borderRadius: "var(--radius-pill)",
    background: "rgba(var(--soft-rgb),0.12)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    transition: "background-color 0.18s ease, border-color 0.18s ease",
  },

  switchTrackOn: {
    background: "var(--accent-gradient)",
    borderColor: "transparent",
  },

  switchKnob: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "var(--text-secondary)",
    transition: "transform 0.18s cubic-bezier(0.2,0.9,0.3,1.3), background-color 0.18s ease",
  },

  switchKnobOn: {
    transform: "translateX(14px)",
    background: "var(--accent-solid-text)",
  },

  switchText: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },

  switchLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text-secondary)",
    transition: "color 0.15s ease",
  },

  switchLabelOn: { color: "var(--text-body)" },

  switchHint: { fontSize: 10.5, lineHeight: 1.35, color: "var(--text-muted)" },

  matrixWrap: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.55)",
    border: "1px dashed rgba(var(--border-rgb),0.45)",
  },

  matrixTitle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "var(--text-muted)",
    marginBottom: 8,
  },

  matrixGrid: { display: "flex", flexWrap: "wrap", gap: 5 },

  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 8px",
    borderRadius: "var(--radius-pill)",
    fontSize: 10.5,
    fontWeight: 700,
    border: "1px solid transparent",
    transition: "opacity 0.18s ease, background-color 0.18s ease, color 0.18s ease",
  },

  chipOn: {
    background: "rgba(var(--accent-rgb),0.14)",
    borderColor: "rgba(var(--accent-rgb),0.4)",
    color: "var(--accent-text)",
  },

  chipOff: {
    background: "rgba(var(--soft-rgb),0.04)",
    borderColor: "rgba(var(--border-rgb),0.35)",
    color: "var(--text-muted)",
    opacity: 0.55,
    textDecoration: "line-through",
  },
};
