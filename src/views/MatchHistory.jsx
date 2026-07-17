import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import { placementColor, placementBg, placementBorder } from "../lib/placement";
import { augmentRarityStyle } from "../lib/augments";
import { useLanguage } from "../lib/i18n";
import Tooltip from "../components/Tooltip";

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

// ================= COLUNAS DA FILEIRA DE COLEGAS/ADVERSÁRIOS =================
// Larguras fixas de cada coluna, em px. Fixas (e não a acompanhar o conteúdo)
// porque o objetivo é comparar jogadores ENTRE cartões de equipa diferentes:
// com colunas dimensionadas ao conteúdo, cada cartão chegava a um tamanho
// próprio e o dano de uma equipa não ficava por cima do dano da outra. Os
// valores saem do texto mais largo que cada coluna chega a ter (ex: "19/15/12"
// no KDA, "DK×4"+"TK×2" nos multikills, "🛡 131.5k" nas stats).
const TEAM_COL = {
  icon: 24,
  kda: 52,
  multikill: 75,
  stat: 46,
  item: 14,
  itemGap: 2,
  augment: 16, // ícone 12 + padding 1 + borda 1, de cada lado
  augmentGap: 2,
};

// Decide, para UMA partida, que colunas a fileira de cada jogador vai ter e
// devolve o "gridTemplateColumns" que TODOS os cartões dessa partida usam —
// é isso que faz o dano/build/augments de qualquer jogador cair exatamente
// por baixo do dos outros, mesmo em equipas diferentes.
//
// As colunas de conteúdo só existem se ALGUÉM na partida as tiver: partidas
// antigas (importadas antes de guardarmos dano/ouro/cura, ou sem augments)
// não ficam com colunas vazias reservadas a nada. Dentro de uma coluna que
// exista, quem não tem valor fica com a célula vazia — o espaço continua lá,
// que é o que mantém o alinhamento.
function teamRowLayout(participants) {
  const players = participants || [];
  const any = (fn) => players.some(fn);
  const maxCount = (fn) => Math.max(0, ...players.map((p) => fn(p)?.length || 0));

  const layout = {
    multikill: any((p) => p.doubleKills || p.tripleKills),
    damageDealt: any((p) => p.damageDealt),
    damageTaken: any((p) => p.damageTaken),
    goldEarned: any((p) => p.goldEarned),
    healing: any((p) => p.healing),
    items: maxCount((p) => p.items),
    augments: maxCount((p) => p.augments),
  };

  const groupWidth = (count, size, gap) => count * size + (count - 1) * gap;

  // O nome é a única coluna elástica: leva o espaço que sobrar, o que corta
  // menos nomes do que os 100px fixos de antes ("DerAufgestande..."). Mas com
  // um teto — sem ele, num monitor largo ficava com ~250px e abria um vazio
  // enorme entre o nome e o KDA. O que sobra do teto fica no fim da fileira,
  // onde não separa nada.
  const columns = [`${TEAM_COL.icon}px`, "minmax(90px, 170px)", `${TEAM_COL.kda}px`];

  if (layout.multikill) columns.push(`${TEAM_COL.multikill}px`);
  ["damageDealt", "damageTaken", "goldEarned", "healing"].forEach((key) => {
    if (layout[key]) columns.push(`${TEAM_COL.stat}px`);
  });
  if (layout.items > 0) {
    columns.push(`${groupWidth(layout.items, TEAM_COL.item, TEAM_COL.itemGap)}px`);
  }
  if (layout.augments > 0) {
    columns.push(`${groupWidth(layout.augments, TEAM_COL.augment, TEAM_COL.augmentGap)}px`);
  }

  return { ...layout, template: columns.join(" ") };
}

// Uma célula de stat (dano/ouro/cura) da fileira. É renderizada mesmo sem
// valor — uma célula vazia continua a ocupar a sua coluna, e é isso que
// impede as colunas seguintes de deslizarem para a esquerda nas linhas a
// quem falta um valor.
function TeamStatCell({ icon, label, value }) {
  if (!value) return <span style={styles.teamPlayerStat} />;

  return (
    <Tooltip label={label} style={styles.teamPlayerStatCell}>
      <span style={styles.teamPlayerStat}>
        {icon} {formatCompact(value)}
      </span>
    </Tooltip>
  );
}

// Cor do selo de lugar — mantém a mesma lógica de sempre (pódio a verde,
// meio a laranja, fundo a vermelho), só já não vem acompanhada de uma
// etiqueta de texto tipo "VITÓRIA"/"TOP 3"/"DERROTA".
function resultColor(m) {
  if (m.placement) return placementColor(m.placement);
  return m.win ? "var(--place-good)" : "var(--place-low)";
}

// Uma opção por cada posição possível (1º-8º, o máximo que a Arena já teve
// no formato de 8 equipas de 2 — ver placement.js) em vez dos baldes 4º-6º/
// 7º-8º de antes: já não precisa de poupar espaço (é um <select>, não
// chips), por isso mostrar cada lugar individual é mais direto do que
// agrupar. "Sem dados de lugar" foi removido a pedido — partidas antigas só
// com Live Client Data (sem lugar exato) ficam de fora deste filtro, mas
// continuam visíveis com "ALL".
function getPlacementFilters(t) {
  return [
    { key: "ALL", label: t("filter_all_placements") },
    { key: "1", label: "1º" },
    { key: "2", label: "2º" },
    { key: "3", label: "3º" },
    { key: "4", label: "4º" },
    { key: "5", label: "5º" },
    { key: "6", label: "6º" },
    { key: "7", label: "7º" },
    { key: "8", label: "8º" },
  ];
}

function matchesPlacementFilter(m, filter) {
  if (filter === "ALL") return true;
  if (!m.placement) return false;
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

export default function MatchHistory({
  matches,
  champions,
  DRAGON,
  augmentsMap,
  summonerSpellsMap,
  itemsMap,
  theme,
}) {
  const { t, lang } = useLanguage();
  const PLACEMENT_FILTERS = getPlacementFilters(t);
  const SORT_OPTIONS = getSortOptions(t);

  const [placementFilter, setPlacementFilter] = useState("ALL");
  // Antes era um <select> com um campeão exato à escolha — uma busca por
  // texto encontra logo qualquer campeão que contenha o que se escreve
  // (ex: "vi" apanha Vi/Viktor/Viego de uma vez), sem precisar de abrir uma
  // lista com 170+ opções. A lista de sugestões por baixo (ver
  // championSuggestions) junta o melhor dos dois: continua a ser texto
  // livre, mas mostra logo com quem é que esse texto está a corresponder.
  const [championSearch, setChampionSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
  const [sortBy, setSortBy] = useState("date_desc");
  const [expanded, setExpanded] = useState(null);

  const champName = (id) => champions.find((c) => c.id === id)?.name || id;

  const championSuggestions = useMemo(() => {
    const q = championSearch.trim().toLowerCase();
    if (!q) return [];
    return champions.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [championSearch, champions]);

  const showSuggestions = searchFocused && championSuggestions.length > 0;

  const selectChampionSuggestion = (champion) => {
    setChampionSearch(champion.name);
    setSearchFocused(false);
    setHighlightedSuggestion(-1);
  };

  const handleSearchKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedSuggestion((i) => Math.min(i + 1, championSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedSuggestion((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (highlightedSuggestion >= 0 && championSuggestions[highlightedSuggestion]) {
        e.preventDefault();
        selectChampionSuggestion(championSuggestions[highlightedSuggestion]);
      }
    } else if (e.key === "Escape") {
      setSearchFocused(false);
    }
  };

  const filteredMatches = useMemo(() => {
    const q = championSearch.trim().toLowerCase();

    // "matches" já vem filtrado pelo formato escolhido na barra do topo
    // (Todos/2v2/3v3, ver teamSizeFilter em App.jsx) — o Histórico já não
    // tem um filtro de formato próprio, para não haver dois seletores
    // independentes a controlar a mesma coisa.
    const filtered = matches.filter((m) => {
      const matchPlacement = matchesPlacementFilter(m, placementFilter);
      const matchChampion = !q || champName(m.champion).toLowerCase().includes(q);

      return matchPlacement && matchChampion;
    });

    return sortMatches(filtered, sortBy);
  }, [matches, placementFilter, championSearch, sortBy, champions]);

  // "Load more" em vez de paginação clássica (páginas 1/2/3...) — a lista já
  // vive dentro do scroll único da própria tab (ver App.jsx), sem scroll
  // próprio, por isso trocar de página exigiria voltar ao topo sempre; isto
  // deixa continuar exatamente onde se estava. Reinicia sempre que os
  // filtros mudam, para nunca mostrar "carregar mais" de uma lista antiga.
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [placementFilter, championSearch, sortBy]);

  const visibleMatches = filteredMatches.slice(0, visibleCount);
  const hasMore = visibleCount < filteredMatches.length;

  if (!matches.length) {
    return <div style={styles.empty}>{t("history_empty")}</div>;
  }

  return (
    <div style={styles.wrap}>
      {/* Barra de filtros compacta — busca, lugar/formato/ordenação (todos em
          select) numa única fileira, em vez do painel antigo empilhado em
          várias linhas (busca+exportar, depois um grupo de chips por
          categoria). Isto liberta bastante altura para a lista de partidas,
          que é o que importa de verdade no ecrã. */}
      <div style={styles.filterToolbar}>
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>
            <Search size={13} strokeWidth={2.25} />
          </span>
          <input
            value={championSearch}
            onChange={(e) => {
              setChampionSearch(e.target.value);
              setHighlightedSuggestion(-1);
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t("search_champion_placeholder")}
            style={styles.searchInput}
          />

          {showSuggestions && (
            <div style={styles.searchDropdown}>
              {championSuggestions.map((c, idx) => (
                <div
                  key={c.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectChampionSuggestion(c)}
                  style={{
                    ...styles.searchOption,
                    ...(idx === highlightedSuggestion ? styles.searchOptionActive : null),
                  }}
                >
                  {DRAGON && (
                    <img src={`${DRAGON}/img/champion/${c.id}.png`} style={styles.searchOptionIcon} />
                  )}
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Tooltip label={t("filter_placement_tooltip")}>
          <select
            value={placementFilter}
            onChange={(e) => setPlacementFilter(e.target.value)}
            style={styles.filterSelect}
          >
            {PLACEMENT_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </Tooltip>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.filterSelect}>
          {SORT_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* LISTA — sem altura/scroll próprios: a área da tab (em App.jsx) é
          quem tem o overflow vertical, para as linhas nunca ficarem cortadas */}
      {filteredMatches.length === 0 ? (
        <div style={styles.empty}>{t("no_filtered_results")}</div>
      ) : (
      <div style={styles.matchList}>
        <AnimatePresence initial={false}>
          {visibleMatches.map((m, i) => {
            const rowKey = `${m.champion}-${m.created_at}-${i}`;
            const isOpen = expanded === rowKey;
            const color = resultColor(m);
            // Calculado uma vez por partida (não por cartão de equipa) — é
            // exatamente por ser o mesmo para toda a gente que as colunas
            // alinham entre equipas. Ver teamRowLayout.
            const teamGrid = isOpen ? teamRowLayout(m.participants) : null;

            return (
              <motion.div
                key={rowKey}
                className="historyCard"
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
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    setExpanded(isOpen ? null : rowKey);
                  }}
                >
                  <div style={styles.matchIconWrap}>
                    {DRAGON && (
                      <img
                        src={`${DRAGON}/img/champion/${m.champion}.png`}
                        style={{ ...styles.matchIcon, border: `2px solid ${color}` }}
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

                  <div style={styles.expandArrow}>
                    {isOpen ? <ChevronUp size={14} strokeWidth={2.25} /> : <ChevronDown size={14} strokeWidth={2.25} />}
                  </div>
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
                    {/* Stats/Build/Augments lado a lado numa única linha (em
                        vez de empilhados numa coluna estreita, que sobrava
                        vazia ao lado de Colegas/Adversários e obrigava mais
                        scroll do que o conteúdo precisa) — cada secção usa o
                        espaço horizontal que tiver, e só empilha (flexWrap)
                        em janelas mesmo estreitas. Colegas/Adversários fica
                        numa linha própria por baixo, a usar a largura toda. */}
                    <div style={styles.expandTopRow}>
                      <div style={styles.expandRowSection}>
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

                      <div style={styles.expandRowSection}>
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

                      <div style={styles.expandRowSection}>
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
                    </div>

                    <div style={styles.expandSection}>
                        <div style={styles.expandLabel}>{t("section_teammates_opponents")}</div>
                        {m.participants?.length ? (
                          <div className="teamsGrid">
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
                                          gridTemplateColumns: teamGrid.template,
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
                                        {/* Cada bloco daqui para baixo é UMA célula do grid da linha
                                            (ver teamPlayer/teamRowLayout) — nome, KDA, multikills, cada
                                            stat, build e augments têm coluna própria de largura fixa, e
                                            existem mesmo quando o jogador não tem o valor. É isso que
                                            põe o dano de cada um debaixo do dano dos outros, em vez de
                                            uma fileira em flex onde tudo escorregava consoante o que
                                            vinha antes (um badge DK a mais empurrava a linha inteira). */}
                                        {p.name ? (
                                          <Tooltip label={p.name} style={styles.teamPlayerNameCell}>
                                            <span style={styles.teamPlayerName}>{p.name}</span>
                                          </Tooltip>
                                        ) : (
                                          <span />
                                        )}
                                        <span style={styles.teamPlayerKda}>
                                          {p.kills}/{p.deaths}/{p.assists}
                                        </span>
                                        {teamGrid.multikill && (
                                          <div style={styles.multikillGroup}>
                                            {!!p.doubleKills && (
                                              <Tooltip
                                                label={`${MULTIKILL_LABELS[2]}${p.doubleKills > 1 ? ` ×${p.doubleKills}` : ""}`}
                                              >
                                                <span style={styles.multikillBadgeSmall}>
                                                  DK{p.doubleKills > 1 ? `×${p.doubleKills}` : ""}
                                                </span>
                                              </Tooltip>
                                            )}
                                            {!!p.tripleKills && (
                                              <Tooltip
                                                label={`${MULTIKILL_LABELS[3]}${p.tripleKills > 1 ? ` ×${p.tripleKills}` : ""}`}
                                              >
                                                <span style={{ ...styles.multikillBadgeSmall, ...styles.multikillBadgeTriple }}>
                                                  TK{p.tripleKills > 1 ? `×${p.tripleKills}` : ""}
                                                </span>
                                              </Tooltip>
                                            )}
                                          </div>
                                        )}
                                        {teamGrid.damageDealt && (
                                          <TeamStatCell icon="⚔" label={t("stat_damage_dealt")} value={p.damageDealt} />
                                        )}
                                        {teamGrid.damageTaken && (
                                          <TeamStatCell icon="🛡" label={t("stat_damage_taken")} value={p.damageTaken} />
                                        )}
                                        {teamGrid.goldEarned && (
                                          <TeamStatCell icon="🪙" label={t("stat_gold")} value={p.goldEarned} />
                                        )}
                                        {teamGrid.healing && (
                                          <TeamStatCell icon="✚" label={t("stat_healing")} value={p.healing} />
                                        )}
                                        {teamGrid.items > 0 && (
                                          <div style={styles.teamPlayerItemsGroup}>
                                            {(p.items || []).map((itemId, i2) => (
                                              <Tooltip key={`i-${i2}`} label={itemsMap?.[itemId] || `Item #${itemId}`}>
                                                <img
                                                  src={`${DRAGON}/img/item/${itemId}.png`}
                                                  style={styles.teamPlayerItemIcon}
                                                />
                                              </Tooltip>
                                            ))}
                                          </div>
                                        )}
                                        {teamGrid.augments > 0 && (
                                          <div style={styles.teamPlayerAugmentsGroup}>
                                            {(p.augments || []).map((augId, i3) => {
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
                                        )}
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

      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          style={styles.loadMoreBtn}
        >
          {t("load_more")} ({filteredMatches.length - visibleCount})
        </button>
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
    borderRadius: "var(--radius-xl)",
  },

  // Largura fixa (não "flex:1" como antes) — numa fileira única com os
  // outros filtros, deixar a busca esticar-se para ocupar todo o espaço
  // sobrante empurrava tudo o resto para uma segunda linha sempre.
  // "position: relative" ancora o dropdown de sugestões (searchDropdown)
  // logo por baixo, sem afetar o resto da fileira de filtros.
  searchBox: {
    position: "relative",
    width: 200,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--accent-rgb),0.25)",
  },

  searchIcon: {
    display: "inline-flex",
    flexShrink: 0,
    color: "var(--text-muted)",
  },

  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--text-body)",
    fontSize: 13,
  },

  // Lista de sugestões de campeões — "select com input": continua a ser
  // texto livre (searchInput), mas mostra logo com quem esse texto está a
  // corresponder, para escolher com um clique em vez de escrever o nome
  // completo. Ancorada ao searchBox via position:absolute (ver acima).
  searchDropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    zIndex: 20,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: 4,
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.98)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
  },

  searchOption: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 8px",
    borderRadius: "var(--radius-md)",
    fontSize: 12,
    color: "var(--text-body)",
    cursor: "pointer",
  },

  searchOptionActive: {
    background: "rgba(var(--accent-rgb),0.2)",
  },

  searchOptionIcon: {
    width: 20,
    height: 20,
    borderRadius: "var(--radius-xs)",
    flexShrink: 0,
    pointerEvents: "none",
  },

  // Painel único de filtros — busca, lugar/formato/ordenação (todos em
  // select) numa única fileira que só quebra (flexWrap) se a janela for
  // mesmo estreita. Antes eram 4 linhas empilhadas (busca+exportar, depois
  // um grupo de chips por categoria) — isto liberta bastante altura para a
  // lista de partidas, que é o conteúdo que importa de facto.
  filterToolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: "var(--radius-xl)",
    background: "rgba(var(--panel-deep-rgb),0.4)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  // Mesma linguagem visual do <select> de resolução nas Definições.
  filterSelect: {
    padding: "5px 8px",
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    color: "var(--text-body)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },

  matchList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  loadMoreBtn: {
    alignSelf: "center",
    padding: "8px 20px",
    borderRadius: "var(--radius-pill)",
    border: "1px solid rgba(var(--accent-rgb),0.35)",
    background: "rgba(var(--accent-rgb),0.1)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },

  matchCard: {
    borderRadius: "var(--radius-lg)",
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
    gap: 10,
    padding: "6px 12px",
    cursor: "pointer",
    background: "rgba(var(--accent-rgb),0.16)",
  },

  matchIconWrap: {
    position: "relative",
    width: 28,
    height: 28,
    flexShrink: 0,
  },

  matchIcon: {
    width: 28,
    height: 28,
    borderRadius: "var(--radius-md)",
    pointerEvents: "none",
  },

  levelBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    minWidth: 14,
    height: 14,
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
    width: 14,
    height: 14,
    borderRadius: "var(--radius-xs)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  matchChampName: {
    width: 110,
    fontSize: 12,
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
    borderRadius: "var(--radius-pill)",
    padding: "3px 8px",
    whiteSpace: "nowrap",
  },

  // O elemento mais saliente da linha — substitui as antigas etiquetas de
  // texto (VITÓRIA/TOP 3/DERROTA) por um selo grande só com o lugar em si.
  placementPill: {
    width: 42,
    textAlign: "center",
    fontSize: 16,
    fontWeight: 800,
    padding: "3px 4px",
    borderRadius: "var(--radius-md)",
    flexShrink: 0,
    letterSpacing: -0.3,
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
    fontSize: 12,
    color: "var(--text-body)",
    fontWeight: 600,
  },

  matchKdaRatio: {
    fontSize: 9,
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginTop: 1,
  },

  matchTime: {
    fontSize: 10,
    color: "var(--text-secondary)",
    minWidth: 60,
    textAlign: "right",
  },

  matchTimeAgo: {
    color: "var(--text-muted)",
  },

  expandArrow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-secondary)",
    width: 16,
    flexShrink: 0,
  },

  expandWrap: {
    padding: "0 12px 10px 50px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  // Stats/Build/Augments lado a lado na mesma linha (cada um até 3 colunas
  // numa janela larga) em vez de empilhados — só caem para baixo (flexWrap)
  // quando a janela é mesmo estreita para os três caberem lado a lado.
  expandTopRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 24,
    alignItems: "flex-start",
  },

  // Usado pelas 3 secções da expandTopRow (Stats/Build/Augments) — cada uma
  // é um item da linha (flex-basis + minWidth) que por dentro continua em
  // coluna (label por cima do conteúdo).
  expandRowSection: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: "1 1 200px",
    minWidth: 180,
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
    borderRadius: "var(--radius-sm)",
    border: "1px solid rgba(var(--accent-rgb),0.25)",
  },

  augmentPill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 8px",
    borderRadius: "var(--radius-sm)",
    background: "rgba(var(--accent-rgb),0.12)",
    border: "1px solid rgba(var(--accent-rgb),0.25)",
    color: "var(--accent-text)",
    fontSize: 11,
  },

  augmentIcon: {
    width: 18,
    height: 18,
    borderRadius: "var(--radius-xs)",
  },

  // Cartão de equipa modernizado: fundo em degradê (como o resto da app) em
  // vez de uma cor plana, com uma barra de destaque à esquerda na cor do
  // lugar (mesmo padrão usado no cartão da partida) em vez de contorno
  // completo — menos "pesado" visualmente e mais consistente com o resto.
  teamCard: {
    borderRadius: "var(--radius-lg)",
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
    fontSize: 11.5,
    fontWeight: 800,
    padding: "1px 7px",
    borderRadius: 20,
  },

  teamSelfTag: {
    fontWeight: 700,
    fontSize: 10.5,
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

  // Uma coluna por cada coisa comparável (ícone/nome/KDA/multikills/cada
  // stat/build/augments), toda de largura fixa — lê-se como uma tabela: para
  // comparar o dano de dois jogadores basta descer o olhar pela coluna, sem
  // procurar onde é que o número daquela linha calhou. O "gridTemplateColumns"
  // vem de fora (ver teamRowLayout), porque depende do que a partida tem e é
  // igual para todos os cartões de equipa dela.
  teamPlayer: {
    display: "grid",
    alignItems: "center",
    columnGap: 8,
    padding: "3px 5px",
    borderRadius: 7,
  },

  teamPlayerIcon: {
    width: 24,
    height: 24,
    borderRadius: "var(--radius-sm)",
    pointerEvents: "none",
  },

  multikillGroup: {
    display: "flex",
    alignItems: "center",
    gap: 3,
  },

  multikillBadgeSmall: {
    fontSize: 9.5,
    fontWeight: 800,
    padding: "1px 5px",
    borderRadius: "var(--radius-xs)",
    background: "rgba(var(--accent-rgb),0.18)",
    color: "var(--accent-text)",
    whiteSpace: "nowrap",
  },

  // Triple Kill é bem mais raro que Double na Arena — cor de destaque
  // própria (dourado, mesma linguagem das conquistas especiais) para saltar
  // mais à vista do que um double kill comum.
  multikillBadgeTriple: {
    background: "rgba(250,204,21,0.2)",
    color: "#eab308",
  },

  // O <span> do Tooltip é que é a célula do grid — sem minWidth:0 um nome
  // longo esticava a coluna flexível do nome e roubava espaço às outras.
  teamPlayerNameCell: {
    minWidth: 0,
    overflow: "hidden",
  },

  teamPlayerName: {
    fontSize: 11.5,
    fontWeight: 600,
    color: "var(--text-secondary)",
    width: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  // tabular-nums no KDA e nas stats: por omissão os dígitos têm larguras
  // diferentes (o "1" é estreito), por isso números da mesma grandeza em
  // linhas seguidas ficavam com comprimentos visuais diferentes. Com dígitos
  // de largura fixa, uma coluna de números compara-se de relance.
  teamPlayerKda: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "var(--text-body)",
    fontVariantNumeric: "tabular-nums",
  },

  teamPlayerStatCell: {
    minWidth: 0,
    overflow: "hidden",
  },

  teamPlayerStat: {
    fontSize: 10.5,
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  },

  // Grupos próprios para items/augments (gap bem mais apertado entre si do
  // que o resto da fileira) — lêem-se como um "bloco" de build/augments,
  // não como itens soltos espaçados igual às stats de texto ao lado.
  teamPlayerItemsGroup: {
    display: "flex",
    gap: 2,
  },

  teamPlayerItemIcon: {
    width: 14,
    height: 14,
    borderRadius: 3,
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  teamPlayerAugmentsGroup: {
    display: "flex",
    gap: 2,
  },

  teamPlayerAugmentWrap: {
    display: "inline-flex",
    borderRadius: "var(--radius-xs)",
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
