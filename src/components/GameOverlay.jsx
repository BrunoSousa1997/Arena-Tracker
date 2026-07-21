import { useEffect, useState } from "react";

// O que se desenha DENTRO da janela de sobreposição (ver electron/overlay.js).
//
// Componente deliberadamente burro: não fala com a Supabase, não carrega o
// Data Dragon, não sabe o que é uma conta. Recebe pelo IPC um objeto já
// pronto, calculado pelo renderer principal (useLiveGame.js), e limita-se a
// pintá-lo. Assim não há uma segunda cópia da lógica de "já tenho vitória com
// este campeão?" a divergir da primeira, e esta janela arranca instantânea.
//
// Estilos embutidos e sem variáveis CSS do tema: esta janela é transparente e
// vive por cima do jogo, onde não há fundo nenhum da app por trás — as cores
// têm de ser absolutas e legíveis contra o que quer que esteja no ecrã, daí o
// contraste alto e as sombras no texto.
export default function GameOverlay() {
  const [data, setData] = useState(null);

  useEffect(() => {
    document.body.style.background = "transparent";
    const unsubscribe = window.electron?.onOverlayData?.(setData);
    // Só DEPOIS de subscrever: é este aviso que faz o processo principal
    // reenviar o cartão que já tinha em mão. Sem ele, o primeiro cartão de
    // cada partida perdia-se, porque a janela é criada e alimentada no mesmo
    // instante (ver lastPayload em electron/overlay.js).
    window.electron?.notifyOverlayReady?.();
    return unsubscribe;
  }, []);

  if (!data) return null;

  const { championIcon, championName, hasWin, roast, kda, gameEnded, gameWon } = data;

  const accent = gameEnded ? (gameWon ? "#3ddc97" : "#ff6b6b") : hasWin ? "#3ddc97" : "#ffc754";

  return (
    <div style={{ ...styles.card, borderColor: accent }}>
      {championIcon && <img src={championIcon} alt="" style={{ ...styles.icon, borderColor: accent }} />}

      <div style={styles.text}>
        <div style={styles.topRow}>
          <span style={styles.champion}>{championName}</span>
          <span style={{ ...styles.badge, color: accent, borderColor: accent }}>
            {gameEnded ? (gameWon ? "1º LUGAR" : "FIM") : hasWin ? "JÁ TENS" : "FALTA"}
          </span>
        </div>

        {roast && <div style={styles.roast}>{roast}</div>}

        {kda && (
          <div style={styles.kda}>
            <span style={styles.kdaNum}>{kda.kills}</span>
            <span style={styles.slash}>/</span>
            <span style={{ ...styles.kdaNum, color: "#ff8080" }}>{kda.deaths}</span>
            <span style={styles.slash}>/</span>
            <span style={styles.kdaNum}>{kda.assists}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    height: "100%",
    padding: "10px 14px",
    boxSizing: "border-box",
    borderRadius: 12,
    border: "1px solid",
    // Fundo próprio bem opaco: por cima do jogo, um fundo translúcido dava
    // um texto ilegível sempre que passasse por uma zona clara do ecrã.
    background: "rgba(10, 13, 22, 0.88)",
    backdropFilter: "blur(6px)",
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
    color: "#e8ecf5",
    userSelect: "none",
    overflow: "hidden",
  },

  icon: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 8,
    border: "1px solid",
    objectFit: "cover",
  },

  text: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 },

  topRow: { display: "flex", alignItems: "center", gap: 8 },

  champion: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 0.2,
    textShadow: "0 1px 3px rgba(0,0,0,0.8)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  badge: {
    flexShrink: 0,
    padding: "1px 6px",
    borderRadius: 5,
    border: "1px solid",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 0.5,
  },

  roast: {
    fontSize: 10.5,
    lineHeight: 1.35,
    color: "#aab4c8",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  kda: { display: "flex", alignItems: "baseline", gap: 3, marginTop: 1 },

  kdaNum: {
    fontSize: 13,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    textShadow: "0 1px 3px rgba(0,0,0,0.8)",
  },

  slash: { fontSize: 11, color: "#6b7689" },
};
