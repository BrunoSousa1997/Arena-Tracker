import { useMemo } from "react";
import { normalizeChampionId } from "../lib/champions";
import { useLanguage } from "../lib/i18n";

function kdaLabel(k, d, a) {
  return `${k.toFixed(1)} / ${d.toFixed(1)} / ${a.toFixed(1)}`;
}

// O pódio é verde nesta app inteira (ver placementColor), por isso o 1º e o
// 2º/3º não podem ser duas cores diferentes sem trair essa linguagem — mas
// também não podem ser a MESMA, que era o que acontecia antes (ambos usavam
// --place-good e liam-se como o mesmo número duas vezes). Fica o mesmo verde
// com força diferente: cheio para o 1º, esbatido para o resto do pódio.
const SEG_COLORS = {
  first: "var(--place-good)",
  podium: "color-mix(in srgb, var(--place-good) 45%, var(--text-muted))",
  below: "var(--place-low)",
};

// Resumo geral partilhado por todas as tabs. "matches" já vem filtrado por
// formato (2v2/3v3) quando aplicável — ver teamSizeFilter em App.jsx — porque
// "top 3" não significa o mesmo num jogo de 8 equipas e num de 6.
//
// A leitura é em três blocos, e é essa a mudança que interessa face à versão
// anterior: sete números em fila, todos com o mesmo peso, escondiam que eles
// não são sete coisas independentes. O total parte-se em três resultados que
// somam de volta ao total (1º + 2º/3º + fora = jogos), e só depois vêm as
// médias. A barra existe para essa soma ser visível em vez de ter de ser
// feita de cabeça.
export default function StatsBar({ matches, teamSizeFilter, wins: winsList, champions, compact }) {
  const { t } = useLanguage();

  const stats = useMemo(() => {
    const games = matches.length;
    const winMatches = matches.filter((m) => m.win);
    const wins = winMatches.length;

    // O nº de campeões distintos com vitória NÃO pode vir só das "matches":
    // vitórias marcadas manualmente (sem partida associada) não geram linha
    // em "matches". Com "todos os formatos" usamos a lista de vitórias (fonte
    // da Coleção, sempre completa); com um formato específico não há forma de
    // saber em que formato cada vitória manual aconteceu, e caímos para o que
    // se apura das partidas desse formato.
    const uniqueWinChamps =
      teamSizeFilter === "all" && winsList
        ? new Set(winsList.map((c) => normalizeChampionId(c, champions))).size
        : new Set(winMatches.map((m) => normalizeChampionId(m.champion, champions))).size;

    // Usa o lugar exato quando existe; partidas antigas (só Live Client Data,
    // sem lugar) caem no par vitória/derrota, já que uma vitória implica
    // sempre estar no top 3.
    const top3Games = matches.filter((m) => (m.placement ? m.placement <= 3 : m.win)).length;

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
      // O pódio SEM o 1º lugar. É este o número que a barra desenha, e não o
      // top 3 inteiro: o 1º já ocupa o seu próprio segmento, e somar os dois
      // dava uma barra mais comprida do que o total de jogos.
      podiumGames: top3Games - wins,
      belowTop3Games: games - top3Games,
      winrate: games ? Math.round((wins / games) * 100) : 0,
      top3Rate: games ? Math.round((top3Games / games) * 100) : 0,
      avgK: games ? totals.k / games : 0,
      avgD: games ? totals.d / games : 0,
      avgA: games ? totals.a / games : 0,
    };
  }, [matches, teamSizeFilter, winsList, champions]);

  const segments = [
    { key: "first", value: stats.wins, label: t("stat_seg_first"), color: SEG_COLORS.first },
    { key: "podium", value: stats.podiumGames, label: t("stat_seg_podium"), color: SEG_COLORS.podium },
    { key: "below", value: stats.belowTop3Games, label: t("stat_seg_below"), color: SEG_COLORS.below },
  ];

  const rates = [
    { key: "wr1", value: `${stats.winrate}%`, label: t("stat_winrate_first"), color: SEG_COLORS.first },
    { key: "wr3", value: `${stats.top3Rate}%`, label: t("stat_winrate_top3"), color: SEG_COLORS.podium },
    { key: "kda", value: kdaLabel(stats.avgK, stats.avgD, stats.avgA), label: t("stat_kda"), color: null },
  ];

  // Isto esteve envolvido num <AnimatePresence mode="wait"> com dois filhos
  // keyed ("compact"/"full") para animar a troca de densidade. Estava
  // partido, e de forma silenciosa: com mode="wait" o filho que sai tem de
  // terminar a animação de altura antes de o novo entrar, e a saída nunca
  // fechava — carregar em comprimir mudava o estado mas o ecrã ficava na
  // versão anterior indefinidamente. Medido no browser: vários segundos após
  // o clique, com o estado já em "compact", continuava a desenhar a versão
  // completa. Trocar a densidade do cabeçalho é uma preferência e não uma
  // navegação; funcionar sempre vale mais do que a transição de 0,15s.
  return (
    <div style={styles.wrap}>
      <div style={{ ...styles.bar, padding: compact ? "8px 16px" : "12px 18px" }}>
          {/* ---- âncora: o total de que tudo o resto é uma fatia ---- */}
          <div style={styles.anchor}>
            <span style={{ ...styles.anchorValue, fontSize: compact ? 20 : 26 }}>
              {stats.games}
            </span>
            <span style={styles.anchorLabel}>{t("stat_games")}</span>
          </div>

          <div style={styles.divider} />

          {/* ---- resultados: a barra e a legenda que somam ao total ---- */}
          <div style={styles.outcomes}>
            {!compact && (
              <div style={styles.track}>
                {segments.map((s) => (
                  <div
                    key={s.key}
                    title={`${s.value} — ${s.label}`}
                    style={{
                      width: stats.games ? `${(s.value / stats.games) * 100}%` : "0%",
                      background: s.color,
                    }}
                  />
                ))}
              </div>
            )}

            <div style={styles.legend}>
              {segments.map((s) => (
                <span key={s.key} style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: s.color }} />
                  <b style={{ ...styles.legendValue, color: s.color }}>{s.value}</b>
                  <span style={styles.legendLabel}>{s.label}</span>
                  {/* Só no 1º lugar: quantos campeões DIFERENTES já deram
                      vitória, que é o número que a Coleção persegue. */}
                  {s.key === "first" && stats.wins > 0 && (
                    <span style={styles.legendExtra}>
                      · {stats.uniqueWinChamps} {t("champions_suffix")}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div style={styles.divider} />

          {/* ---- médias ---- */}
          <div style={styles.rates}>
            {rates.map((r) => (
              <div key={r.key} style={styles.rateItem}>
                <span style={{ ...styles.rateValue, color: r.color || "var(--text-body)" }}>
                  {r.value}
                </span>
                <span style={styles.rateLabel}>{r.label}</span>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column" },

  bar: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    borderRadius: 13,
    background: "var(--panel-bg)",
    backdropFilter: "var(--panel-blur)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
  },

  // Uma única divisória por fronteira de BLOCO, em vez de uma entre cada
  // número. Antes havia sete divisórias e quatro caixas coloridas a fazer o
  // mesmo trabalho ao mesmo tempo, e nenhum dos dois se lia.
  divider: {
    width: 1,
    alignSelf: "stretch",
    flexShrink: 0,
    background: "rgba(var(--border-rgb),0.35)",
  },

  anchor: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
    minWidth: 64,
  },

  anchorValue: {
    fontWeight: 700,
    lineHeight: 1.1,
    color: "var(--text-body)",
    fontVariantNumeric: "tabular-nums",
    fontFamily: "Cinzel, serif",
  },

  anchorLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "var(--text-muted)",
  },

  outcomes: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    flex: 1,
    minWidth: 220,
  },

  track: {
    display: "flex",
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    background: "rgba(var(--soft-rgb),0.07)",
  },

  legend: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "3px 16px",
  },

  legendItem: { display: "inline-flex", alignItems: "baseline", gap: 5 },

  legendDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    alignSelf: "center",
    flexShrink: 0,
  },

  legendValue: { fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" },

  legendLabel: { fontSize: 11, color: "var(--text-secondary)" },

  legendExtra: { fontSize: 10.5, color: "var(--text-muted)" },

  rates: { display: "flex", alignItems: "center", gap: 20, flexShrink: 0 },

  rateItem: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 },

  rateValue: {
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.2,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },

  rateLabel: {
    fontSize: 10,
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
  },
};
