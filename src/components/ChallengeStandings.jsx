import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Crown, Flag } from "lucide-react";
import { useLanguage } from "../lib/i18n";
import { useCountUpInt } from "../lib/useCountUp";
import { ICON_STROKE } from "../lib/ui";

// ================= CORRIDA DE PONTOS (placar do desafio) =================
// O placar tinha os cards de combate (muita informação por jogador) mas
// nenhuma leitura de "quem vai à frente, e por quanto" — para comparar dois
// jogadores era preciso ler dois números grandes em cantos diferentes do ecrã
// e subtrair de cabeça.
//
// Esta é a barra de corrida: uma fileira por jogador, ordenada pela
// pontuação, com a barra proporcional a quem lidera. É o que transforma o
// placar numa coisa que se lê de relance e que mexe quando alguém pontua —
// as fileiras trocam de lugar com animação (layout do framer-motion), por
// isso ultrapassar alguém vê-se acontecer em vez de aparecer já feito.
//
// Entradas ("entries"): { key, name, color, points, games, targetGames,
// live, forfeited, isSelf }. Serve jogadores E equipas — em modo equipas a
// entrada é a equipa, com a soma dos membros (ver teamStandings).

// Quanto tempo a seta de subiu/descei fica visível depois de uma troca de
// posição. Curto de propósito: é um sinal do momento ("acabaste de passar
// alguém"), não um dado permanente do placar.
const MOVE_HINT_MS = 4500;

function initials(name) {
  const words = String(name || "?")
    .replace(/#.*$/, "")
    .split(/[\s_.-]+/)
    .filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return String(name || "?").slice(0, 2).toUpperCase();
}

function StandingRow({ entry, rank, maxPoints, finished, move, t }) {
  const points = useCountUpInt(Math.round(entry.points), 520);
  // Mínimo de 4% para a barra de quem tem zero (ou pontos negativos) ainda se
  // ver como uma faixa na cor do jogador, em vez de desaparecer e dar a
  // sensação de que a fileira está vazia/quebrada.
  const pct = maxPoints > 0 ? Math.max(4, Math.min(100, (entry.points / maxPoints) * 100)) : 4;
  const progressPct = entry.targetGames
    ? Math.min(100, (entry.games / entry.targetGames) * 100)
    : 0;
  const isLeader = rank === 0 && !entry.forfeited;

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      style={{
        ...styles.row,
        ...(entry.isSelf ? styles.rowSelf : null),
        ...(finished && isLeader ? styles.rowLeader : null),
        ...(entry.forfeited ? { opacity: 0.55 } : null),
      }}
    >
      <div style={styles.rankCol}>
        <span style={{ ...styles.rankNum, ...(isLeader ? styles.rankNumLeader : null) }}>
          {finished && isLeader ? <Crown size={13} strokeWidth={ICON_STROKE} /> : rank + 1}
        </span>
        {move && (
          <span
            className="at-chal-move"
            style={{ ...styles.move, color: move === "up" ? "#58c778" : "#e2555f" }}
          >
            {move === "up" ? (
              <ChevronUp size={12} strokeWidth={3} />
            ) : (
              <ChevronDown size={12} strokeWidth={3} />
            )}
          </span>
        )}
      </div>

      <span
        style={{
          ...styles.avatar,
          background: `${entry.color}22`,
          borderColor: entry.color,
          color: entry.color,
        }}
      >
        {initials(entry.name)}
      </span>

      <div style={styles.main}>
        <div style={styles.topLine}>
          <span style={styles.name} title={entry.name}>
            {entry.name}
          </span>
          {entry.live && (
            <span style={styles.liveTag}>
              <span style={styles.liveDot} /> {t("chal_live_tag")}
            </span>
          )}
          {entry.forfeited && (
            <span style={styles.forfeitTag}>
              <Flag size={9} strokeWidth={ICON_STROKE} /> {t("chal_forfeited")}
            </span>
          )}
          <span style={styles.games}>
            {entry.games}/{entry.targetGames}
          </span>
        </div>

        <div style={styles.track}>
          <motion.div
            className={entry.live ? "at-chal-bar at-chal-bar-live" : "at-chal-bar"}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 180, damping: 26 }}
            style={{
              ...styles.bar,
              background: `linear-gradient(90deg, ${entry.color}cc, ${entry.color})`,
            }}
          />
          {/* Marca de quantos jogos já fez, sobre a mesma barra: duas
              barras separadas (pontos e jogos) ocupavam o dobro da altura
              para dizer coisas que se leem juntas. */}
          <div style={{ ...styles.progressMark, left: `${progressPct}%` }} />
        </div>
      </div>

      <div style={styles.ptsCol}>
        <span style={{ ...styles.pts, color: finished && isLeader ? "#f5c451" : entry.color }}>
          {points}
        </span>
        <span style={styles.ptsLabel}>pts</span>
      </div>
    </motion.div>
  );
}

export default function ChallengeStandings({ entries, finished = false, title }) {
  const { t } = useLanguage();
  // Posição anterior de cada entrada, para saber quem subiu e quem desceu.
  // Ref e não estado: só interessa na comparação com o render seguinte e
  // nunca é desenhado diretamente.
  const prevRanks = useRef(new Map());
  const [moves, setMoves] = useState({});

  const sorted = entries;
  const ranksKey = sorted.map((e) => e.key).join("|");

  useEffect(() => {
    const next = new Map();
    const changed = {};
    sorted.forEach((e, idx) => {
      next.set(e.key, idx);
      const before = prevRanks.current.get(e.key);
      if (before != null && before !== idx) changed[e.key] = idx < before ? "up" : "down";
    });
    const first = prevRanks.current.size === 0;
    prevRanks.current = next;

    // No primeiro render ainda não houve troca nenhuma: toda a tabela
    // "mudaria" de posição e apareciam setas falsas em todas as fileiras.
    if (first || !Object.keys(changed).length) return;

    setMoves((prev) => ({ ...prev, ...changed }));
    const timer = setTimeout(() => setMoves({}), MOVE_HINT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranksKey]);

  if (!sorted.length) return null;

  const maxPoints = Math.max(...sorted.map((e) => e.points), 1);

  return (
    <div style={styles.wrap}>
      {title && <div style={styles.title}>{title}</div>}
      <div style={styles.list}>
        {sorted.map((entry, idx) => (
          <StandingRow
            key={entry.key}
            entry={entry}
            rank={idx}
            maxPoints={maxPoints}
            finished={finished}
            move={moves[entry.key]}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrap: { marginBottom: 16 },

  title: {
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "var(--text-muted)",
    marginBottom: 8,
  },

  list: { display: "flex", flexDirection: "column", gap: 6 },

  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px 9px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  rowSelf: {
    borderColor: "rgba(var(--accent-rgb),0.45)",
    background: "linear-gradient(90deg, rgba(var(--accent-rgb),0.1), rgba(var(--panel-deep-rgb),0.8))",
  },

  rowLeader: {
    borderColor: "rgba(245,196,81,0.5)",
    background: "linear-gradient(90deg, rgba(245,196,81,0.12), rgba(var(--panel-deep-rgb),0.8))",
  },

  rankCol: {
    position: "relative",
    width: 20,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  rankNum: {
    fontSize: 12,
    fontWeight: 900,
    color: "var(--text-muted)",
    fontFamily: "Cinzel, serif",
  },

  rankNumLeader: { color: "#f5c451" },

  move: {
    position: "absolute",
    top: -9,
    right: -6,
    display: "inline-flex",
  },

  avatar: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    flexShrink: 0,
    borderRadius: "50%",
    border: "1.5px solid",
    fontSize: 10,
    fontWeight: 800,
  },

  main: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 },

  topLine: { display: "flex", alignItems: "center", gap: 7, minWidth: 0 },

  name: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text-body)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  games: {
    marginLeft: "auto",
    fontSize: 10,
    fontWeight: 700,
    color: "var(--text-muted)",
    flexShrink: 0,
  },

  liveTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    fontSize: 9,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#58c778",
    flexShrink: 0,
  },

  liveDot: {
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#58c778",
    animation: "livePulse 1.6s ease-in-out infinite",
  },

  forfeitTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    fontSize: 9,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#e2555f",
    flexShrink: 0,
  },

  track: {
    position: "relative",
    height: 8,
    borderRadius: "var(--radius-pill)",
    background: "rgba(var(--border-rgb),0.35)",
    overflow: "hidden",
  },

  bar: {
    height: "100%",
    borderRadius: "var(--radius-pill)",
  },

  progressMark: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    background: "rgba(var(--soft-rgb),0.55)",
    transition: "left 0.3s ease",
  },

  ptsCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    minWidth: 42,
    flexShrink: 0,
  },

  pts: { fontSize: 16, fontWeight: 900, lineHeight: 1.05 },

  ptsLabel: {
    fontSize: 8.5,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "var(--text-muted)",
  },
};
