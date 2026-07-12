import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { placementColor, placementBg, placementBorder } from "./placement";
import { augmentRarityStyle } from "./augments";
import { useLanguage } from "./i18n";
import Tooltip from "./Tooltip";

function timeAgo(iso, lang) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);

  if (lang === "en") {
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months} month(s) ago`;
  }

  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} min`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;

  const months = Math.floor(days / 30);
  return `há ${months} mês(es)`;
}

// Versão curta, para o selo grande e saliente que substitui as antigas
// etiquetas "VITÓRIA"/"TOP 3"/"DERROTA" — o lugar em si já diz tudo o que
// essas etiquetas diziam, sem repetir a informação.
function placementShort(m) {
  if (m.placement) return `${m.placement}º`;
  // Partidas antigas (só Live Client Data, sem lugar exato) caem de volta
  // no par Vitória/Derrota que já tínhamos.
  return m.win ? "V" : "D";
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function kdaRatio(kills, deaths, assists) {
  const k = kills || 0;
  const d = deaths || 0;
  const a = assists || 0;
  return ((k + a) / Math.max(d, 1)).toFixed(1);
}

// Números grandes (dano, ouro, cura) em formato compacto (ex: "12.3k") para
// caberem nas linhas apertadas dos cartões de colegas/adversários.
function formatCompact(n) {
  if (n == null) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

// Cada ronda da Arena é um combate 2v2 ou 3v3 — o número de inimigos nunca
// chega a 4 ou 5, por isso Quadra/Pentakill não são resultados possíveis
// neste modo (ao contrário do Convocação da Fenda). Só Double/Triple Kill
// fazem sentido aqui.
const MULTIKILL_LABELS = {
  2: "Double Kill",
  3: "Triple Kill",
};

// Colegas e adversários (estilo op.gg): "participants" já vem com todos os
// jogadores da partida (ver extractAllParticipants em electron.js) — como
// na Arena todos os membros da mesma equipa terminam sempre no mesmo lugar,
// agrupar por "placement" separa naturalmente cada equipa (a nossa e as
// adversárias), sem precisar de um id de subequipa à parte.
function groupParticipantsByPlacement(participants) {
  const map = new Map();

  (participants || []).forEach((p) => {
    const key = p.placement ?? "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  });

  return [...map.entries()]
    .map(([placement, players]) => ({
      placement: placement === "unknown" ? null : placement,
      players,
      isSelfTeam: players.some((p) => p.isSelf),
    }))
    .sort((a, b) => (a.placement || 99) - (b.placement || 99));
}

// Cor do selo de lugar — mantém a mesma lógica de sempre (pódio a verde,
// meio a laranja, fundo a vermelho), só já não vem acompanhada de uma
// etiqueta de texto tipo "VITÓRIA"/"TOP 3"/"DERROTA".
function resultColor(m) {
  if (m.placement) return placementColor(m.placement);
  return m.win ? "var(--place-good)" : "var(--place-low)";
}

// Baldes usados no filtro por posição e na ordenação — 4º-6º e 7º-8º
// porque é assim que a Arena os agrupa (7º/8º só existe no formato de 8
// equipas de 2, ver placement.js).
function getPlacementFilters(t) {
  return [
    { key: "ALL", label: t("filter_all_placements") },
    { key: "1", label: "1º" },
    { key: "2", label: "2º" },
    { key: "3", label: "3º" },
    { key: "4-6", label: "4º-6º" },
    { key: "7-8", label: "7º-8º" },
    { key: "NONE", label: t("filter_no_placement_data") },
  ];
}

function matchesPlacementFilter(m, filter) {
  if (filter === "ALL") return true;
  if (filter === "NONE") return !m.placement;
  if (!m.placement) return false;
  if (filter === "4-6") return m.placement >= 4 && m.placement <= 6;
  if (filter === "7-8") return m.placement >= 7 && m.placement <= 8;
  return m.placement === Number(filter);
}

function getSortOptions(t) {
  return [
    { key: "date_desc", label: t("sort_most_recent") },
    { key: "date_asc", label: t("sort_oldest") },
    // "vitória" já não existe como etiqueta própria — o equivalente agora é
    // ordenar pelo lugar em si (melhor resultado primeiro).
    { key: "placement_asc", label: t("sort_best_placement") },
    { key: "placement_desc", label: t("sort_worst_placement") },
    { key: "kda_desc", label: t("sort_best_kda") },
    { key: "duration_desc", label: t("sort_longest") },
  ];
}

function sortMatches(matches, sortBy) {
  const sorted = [...matches];

  switch (sortBy) {
    case "date_asc":
      return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case "placement_asc":
      // Sem lugar conhecido fica sempre no fim, seja qual for a direção.
      return sorted.sort((a, b) => (a.placement || 99) - (b.placement || 99));
    case "placement_desc":
      return sorted.sort((a, b) => (b.placement || 0) - (a.placement || 0));
    case "kda_desc":
      return sorted.sort(
        (a, b) => Number(kdaRatio(b.kills, b.deaths, b.assists)) - Number(kdaRatio(a.kills, a.deaths, a.assists))
      );
    case "duration_desc":
      return sorted.sort((a, b) => (b.game_duration || 0) - (a.game_duration || 0));
    case "date_desc":
    default:
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

// Mesmos nomes de campos usados pela Riot na Match-V5 API (championName,
// kills/deaths/assists, win, item0-6, playerAugment1-4, queueId da Arena),
// preenchidos com os dados que já temos. placement/augments ficam null
// enquanto não houver importação via Riot API.
const ARENA_QUEUE_ID = 1700;

function toRiotFormat(matches, riotAccountName) {
  return matches.map((m) => {
    const items = m.items || [];
    const itemSlots = [0, 1, 2, 3, 4, 5, 6].map((i) => items[i]?.itemID ?? 0);
    const augments = m.augments || [];

    return {
      metadata: {
        matchId: null,
        dataVersion: "arena-tracker-export-1",
      },
      info: {
        gameMode: "CHERRY",
        queueId: ARENA_QUEUE_ID,
        gameEndTimestamp: new Date(m.created_at).getTime(),
        participants: [
          {
            riotIdGameName: riotAccountName || null,
            championName: m.champion,
            kills: m.kills || 0,
            deaths: m.deaths || 0,
            assists: m.assists || 0,
            win: !!m.win,
            placement: m.placement ?? null,
            playerAugment1: augments[0] ?? null,
            playerAugment2: augments[1] ?? null,
            playerAugment3: augments[2] ?? null,
            playerAugment4: augments[3] ?? null,
            item0: itemSlots[0],
            item1: itemSlots[1],
            item2: itemSlots[2],
            item3: itemSlots[3],
            item4: itemSlots[4],
            item5: itemSlots[5],
            item6: itemSlots[6],
          },
        ],
      },
    };
  });
}

// CSV simples (uma linha por partida) — pensado para abrir em Excel/Sheets,
// ao contrário do export em formato Riot que serve para reimportar dados.
function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(matches, champions) {
  const champName = (id) => champions.find((c) => c.id === id)?.name || id;
  const header = [
    "date",
    "champion",
    "format",
    "placement",
    "win",
    "kills",
    "deaths",
    "assists",
    "damage_dealt",
    "damage_taken",
    "healing",
    "max_hp",
    "gold_earned",
    "cs",
    "vision_score",
    "duration_seconds",
    "items",
    "augments",
  ];

  const rows = matches.map((m) => [
    m.created_at ? new Date(m.created_at).toISOString() : "",
    champName(m.champion),
    m.team_size ? `${m.team_size}v${m.team_size}` : "",
    m.placement ?? "",
    m.win ? 1 : 0,
    m.kills ?? "",
    m.deaths ?? "",
    m.assists ?? "",
    m.damage_dealt ?? "",
    m.damage_taken ?? "",
    m.healing ?? "",
    m.max_hp ?? "",
    m.gold_earned ?? "",
    m.cs ?? "",
    m.vision_score ?? "",
    m.game_duration ?? "",
    (m.items || []).map((it) => it?.name || it?.itemID).filter(Boolean).join(" | "),
    (m.augments || []).join(" | "),
  ]);

  return [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

export default function MatchHistory({
  matches,
  champions,
  DRAGON,
  augmentsMap,
  summonerSpellsMap,
  itemsMap,
  theme,
  riotAccountName,
}) {
  const { t, lang } = useLanguage();
  const PLACEMENT_FILTERS = getPlacementFilters(t);
  const SORT_OPTIONS = getSortOptions(t);
  const FORMAT_FILTERS = [
    { key: "ALL", label: t("format_all") },
    { key: 2, label: t("format_2v2") },
    { key: 3, label: t("format_3v3") },
  ];

  const [placementFilter, setPlacementFilter] = useState("ALL");
  // Antes era um <select> com um campeão exato à escolha — uma busca por
  // texto encontra logo qualquer campeão que contenha o que se escreve
  // (ex: "vi" apanha Vi/Viktor/Viego de uma vez), sem precisar de abrir uma
  // lista com 170+ opções.
  const [championSearch, setChampionSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date_desc");
  const [expanded, setExpanded] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!window.electron?.exportFile) return;

    setExporting(true);
    try {
      const payload = toRiotFormat(matches, riotAccountName);
      const content = JSON.stringify(payload, null, 2);
      const defaultName = `arena-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;

      const res = await window.electron.exportFile({ defaultName, content });

      if (res.success) {
        alert(`${lang === "en" ? "History exported to" : "Histórico exportado para"}:\n${res.path}`);
      } else if (res.error) {
        alert(`${lang === "en" ? "Export error" : "Erro ao exportar"}: ${res.error}`);
      }
    } finally {
      setExporting(false);
    }
  };

  const [exportingCsv, setExportingCsv] = useState(false);

  const handleExportCsv = async () => {
    if (!window.electron?.exportFile) return;

    setExportingCsv(true);
    try {
      const content = toCsv(matches, champions);
      const defaultName = `arena-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`;

      const res = await window.electron.exportFile({ defaultName, content });

      if (res.success) {
        alert(`${lang === "en" ? "History exported to" : "Histórico exportado para"}:\n${res.path}`);
      } else if (res.error) {
        alert(`${lang === "en" ? "Export error" : "Erro ao exportar"}: ${res.error}`);
      }
    } finally {
      setExportingCsv(false);
    }
  };

  const champName = (id) => champions.find((c) => c.id === id)?.name || id;

  const filteredMatches = useMemo(() => {
    const q = championSearch.trim().toLowerCase();

    const filtered = matches.filter((m) => {
      const matchPlacement = matchesPlacementFilter(m, placementFilter);
      const matchChampion = !q || champName(m.champion).toLowerCase().includes(q);

      // A Arena já teve formato de 8 equipas de 2 e de 6 equipas de 3 —
      // dá para isolar cada um aqui no histórico.
      const matchFormat = formatFilter === "ALL" || m.team_size === formatFilter;

      return matchPlacement && matchChampion && matchFormat;
    });

    return sortMatches(filtered, sortBy);
  }, [matches, placementFilter, championSearch, formatFilter, sortBy, champions]);

  if (!matches.length) {
    return <div style={styles.empty}>{t("history_empty")}</div>;
  }

  return (
    <div style={styles.wrap}>
      {/* Painel único de filtros — busca + exportar em cima, grupos de chips
          (lugar/formato/ordenação) em baixo, tudo dentro do mesmo cartão em
          vez de campos soltos empilhados (mesma linguagem visual da tab de
          Estatísticas). */}
      <div style={styles.filterToolbar}>
        <div style={styles.searchRow}>
          <div style={{ ...styles.searchBox, marginBottom: 0 }}>
            <span style={styles.searchIcon}>🔎</span>
            <input
              value={championSearch}
              onChange={(e) => setChampionSearch(e.target.value)}
              placeholder={t("search_champion_placeholder")}
              style={styles.searchInput}
            />
          </div>

          {window.electron?.exportFile && (
            <div style={styles.exportBtnGroup}>
              <button onClick={handleExport} style={styles.exportBtn} disabled={exporting}>
                {exporting ? t("exporting") : t("export_btn")}
              </button>
              <button onClick={handleExportCsv} style={styles.exportBtn} disabled={exportingCsv}>
                {exportingCsv ? t("exporting") : t("export_csv_btn")}
              </button>
            </div>
          )}
        </div>

        <div style={styles.filterGroups}>
          <div style={styles.filterGroup}>
            <Tooltip label={t("filter_placement_tooltip")}>
              <span style={styles.filterGroupLabel}>{t("filter_group_placement")}</span>
            </Tooltip>
            <div style={styles.chipRow}>
              {PLACEMENT_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setPlacementFilter(f.key)}
                  style={{
                    ...styles.chip,
                    ...(placementFilter === f.key ? styles.chipActive : {}),
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.filterGroup}>
            <Tooltip label={t("filter_format_tooltip")}>
              <span style={styles.filterGroupLabel}>{t("filter_group_format")}</span>
            </Tooltip>
            <div style={styles.chipRow}>
              {FORMAT_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFormatFilter(f.key)}
                  style={{
                    ...styles.chip,
                    ...(formatFilter === f.key ? styles.chipActive : {}),
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterGroupLabel}>{t("filter_group_sort")}</span>
            <div style={styles.chipRow}>
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSortBy(s.key)}
                  style={{
                    ...styles.chip,
                    ...(sortBy === s.key ? styles.chipActive : {}),
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* LISTA — sem altura/scroll próprios: a área da tab (em App.jsx) é
          quem tem o overflow vertical, para as linhas nunca ficarem cortadas */}
      {filteredMatches.length === 0 ? (
        <div style={styles.empty}>{t("no_filtered_results")}</div>
      ) : (
      <div style={styles.matchList}>
        <AnimatePresence initial={false}>
          {filteredMatches.map((m, i) => {
            const rowKey = `${m.champion}-${m.created_at}-${i}`;
            const isOpen = expanded === rowKey;
            const color = resultColor(m);

            return (
              <motion.div
                key={rowKey}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={{
                  ...styles.matchCard,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div
                  className="clickableRow"
                  style={styles.matchRow}
                  onClick={() => setExpanded(isOpen ? null : rowKey)}
                >
                  <div style={styles.matchIconWrap}>
                    {DRAGON && (
                      <img
                        src={`${DRAGON}/img/champion/${m.champion}.png`}
                        style={styles.matchIcon}
                      />
                    )}
                    {!!m.champ_level && <div style={styles.levelBadge}>{m.champ_level}</div>}
                  </div>

                  {(m.summoner1 || m.summoner2) && (
                    <div style={styles.spellCol}>
                      {[m.summoner1, m.summoner2].filter(Boolean).map((name, idx) => (
                        <Tooltip key={idx} label={name}>
                          <img
                            src={summonerSpellsMap?.[name]}
                            style={styles.spellIcon}
                            onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                          />
                        </Tooltip>
                      ))}
                    </div>
                  )}

                  <div style={styles.matchChampName}>
                    {champName(m.champion)}
                  </div>

                  <Tooltip
                    label={
                      m.placement
                        ? t("arena_placement_tooltip")
                        : t("no_placement_fallback_tooltip")
                    }
                  >
                    <div
                      style={{
                        ...styles.placementPill,
                        background: `color-mix(in srgb, ${color} 20%, transparent)`,
                        color,
                        border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
                      }}
                    >
                      {placementShort(m)}
                    </div>
                  </Tooltip>

                  <div style={styles.matchKda}>
                    <div>
                      <div>
                        {(m.kills || 0).toFixed?.(0) ?? m.kills} / {m.deaths} / {m.assists}
                      </div>
                      <div style={styles.matchKdaRatio}>
                        {kdaRatio(m.kills, m.deaths, m.assists)} KDA
                      </div>
                    </div>
                    {/* Double/Triple Kill como uma pequena marca logo a seguir
                        ao KDA — antes ficava por baixo do nome do campeão,
                        numa coluna estreita de largura fixa; aqui aproveita o
                        espaço vazio que a coluna do KDA (flex:1) costuma
                        deixar sobrar. */}
                    {MULTIKILL_LABELS[m.multikill] && (
                      <Tooltip label={MULTIKILL_LABELS[m.multikill]}>
                        <div style={styles.multikillTag}>
                          {MULTIKILL_LABELS[m.multikill]}
                        </div>
                      </Tooltip>
                    )}
                  </div>

                  <div style={styles.matchTime}>
                    {formatDuration(m.game_duration) && (
                      <div>{formatDuration(m.game_duration)}</div>
                    )}
                    <div style={styles.matchTimeAgo}>{timeAgo(m.created_at, lang)}</div>
                  </div>

                  <div style={styles.expandArrow}>{isOpen ? "▲" : "▼"}</div>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      style={styles.expandWrap}
                    >
                      <div style={styles.expandSection}>
                        <div style={styles.expandLabel}>{t("section_stats")}</div>
                        {m.damage_dealt != null || m.gold_earned != null || m.healing != null || m.max_hp != null ? (
                          <div style={styles.statGrid}>
                            {m.damage_dealt != null && (
                              <div style={styles.statItem}>
                                <div style={styles.statValue}>{m.damage_dealt.toLocaleString()}</div>
                                <div style={styles.statLabel}>{t("stat_damage_dealt")}</div>
                              </div>
                            )}
                            {m.damage_taken != null && (
                              <div style={styles.statItem}>
                                <div style={styles.statValue}>{m.damage_taken.toLocaleString()}</div>
                                <div style={styles.statLabel}>{t("stat_damage_taken")}</div>
                              </div>
                            )}
                            {m.gold_earned != null && (
                              <div style={styles.statItem}>
                                <div style={styles.statValue}>{m.gold_earned.toLocaleString()}</div>
                                <div style={styles.statLabel}>{t("stat_gold")}</div>
                              </div>
                            )}
                            {m.healing != null && (
                              <div style={styles.statItem}>
                                <div style={styles.statValue}>{m.healing.toLocaleString()}</div>
                                <div style={styles.statLabel}>{t("stat_healing")}</div>
                              </div>
                            )}
                            {m.max_hp != null && (
                              <div style={styles.statItem}>
                                <div style={styles.statValue}>{m.max_hp.toLocaleString()}</div>
                                <div style={styles.statLabel}>{t("stat_hp")}</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={styles.placeholderText}>{t("available_after_riot_sync")}</div>
                        )}
                      </div>

                      <div style={styles.expandSection}>
                        <div style={styles.expandLabel}>{t("section_build")}</div>
                        {m.items?.length ? (
                          <div style={styles.itemRow}>
                            {m.items.map((it, idx) => {
                              const itemName = itemsMap?.[it.itemID] || `Item #${it.itemID}`;
                              const label = it.count > 1 ? `${itemName} (x${it.count})` : itemName;
                              return (
                                <Tooltip key={idx} label={label}>
                                  <img
                                    src={`${DRAGON}/img/item/${it.itemID}.png`}
                                    style={styles.itemIcon}
                                  />
                                </Tooltip>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={styles.placeholderText}>{t("no_build_saved")}</div>
                        )}
                      </div>

                      <div style={styles.expandSection}>
                        <div style={styles.expandLabel}>{t("section_augments")}</div>
                        {m.augments?.length ? (
                          <div style={styles.itemRow}>
                            {m.augments.map((a, idx) => {
                              const info = augmentsMap?.[a];
                              // Os ícones dos augments da Arena de 3 (formato
                              // de 6 equipas) vêm claros por defeito e ficam
                              // quase invisíveis sobre o fundo branco do tema
                              // claro — escurecemos só neste caso específico.
                              const needsDarkIcon = theme === "light" && m.team_size === 3;
                              const rarityStyle = augmentRarityStyle(info?.rarity);
                              return (
                                <div key={idx} style={{ ...styles.augmentPill, ...rarityStyle }}>
                                  {info?.icon && (
                                    <img
                                      src={info.icon}
                                      style={{
                                        ...styles.augmentIcon,
                                        filter: needsDarkIcon ? "brightness(0.35)" : "none",
                                      }}
                                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                                    />
                                  )}
                                  <span>{info?.name || `Augment #${a}`}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={styles.placeholderText}>{t("available_after_riot_link")}</div>
                        )}
                      </div>

                      <div style={styles.expandSection}>
                        <div style={styles.expandLabel}>{t("section_teammates_opponents")}</div>
                        {m.participants?.length ? (
                          <div style={styles.teamsGrid}>
                            {groupParticipantsByPlacement(m.participants).map((team) => {
                              const teamColor = placementColor(team.placement);
                              return (
                                <div
                                  key={team.placement ?? "unknown"}
                                  style={{
                                    ...styles.teamCard,
                                    borderLeft: `3px solid ${teamColor}`,
                                  }}
                                >
                                  <div style={styles.teamHeader}>
                                    <span
                                      style={{
                                        ...styles.teamPlacementBadge,
                                        background: placementBg(team.placement),
                                        color: teamColor,
                                        border: `1px solid ${placementBorder(team.placement)}`,
                                      }}
                                    >
                                      {team.placement ? `${team.placement}º` : "?"}
                                    </span>
                                    {team.isSelfTeam && (
                                      <span style={styles.teamSelfTag}>{t("your_team")}</span>
                                    )}
                                  </div>
                                  <div style={styles.teamPlayers}>
                                    {team.players.map((p, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          ...styles.teamPlayer,
                                          background: p.isSelf ? "rgba(var(--accent-rgb),0.14)" : "transparent",
                                        }}
                                      >
                                        <Tooltip label={p.name ? `${champName(p.champion)} — ${p.name}` : champName(p.champion)}>
                                          {DRAGON && (
                                            <img
                                              src={`${DRAGON}/img/champion/${p.champion}.png`}
                                              style={styles.teamPlayerIcon}
                                            />
                                          )}
                                        </Tooltip>
                                        {/* Uma única fileira que envolve (wrap) tudo — KDA, stats
                                            e build — em vez de duas linhas fixas por jogador; builds
                                            curtas ficam na mesma linha do KDA, só passa para a linha
                                            de baixo quando o espaço mesmo não chega. */}
                                        <div style={styles.teamPlayerInfo}>
                                          {/* Nome visível em vez de só no tooltip do ícone — antes só
                                              dava para saber quem era passando o rato campeão a
                                              campeão; agora dá para reconhecer de imediato um
                                              colega/adversário recorrente. */}
                                          {p.name && (
                                            <span style={styles.teamPlayerName} title={p.name}>
                                              {p.name}
                                            </span>
                                          )}
                                          <span style={styles.teamPlayerKda}>
                                            {p.kills}/{p.deaths}/{p.assists}
                                          </span>
                                          {!!p.damageDealt && (
                                            <Tooltip label={t("stat_damage_dealt")}>
                                              <span style={styles.teamPlayerStat}>⚔ {formatCompact(p.damageDealt)}</span>
                                            </Tooltip>
                                          )}
                                          {!!p.damageTaken && (
                                            <Tooltip label={t("stat_damage_taken")}>
                                              <span style={styles.teamPlayerStat}>🛡 {formatCompact(p.damageTaken)}</span>
                                            </Tooltip>
                                          )}
                                          {!!p.goldEarned && (
                                            <Tooltip label={t("stat_gold")}>
                                              <span style={styles.teamPlayerStat}>🪙 {formatCompact(p.goldEarned)}</span>
                                            </Tooltip>
                                          )}
                                          {!!p.healing && (
                                            <Tooltip label={t("stat_healing")}>
                                              <span style={styles.teamPlayerStat}>✚ {formatCompact(p.healing)}</span>
                                            </Tooltip>
                                          )}
                                          {p.items?.map((itemId, i2) => (
                                            <Tooltip key={`i-${i2}`} label={itemsMap?.[itemId] || `Item #${itemId}`}>
                                              <img
                                                src={`${DRAGON}/img/item/${itemId}.png`}
                                                style={styles.teamPlayerItemIcon}
                                              />
                                            </Tooltip>
                                          ))}
                                          {p.augments?.map((augId, i3) => {
                                            const info = augmentsMap?.[augId];
                                            const needsDarkIcon = theme === "light" && m.team_size === 3;
                                            const rarityStyle = augmentRarityStyle(info?.rarity);
                                            return (
                                              <Tooltip
                                                key={`a-${i3}`}
                                                label={info?.name || `Augment #${augId}`}
                                              >
                                                {info?.icon && (
                                                  <span style={{ ...styles.teamPlayerAugmentWrap, ...rarityStyle }}>
                                                    <img
                                                      src={info.icon}
                                                      style={{
                                                        ...styles.teamPlayerAugmentIcon,
                                                        filter: needsDarkIcon ? "brightness(0.35)" : "none",
                                                      }}
                                                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                                                    />
                                                  </span>
                                                )}
                                              </Tooltip>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={styles.placeholderText}>{t("available_after_riot_enrich")}</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 12,
  },

  empty: {
    marginTop: 20,
    padding: 20,
    textAlign: "center",
    color: "var(--text-secondary)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: 14,
  },

  searchRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },

  searchBox: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 10,
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--accent-rgb),0.25)",
  },

  searchIcon: {
    fontSize: 12,
    flexShrink: 0,
  },

  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--text-body)",
    fontSize: 13,
  },

  // Grupos de filtros lado a lado, cada um com um rótulo pequeno + a sua
  // Painel único para busca/exportar/filtros — em vez de campos soltos
  // empilhados, ficam agrupados dentro do mesmo cartão com fundo próprio
  // (mesma linguagem visual da tab de Estatísticas, ver MatchReports.jsx).
  filterToolbar: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    background: "rgba(var(--panel-deep-rgb),0.4)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  // fileira de chips — mais fácil de perceber de relance o que pertence a
  // cada categoria (lugar/formato/ordenação) do que 3 <select> soltos.
  filterGroups: {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
  },

  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  filterGroupLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 5,
  },

  chip: {
    padding: "6px 13px",
    borderRadius: 999,
    border: "1px solid rgba(var(--border-rgb),0.4)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    transition: "all 0.15s ease",
  },

  chipActive: {
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    borderColor: "#4f46e5",
    color: "#ffffff",
    boxShadow: "0 3px 10px rgba(79,70,229,0.4)",
  },

  exportBtnGroup: {
    marginLeft: "auto",
    display: "flex",
    gap: 6,
  },

  exportBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(var(--accent-rgb),0.35)",
    background: "rgba(var(--accent-rgb),0.08)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 12,
  },

  matchList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  matchCard: {
    borderRadius: 10,
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--border-rgb),0.25)",
    overflow: "hidden",
  },

  // Fundo com um tom claro da cor de destaque — distingue visualmente a
  // fileira clicável (que abre/fecha os detalhes) do resto do cartão. Os
  // detalhes (expandWrap, mais abaixo) ficam sem este fundo, precisamente
  // para se notar a diferença entre a parte clicável e a que não é.
  matchRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 12px",
    cursor: "pointer",
    background: "rgba(var(--accent-rgb),0.16)",
  },

  matchIconWrap: {
    position: "relative",
    width: 36,
    height: 36,
    flexShrink: 0,
  },

  matchIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    pointerEvents: "none",
  },

  levelBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    padding: "0 3px",
    borderRadius: 5,
    background: "rgba(var(--panel-deep-rgb),0.95)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    color: "var(--text-secondary)",
    fontSize: 9,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  spellCol: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flexShrink: 0,
  },

  spellIcon: {
    width: 17,
    height: 17,
    borderRadius: 4,
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  matchChampName: {
    width: 120,
    fontSize: 13,
    color: "var(--text-body)",
    fontWeight: 600,
  },

  // Etiqueta discreta (Double/Triple Kill) — vive dentro de matchKda, que é
  // "flex:1" e normalmente sobra muito espaço vazio à direita do KDA; fica
  // encostada a esse espaço em vez de ocupar mais uma linha noutra coluna.
  multikillTag: {
    flexShrink: 0,
    fontSize: 10,
    fontWeight: 700,
    color: "var(--accent-text)",
    background: "rgba(var(--accent-rgb),0.14)",
    border: "1px solid rgba(var(--accent-rgb),0.35)",
    borderRadius: 999,
    padding: "3px 8px",
    whiteSpace: "nowrap",
  },

  // O elemento mais saliente da linha — substitui as antigas etiquetas de
  // texto (VITÓRIA/TOP 3/DERROTA) por um selo grande só com o lugar em si.
  placementPill: {
    width: 46,
    textAlign: "center",
    fontSize: 17,
    fontWeight: 800,
    padding: "5px 4px",
    borderRadius: 8,
    flexShrink: 0,
  },

  // "flex:1" + display:flex para o KDA (à esquerda) e a etiqueta de
  // multikill (à direita, quando existe) partilharem a mesma linha, em vez
  // de deixarem todo o espaço sobrante da coluna por aproveitar.
  matchKda: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 13,
    color: "var(--text-body)",
    fontWeight: 600,
  },

  matchKdaRatio: {
    fontSize: 10,
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginTop: 1,
  },

  matchTime: {
    fontSize: 11,
    color: "var(--text-secondary)",
    minWidth: 70,
    textAlign: "right",
  },

  matchTimeAgo: {
    color: "var(--text-muted)",
  },

  expandArrow: {
    fontSize: 10,
    color: "var(--text-secondary)",
    width: 14,
    textAlign: "center",
  },

  expandWrap: {
    padding: "0 12px 12px 58px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  expandSection: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  expandLabel: {
    fontSize: 11,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  statGrid: {
    display: "flex",
    gap: 18,
    flexWrap: "wrap",
  },

  statItem: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  statValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text-body)",
  },

  statLabel: {
    fontSize: 10,
    color: "var(--text-secondary)",
  },

  itemRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },

  itemIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    border: "1px solid rgba(var(--accent-rgb),0.25)",
  },

  augmentPill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 8px",
    borderRadius: 6,
    background: "rgba(var(--accent-rgb),0.12)",
    border: "1px solid rgba(var(--accent-rgb),0.25)",
    color: "var(--accent-text)",
    fontSize: 11,
  },

  augmentIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },

  // Colegas e adversários (estilo op.gg) — um cartão por equipa (agrupada
  // por lugar final). Antes ficavam empilhadas numa só coluna (até 8
  // cartões seguidos na Arena de 2, cada um ocupando a largura toda) — o que
  // tornava a secção enorme. Em 2 colunas usa-se a largura disponível e
  // corta a altura total a cerca de metade.
  teamsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 6,
  },

  // Cartão de equipa modernizado: fundo em degradê (como o resto da app) em
  // vez de uma cor plana, com uma barra de destaque à esquerda na cor do
  // lugar (mesmo padrão usado no cartão da partida) em vez de contorno
  // completo — menos "pesado" visualmente e mais consistente com o resto.
  teamCard: {
    borderRadius: 10,
    padding: "6px 8px",
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.85), rgba(var(--panel-deep-rgb),0.9))",
  },

  teamHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },

  teamPlacementBadge: {
    fontSize: 10.5,
    fontWeight: 800,
    padding: "1px 7px",
    borderRadius: 20,
  },

  teamSelfTag: {
    fontWeight: 700,
    fontSize: 9.5,
    color: "var(--accent-text)",
    background: "rgba(var(--accent-rgb),0.14)",
    padding: "1px 7px",
    borderRadius: 20,
  },

  teamPlayers: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },

  teamPlayer: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 5px",
    borderRadius: 7,
  },

  teamPlayerIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    flexShrink: 0,
    pointerEvents: "none",
  },

  // Uma única fileira que envolve (wrap): KDA, stats e build juntos — builds
  // curtas cabem na mesma linha do KDA, só passando à linha seguinte quando
  // o espaço já não chega, em vez de reservar sempre 2 linhas por jogador.
  teamPlayerInfo: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 7,
    rowGap: 2,
    minWidth: 0,
    flex: 1,
  },

  teamPlayerName: {
    fontSize: 10.5,
    fontWeight: 600,
    color: "var(--text-secondary)",
    maxWidth: 96,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flexShrink: 1,
  },

  teamPlayerKda: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "var(--text-body)",
    flexShrink: 0,
  },

  teamPlayerStat: {
    fontSize: 9.5,
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
  },

  teamPlayerItemIcon: {
    width: 14,
    height: 14,
    borderRadius: 3,
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  teamPlayerAugmentWrap: {
    display: "inline-flex",
    borderRadius: 4,
    padding: 1,
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  teamPlayerAugmentIcon: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },

  placeholderText: {
    fontSize: 12,
    color: "var(--text-muted)",
    fontStyle: "italic",
  },
};
