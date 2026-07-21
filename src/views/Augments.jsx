import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useLanguage } from "../lib/i18n";
import { augmentRarityColor, augmentRarityStyle } from "../lib/augments";
import { computeAugmentStats, sortAugmentRows, DEFAULT_MIN_GAMES } from "../lib/augmentStats";

// Taxa de vitória e de pódio por augment (ver lib/augmentStats.js para o
// cálculo e o porquê). Duas populações à escolha:
//   "mine" — só as tuas escolhas. É o que responde a "a MIM corre-me bem?",
//            mas a amostra é pequena: 4 escolhas por partida.
//   "all"  — as escolhas de todos os participantes de todas as tuas partidas.
//            Uma ordem de grandeza mais dados, à custa de deixar de ser sobre
//            ti. Serve para augments que raramente te calharam.
const SORTS = [
  { key: "delta", labelKey: "aug_sort_best" },
  { key: "worst", labelKey: "aug_sort_worst" },
  { key: "winRate", labelKey: "aug_sort_winrate" },
  { key: "games", labelKey: "aug_sort_games" },
];

const MIN_GAMES_OPTIONS = [1, 5, 10, 25];

export default function Augments({ matches, augmentsMap }) {
  const { t, lang } = useLanguage();

  const [population, setPopulation] = useState("mine");
  const [sortBy, setSortBy] = useState("delta");
  const [minGames, setMinGames] = useState(DEFAULT_MIN_GAMES);
  const [search, setSearch] = useState("");

  const { baseline, rows } = useMemo(
    () => computeAugmentStats(matches, { allPlayers: population === "all" }),
    [matches, population]
  );

  const visible = useMemo(() => {
    const sorted = sortAugmentRows(rows, sortBy, minGames);
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((r) => (augmentsMap?.[r.augmentId]?.name || "").toLowerCase().includes(q));
  }, [rows, sortBy, minGames, search, augmentsMap]);

  // Escala do desvio: a barra é relativa ao maior desvio visível, senão com
  // deltas pequenos ficavam todas as barras invisíveis e com deltas enormes
  // saíam todas do sítio.
  const maxAbsDelta = useMemo(
    () => Math.max(10, ...visible.map((r) => Math.abs(r.delta))),
    [visible]
  );

  if (!matches.length) {
    return <div style={styles.empty}>{t("aug_empty_no_matches")}</div>;
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.toolbar}>
        <div style={styles.segGroup}>
          <button
            onClick={() => setPopulation("mine")}
            style={{ ...styles.segBtn, ...(population === "mine" ? styles.segBtnActive : null) }}
          >
            {t("aug_pop_mine")}
          </button>
          <button
            onClick={() => setPopulation("all")}
            style={{ ...styles.segBtn, ...(population === "all" ? styles.segBtnActive : null) }}
          >
            {t("aug_pop_all")}
          </button>
        </div>

        <div style={styles.segGroup}>
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              style={{ ...styles.segBtn, ...(sortBy === s.key ? styles.segBtnActive : null) }}
            >
              {t(s.labelKey)}
            </button>
          ))}
        </div>

        <div style={styles.minGamesWrap}>
          <span style={styles.minGamesLabel}>{t("aug_min_games")}</span>
          <div style={styles.segGroup}>
            {MIN_GAMES_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setMinGames(n)}
                style={{ ...styles.segBtn, ...(minGames === n ? styles.segBtnActive : null) }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.searchWrap}>
          <Search size={13} strokeWidth={2.25} style={styles.searchIcon} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("aug_search_placeholder")}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* A baseline tem de estar sempre à vista: sem ela, "38% de pódio" não
          se sabe se é bom. Todos os deltas na lista são contra este número. */}
      <div style={styles.baselineBar}>
        <span style={styles.baselineLabel}>
          {population === "mine" ? t("aug_baseline_mine") : t("aug_baseline_all")}
        </span>
        <span style={styles.baselineValue}>
          {t("aug_top3")} {baseline.top3Rate.toFixed(1)}%
        </span>
        <span style={styles.baselineValue}>
          {t("aug_winrate")} {baseline.winRate.toFixed(1)}%
        </span>
        <span style={styles.baselineMuted}>
          {baseline.picks.toLocaleString(lang === "en" ? "en-US" : "pt-PT")} {t("aug_picks")}
        </span>
      </div>

      {visible.length === 0 ? (
        <div style={styles.empty}>{t("aug_empty_filtered")}</div>
      ) : (
        <div style={styles.list}>
          <div style={{ ...styles.row, ...styles.headRow }}>
            <span style={styles.headName}>{t("aug_col_augment")}</span>
            <span style={styles.headCell}>{t("aug_col_games")}</span>
            <span style={styles.headCell}>{t("aug_col_winrate")}</span>
            <span style={styles.headCell}>{t("aug_col_top3")}</span>
            <span style={styles.headCell}>{t("aug_col_avg")}</span>
            <span style={styles.headDelta}>{t("aug_col_delta")}</span>
          </div>

          {visible.map((r) => {
            const info = augmentsMap?.[r.augmentId];
            const rarityColor = augmentRarityColor(info?.rarity);
            const good = r.delta >= 0;

            return (
              <div key={r.augmentId} style={styles.row}>
                <span style={styles.nameCell}>
                  <span style={{ ...styles.iconWrap, ...augmentRarityStyle(info?.rarity) }}>
                    {info?.icon && <img src={info.icon} alt="" style={styles.icon} loading="lazy" />}
                  </span>
                  <span style={styles.nameText}>
                    <span style={{ ...styles.name, color: rarityColor || "var(--text-body)" }}>
                      {info?.name || `#${r.augmentId}`}
                    </span>
                    {info?.tierLabel && <span style={styles.tier}>{info.tierLabel}</span>}
                  </span>
                </span>

                <span style={styles.cell}>{r.games}</span>
                <span style={styles.cell}>{r.winRate.toFixed(0)}%</span>
                <span style={styles.cell}>{r.top3Rate.toFixed(0)}%</span>
                <span style={styles.cell}>{r.avgPlacement.toFixed(1)}º</span>

                <span style={styles.deltaCell}>
                  <span style={styles.deltaTrack}>
                    <span
                      style={{
                        ...styles.deltaFill,
                        width: `${(Math.abs(r.delta) / maxAbsDelta) * 50}%`,
                        [good ? "left" : "right"]: "50%",
                        background: good ? "var(--place-good)" : "var(--place-low)",
                      }}
                    />
                  </span>
                  <span
                    style={{
                      ...styles.deltaValue,
                      color: good ? "var(--place-good)" : "var(--place-low)",
                    }}
                  >
                    {good ? "+" : ""}
                    {r.delta.toFixed(0)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={styles.footnote}>{t("aug_footnote")}</div>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 12 },

  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },

  segGroup: {
    display: "flex",
    gap: 2,
    padding: 2,
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  segBtn: {
    padding: "6px 11px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 600,
    fontFamily: "Cinzel, serif",
    whiteSpace: "nowrap",
  },

  segBtnActive: { background: "var(--accent-solid)", color: "var(--accent-solid-text)" },

  minGamesWrap: { display: "flex", alignItems: "center", gap: 6 },

  minGamesLabel: { fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" },

  searchWrap: { position: "relative", display: "flex", alignItems: "center", marginLeft: "auto" },

  searchIcon: { position: "absolute", left: 9, color: "var(--text-muted)", pointerEvents: "none" },

  searchInput: {
    padding: "7px 10px 7px 28px",
    width: 190,
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    color: "var(--text-body)",
    fontSize: 12,
    outline: "none",
  },

  baselineBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 14,
    padding: "10px 14px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--accent-rgb),0.1)",
    border: "1px solid rgba(var(--accent-rgb),0.28)",
  },

  baselineLabel: { fontSize: 11.5, fontWeight: 700, color: "var(--accent-text)" },
  baselineValue: { fontSize: 11.5, fontWeight: 700, color: "var(--text-body)" },
  baselineMuted: { fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" },

  list: {
    display: "flex",
    flexDirection: "column",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--accent-rgb),0.15)",
    overflow: "hidden",
  },

  row: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 54px 62px 62px 62px 130px",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    borderBottom: "1px solid rgba(var(--border-rgb),0.18)",
  },

  headRow: { background: "rgba(var(--panel-deep-rgb),0.95)", padding: "7px 14px" },

  headName: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "var(--text-muted)",
  },

  headCell: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "var(--text-muted)",
    textAlign: "right",
  },

  headDelta: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "var(--text-muted)",
    textAlign: "center",
  },

  nameCell: { display: "flex", alignItems: "center", gap: 9, minWidth: 0 },

  iconWrap: {
    width: 30,
    height: 30,
    flexShrink: 0,
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  icon: { width: "100%", height: "100%", objectFit: "cover" },

  nameText: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0 },

  name: {
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  tier: { fontSize: 9.5, color: "var(--text-muted)" },

  cell: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-body)",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },

  // Barra divergente a partir do centro: para a direita quando o augment está
  // acima da tua média, para a esquerda quando está abaixo. Lê-se a coluna
  // toda de relance sem ter de comparar números um a um.
  deltaCell: { display: "flex", alignItems: "center", gap: 8 },

  deltaTrack: {
    position: "relative",
    flex: 1,
    height: 6,
    borderRadius: 3,
    background: "rgba(var(--soft-rgb),0.1)",
    overflow: "hidden",
  },

  deltaFill: { position: "absolute", top: 0, bottom: 0 },

  deltaValue: {
    fontSize: 11.5,
    fontWeight: 700,
    width: 30,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },

  empty: {
    padding: "26px 18px",
    textAlign: "center",
    fontSize: 12.5,
    color: "var(--text-muted)",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  footnote: { fontSize: 10.5, lineHeight: 1.5, color: "var(--text-muted)" },
};
