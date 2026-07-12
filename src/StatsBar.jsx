import { useMemo } from "react";
import { motion } from "framer-motion";
import { placementColor } from "./placement";
import { normalizeChampionId } from "./champions";
import { useLanguage } from "./i18n";

function kdaLabel(k, d, a) {
  return `${k.toFixed(1)} / ${d.toFixed(1)} / ${a.toFixed(1)}`;
}

// Resumo geral partilhado por todas as tabs — antes só existia (de forma
// diferente) dentro de Visão Geral e Estatísticas; agora é um único
// componente sempre visível, logo abaixo das tabs. "matches" já vem
// filtrado por formato (2v2/3v3) quando aplicável — ver teamSizeFilter em
// App.jsx — porque "top 3" e os baldes de lugar não significam o mesmo
// num jogo de 8 equipas e num de 6.
export default function StatsBar({ matches, teamSizeFilter, onChangeTeamSizeFilter, wins: winsList, champions }) {
  const { t } = useLanguage();

  const TEAM_SIZE_OPTIONS = [
    { key: "all", label: t("format_all") },
    { key: 2, label: t("format_2v2") },
    { key: 3, label: t("format_3v3") },
  ];

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
      {/* Mesmo "segmented control" animado da barra de tabs (ver App.jsx) —
          fundo próprio a toda a largura, e a opção ativa desliza de um
          formato para o outro via layoutId partilhado, em vez de só trocar
          de cor instantaneamente. */}
      {onChangeTeamSizeFilter && (
        <div style={styles.filterRow}>
          {TEAM_SIZE_OPTIONS.map((opt) => {
            const isActive = teamSizeFilter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => onChangeTeamSizeFilter(opt.key)}
                style={{
                  ...styles.filterBtn,
                  color: isActive ? "#ffffff" : "var(--text-secondary)",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="formatIndicator"
                    style={styles.filterIndicator}
                    transition={{ type: "spring", stiffness: 480, damping: 34 }}
                  />
                )}
                <span style={styles.filterBtnLabel}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={styles.summaryBar}>
        <div style={styles.summaryItem}>
          <div style={styles.summaryValue}>{stats.games}</div>
          <div style={styles.summaryLabel}>{t("stat_games")}</div>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryItem}>
          <div style={{ ...styles.summaryValue, color: "var(--place-good)" }}>
            {stats.wins}
            {stats.wins > 0 && <span style={styles.summarySub}> ({stats.uniqueWinChamps} {t("champions_suffix")})</span>}
          </div>
          <div style={styles.summaryLabel}>{t("stat_wins_first")}</div>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryItem}>
          <div style={{ ...styles.summaryValue, color: placementColor(3) }}>{stats.top3Games}</div>
          <div style={styles.summaryLabel}>{t("stat_wins_top3")}</div>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryItem}>
          <div style={{ ...styles.summaryValue, color: "var(--place-low)" }}>{stats.belowTop3Games}</div>
          <div style={styles.summaryLabel}>{t("stat_losses")}</div>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryItem}>
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
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 10,
  },

  // Mesmo "segmented control" com fundo próprio a toda a largura da barra
  // de tabs em App.jsx — consistência visual entre os dois seletores que
  // ficam um por cima do outro.
  filterRow: {
    display: "flex",
    gap: 4,
    width: "100%",
    padding: 4,
    borderRadius: 12,
    background: "rgba(var(--panel-deep-rgb),0.5)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  // "position: relative" + flex:1 para o indicador (absolute, atrás do
  // texto) deslizar de um formato para o outro sem afetar o layout, e para
  // as 3 opções (Todos/2v2/3v3) se espalharem pela largura toda.
  filterBtn: {
    position: "relative",
    flex: 1,
    display: "flex",
    justifyContent: "center",
    padding: "6px 10px",
    borderRadius: 8,
    border: "none",
