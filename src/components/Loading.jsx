import { useLanguage } from "../lib/i18n";

// Loading genérico, com o logo da app ao centro de um anel a girar (reutiliza
// o keyframe "spin" já definido em index.css) — pensado para substituir o
// conteúdo de uma página inteira (Histórico, Visão Geral, etc.) enquanto os
// dados da conta ativa (wins/matches) ainda não chegaram, em vez de mostrar
// por instantes um estado vazio que parece "sem partidas" mas é só "ainda a
// carregar". "label" é opcional — sem ele, mostra só o logo a girar.
const SIZES = {
  sm: { logo: 28, ring: 44, border: 2.5 },
  md: { logo: 40, ring: 62, border: 3 },
  lg: { logo: 56, ring: 84, border: 3.5 },
};

export default function Loading({ label, size = "md", fullHeight = true }) {
  const { t } = useLanguage();
  const dims = SIZES[size] || SIZES.md;

  return (
    <div style={{ ...styles.wrap, ...(fullHeight ? styles.fullHeight : null) }}>
      <div style={{ width: dims.ring, height: dims.ring, position: "relative" }}>
        <div
          style={{
            ...styles.ring,
            width: dims.ring,
            height: dims.ring,
            borderWidth: dims.border,
          }}
        />
        <img
          src="./logo.ico"
          alt=""
          style={{
            ...styles.logo,
            width: dims.logo,
            height: dims.logo,
            top: (dims.ring - dims.logo) / 2,
            left: (dims.ring - dims.logo) / 2,
          }}
        />
      </div>
      {label !== null && <div style={styles.label}>{label || t("loading_generic")}</div>}
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },

  fullHeight: {
    minHeight: 200,
    width: "100%",
    flex: 1,
  },

  ring: {
    position: "absolute",
    top: 0,
    left: 0,
    borderRadius: "50%",
    borderStyle: "solid",
    borderColor: "rgba(var(--accent-rgb),0.18)",
    borderTopColor: "var(--accent-solid)",
    animation: "spin 0.9s linear infinite",
  },

  logo: {
    position: "absolute",
    borderRadius: "var(--radius-sm)",
    boxShadow: "0 0 12px rgba(var(--accent-rgb),0.35)",
  },

  label: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "var(--text-secondary)",
    letterSpacing: 0.2,
  },
};
