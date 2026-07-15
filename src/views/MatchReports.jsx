import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Info, Puzzle, Search, ChevronUp, ChevronDown } from "lucide-react";
import { placementColor, placementText, placementBg, placementBorder, isLastPlace } from "../lib/placement";
import { normalizeChampionId } from "../lib/champions";
import { buildFormatBuckets, bestFormatAvg, bestFormatKda } from "../lib/formatStats";
import { augmentRarityStyle } from "../lib/augments";
import { useLanguage } from "../lib/i18n";
import Tooltip from "../components/Tooltip";

// Item de trinket obrigatório em qualquer partida (toda a gente o leva) —
// não diz nada sobre o estilo de jogo do campeão, por isso sai da lista de
// "itens mais usados" para não ocupar espaço com informação óbvia.
const ALWAYS_EXCLUDED_ITEM_NAMES = new Set(["Oracle Lens"]);

// 1º-8º — a Arena de 2 (8 equipas) tem sempre estes 8 lugares possíveis; na
// Arena de 3 (6 equipas) só existem até ao 6º, mas mostramos os 8 cartões
// sempre da mesma forma para não mudar de layout consoante o formato —
// 7º/8º ficam simplesmente sempre a 0 nesse caso.
const ALL_PLACEMENTS = [1, 2, 3, 4, 5, 6, 7, 8];

function kdaLabel(k, d, a) {
  return `${k.toFixed(1)} / ${d.toFixed(1)} / ${a.toFixed(1)}`;
}

function avgOf(sum, count) {
  return count ? sum / count : null;
}

// Acessor + formatação do valor exato de cada critério de ordenação — usado
// para mostrar, já na própria linha (sem precisar de abrir o campeão), o
// valor pelo qual se está a ordenar. "games_desc"/"winrate_desc"/"top3_desc"
// e "name_asc" ficam de fora de propósito: já têm coluna própria sempre
// visível (ou, no caso do nome, não têm valor numérico nenhum para mostrar).
const SORT_ROW_VALUE = {
  kda_desc: { get: (c) => c.bestKda, format: (v) => v.toFixed(1) },
  worst_kda: { get: (c) => c.worstKda, format: (v) => v.toFixed(1) },
  best_avg_placement: { get: (c) => c.avgPlacement, format: (v) => `${v.toFixed(1)}º` },
  worst_avg_placement: { get: (c) => c.avgPlacement, format: (v) => `${v.toFixed(1)}º` },
  most_wins: { get: (c) => c.wins, format: (v) => `${v}` },
  most_top3_count: { get: (c) => c.top3, format: (v) => `${v}` },
  most_below_top3: { get: (c) => c.belowTop3, format: (v) => `${v}` },
  most_last: { get: (c) => c.lastPlace, format: (v) => `${v}` },
  highest_damage: { get: (c) => c.avgDamageDealt, format: (v) => Math.round(v).toLocaleString() },
  highest_healing: { get: (c) => c.avgHealing, format: (v) => Math.round(v).toLocaleString() },
  highest_damage_taken: { get: (c) => c.avgDamageTaken, format: (v) => Math.round(v).toLocaleString() },
  highest_hp: { get: (c) => c.avgHp, format: (v) => Math.round(v).toLocaleString() },
  highest_gold: { get: (c) => c.avgGold, format: (v) => Math.round(v).toLocaleString() },
  best_damage_game: { get: (c) => c.bestGameDamage, format: (v) => Math.round(v).toLocaleString() },
  best_healing_game: { get: (c) => c.bestGameHealing, format: (v) => Math.round(v).toLocaleString() },
  best_damage_taken_game: { get: (c) => c.bestGameDamageTaken, format: (v) => Math.round(v).toLocaleString() },
  best_hp_game: { get: (c) => c.bestGameHp, format: (v) => Math.round(v).toLocaleString() },
  best_gold_game: { get: (c) => c.bestGameGold, format: (v) => Math.round(v).toLocaleString() },
  highest_doubles: { get: (c) => c.avgDoubles, format: (v) => v.toFixed(2) },
  highest_triples: { get: (c) => c.avgTriples, format: (v) => v.toFixed(2) },
  best_doubles_game: { get: (c) => c.bestGameDoubles, format: (v) => `${v}` },
  best_triples_game: { get: (c) => c.bestGameTriples, format: (v) => `${v}` },
};

// Cada opção liga um critério (compare) a um requisito mínimo opcional
// (qualifies) — sem "qualifies", mostra sempre todos os campeões; com ele,
// campeões que não têm dados suficientes para aquele critério (ex: menos de
// 2 jogos para uma média, ou 0 ocorrências para uma contagem) saem da lista
// em vez de aparecerem lá com um valor sem sentido/enganador. As chaves e
// rótulos espelham exatamente os cartões de destaque da Visão Geral (mesmo
// texto, ver i18n.js) — clicar num cartão lá aplica o mesmo critério aqui.
function getSortMeta(t) {
  return [
    { key: "games_desc", label: t("sort_most_played"), compare: (a, b) => b.games - a.games },
    { key: "winrate_desc", label: t("sort_best_winrate"), compare: (a, b) => b.winrate - a.winrate || b.games - a.games },
    { key: "top3_desc", label: t("sort_best_top3"), compare: (a, b) => b.top3Rate - a.top3Rate || b.games - a.games },
    {
      key: "kda_desc",
      label: t("sort_best_kda"),
      // Ordena pelo melhor KDA por formato (ver formatStats.js), não pela
      // média cega de 2v2+3v3 — o mesmo critério do destaque "Melhor KDA"
      // na Visão Geral, para nunca mostrar um líder diferente daquele.
      compare: (a, b) => (b.bestKda ?? -1) - (a.bestKda ?? -1),
      qualifies: (c) => c.bestKda != null,
    },
    {
      key: "worst_kda",
      label: t("spotlight_worst_kda"),
      compare: (a, b) => (a.worstKda ?? Infinity) - (b.worstKda ?? Infinity),
      qualifies: (c) => c.worstKda != null,
    },
    { key: "most_wins", label: t("spotlight_most_first"), compare: (a, b) => b.wins - a.wins, qualifies: (c) => c.wins > 0 },
    {
      key: "most_top3_count",
      label: t("spotlight_most_top3"),
      compare: (a, b) => b.top3 - a.top3,
      qualifies: (c) => c.top3 > 0,
    },
    {
      key: "most_below_top3",
      label: t("spotlight_most_below_top3"),
      compare: (a, b) => b.belowTop3 - a.belowTop3,
      qualifies: (c) => c.belowTop3 > 0,
    },
    {
      key: "most_last",
      label: t("spotlight_most_last"),
      compare: (a, b) => b.lastPlace - a.lastPlace,
      qualifies: (c) => c.lastPlace > 0,
    },
    // Mínimo de 2 partidas com lugar registado, tal como as outras médias
    // (ver overviewSpotlights.js) — sem isto uma única partida boa/má
    // colocava um campeão no topo só por sorte de amostra. "Melhor" = média
    // mais BAIXA (1º é o melhor lugar), por isso ordena ascendente.
    {
      key: "best_avg_placement",
      label: t("spotlight_best_avg_placement"),
      compare: (a, b) => (a.avgPlacement ?? Infinity) - (b.avgPlacement ?? Infinity),
      qualifies: (c) => c.avgPlacement != null && c.placements.length >= 2,
    },
    {
      key: "worst_avg_placement",
      label: t("spotlight_worst_avg_placement"),
      compare: (a, b) => (b.avgPlacement ?? -1) - (a.avgPlacement ?? -1),
      qualifies: (c) => c.avgPlacement != null && c.placements.length >= 2,
    },
    {
      key: "highest_damage",
      label: t("spotlight_highest_damage"),
      compare: (a, b) => (b.avgDamageDealt ?? -1) - (a.avgDamageDealt ?? -1),
      qualifies: (c) => c.avgDamageDealt != null,
    },
    {
      key: "highest_healing",
      label: t("spotlight_highest_healing"),
      compare: (a, b) => (b.avgHealing ?? -1) - (a.avgHealing ?? -1),
      qualifies: (c) => c.avgHealing != null,
    },
    {
      key: "highest_damage_taken",
      label: t("spotlight_highest_damage_taken"),
      compare: (a, b) => (b.avgDamageTaken ?? -1) - (a.avgDamageTaken ?? -1),
      qualifies: (c) => c.avgDamageTaken != null,
    },
    {
      key: "highest_hp",
      label: t("spotlight_highest_hp"),
      compare: (a, b) => (b.avgHp ?? -1) - (a.avgHp ?? -1),
      qualifies: (c) => c.avgHp != null,
    },
    {
      key: "highest_gold",
      label: t("spotlight_highest_gold"),
      compare: (a, b) => (b.avgGold ?? -1) - (a.avgGold ?? -1),
      qualifies: (c) => c.avgGold != null,
    },
    {
      key: "best_damage_game",
      label: t("spotlight_best_damage_game"),
      compare: (a, b) => (b.bestGameDamage ?? -1) - (a.bestGameDamage ?? -1),
      qualifies: (c) => c.bestGameDamage != null,
    },
    {
      key: "best_healing_game",
      label: t("spotlight_best_healing_game"),
      compare: (a, b) => (b.bestGameHealing ?? -1) - (a.bestGameHealing ?? -1),
      qualifies: (c) => c.bestGameHealing != null,
    },
    {
      key: "best_damage_taken_game",
      label: t("spotlight_best_damage_taken_game"),
      compare: (a, b) => (b.bestGameDamageTaken ?? -1) - (a.bestGameDamageTaken ?? -1),
      qualifies: (c) => c.bestGameDamageTaken != null,
    },
    {
      key: "best_hp_game",
      label: t("spotlight_best_hp_game"),
      compare: (a, b) => (b.bestGameHp ?? -1) - (a.bestGameHp ?? -1),
      qualifies: (c) => c.bestGameHp != null,
    },
    {
      key: "best_gold_game",
      label: t("spotlight_best_gold_game"),
      compare: (a, b) => (b.bestGameGold ?? -1) - (a.bestGameGold ?? -1),
      qualifies: (c) => c.bestGameGold != null,
    },
    {
      key: "highest_doubles",
      label: t("spotlight_highest_doubles"),
      compare: (a, b) => (b.avgDoubles ?? -1) - (a.avgDoubles ?? -1),
      qualifies: (c) => c.avgDoubles != null,
    },
    {
      key: "highest_triples",
      label: t("spotlight_highest_triples"),
      compare: (a, b) => (b.avgTriples ?? -1) - (a.avgTriples ?? -1),
      qualifies: (c) => c.avgTriples != null,
    },
    {
      key: "best_doubles_game",
      label: t("spotlight_best_doubles_game"),
      compare: (a, b) => (b.bestGameDoubles ?? -1) - (a.bestGameDoubles ?? -1),
      qualifies: (c) => c.bestGameDoubles != null,
    },
    {
      key: "best_triples_game",
      label: t("spotlight_best_triples_game"),
      compare: (a, b) => (b.bestGameTriples ?? -1) - (a.bestGameTriples ?? -1),
      qualifies: (c) => c.bestGameTriples != null,
    },
    { key: "name_asc", label: t("sort_name_az"), compare: (a, b) => a.name.localeCompare(b.name) },
  ];
}

export default function MatchReports({ matches, champions, DRAGON, augmentsMap, itemsMap, highlightChampion }) {
  const { t, lang } = useLanguage();
  const SORT_META = useMemo(() => getSortMeta(t), [t]);
  const [expanded, setExpanded] = useState(null);
  const [sortBy, setSortBy] = useState("games_desc");
  // Antes não havia forma nenhuma de saltar direto para um campeão aqui —
  // só dava para ordenar e ir procurando na lista toda. A lista de
  // sugestões por baixo (mesma lógica do Histórico, ver championSuggestions
  // em MatchHistory.jsx) junta o melhor dos dois: continua a ser texto
  // livre, mas mostra logo com quem esse texto está a corresponder.
  const [champSearch, setChampSearch] = useState("");
  const [champSearchFocused, setChampSearchFocused] = useState(false);
  const [champSearchHighlight, setChampSearchHighlight] = useState(-1);
  // Filtro por build (augments e itens específicos) — restringe TODAS as
  // estatísticas abaixo (não só a lista de campeões) às partidas em que
  // TODAS as peças escolhidas foram mesmo usadas, ex: "só as partidas em que
  // levei este augment E este item". Augments e itens vivem em dois campos
  // próprios (cada um permite escolher vários, não só um de cada vez) — antes
  // eram um único campo combinado com uma única seleção possível.
  const [augmentFilterQuery, setAugmentFilterQuery] = useState("");
  const [augmentFilterIds, setAugmentFilterIds] = useState([]);
  const [itemFilterQuery, setItemFilterQuery] = useState("");
  const [itemFilterIds, setItemFilterIds] = useState([]);

  const champName = (id) => champions.find((c) => c.id === id)?.name || id;

  // Listas pesquisáveis, construídas uma vez a partir dos mapas já
  // carregados (id -> nome/objeto vindos do Data Dragon).
  const augmentOptions = useMemo(
    () =>
      Object.entries(augmentsMap || {}).map(([id, info]) => ({
        id,
        name: info?.name || `Augment #${id}`,
        icon: info?.icon,
      })),
    [augmentsMap]
  );

  const itemOptions = useMemo(
    () => Object.entries(itemsMap || {}).map(([id, name]) => ({ id, name: name || `Item #${id}` })),
    [itemsMap]
  );

  const augmentSuggestions = useMemo(() => {
    const q = augmentFilterQuery.trim().toLowerCase();
    if (!q) return [];
    return augmentOptions
      .filter((o) => !augmentFilterIds.includes(o.id) && o.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [augmentFilterQuery, augmentOptions, augmentFilterIds]);

  const itemSuggestions = useMemo(() => {
    const q = itemFilterQuery.trim().toLowerCase();
    if (!q) return [];
    return itemOptions.filter((o) => !itemFilterIds.includes(o.id) && o.name.toLowerCase().includes(q)).slice(0, 8);
  }, [itemFilterQuery, itemOptions, itemFilterIds]);

  const selectedAugmentFilters = useMemo(
    () => augmentOptions.filter((o) => augmentFilterIds.includes(o.id)),
    [augmentOptions, augmentFilterIds]
  );

  const selectedItemFilters = useMemo(
    () => itemOptions.filter((o) => itemFilterIds.includes(o.id)),
    [itemOptions, itemFilterIds]
  );

  const toggleAugmentFilter = (o) => {
    setAugmentFilterIds((ids) => (ids.includes(o.id) ? ids.filter((id) => id !== o.id) : [...ids, o.id]));
    setAugmentFilterQuery("");
  };

  const toggleItemFilter = (o) => {
    setItemFilterIds((ids) => (ids.includes(o.id) ? ids.filter((id) => id !== o.id) : [...ids, o.id]));
    setItemFilterQuery("");
  };

  // Partidas restringidas aos augments/itens escolhidos (se houver) — tudo o
  // resto (leaderboard, KDA, dano médio, matchups, etc.) passa a ser
  // calculado só sobre este subconjunto, em vez das partidas todas. "every"
  // exige TODAS as peças escolhidas na mesma partida (não basta uma), para
  // conseguir isolar uma build específica em vez de só "usei isto OU aquilo".
  const filteredMatches = useMemo(() => {
    if (!augmentFilterIds.length && !itemFilterIds.length) return matches;
    return matches.filter((m) => {
      const matchAugments = augmentFilterIds.every((id) =>
        (m.augments || []).some((a) => String(a) === String(id))
      );
      const matchItems = itemFilterIds.every((id) => (m.items || []).some((it) => String(it?.itemID) === String(id)));
      return matchAugments && matchItems;
    });
  }, [matches, augmentFilterIds, itemFilterIds]);

  // Comparação lado a lado — dois campeões escolhidos manualmente, sem
  // depender do filtro/ordenação ativos na lista principal.
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareAId, setCompareAId] = useState(null);
  const [compareBId, setCompareBId] = useState(null);
  const [compareQueryA, setCompareQueryA] = useState("");
  const [compareQueryB, setCompareQueryB] = useState("");

  // Partidas agrupadas por campeão E por formato (2v2/3v3) — partilhado com
  // Overview.jsx (ver formatStats.js) para os dois lados da app usarem
  // sempre o mesmo critério ao comparar médias entre formatos. Sem isto, a
  // Visão Geral e as Estatísticas podiam apontar campeões diferentes como
  // "líder" na mesma métrica (ex: destaque de maior dano médio mostrava um
  // campeão, mas a lista aqui, ordenada pelo mesmo critério, mostrava outro
  // no topo) por estarem a fazer a média de forma diferente.
  const perChampionByFormat = useMemo(
    () => buildFormatBuckets(filteredMatches, champions),
    [filteredMatches, champions]
  );

  // ================= LEADERBOARD POR CAMPEÃO =================
  const perChampion = useMemo(() => {
    const map = {};

    filteredMatches.forEach((rawMatch) => {
      // Normaliza a id do campeão antes de agrupar — ver champions.js: sem
      // isto, partidas antigas com uma variante de capitalização diferente
      // da canónica ficavam a contar como um campeão à parte, dividindo (e
      // por isso desacertando) as suas estatísticas, incluindo vitórias.
      const champion = normalizeChampionId(rawMatch.champion, champions);
      const m = { ...rawMatch, champion };

      if (!map[champion]) {
        map[champion] = {
          champion,
          games: 0,
          wins: 0,
          k: 0,
          d: 0,
          a: 0,
          top3: 0,
          belowTop3: 0,
          lastPlace: 0,
          withPlacement: 0,
          placements: [],
          placementCounts: {},
          augmentCounts: {},
          itemCounts: {},
          winAugmentCounts: {},
          winItemCounts: {},
          opponentCounts: {},
          bestMultikill: 0,
          damageDealtSum: 0,
          damageDealtCount: 0,
          bestGameDamage: null,
          damageTakenSum: 0,
          damageTakenCount: 0,
          bestGameDamageTaken: null,
          goldSum: 0,
          goldCount: 0,
          bestGameGold: null,
          healingSum: 0,
          healingCount: 0,
          bestGameHealing: null,
          hpSum: 0,
          hpCount: 0,
          bestGameHp: null,
          doubleKillsSum: 0,
          doubleKillsCount: 0,
          bestGameDoubles: null,
          tripleKillsSum: 0,
          tripleKillsCount: 0,
          bestGameTriples: null,
        };
      }
      const s = map[m.champion];
      s.games += 1;
      if (m.win) s.wins += 1;
      s.k += m.kills || 0;
      s.d += m.deaths || 0;
      s.a += m.assists || 0;

      if (m.placement) {
        s.withPlacement += 1;
        if (m.placement <= 3) s.top3 += 1;
        else s.belowTop3 += 1;
        s.placements.push({ placement: m.placement, created_at: m.created_at });
        s.placementCounts[m.placement] = (s.placementCounts[m.placement] || 0) + 1;
      }
      if (isLastPlace(m)) s.lastPlace += 1;

      if (m.multikill > s.bestMultikill) s.bestMultikill = m.multikill;

      if (m.damage_dealt != null) {
        s.damageDealtSum += m.damage_dealt;
        s.damageDealtCount += 1;
        if (s.bestGameDamage == null || m.damage_dealt > s.bestGameDamage) s.bestGameDamage = m.damage_dealt;
      }
      if (m.damage_taken != null) {
        s.damageTakenSum += m.damage_taken;
        s.damageTakenCount += 1;
        if (s.bestGameDamageTaken == null || m.damage_taken > s.bestGameDamageTaken) s.bestGameDamageTaken = m.damage_taken;
      }
      if (m.gold_earned != null) {
        s.goldSum += m.gold_earned;
        s.goldCount += 1;
        if (s.bestGameGold == null || m.gold_earned > s.bestGameGold) s.bestGameGold = m.gold_earned;
      }
      if (m.healing != null) {
        s.healingSum += m.healing;
        s.healingCount += 1;
        if (s.bestGameHealing == null || m.healing > s.bestGameHealing) s.bestGameHealing = m.healing;
      }
      if (m.max_hp != null) {
        s.hpSum += m.max_hp;
        s.hpCount += 1;
        if (s.bestGameHp == null || m.max_hp > s.bestGameHp) s.bestGameHp = m.max_hp;
      }
      if (m.double_kills != null) {
        s.doubleKillsSum += m.double_kills;
        s.doubleKillsCount += 1;
        if (s.bestGameDoubles == null || m.double_kills > s.bestGameDoubles) s.bestGameDoubles = m.double_kills;
      }
      if (m.triple_kills != null) {
        s.tripleKillsSum += m.triple_kills;
        s.tripleKillsCount += 1;
        if (s.bestGameTriples == null || m.triple_kills > s.bestGameTriples) s.bestGameTriples = m.triple_kills;
      }

      (m.augments || []).forEach((a) => {
        if (!a) return;
        s.augmentCounts[a] = (s.augmentCounts[a] || 0) + 1;
        // Mesma contagem, mas só nas partidas vencidas — para sugerir a
        // "build vencedora" separada do "o que costumo levar" (que inclui
        // derrotas também).
        if (m.win) s.winAugmentCounts[a] = (s.winAugmentCounts[a] || 0) + 1;
      });

      // Cada item conta uma vez por partida em que foi usado (não pelo
      // número de stacks), para responder a "que itens costumo levar".
      (m.items || []).forEach((it) => {
        if (!it?.itemID) return;
        s.itemCounts[it.itemID] = (s.itemCounts[it.itemID] || 0) + 1;
        if (m.win) s.winItemCounts[it.itemID] = (s.winItemCounts[it.itemID] || 0) + 1;
      });

      // "Adversários" — a Match-V5 API não dá o par exato de cada ronda da
      // Arena, só o lugar final de cada participante. Como aproximação,
      // contamos qualquer participante com um lugar final diferente do nosso
      // como tendo estado "na mesma lobby, não na nossa equipa" — é um sinal
      // mais fraco do que um confronto direto, mas ainda dá uma ideia de com
      // que campeões se costuma sair melhor/pior na mesma partida.
      if (m.participants?.length && m.placement != null) {
        m.participants
          .filter((p) => !p.isSelf && p.placement != null && p.placement !== m.placement)
          .forEach((p) => {
            const oppChamp = normalizeChampionId(p.champion, champions);
            if (!s.opponentCounts[oppChamp]) s.opponentCounts[oppChamp] = { games: 0, wins: 0 };
            s.opponentCounts[oppChamp].games += 1;
            if (m.win) s.opponentCounts[oppChamp].wins += 1;
          });
      }
    });

    return Object.values(map).map((s) => {
      // Dano/cura/dano recebido: em vez de uma média cega de 2v2+3v3
      // juntos, usamos a melhor média entre os formatos (ver formatStats.js)
      // — exatamente o mesmo critério da Visão Geral, para os dois lados da
      // app nunca voltarem a apontar campeões diferentes como "líder" na
      // mesma métrica.
      const buckets = perChampionByFormat[s.champion];
      const bestDamage = bestFormatAvg(buckets, "damageDealtSum", "damageDealtCount");
      const bestDamageTaken = bestFormatAvg(buckets, "damageTakenSum", "damageTakenCount");
      const bestHealing = bestFormatAvg(buckets, "healingSum", "healingCount");
      const bestHp = bestFormatAvg(buckets, "hpSum", "hpCount");
      const bestGold = bestFormatAvg(buckets, "goldSum", "goldCount");
      const bestDoubles = bestFormatAvg(buckets, "doubleKillsSum", "doubleKillsCount");
      const bestTriples = bestFormatAvg(buckets, "tripleKillsSum", "tripleKillsCount");
      // Melhor/pior KDA por formato — só usado para ordenar pelos filtros
      // "Melhor KDA"/"Pior KDA" (o KDA médio geral, mostrado sempre na
      // linha do campeão, continua a somar tudo normalmente).
      const bestKda = bestFormatKda(buckets, 2, "max");
      const worstKda = bestFormatKda(buckets, 2, "min");

      return {
        ...s,
        name: champName(s.champion),
        winrate: s.games ? Math.round((s.wins / s.games) * 100) : 0,
        top3Rate: s.withPlacement ? Math.round((s.top3 / s.withPlacement) * 100) : 0,
        // Lugar médio (só partidas com lugar registado) — usado pelos
        // critérios "Melhor/Pior lugar médio", espelhando os cartões novos
        // da Visão Geral (ver overviewSpotlights.js).
        avgPlacement: s.placements.length
          ? s.placements.reduce((sum, p) => sum + p.placement, 0) / s.placements.length
          : null,
        avgK: s.k / s.games,
        avgD: s.d / s.games,
        avgA: s.a / s.games,
        avgDamageDealt: bestDamage?.avg ?? null,
        damageDealtCount: bestDamage?.count ?? s.damageDealtCount,
        avgDamageTaken: bestDamageTaken?.avg ?? null,
        damageTakenCount: bestDamageTaken?.count ?? s.damageTakenCount,
        // Ouro/CS/vision agora seguem o mesmo critério de "melhor formato"
        // que dano/cura/HP (ver comentário acima) — antes usavam uma média
        // cega de 2v2+3v3 juntos, o que podia mostrar um valor diferente do
        // que a Visão Geral acaba de passar a mostrar para o mesmo campeão.
        avgGold: bestGold?.avg ?? null,
        goldCount: bestGold?.count ?? s.goldCount,
        avgHealing: bestHealing?.avg ?? null,
        healingCount: bestHealing?.count ?? s.healingCount,
        avgHp: bestHp?.avg ?? null,
        hpCount: bestHp?.count ?? s.hpCount,
        avgDoubles: bestDoubles?.avg ?? null,
        doubleKillsCount: bestDoubles?.count ?? s.doubleKillsCount,
        avgTriples: bestTriples?.avg ?? null,
        tripleKillsCount: bestTriples?.count ?? s.tripleKillsCount,
        bestKda: bestKda?.kda ?? null,
        worstKda: worstKda?.kda ?? null,
        // Os 8 lugares possíveis, sempre pela mesma ordem e sempre todos
        // presentes (mesmo a 0) — é o que substitui o antigo "nV-nD".
        placementBreakdown: ALL_PLACEMENTS.map((placement) => ({
          placement,
          count: s.placementCounts[placement] || 0,
        })),
        recentPlacements: [...s.placements]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10),
        // Todos os augments/itens usados (não só um top N) — o utilizador
        // quer ver o quadro completo, não apenas os mais frequentes.
        topAugments: Object.entries(s.augmentCounts)
          .map(([id, count]) => ({ id, count }))
          .sort((a, b) => b.count - a.count),
        topItems: Object.entries(s.itemCounts)
          .map(([id, count]) => ({ id, count }))
          .filter(({ id }) => !ALWAYS_EXCLUDED_ITEM_NAMES.has(itemsMap?.[id]))
          .sort((a, b) => b.count - a.count),
        // Build vencedora: mesma contagem, mas só sobre partidas ganhas — dá
        // uma recomendação de "o que costuma dar vitória" separada de
        // "o que costumo levar" (que mistura vitórias e derrotas). Exige
        // pelo menos 2 vitórias para não sugerir uma build a partir de 1
        // jogo só por sorte de amostra.
        topWinItems:
          s.wins >= 2
            ? Object.entries(s.winItemCounts)
                .map(([id, count]) => ({ id, count }))
                .filter(({ id }) => !ALWAYS_EXCLUDED_ITEM_NAMES.has(itemsMap?.[id]))
                .sort((a, b) => b.count - a.count)
                .slice(0, 6)
            : [],
        topWinAugments:
          s.wins >= 2
            ? Object.entries(s.winAugmentCounts)
                .map(([id, count]) => ({ id, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 6)
            : [],
        // Melhor/pior desempenho por campeão adversário na mesma lobby (ver
        // nota acima sobre a limitação dos dados) — exige pelo menos 2
        // partidas juntos para não tirar conclusões de uma amostra de 1.
        ...(() => {
          const withEnoughGames = Object.entries(s.opponentCounts)
            .map(([champion, o]) => ({
              champion,
              games: o.games,
              wins: o.wins,
              winrate: Math.round((o.wins / o.games) * 100),
            }))
            .filter((o) => o.games >= 2);
          return {
            bestMatchups: [...withEnoughGames].sort((a, b) => b.winrate - a.winrate || b.games - a.games).slice(0, 3),
            worstMatchups: [...withEnoughGames].sort((a, b) => a.winrate - b.winrate || b.games - a.games).slice(0, 3),
          };
        })(),
      };
    });
  }, [filteredMatches, champions, itemsMap, perChampionByFormat]);

  const activeSortMeta = useMemo(
    () => SORT_META.find((s) => s.key === sortBy) || SORT_META[0],
    [SORT_META, sortBy]
  );

  // "qualifies" (quando existe) tira da lista quem não tem dados que cheguem
  // para o critério ativo (ex: menos de 2 jogos para uma média, ou 0
  // ocorrências para uma contagem) — em vez de mostrar um valor sem sentido
  // ou enganador, esse campeão simplesmente não aparece enquanto este filtro
  // estiver ativo.
  const sortedChampions = useMemo(() => {
    const q = champSearch.trim().toLowerCase();
    let list = activeSortMeta.qualifies
      ? perChampion.filter(activeSortMeta.qualifies)
      : perChampion;
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
    return [...list].sort(activeSortMeta.compare);
  }, [perChampion, activeSortMeta, champSearch]);

  const champSearchSuggestions = useMemo(() => {
    const q = champSearch.trim().toLowerCase();
    if (!q) return [];
    return perChampion.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [champSearch, perChampion]);

  const showChampSearchSuggestions = champSearchFocused && champSearchSuggestions.length > 0;

  const selectChampSearchSuggestion = (c) => {
    setChampSearch(c.name);
    setChampSearchFocused(false);
    setChampSearchHighlight(-1);
  };

  const handleChampSearchKeyDown = (e) => {
    if (!showChampSearchSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setChampSearchHighlight((i) => Math.min(i + 1, champSearchSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setChampSearchHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (champSearchHighlight >= 0 && champSearchSuggestions[champSearchHighlight]) {
        e.preventDefault();
        selectChampSearchSuggestion(champSearchSuggestions[champSearchHighlight]);
      }
    } else if (e.key === "Escape") {
      setChampSearchFocused(false);
    }
  };

  // "Load more" em vez de paginação clássica — mesma lógica do Histórico
  // (ver MatchHistory.jsx): a lista vive no scroll único da tab, sem scroll
  // próprio, por isso "carregar mais" continua de onde se estava em vez de
  // saltar para outra página. Reinicia sempre que a busca/ordenação/filtro
  // de build mudam.
  const REPORTS_PAGE_SIZE = 20;
  const [visibleChampCount, setVisibleChampCount] = useState(REPORTS_PAGE_SIZE);

  useEffect(() => {
    setVisibleChampCount(REPORTS_PAGE_SIZE);
  }, [champSearch, sortBy, augmentFilterIds, itemFilterIds]);

  const visibleChampions = sortedChampions.slice(0, visibleChampCount);
  const hasMoreChampions = visibleChampCount < sortedChampions.length;

  // Vindo de um atalho da Visão Geral ("ver mais" num destaque) — já não
  // abre/expande a linha do campeão nem desloca o scroll até ela (a App.jsx
  // trata de repor o scroll da tab no topo ao navegar para cá, ver
  // goToChampionStats). Só continua a aplicar a métrica do cartão em que se
  // clicou (sortKey), para a lista já aparecer ordenada por esse critério.
  // "highlightChampion" é sempre um objeto NOVO { champion, key } mesmo
  // clicando duas vezes seguidas no mesmo campeão, para este efeito disparar
  // de novo mesmo sem o campeão mudar.
  useEffect(() => {
    if (!highlightChampion?.champion) return;
    if (highlightChampion.sortKey) setSortBy(highlightChampion.sortKey);
  }, [highlightChampion]);

  const compareA = useMemo(
    () => perChampion.find((c) => c.champion === compareAId) || null,
    [perChampion, compareAId]
  );
  const compareB = useMemo(
    () => perChampion.find((c) => c.champion === compareBId) || null,
    [perChampion, compareBId]
  );

  const compareOptionsA = useMemo(() => {
    const q = compareQueryA.trim().toLowerCase();
    if (!q) return [];
    return perChampion.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [compareQueryA, perChampion]);

  const compareOptionsB = useMemo(() => {
    const q = compareQueryB.trim().toLowerCase();
    if (!q) return [];
    return perChampion.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [compareQueryB, perChampion]);

  // Linhas da tabela de comparação — cada uma sabe formatar o próprio valor
  // e diz se "maior é melhor" (a maioria) ou "menor é melhor" (dano
  // recebido), para decidir que lado fica a verde.
  const compareRows = [
    { key: "games", label: t("compare_games"), get: (c) => c.games, format: (v) => `${v}`, higherIsBetter: true },
    { key: "winrate", label: t("compare_winrate"), get: (c) => c.winrate, format: (v) => `${v}%`, higherIsBetter: true },
    { key: "top3Rate", label: t("compare_top3rate"), get: (c) => c.top3Rate, format: (v) => `${v}%`, higherIsBetter: true },
    {
      key: "kda",
      label: t("compare_kda"),
      get: (c) => (c.avgK + c.avgA) / Math.max(c.avgD, 0.01),
      format: (v) => v.toFixed(2),
      higherIsBetter: true,
    },
    {
      key: "damage",
      label: t("compare_avg_damage"),
      get: (c) => c.avgDamageDealt,
      format: (v) => (v == null ? "—" : Math.round(v).toLocaleString()),
      higherIsBetter: true,
    },
    {
      key: "damageTaken",
      label: t("compare_avg_damage_taken"),
      get: (c) => c.avgDamageTaken,
      format: (v) => (v == null ? "—" : Math.round(v).toLocaleString()),
      higherIsBetter: false,
    },
    {
      key: "healing",
      label: t("compare_avg_healing"),
      get: (c) => c.avgHealing,
      format: (v) => (v == null ? "—" : Math.round(v).toLocaleString()),
      higherIsBetter: true,
    },
    {
      key: "hp",
      label: t("compare_avg_hp"),
      get: (c) => c.avgHp,
      format: (v) => (v == null ? "—" : Math.round(v).toLocaleString()),
      higherIsBetter: true,
    },
    {
      key: "gold",
      label: t("compare_avg_gold"),
      get: (c) => c.avgGold,
      format: (v) => (v == null ? "—" : Math.round(v).toLocaleString()),
      higherIsBetter: true,
    },
    {
      key: "doubles",
      label: t("compare_avg_doubles"),
      get: (c) => c.avgDoubles,
      format: (v) => (v == null ? "—" : v.toFixed(2)),
      higherIsBetter: true,
    },
    {
      key: "triples",
      label: t("compare_avg_triples"),
      get: (c) => c.avgTriples,
      format: (v) => (v == null ? "—" : v.toFixed(2)),
      higherIsBetter: true,
    },
  ];

  if (!matches.length) {
    return (
      <div style={styles.empty}>
        {t("history_empty")}
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      {/* COMPARAÇÃO LADO A LADO — dois campeões escolhidos à mão, fora do
          filtro/ordenação ativos na lista principal. */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>{t("compare_champions")}</h2>
          <button onClick={() => setCompareOpen((v) => !v)} style={styles.compareToggleBtn}>
            {compareOpen ? t("compare_hide") : t("compare_show")}
          </button>
        </div>

        {compareOpen && (
          <div style={styles.compareWrap}>
            <div style={styles.comparePickerRow}>
              {[
                { champ: compareA, query: compareQueryA, setQuery: setCompareQueryA, options: compareOptionsA, setId: setCompareAId },
                { champ: compareB, query: compareQueryB, setQuery: setCompareQueryB, options: compareOptionsB, setId: setCompareBId },
              ].map((slot, idx) => (
                <div key={idx} style={styles.compareSlotCol}>
                  <div style={styles.filterToolbarLabel}>
                    {idx === 0 ? t("compare_slot_a_label") : t("compare_slot_b_label")}
                  </div>
                  <div style={{ ...styles.searchBox, position: "relative", marginBottom: 0 }}>
                  {slot.champ && DRAGON && (
                    <img
                      src={`${DRAGON}/img/champion/${slot.champ.champion}.png`}
                      style={styles.compareSlotIcon}
                    />
                  )}
                  <input
                    value={slot.champ ? slot.champ.name : slot.query}
                    onChange={(e) => {
                      slot.setId(null);
                      slot.setQuery(e.target.value);
                    }}
                    onFocus={() => slot.champ && slot.setId(null)}
                    placeholder={t("search_champion_placeholder")}
                    style={styles.searchInput}
                  />
                  {!slot.champ && slot.options.length > 0 && (
                    <div className="scrollArea" style={styles.buildFilterDropdown}>
                      {slot.options.map((c) => (
                        <div
                          key={c.champion}
                          className="clickableRow"
                          style={styles.buildFilterOption}
                          onClick={() => {
                            slot.setId(c.champion);
                            slot.setQuery("");
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault();
                            slot.setId(c.champion);
                            slot.setQuery("");
                          }}
                        >
                          {DRAGON && (
                            <img
                              src={`${DRAGON}/img/champion/${c.champion}.png`}
                              style={styles.buildFilterOptionIcon}
                            />
                          )}
                          <span style={styles.buildFilterOptionName}>{c.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </div>
              ))}
            </div>

            {compareA && compareB ? (
              <div style={styles.compareTable}>
                {compareRows.map((row) => {
                  const valA = row.get(compareA);
                  const valB = row.get(compareB);
                  const aBetter =
                    valA != null && valB != null && valA !== valB
                      ? row.higherIsBetter
                        ? valA > valB
                        : valA < valB
                      : null;
                  return (
                    <div key={row.key} style={styles.compareRow}>
                      <span
                        style={{
                          ...styles.compareValue,
                          color: aBetter === true ? "var(--place-good)" : "var(--text-body)",
                          fontWeight: aBetter === true ? 800 : 600,
                        }}
                      >
                        {row.format(valA)}
                      </span>
                      <span style={styles.compareLabel}>{row.label}</span>
                      <span
                        style={{
                          ...styles.compareValue,
                          textAlign: "right",
                          color: aBetter === false ? "var(--place-good)" : "var(--text-body)",
                          fontWeight: aBetter === false ? 800 : 600,
                        }}
                      >
                        {row.format(valB)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={styles.placeholderText}>{t("compare_pick_two")}</div>
            )}
          </div>
        )}
      </div>

      {/* LEADERBOARD DE CAMPEÕES */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>{t("stats_by_champion")}</h2>
        </div>

        {/* Painel de filtros — busca de campeão + ordenação numa linha,
            augments/itens (multi-seleção, um campo por tipo) noutra — tudo
            dentro do mesmo cartão em vez de campos soltos empilhados.
            Ordenação passou de ~20 chips (que tornavam este cartão enorme)
            para um único <select>. */}
        <div style={styles.filterToolbar}>
          <div style={styles.filterToolbarRow}>
            <div style={{ ...styles.searchBox, flex: 1, marginBottom: 0, position: "relative" }}>
              <span style={styles.searchIcon}>
                <Search size={13} strokeWidth={2.25} />
              </span>
              <input
                value={champSearch}
                onChange={(e) => {
                  setChampSearch(e.target.value);
                  setChampSearchHighlight(-1);
                }}
                onFocus={() => setChampSearchFocused(true)}
                onBlur={() => setTimeout(() => setChampSearchFocused(false), 120)}
                onKeyDown={handleChampSearchKeyDown}
                placeholder={t("search_champion_placeholder")}
                style={styles.searchInput}
              />

              {showChampSearchSuggestions && (
                <div className="scrollArea" style={styles.buildFilterDropdown}>
                  {champSearchSuggestions.map((c, idx) => (
                    <div
                      key={c.champion}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectChampSearchSuggestion(c)}
                      style={{
                        ...styles.buildFilterOption,
                        ...(idx === champSearchHighlight ? styles.searchOptionActive : null),
                      }}
                    >
                      {DRAGON && (
                        <img
                          src={`${DRAGON}/img/champion/${c.champion}.png`}
                          style={styles.buildFilterOptionIcon}
                        />
                      )}
                      <span style={styles.buildFilterOptionName}>{c.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ ...styles.filterSelect, flex: 1 }}
            >
              {SORT_META.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por build — restringe tudo (leaderboard, médias,
              matchups) às partidas em que TODOS os augments/itens escolhidos
              foram usados na mesma partida, ex: "só quero ver como me saio
              quando levo este augment com este item". Augments e itens têm
              campos próprios (cada um permite escolher vários), para não
              misturar os dois tipos de opção numa única lista comprida. */}
          <div style={styles.filterToolbarRow}>
            <div style={{ ...styles.compareSlotCol, flex: 1 }}>
              <div style={styles.filterToolbarLabel}>{t("build_filter_augments_label")}</div>
              {selectedAugmentFilters.length > 0 && (
                <div style={styles.buildFilterChipRow}>
                  {selectedAugmentFilters.map((o) => (
                    <div key={o.id} style={styles.buildFilterChip}>
                      {o.icon && <img src={o.icon} style={styles.buildFilterChipIcon} />}
                      <span>{o.name}</span>
                      <button onClick={() => toggleAugmentFilter(o)} style={styles.buildFilterClear}>
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ ...styles.searchBox, position: "relative", marginBottom: 0 }}>
                <span style={styles.searchIcon}>
                  <Puzzle size={13} strokeWidth={2.25} />
                </span>
                <input
                  value={augmentFilterQuery}
                  onChange={(e) => setAugmentFilterQuery(e.target.value)}
                  placeholder={t("build_filter_augments_placeholder")}
                  style={styles.searchInput}
                />
                {augmentSuggestions.length > 0 && (
                  <div className="scrollArea" style={styles.buildFilterDropdown}>
                    {augmentSuggestions.map((o) => (
                      <div
                        key={o.id}
                        className="clickableRow"
                        style={styles.buildFilterOption}
                        onClick={() => toggleAugmentFilter(o)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          toggleAugmentFilter(o);
                        }}
                      >
                        {o.icon && <img src={o.icon} style={styles.buildFilterOptionIcon} />}
                        <span style={styles.buildFilterOptionName}>{o.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ ...styles.compareSlotCol, flex: 1 }}>
              <div style={styles.filterToolbarLabel}>{t("build_filter_items_label")}</div>
              {selectedItemFilters.length > 0 && (
                <div style={styles.buildFilterChipRow}>
                  {selectedItemFilters.map((o) => (
                    <div key={o.id} style={styles.buildFilterChip}>
                      {DRAGON && <img src={`${DRAGON}/img/item/${o.id}.png`} style={styles.buildFilterChipIcon} />}
                      <span>{o.name}</span>
                      <button onClick={() => toggleItemFilter(o)} style={styles.buildFilterClear}>
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ ...styles.searchBox, position: "relative", marginBottom: 0 }}>
                <span style={styles.searchIcon}>
                  <Puzzle size={13} strokeWidth={2.25} />
                </span>
                <input
                  value={itemFilterQuery}
                  onChange={(e) => setItemFilterQuery(e.target.value)}
                  placeholder={t("build_filter_items_placeholder")}
                  style={styles.searchInput}
                />
                {itemSuggestions.length > 0 && (
                  <div className="scrollArea" style={styles.buildFilterDropdown}>
                    {itemSuggestions.map((o) => (
                      <div
                        key={o.id}
                        className="clickableRow"
                        style={styles.buildFilterOption}
                        onClick={() => toggleItemFilter(o)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          toggleItemFilter(o);
                        }}
                      >
                        {DRAGON && <img src={`${DRAGON}/img/item/${o.id}.png`} style={styles.buildFilterOptionIcon} />}
                        <span style={styles.buildFilterOptionName}>{o.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {sortedChampions.length === 0 ? (
          <div style={styles.emptyInline}>{t("no_filtered_champions")}</div>
        ) : (
        <div style={styles.champList}>
          {visibleChampions.map((s) => {
            const isOpen = expanded === s.champion;

            // Valor do critério de ordenação ativo para este campeão — ver
            // SORT_ROW_VALUE. Fica "null" para os critérios que já têm
            // coluna própria (jogos/winrate/Top 3) ou não têm valor (nome).
            const sortValueDef = SORT_ROW_VALUE[sortBy];
            const sortValueRaw = sortValueDef ? sortValueDef.get(s) : null;
            const showSortValue = sortValueDef && sortValueRaw != null;

            return (
              <div key={s.champion} style={styles.champCard}>
                <div
                  className="clickableRow"
                  style={styles.champRow}
                  onClick={() => setExpanded(isOpen ? null : s.champion)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    setExpanded(isOpen ? null : s.champion);
                  }}
                >
                  {DRAGON && (
                    <img
                      src={`${DRAGON}/img/champion/${s.champion}.png`}
                      style={styles.champIcon}
                    />
                  )}

                  <div style={styles.champRowName}>
                    {s.name}
                    <div style={styles.champRowGames}>
                      {s.games} {s.games === 1 ? t("stat_games_singular") : t("stat_games").toLowerCase()}
                    </div>
                  </div>

                  <div style={{ ...styles.champRowStatPrimary, color: "var(--accent-text)" }}>
                    {s.winrate}% ({t("placement_first_short")})
                  </div>

                  <div style={{ ...styles.champRowStat, color: placementColor(3) }}>
                    {s.top3Rate}% (Top 3)
                  </div>

                  {/* Lugares — sempre visíveis, sem precisar de abrir a linha,
                      agora ao lado da winrate/Top 3 em vez de numa linha
                      própria por baixo. Cartões a 0 ficam acinzentados (sem
                      realce de cor); lugar em cima, nº de vezes em baixo. */}
                  <div style={styles.placementMiniRow}>
                    {s.placementBreakdown.map((p) => {
                      const isZero = p.count === 0;
                      return (
                        <div
                          key={p.placement}
                          style={{
                            ...styles.placementMiniCard,
                            border: `1px solid ${isZero ? "rgba(var(--border-rgb),0.25)" : placementBorder(p.placement)}`,
                            background: isZero ? "rgba(var(--panel-deep-rgb),0.4)" : placementBg(p.placement),
                            opacity: isZero ? 0.5 : 1,
                          }}
                        >
                          <div
                            style={{
                              ...styles.placementMiniNum,
                              color: isZero ? "var(--text-muted)" : placementColor(p.placement),
                            }}
                          >
                            {p.placement}º
                          </div>
                          <div
                            style={{
                              ...styles.placementMiniCount,
                              color: isZero ? "var(--text-muted)" : "var(--text-body)",
                            }}
                          >
                            {p.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Preenche o espaço que sobra na linha com o valor exato
                      do critério pelo qual se está a ordenar (dano médio,
                      melhor/pior KDA, mais vitórias, etc.) — antes só dava
                      para ver isto abrindo o campeão. Fica vazio (mas ocupa
                      o espaço, para o KDA/seta não saltarem de posição)
                      quando o critério já tem coluna própria (jogos/winrate/
                      Top 3) ou não tem valor nenhum (nome). */}
                  <div style={styles.champRowSortValue}>
                    {showSortValue && (
                      <>
                        <span style={styles.champRowSortValueLabel}>{activeSortMeta.label}</span>
                        <span style={styles.champRowSortValueNum}>{sortValueDef.format(sortValueRaw)}</span>
                      </>
                    )}
                  </div>

                  <div style={styles.champRowKda}>
                    {kdaLabel(s.avgK, s.avgD, s.avgA)}
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
                      <div style={styles.expandSection}>
                        <div style={styles.expandLabel}>{t("section_averages")}</div>
                        {s.avgDamageDealt != null ||
                        s.avgGold != null ||
                        s.avgHealing != null ||
                        s.avgHp != null ||
                        s.avgDoubles != null ||
                        s.avgTriples != null ? (
                          <div style={styles.statGrid}>
                            {s.avgDamageDealt != null && (
                              <div style={styles.statItem}>
                                <div style={styles.statValue}>{Math.round(s.avgDamageDealt).toLocaleString()}</div>
                                <div style={styles.statLabel}>
                                  {t("stat_damage_dealt")}
                                  <span style={styles.statLabelCount}> · {s.damageDealtCount}{lang === "en" ? "g" : "j"}</span>
                                </div>
                              </div>
                            )}
                            {s.avgDamageTaken != null && (
                              <div style={styles.statItem}>
                                <div style={styles.statValue}>{Math.round(s.avgDamageTaken).toLocaleString()}</div>
                                <div style={styles.statLabel}>
                                  {t("stat_damage_taken")}
                                  <span style={styles.statLabelCount}> · {s.damageTakenCount}{lang === "en" ? "g" : "j"}</span>
                                </div>
                              </div>
                            )}
                            {s.avgGold != null && (
                              <div style={styles.statItem}>
                                <div style={styles.statValue}>{Math.round(s.avgGold).toLocaleString()}</div>
                                <div style={styles.statLabel}>{t("stat_gold")}</div>
                              </div>
                            )}
                            {s.avgHealing != null && (
                              <div style={styles.statItem}>
                                <div style={styles.statValue}>{Math.round(s.avgHealing).toLocaleString()}</div>
                                <div style={styles.statLabel}>
                                  {t("stat_healing")}
                                  <span style={styles.statLabelCount}> · {s.healingCount}{lang === "en" ? "g" : "j"}</span>
                                </div>
                              </div>
                            )}
                            {s.avgHp != null && (
                              <div style={styles.statItem}>
                                <div style={styles.statValue}>{Math.round(s.avgHp).toLocaleString()}</div>
                                <div style={styles.statLabel}>
                                  {t("stat_hp")}
                                  <span style={styles.statLabelCount}> · {s.hpCount}{lang === "en" ? "g" : "j"}</span>
                                </div>
                              </div>
                            )}
                            {s.bestMultikill >= 2 && (
                              <div style={styles.statItem}>
                                <div style={{ ...styles.statValue, color: "var(--accent-text)" }}>
                                  {s.bestMultikill}x
                                </div>
                                <div style={styles.statLabel}>{t("best_multikill")}</div>
                              </div>
                            )}
                            {s.avgDoubles != null && (
                              <div style={styles.statItem}>
                                <div style={styles.statValue}>{s.avgDoubles.toFixed(2)}</div>
                                <div style={styles.statLabel}>
                                  {t("stat_doubles")}
                                  <span style={styles.statLabelCount}> · {s.doubleKillsCount}{lang === "en" ? "g" : "j"}</span>
                                </div>
                              </div>
                            )}
                            {s.avgTriples != null && (
                              <div style={styles.statItem}>
                                <div style={styles.statValue}>{s.avgTriples.toFixed(2)}</div>
                                <div style={styles.statLabel}>
                                  {t("stat_triples")}
                                  <span style={styles.statLabelCount}> · {s.tripleKillsCount}{lang === "en" ? "g" : "j"}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={styles.placeholderText}>{t("no_placement_data_yet")}</div>
                        )}
                      </div>

                      {(s.bestMatchups.length > 0 || s.worstMatchups.length > 0) && (
                        <div style={styles.expandSection}>
                          <div style={styles.expandLabel}>
                            {t("section_matchups")}{" "}
                            <Tooltip label={t("matchups_disclaimer")}>
                              <span style={styles.infoDot}>
                                <Info size={11} strokeWidth={2.25} />
                              </span>
                            </Tooltip>
                          </div>
                          <div style={styles.matchupsGrid}>
                            {s.bestMatchups.length > 0 && (
                              <div>
                                <div style={styles.matchupSubLabel}>{t("matchups_best")}</div>
                                <div style={styles.placementRow}>
                                  {s.bestMatchups.map((o) => (
                                    <Tooltip
                                      key={o.champion}
                                      label={`${champName(o.champion)} · ${o.wins}/${o.games} (${o.winrate}%)`}
                                    >
                                      <div style={{ ...styles.matchupPill, borderColor: "rgba(74,222,128,0.4)" }}>
                                        {DRAGON && (
                                          <img
                                            src={`${DRAGON}/img/champion/${o.champion}.png`}
                                            style={styles.matchupIcon}
                                          />
                                        )}
                                        <span style={{ color: "var(--place-good)" }}>{o.winrate}%</span>
                                      </div>
                                    </Tooltip>
                                  ))}
                                </div>
                              </div>
                            )}
                            {s.worstMatchups.length > 0 && (
                              <div>
                                <div style={styles.matchupSubLabel}>{t("matchups_worst")}</div>
                                <div style={styles.placementRow}>
                                  {s.worstMatchups.map((o) => (
                                    <Tooltip
                                      key={o.champion}
                                      label={`${champName(o.champion)} · ${o.wins}/${o.games} (${o.winrate}%)`}
                                    >
                                      <div style={{ ...styles.matchupPill, borderColor: "rgba(226,85,95,0.4)" }}>
                                        {DRAGON && (
                                          <img
                                            src={`${DRAGON}/img/champion/${o.champion}.png`}
                                            style={styles.matchupIcon}
                                          />
                                        )}
                                        <span style={{ color: "var(--place-low)" }}>{o.winrate}%</span>
                                      </div>
                                    </Tooltip>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {(s.bestGameDamage != null ||
                        s.bestGameHealing != null ||
                        s.bestGameDamageTaken != null ||
                        s.bestGameHp != null ||
                        s.bestGameGold != null ||
                        s.bestGameDoubles != null ||
                        s.bestGameTriples != null) && (
                        <div style={styles.expandSection}>
                          <div style={styles.expandLabel}>{t("section_best_games")}</div>
                          <div style={styles.statGrid}>
                            {s.bestGameDamage != null && (
                              <div style={styles.statItem}>
                                <div style={{ ...styles.statValue, color: "var(--accent-text)" }}>
                                  {Math.round(s.bestGameDamage).toLocaleString()}
                                </div>
                                <div style={styles.statLabel}>{t("spotlight_best_damage_game")}</div>
                              </div>
                            )}
                            {s.bestGameHealing != null && (
                              <div style={styles.statItem}>
                                <div style={{ ...styles.statValue, color: "var(--accent-text)" }}>
                                  {Math.round(s.bestGameHealing).toLocaleString()}
                                </div>
                                <div style={styles.statLabel}>{t("spotlight_best_healing_game")}</div>
                              </div>
                            )}
                            {s.bestGameDamageTaken != null && (
                              <div style={styles.statItem}>
                                <div style={{ ...styles.statValue, color: "var(--accent-text)" }}>
                                  {Math.round(s.bestGameDamageTaken).toLocaleString()}
                                </div>
                                <div style={styles.statLabel}>{t("spotlight_best_damage_taken_game")}</div>
                              </div>
                            )}
                            {s.bestGameHp != null && (
                              <div style={styles.statItem}>
                                <div style={{ ...styles.statValue, color: "var(--accent-text)" }}>
                                  {Math.round(s.bestGameHp).toLocaleString()}
                                </div>
                                <div style={styles.statLabel}>{t("spotlight_best_hp_game")}</div>
                              </div>
                            )}
                            {s.bestGameGold != null && (
                              <div style={styles.statItem}>
                                <div style={{ ...styles.statValue, color: "var(--accent-text)" }}>
                                  {Math.round(s.bestGameGold).toLocaleString()}
                                </div>
                                <div style={styles.statLabel}>{t("spotlight_best_gold_game")}</div>
                              </div>
                            )}
                            {s.bestGameDoubles != null && (
                              <div style={styles.statItem}>
                                <div style={{ ...styles.statValue, color: "var(--accent-text)" }}>
                                  {s.bestGameDoubles}
                                </div>
                                <div style={styles.statLabel}>{t("spotlight_best_doubles_game")}</div>
                              </div>
                            )}
                            {s.bestGameTriples != null && (
                              <div style={styles.statItem}>
                                <div style={{ ...styles.statValue, color: "var(--accent-text)" }}>
                                  {s.bestGameTriples}
                                </div>
                                <div style={styles.statLabel}>{t("spotlight_best_triples_game")}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div style={styles.expandSection}>
                        <div style={styles.expandLabel}>{t("section_recent_placements")}</div>
                        {s.recentPlacements.length ? (
                          <div style={styles.placementRow}>
                            {s.recentPlacements.map((p, idx) => (
                              <Tooltip key={idx} label={new Date(p.created_at).toLocaleDateString()}>
                                <div
                                  style={{
                                    ...styles.placementPill,
                                    background: placementBg(p.placement),
                                    color: placementColor(p.placement),
                                    border: `1px solid ${placementBorder(p.placement)}`,
                                  }}
                                >
                                  {placementText(p.placement)}
                                </div>
                              </Tooltip>
                            ))}
                          </div>
                        ) : (
                          <div style={styles.placeholderText}>{t("no_placement_data_yet")}</div>
                        )}
                      </div>

                      {(s.topWinItems.length > 0 || s.topWinAugments.length > 0) && (
                        <div style={{ ...styles.expandSection, ...styles.winningBuildSection }}>
                          <div style={styles.expandLabel}>
                            🏆 {t("section_winning_build")}
                          </div>
                          {s.topWinItems.length > 0 && (
                            <div style={styles.placementRow}>
                              {s.topWinItems.map((it) => {
                                const itemName = itemsMap?.[it.id] || `Item #${it.id}`;
                                return (
                                  <Tooltip key={it.id} label={`${itemName} · ${it.count}x ${t("in_wins_suffix")}`}>
                                    <div style={{ ...styles.itemPill, ...styles.winningBuildPill }}>
                                      {DRAGON && (
                                        <img
                                          src={`${DRAGON}/img/item/${it.id}.png`}
                                          style={styles.itemPillIcon}
                                        />
                                      )}
                                      <span>{it.count}x</span>
                                    </div>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          )}
                          {s.topWinAugments.length > 0 && (
                            <div style={{ ...styles.placementRow, marginTop: s.topWinItems.length ? 6 : 0 }}>
                              {s.topWinAugments.map((a) => {
                                const info = augmentsMap?.[a.id];
                                const rarityStyle = augmentRarityStyle(info?.rarity);
                                return (
                                  <Tooltip
                                    key={a.id}
                                    label={`${info?.name || `Augment #${a.id}`} · ${a.count}x ${t("in_wins_suffix")}`}
                                  >
                                    <div style={{ ...styles.augmentPill, ...rarityStyle, ...styles.winningBuildPill }}>
                                      {info?.icon && (
                                        <img
                                          src={info.icon}
                                          style={styles.augmentIcon}
                                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                                        />
                                      )}
                                      <span>{info?.name || `Augment #${a.id}`} · {a.count}x</span>
                                    </div>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      <div style={styles.expandSection}>
                        <div style={styles.expandLabel}>{t("section_top_items")}</div>
                        {s.topItems.length ? (
                          <div style={styles.placementRow}>
                            {s.topItems.map((it) => {
                              const itemName = itemsMap?.[it.id] || `Item #${it.id}`;
                              return (
                                <Tooltip key={it.id} label={`${itemName} · ${it.count}x`}>
                                  <div style={styles.itemPill}>
                                    {DRAGON && (
                                      <img
                                        src={`${DRAGON}/img/item/${it.id}.png`}
                                        style={styles.itemPillIcon}
                                      />
                                    )}
                                    <span>{it.count}x</span>
                                  </div>
                                </Tooltip>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={styles.placeholderText}>{t("no_build_yet")}</div>
                        )}
                      </div>

                      <div style={styles.expandSection}>
                        <div style={styles.expandLabel}>{t("section_top_augments")}</div>
                        {s.topAugments.length ? (
                          <div style={styles.placementRow}>
                            {s.topAugments.map((a) => {
                              const info = augmentsMap?.[a.id];
                              const rarityStyle = augmentRarityStyle(info?.rarity);
                              return (
                                <Tooltip
                                  key={a.id}
                                  label={`${info?.name || `Augment #${a.id}`} · ${a.count}x`}
                                >
                                  <div style={{ ...styles.augmentPill, ...rarityStyle }}>
                                    {info?.icon && (
                                      <img
                                        src={info.icon}
                                        style={styles.augmentIcon}
                                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                                      />
                                    )}
                                    <span>{info?.name || `Augment #${a.id}`} · {a.count}x</span>
                                  </div>
                                </Tooltip>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={styles.placeholderText}>{t("no_placement_data_yet")}</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        )}

        {hasMoreChampions && (
          <button
            onClick={() => setVisibleChampCount((c) => c + REPORTS_PAGE_SIZE)}
            style={styles.loadMoreBtn}
          >
            {t("load_more")} ({sortedChampions.length - visibleChampCount})
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
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


  section: {
    background:
      "linear-gradient(180deg, rgba(var(--panel-rgb),0.92), rgba(var(--panel-deep-rgb),0.96))",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-2xl)",
    padding: 16,
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionTitle: { color: "var(--accent-text)" },

  select: {
    padding: "6px 10px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    background: "rgba(var(--panel-deep-rgb),0.8)",
    color: "var(--text-body)",
    fontSize: 12,
  },

  // Busca por nome — antes não havia forma nenhuma de ir direto a um
  // campeão aqui, só ordenar e procurar visualmente na lista toda.
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--accent-rgb),0.25)",
    marginBottom: 10,
  },

  searchIcon: {
    display: "inline-flex",
    flexShrink: 0,
    color: "var(--text-muted)",
  },

  // Cada peça escolhida (augment ou item) vira um chip próprio dentro de
  // buildFilterChipRow — antes era uma única faixa cheia de largura (só
  // cabia uma seleção de cada vez); agora várias cabem lado a lado.
  buildFilterChipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },

  buildFilterChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    borderRadius: "var(--radius-pill)",
    background: "rgba(250,204,21,0.1)",
    border: "1px solid rgba(250,204,21,0.4)",
    fontSize: 11,
    color: "var(--text-body)",
  },

  buildFilterChipIcon: {
    width: 18,
    height: 18,
    borderRadius: "var(--radius-xs)",
  },

  buildFilterClear: {
    marginLeft: "auto",
    width: 20,
    height: 20,
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "rgba(var(--soft-rgb),0.1)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },

  buildFilterDropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    zIndex: 20,
    maxHeight: 220,
    overflowY: "auto",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.98)",
    border: "1px solid rgba(var(--accent-rgb),0.3)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  },

  buildFilterOption: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: 12,
    color: "var(--text-body)",
    borderBottom: "1px solid rgba(var(--border-rgb),0.25)",
  },

  buildFilterOptionIcon: {
    width: 18,
    height: 18,
    borderRadius: "var(--radius-xs)",
    flexShrink: 0,
  },

  buildFilterOptionName: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  // Realce de navegação por teclado (setas) nas sugestões de campeão — mesma
  // lógica do Histórico (ver searchOptionActive em MatchHistory.jsx).
  searchOptionActive: {
    background: "rgba(var(--accent-rgb),0.2)",
  },

  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--text-body)",
    fontSize: 13,
  },

  emptyInline: {
    padding: "16px 0",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: 12,
  },

  // Painel único para todos os filtros/ordenação (busca, build, sort) — em
  // vez de campos soltos empilhados, ficam agrupados dentro do mesmo cartão
  // com fundo próprio, para ler-se de imediato como "isto tudo é filtro".
  filterToolbar: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 12,
    borderRadius: "var(--radius-xl)",
    background: "rgba(var(--panel-deep-rgb),0.4)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
    marginBottom: 14,
  },

  filterToolbarRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  filterToolbarLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "var(--text-muted)",
  },

  // Ordenação — antes ~20 chips (um por critério, espelhando os cartões de
  // destaque da Visão Geral) que tornavam este painel enorme; um único
  // <select> ocupa a mesma linha da busca de campeão, sem quebrar.
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

  champList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  // Mesma lógica/estilo do botão "Carregar mais" do Histórico (ver
  // loadMoreBtn em MatchHistory.jsx).
  loadMoreBtn: {
    alignSelf: "center",
    marginTop: 8,
    padding: "8px 20px",
    borderRadius: "var(--radius-pill)",
    border: "1px solid rgba(var(--accent-rgb),0.35)",
    background: "rgba(var(--accent-rgb),0.1)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },

  // Mesma paleta do cartão de partida no Histórico (ver matchCard em
  // MatchHistory.jsx) — antes usava um preto fixo (rgba(0,0,0,0.25)), que
  // no tema claro ficava com um tom escuro estranho em vez de acompanhar o
  // resto do painel.
  champCard: {
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--border-rgb),0.25)",
    overflow: "hidden",
  },

  // Fundo com um tom claro da cor de destaque — distingue visualmente a
  // fileira clicável (que abre/fecha os detalhes) do resto do cartão. Os
  // lugares (sempre visíveis, logo abaixo) e os detalhes (expandWrap, só
  // quando aberto) ficam sem este fundo, precisamente para se notar a
  // diferença entre a parte clicável e a que não é.
  champRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 12px",
    cursor: "pointer",
    background: "rgba(var(--accent-rgb),0.16)",
  },

  champIcon: {
    width: 28,
    height: 28,
    borderRadius: "var(--radius-md)",
    pointerEvents: "none",
  },

  champRowName: {
    width: 115,
    fontSize: 12,
    color: "var(--text-body)",
    fontWeight: 600,
  },

  champRowGames: {
    fontSize: 9,
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginTop: 1,
  },

  champRowStat: {
    width: 95,
    fontSize: 11,
    color: "var(--text-secondary)",
    textAlign: "center",
  },

  // Winrate é a métrica mais importante da linha ("como me saio com este
  // campeão?") mas antes tinha o mesmo peso visual que Top 3/KDA — só a cor
  // (accent) a distinguia. Maior e mais pesada para saltar à vista primeiro.
  champRowStatPrimary: {
    width: 95,
    fontSize: 13,
    fontWeight: 800,
    textAlign: "center",
  },

  // 8 cartões fixos (1º-8º), sempre pela mesma ordem, mesmo quando a
  // contagem é 0 — ao lado da winrate/Top 3 na mesma linha, em vez de numa
  // linha própria por baixo, e bem mais pequenos: lugar em cima, nº de vezes
  // em baixo.
  placementMiniRow: {
    display: "flex",
    gap: 3,
    flexShrink: 0,
  },

  placementMiniCard: {
    width: 19,
    borderRadius: 5,
    padding: "2px 0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },

  placementMiniNum: {
    fontSize: 8.5,
    fontWeight: 800,
    lineHeight: 1.2,
  },

  placementMiniCount: {
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.2,
  },

  // Deixou de ter "flex:1" — esse papel (ocupar o espaço livre da linha)
  // passou para champRowSortValue, mais à esquerda, para não ficar tudo
  // encostado ao KDA/seta do lado direito.
  champRowKda: {
    width: 90,
    flexShrink: 0,
    fontSize: 11,
    color: "var(--text-body)",
    textAlign: "right",
  },

  // Espaço antes reservado (e vazio) para o KDA médio esticar — agora mostra
  // o valor do critério de ordenação ativo (ver SORT_ROW_VALUE), para se ver
  // logo, sem abrir o campeão, o número exato pelo qual a lista está
  // ordenada. Continua sempre presente (mesmo vazio) para o KDA e a seta não
  // saltarem de posição consoante o critério.
  champRowSortValue: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    overflow: "hidden",
  },

  champRowSortValueLabel: {
    fontSize: 11,
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
  },

  champRowSortValueNum: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--accent-text)",
    whiteSpace: "nowrap",
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
    padding: "0 12px 12px 50px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  expandSection: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  // Destaque visual próprio (fundo/borda dourados) para separar a "build
  // vencedora" (só partidas ganhas) do resto, que mistura vitórias e
  // derrotas — é uma recomendação, não só mais uma estatística.
  winningBuildSection: {
    padding: 8,
    borderRadius: "var(--radius-lg)",
    background: "rgba(250,204,21,0.08)",
    border: "1px solid rgba(250,204,21,0.3)",
  },

  winningBuildPill: {
    border: "1px solid rgba(250,204,21,0.35)",
  },

  expandLabel: {
    fontSize: 11,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  infoDot: {
    display: "inline-flex",
    verticalAlign: "middle",
    textTransform: "none",
    letterSpacing: 0,
    cursor: "help",
    opacity: 0.7,
  },

  matchupsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  matchupSubLabel: {
    fontSize: 10,
    color: "var(--text-muted)",
    marginBottom: 4,
  },

  matchupPill: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "3px 7px 3px 3px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    fontSize: 11,
    fontWeight: 700,
  },

  matchupIcon: {
    width: 18,
    height: 18,
    borderRadius: "var(--radius-xs)",
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

  // Nº de partidas por trás da média mostrada — em "todos os formatos" o
  // valor é a melhor média entre 2v2/3v3 (ver formatStats.js), não uma média
  // cega dos dois juntos, por isso vale a pena deixar claro a que amostra
  // (de que formato) esse número se refere.
  statLabelCount: {
    color: "var(--text-muted)",
    fontWeight: 500,
  },

  placementRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },

  placementPill: {
    padding: "3px 8px",
    borderRadius: "var(--radius-sm)",
    fontSize: 11,
    fontWeight: 700,
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

  itemPill: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "3px 7px 3px 3px",
    borderRadius: "var(--radius-sm)",
    background: "rgba(var(--accent-rgb),0.12)",
    border: "1px solid rgba(var(--accent-rgb),0.25)",
    color: "var(--accent-text)",
    fontSize: 11,
  },

  itemPillIcon: {
    width: 22,
    height: 22,
    borderRadius: "var(--radius-xs)",
  },

  placeholderText: {
    fontSize: 12,
    color: "var(--text-muted)",
    fontStyle: "italic",
  },

  compareToggleBtn: {
    padding: "6px 12px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--accent-rgb),0.35)",
    background: "rgba(var(--accent-rgb),0.08)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 12,
  },

  compareWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  comparePickerRow: {
    display: "flex",
    gap: 10,
  },

  // Antes as duas caixas de comparação só se distinguiam pelo campeão já
  // escolhido lá dentro — sem nada escolhido eram indistinguíveis (mesmo
  // placeholder nas duas). Esta etiqueta por cima (reaproveita
  // filterToolbarLabel) resolve isso.
  compareSlotCol: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: 1,
  },

  compareSlotIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    flexShrink: 0,
  },

  compareTable: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  compareRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 10,
    padding: "8px 4px",
    borderBottom: "1px solid rgba(var(--border-rgb),0.25)",
  },

  compareValue: {
    fontSize: 14,
  },

  compareLabel: {
    fontSize: 10.5,
    color: "var(--text-secondary)",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
};
