import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { placementColor } from "./placement";
import { normalizeChampionId } from "./champions";
import { useLanguage } from "./i18n";

function kdaLabel(k, d, a) {
  return `${k.toFixed(1)} / ${d.toFixed(1)} / ${a.toFixed(1)}`;
}

// Fundo translúcido por trás dos números com resultado (vitórias/top3/
// derrotas/winrate) — antes só a cor do texto distinguia cada métrica, o que
// deixava a barra visualmente plana. Um chip com a mesma cor do texto, bem
// suave, dá presença a cada número sem competir com ele.
function chipStyle(color) {
  return {
    padding: "4px 10px",
    borderRadius: 9,
    background: `color-mix(in srgb, ${color} 14%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
  };
}

// Resumo geral partilhado por todas as tabs — antes só existia (de forma
// diferente) dentro de Visão Geral e Estatísticas; agora é um único
// componente sempre visível, logo abaixo das tabs. "matches" já vem
// filtrado por formato (2v2/3v3) quando aplicável — ver teamSizeFilter em
// App.jsx — porque "top 3" e os baldes de lugar não significam o mesmo
// num jogo de 8 equipas e num de 6. "compact" vem de App.jsx (um único
// interruptor para o cabeçalho todo, ver headerCompact) — nunca esconde
// nenhum destes números, só troca o grid por uma única linha. O filtro de
// formato já não é renderizado aqui — mudou-se para a mesma linha das tabs
// em App.jsx (ver navRow); "teamSizeFilter" continua a vir por prop só
// para o cálculo de "uniqueWinChamps" abaixo.
export default function StatsBar({ matches, teamSizeFilter, wins: winsList, champions, compact }) {
  const { t } = useLanguage();

  const stats = useMemo(() => {
    const games = matches.length;
    const winMatches = matches.filter((m) => m.win);
    const wins = winMatches.length;

    // O nº de campeões distintos com vitória NÃO pode vir só das "matches":
    // vitórias marcadas manualmente (sem partida associada) não geram uma
    // linha em "matches", por isso contar só a partir daí sub-representava
    // este número (ex: mostrava 50 quando a Coleção já tinha 52). Com "todos
    // os formatos" usamos a lista de vitórias (fonte oficial da Coleção,
    // sempre completa); com um formato específico não há forma fiável de
    // saber em que formato cada vitória manual aconteceu, por isso caímos de
    // volta para o que der para apurar a partir das partidas desse formato.
    const uniqueWinChamps =
      teamSizeFilter === "all" && winsList
        ? new Set(winsList.map((c) => normalizeChampionId(c, champions))).size
        : new Set(winMatches.map((m) => normalizeChampionId(m.champion, champions))).size;

    // Top 3 / abaixo do Top 3: usa o lugar exato quando existe; partidas
    // antigas (só Live Client Data, sem lugar) caem no par vitória/derrota,
    // já que uma vitória implica sempre estar no Top 3.
    const top3Games = matches.filter((m) => (m.placement ? m.placement <= 3 : m.win)).length;
    const belowTop3Games = games - top3Games;

    const totals = matches.reduce(
      (acc, m) => {
        acc.k += m.kills || 0;
        acc.d += m.deaths || 0;
        acc.a += m.assists || 0;
        return acc;
      },
      { k: 0, d: 0, a: 0 }
    );

    return {
      games,
      wins,
      uniqueWinChamps,
      top3Games,
      belowTop3Games,
      winrate: games ? Math.round((wins / games) * 100) : 0,
      top3Rate: games ? Math.round((top3Games / games) * 100) : 0,
      avgK: games ? totals.k / games : 0,
      avgD: games ? totals.d / games : 0,
      avgA: games ? totals.a / games : 0,
    };
  }, [matches, teamSizeFilter, winsList, champions]);

  return (
    <div style={styles.wrap}>
      <AnimatePresence initial={false} mode="wait">
        {compact ? (
          // Resumo condensado numa única linha — cabe a mesma informação
          // toda, só que lida da esquerda para a direita em vez de espalhada
          // num grid com legendas por baixo de cada valor.
          <motion.div
            key="compact"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            style={styles.compactBarWrap}
          >
            <div style={styles.compactBar}>
              <span style={styles.compactItem}>
                <b>{stats.games}</b> {t("stat_games")}
              </span>
              <span style={{ ...styles.compactItem, color: "var(--place-good)" }}>
                <b>{stats.wins}</b> {t("stat_wins_first")}
              </span>
              <span style={{ ...styles.compactItem, color: placementColor(3) }}>
                <b>{stats.top3Games}</b> {t("stat_wins_top3")}
              </span>
              <span style={{ ...styles.compactItem, color: "var(--place-low)" }}>
                <b>{stats.belowTop3Games}</b> {t("stat_losses")}
              </span>
              <span style={{ ...styles.compactItem, color: "var(--accent-text)" }}>
                <b>{stats.winrate}%</b> {t("stat_winrate_first")}
              </span>
              <span style={styles.compactItem}>
                <b>{stats.top3Rate}%</b> {t("stat_winrate_top3")}
              </span>
              <span style={styles.compactItem}>
                <b>{kdaLabel(stats.avgK, stats.avgD, stats.avgA)}</b> {t("stat_kda")}
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="full"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: "hidden" }}
          >
            <div style={styles.summaryBar}>
              <div style={styles.summaryItem}>
                <div style={styles.summaryValue}>{stats.games}</div>
                <div style={styles.summaryLabel}>{t("stat_games")}</div>
              </div>
              <div style={styles.summaryDivider} />
              <div style={{ ...styles.summaryItem, ...chipStyle("var(--place-good)") }}>
                <div style={{ ...styles.summaryValue, color: "var(--place-good)" }}>
                  {stats.wins}
                  {stats.wins > 0 && <span style={styles.summarySub}> ({stats.uniqueWinChamps} {t("champions_suffix")})</span>}
                </div>
                <div style={styles.summaryLabel}>{t("stat_wins_first")}</div>
              </div>
              <div style={styles.summaryDivider} />
              <div style={{ ...styles.summaryItem, ...chipStyle(placementColor(3)) }}>
                <div style={{ ...styles.summaryValue, color: placementColor(3) }}>{stats.top3Games}</div>
                <div style={styles.summaryLabel}>{t("stat_wins_top3")}</div>
              </div>
              <div style={styles.summaryDivider} />
              <div style={{ ...styles.summaryItem, ...chipStyle("var(--place-low)") }}>
                <div style={{ ...styles.summaryValue, color: "var(--place-low)" }}>{stats.belowTop3Games}</div>
                <div style={styles.summaryLabel}>{t("stat_losses")}</div>
              </div>
              <div style={styles.summaryDivider} />
              <div style={{ ...styles.summaryItem, ...chipStyle("var(--accent-text)") }}>
                <div style={{ ...styles.summaryValue, color: "var(--accent-text)" }}>{stats.winrate}%</div>
                <div style={styles.summaryLabel}>{t("stat_winrate_first")}</div>
              </div>
              <div style={styles.summaryDivider} />
              <div style={styles.summaryItem}>
                <div style={styles.summaryValue}>{stats.top3Rate}%</div>
                <div style={styles.summaryLabel}>{t("stat_winrate_top3")}</div>
              </div>
              <div style={styles.summaryDivider} />
              <div style={styles.summaryItem}>
                <div style={styles.summaryValue}>
                  {kdaLabel(stats.avgK, stats.avgD, stats.avgA)}
                </div>
                <div style={styles.summaryLabel}>{t("stat_kda")}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  summaryBar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 16px",
    borderRadius: 13,
    background:
      "linear-gradient(180deg, rgba(var(--panel-rgb),0.92), rgba(var(--panel-deep-rgb),0.96))",
    border: "1px solid rgba(var(--border-rgb),0.5)",
  },

  summaryItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    flex: 1,
  },

  // Separador fino entre cada valor do resumo — mesma ideia do divisor da
  // topBar (ver App.jsx), só para dar uma leitura mais organizada em vez de
  // 7 números soltos lado a lado sem qualquer separação visual.
  summaryDivider: {
    width: 1,
    alignSelf: "stretch",
    background: "rgba(var(--border-rgb),0.35)",
  },

  summaryValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "var(--text-body)",
  },

  summaryLabel: {
    fontSize: 10.5,
    color: "var(--text-secondary)",
    textAlign: "center",
  },

  summarySub: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-secondary)",
  },

  // Modo colapsado: a mesma informação toda numa única linha compacta, em
  // vez do grid com legenda por baixo de cada valor — muito menos altura,
  // sem esconder nenhum número.
  compactBarWrap: {
    overflow: "hidden",
  },

  compactBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "4px 14px",
    padding: "8px 14px",
    borderRadius: 12,
    background:
      "linear-gradient(180deg, rgba(var(--panel-rgb),0.92), rgba(var(--panel-deep-rgb),0.96))",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    fontSize: 11.5,
    color: "var(--text-secondary)",
  },

  compactItem: {
    whiteSpace: "nowrap",
  },
};
