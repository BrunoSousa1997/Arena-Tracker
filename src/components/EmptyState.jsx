import { ICON_STROKE } from "../lib/ui";

// Estado vazio reutilizável — para quando uma vista não tem dados a mostrar
// (conta sem partidas, filtro sem resultados, lista vazia). Antes cada vista
// tinha o seu próprio "div com uma frase numa caixa", sem ícone nem
// hierarquia e com espaçamentos ligeiramente diferentes entre si. Isto dá a
// todos o mesmo formato: ícone num círculo suave (mesma linguagem do anel do
// Loading), título, subtítulo opcional e uma ação opcional.
//
// Distingue-se do Loading de propósito: o Loading é "ainda a chegar" (anel a
// girar); isto é "chegou e não há nada" (estático). Nunca mostrar este
// enquanto os dados ainda podem estar a carregar — ver nota no Loading.
//
// Props:
//   icon     — componente de ícone (lucide-react), opcional.
//   title    — texto principal (obrigatório).
//   subtitle — segunda linha, mais ténue, opcional.
//   action   — nó React (ex: um botão) por baixo, opcional.
//   compact  — menos padding, para caixas pequenas embutidas.
export default function EmptyState({ icon: Icon, title, subtitle, action, compact = false }) {
  return (
    <div style={{ ...styles.wrap, ...(compact ? styles.compact : null) }}>
      {Icon && (
        <div style={styles.iconWrap}>
          <Icon size={compact ? 20 : 26} strokeWidth={ICON_STROKE} />
        </div>
      )}
      <div style={styles.title}>{title}</div>
      {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
      {action && <div style={styles.action}>{action}</div>}
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: "var(--space-3)",
    padding: "var(--space-8) var(--space-6)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-xl)",
  },

  compact: {
    padding: "var(--space-5) var(--space-4)",
    gap: "var(--space-2)",
  },

  // Círculo suave à volta do ícone, com o tom do acento — a mesma linguagem
  // visual do anel do Loading, para os dois estados "lerem" como família.
  iconWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 52,
    height: 52,
    borderRadius: "var(--radius-pill)",
    background: "rgba(var(--accent-rgb),0.12)",
    color: "var(--accent-text)",
  },

  title: {
    fontSize: "var(--fs-lg)",
    fontWeight: "var(--fw-semibold)",
    color: "var(--text-body)",
  },

  subtitle: {
    fontSize: "var(--fs-sm)",
    color: "var(--text-muted)",
    maxWidth: 42 * 16,
    lineHeight: 1.5,
  },

  action: {
    marginTop: "var(--space-2)",
  },
};
