// Lógica dos cartões da Visão Geral (resumo de carreira + destaques por
// campeão) extraída de Overview.jsx para ser partilhada com a tab Comparar —
// os dois lados usam sempre os mesmos números/critérios, nunca duas versões
// que podem divergir (mesma razão de achievementStats.js e formatStats.js).
import { placementColor, top3Rate as calcTop3Rate, isLastPlace } from "./placement";
import { normalizeChampionId } from "./champions";
import { buildFormatBuckets, bestFormatAvg, bestFormatKda } from "./formatStats";

function avgOf(sum, count) {
  return count ? sum / count : null;
}

// Duração em segundos -> "m:ss", para os destaques de vitória mais rápida e
// partida mais longa (mesma lógica usada no Histórico).
export function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Resumo rápido de carreira (cartão de destaque no topo da Visão Geral):
// progresso do roster, jogos totais, taxas de Top 1/Top 3, sequência atual
// e melhor sequência de vitórias de sempre.
export function computeCareerSummary(matches, wins, champions) {
  const totalGames = matches.length;
  const totalWins = matches.filter((m) => m.win).length;
  const top1RatePct = totalGames ? Math.round((totalWins / totalGames) * 100) : 0;
  const top3RatePct = calcTop3Rate(matches);
  const coverage = champions.length ? Math.round((wins.length / champions.length) * 100) : 0;

  // matches vem sempre ordenado do mais recente para o mais antigo (ver
  // db/api.js), por isso o streak atual é só percorrer a partir do início
  // até a sequência quebrar.
  let streakCurrent = 0;
  let streakCurrentType = null;
  for (const m of matches) {
    const isWin = !!m.win;
    if (streakCurrent === 0) {
      streakCurrent = 1;
      streakCurrentType = isWin ? "win" : "loss";
    } else if ((streakCurrentType === "win") === isWin) {
      streakCurrent += 1;
    } else {
      break;
    }
  }

  let streakBestWin = 0;
  let run = 0;
  matches.forEach((m) => {
    if (m.win) {
      run += 1;
      streakBestWin = Math.max(streakBestWin, run);
    } else {
      run = 0;
    }
  });

  return { totalGames, totalWins, top1RatePct, top3RatePct, coverage, streakCurrent, streakCurrentType, streakBestWin };
}

// Destaques por campeão (secção "Destaques" da Visão Geral), agrupados por
// tema. Cada item existe SEMPRE (mesmo sem dados suficientes — nesse caso
// "champion"/"value" ficam null) para a tab Comparar conseguir emparelhar o
// mesmo "id" dos dois lados mesmo que só um deles tenha esse recorde; quem
// só quer os já preenchidos (Overview.jsx) filtra por "value != null" no
// próprio render.
export function computeSpotlightGroups(matches, champions, t) {
  const perChampion = (() => {
    const map = {};

    matches.forEach((rawMatch) => {
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
          placementSum: 0,
          placementCount: 0,
          damageDealtSum: 0,
          damageDealtCount: 0,
          damageTakenSum: 0,
          damageTakenCount: 0,
          healingSum: 0,
          healingCount: 0,
          hpSum: 0,
          hpCount: 0,
        };
      }
      const s = map[m.champion];
      s.games += 1;
      if (m.win) s.wins += 1;
      s.k += m.kills || 0;
      s.d += m.deaths || 0;
      s.a += m.assists || 0;

      if (m.placement) {
        if (m.placement <= 3) s.top3 += 1;
        else s.belowTop3 += 1;
        s.placementSum += m.placement;
        s.placementCount += 1;
      }
      if (isLastPlace(m)) s.lastPlace += 1;

      if (m.damage_dealt != null) {
        s.damageDealtSum += m.damage_dealt;
        s.damageDealtCount += 1;
      }
      if (m.damage_taken != null) {
        s.damageTakenSum += m.damage_taken;
        s.damageTakenCount += 1;
      }
      if (m.healing != null) {
        s.healingSum += m.healing;
        s.healingCount += 1;
      }
      if (m.max_hp != null) {
        s.hpSum += m.max_hp;
        s.hpCount += 1;
      }
    });

    return Object.values(map).map((s) => ({
      ...s,
      kda: (s.k + s.a) / Math.max(s.d, 1),
      avgDamageDealt: avgOf(s.damageDealtSum, s.damageDealtCount),
      avgDamageTaken: avgOf(s.damageTakenSum, s.damageTakenCount),
      avgHealing: avgOf(s.healingSum, s.healingCount),
      avgHp: avgOf(s.hpSum, s.hpCount),
      avgPlacement: avgOf(s.placementSum, s.placementCount),
    }));
  })();

  const perChampionByFormat = buildFormatBuckets(matches, champions);

  const topChampion = [...perChampion].sort((a, b) => b.wins - a.wins)[0];
  const mostGamesChampion = [...perChampion].sort((a, b) => b.games - a.games)[0];

  const bestKdaChampion = (() => {
    let top = null;
    perChampion.forEach((c) => {
      const r = bestFormatKda(perChampionByFormat[c.champion], 2, "max");
      if (r && (!top || r.kda > top.kda)) top = { champion: c.champion, kda: r.kda, games: r.games };
    });
    return top;
  })();

  const worstKdaChampion = (() => {
    let bottom = null;
    perChampion.forEach((c) => {
      const r = bestFormatKda(perChampionByFormat[c.champion], 2, "min");
      if (r && (!bottom || r.kda < bottom.kda)) bottom = { champion: c.champion, kda: r.kda, games: r.games };
    });
    return bottom;
  })();

  const mostTop3Champion = [...perChampion].filter((c) => c.top3 > 0).sort((a, b) => b.top3 - a.top3)[0];
  const mostBelowTop3Champion = [...perChampion].filter((c) => c.belowTop3 > 0).sort((a, b) => b.belowTop3 - a.belowTop3)[0];
  const mostLastPlaceChampion = [...perChampion].filter((c) => c.lastPlace > 0).sort((a, b) => b.lastPlace - a.lastPlace)[0];

  // Melhor/pior lugar médio por campeão — mínimo de 2 partidas com lugar
  // registado, tal como as outras médias (uma partida só era só sorte/azar
  // de amostra). "Melhor" = média mais BAIXA (1º é o melhor lugar).
  const placementQualified = perChampion.filter((c) => c.placementCount >= 2);
  const bestAvgPlacementChampion = [...placementQualified].sort((a, b) => a.avgPlacement - b.avgPlacement)[0];
  const worstAvgPlacementChampion = [...placementQualified].sort((a, b) => b.avgPlacement - a.avgPlacement)[0];

  function bestAvg(sumKey, countKey) {
    let top = null;
    perChampion.forEach((c) => {
      const r = bestFormatAvg(perChampionByFormat[c.champion], sumKey, countKey);
      if (r && (!top || r.avg > top.avg)) top = { champion: c.champion, avg: r.avg, count: r.count };
    });
    return top;
  }

  const highestAvgDamageChampion = bestAvg("damageDealtSum", "damageDealtCount");
  const highestAvgHealingChampion = bestAvg("healingSum", "healingCount");
  const highestAvgDamageTakenChampion = bestAvg("damageTakenSum", "damageTakenCount");
  const highestAvgHpChampion = bestAvg("hpSum", "hpCount");
  const highestAvgGoldChampion = bestAvg("goldSum", "goldCount");
  const highestAvgDoublesChampion = bestAvg("doubleKillsSum", "doubleKillsCount");
  const highestAvgTriplesChampion = bestAvg("tripleKillsSum", "tripleKillsCount");

  const bestSingleGameDamage = [...matches].filter((m) => m.damage_dealt != null).sort((a, b) => b.damage_dealt - a.damage_dealt)[0];
  const bestSingleGameHealing = [...matches].filter((m) => m.healing != null).sort((a, b) => b.healing - a.healing)[0];
  const bestSingleGameDamageTaken = [...matches].filter((m) => m.damage_taken != null).sort((a, b) => b.damage_taken - a.damage_taken)[0];
  const bestSingleGameHp = [...matches].filter((m) => m.max_hp != null).sort((a, b) => b.max_hp - a.max_hp)[0];
  const bestSingleGameGold = [...matches].filter((m) => m.gold_earned != null).sort((a, b) => b.gold_earned - a.gold_earned)[0];

  const fastestWin = [...matches].filter((m) => m.win && m.game_duration != null).sort((a, b) => a.game_duration - b.game_duration)[0];
  const longestGame = [...matches].filter((m) => m.game_duration != null).sort((a, b) => b.game_duration - a.game_duration)[0];
  const mostKillsGame = [...matches].filter((m) => (m.kills || 0) > 0).sort((a, b) => b.kills - a.kills)[0];
  const mostDeathsGame = [...matches].filter((m) => (m.deaths || 0) > 0).sort((a, b) => b.deaths - a.deaths)[0];
  const mostAssistsGame = [...matches].filter((m) => (m.assists || 0) > 0).sort((a, b) => b.assists - a.assists)[0];
  const bestSingleGameDoubles = [...matches].filter((m) => (m.double_kills || 0) > 0).sort((a, b) => b.double_kills - a.double_kills)[0];
  const bestSingleGameTriples = [...matches].filter((m) => (m.triple_kills || 0) > 0).sort((a, b) => b.triple_kills - a.triple_kills)[0];

  const spotlightsWinsPlacements = [
    {
      id: "most_wins",
      label: t("spotlight_most_first"),
      champion: topChampion?.champion ?? null,
      value: topChampion ? `${topChampion.wins}` : null,
      color: "var(--place-good)",
      sortKey: "most_wins",
    },
    {
      id: "most_top3",
      label: t("spotlight_most_top3"),
      champion: mostTop3Champion?.champion ?? null,
      value: mostTop3Champion ? `${mostTop3Champion.top3}` : null,
      color: placementColor(3),
      sortKey: "most_top3_count",
    },
    {
      id: "most_games",
      label: t("spotlight_most_games"),
      champion: mostGamesChampion?.champion ?? null,
      value: mostGamesChampion ? `${mostGamesChampion.games}` : null,
      color: "var(--text-secondary)",
      sortKey: "games_desc",
    },
    {
      id: "most_below_top3",
      label: t("spotlight_most_below_top3"),
      champion: mostBelowTop3Champion?.champion ?? null,
      value: mostBelowTop3Champion ? `${mostBelowTop3Champion.belowTop3}` : null,
      color: placementColor(7),
      sortKey: "most_below_top3",
    },
    {
      id: "most_last_place",
      label: t("spotlight_most_last"),
      champion: mostLastPlaceChampion?.champion ?? null,
      value: mostLastPlaceChampion ? `${mostLastPlaceChampion.lastPlace}` : null,
      color: "var(--place-low)",
      sortKey: "most_last",
    },
    {
      id: "best_avg_placement",
      label: t("spotlight_best_avg_placement"),
      champion: bestAvgPlacementChampion?.champion ?? null,
      value: bestAvgPlacementChampion ? `${bestAvgPlacementChampion.avgPlacement.toFixed(1)}º` : null,
      color: "var(--place-good)",
      sampleCount: bestAvgPlacementChampion?.placementCount,
      sortKey: "best_avg_placement",
    },
    {
      id: "worst_avg_placement",
      label: t("spotlight_worst_avg_placement"),
      champion: worstAvgPlacementChampion?.champion ?? null,
      value: worstAvgPlacementChampion ? `${worstAvgPlacementChampion.avgPlacement.toFixed(1)}º` : null,
      color: "var(--place-low)",
      sampleCount: worstAvgPlacementChampion?.placementCount,
      sortKey: "worst_avg_placement",
    },
    {
      id: "fastest_win",
      label: t("spotlight_fastest_win"),
      champion: fastestWin ? normalizeChampionId(fastestWin.champion, champions) : null,
      value: fastestWin ? formatDuration(fastestWin.game_duration) : null,
      color: "var(--place-good)",
      sortKey: "games_desc",
    },
    {
      id: "longest_game",
      label: t("spotlight_longest_game"),
      champion: longestGame ? normalizeChampionId(longestGame.champion, champions) : null,
      value: longestGame ? formatDuration(longestGame.game_duration) : null,
      color: "var(--text-secondary)",
      sortKey: "games_desc",
    },
  ];

  const spotlightsCombatKda = [
    {
      id: "best_kda",
      label: t("spotlight_best_kda"),
      champion: bestKdaChampion?.champion ?? null,
      value: bestKdaChampion ? bestKdaChampion.kda.toFixed(1) : null,
      color: "var(--accent-text)",
      sampleCount: bestKdaChampion?.games,
      sortKey: "kda_desc",
    },
    {
      id: "worst_kda",
      label: t("spotlight_worst_kda"),
      champion: worstKdaChampion?.champion ?? null,
      value: worstKdaChampion ? worstKdaChampion.kda.toFixed(1) : null,
      color: "var(--place-low)",
      sampleCount: worstKdaChampion?.games,
      sortKey: "worst_kda",
    },
    {
      id: "most_kills_game",
      label: t("spotlight_most_kills_game"),
      champion: mostKillsGame ? normalizeChampionId(mostKillsGame.champion, champions) : null,
      value: mostKillsGame ? `${mostKillsGame.kills}` : null,
      color: "var(--accent-text)",
      sortKey: "games_desc",
    },
    {
      id: "most_deaths_game",
      label: t("spotlight_most_deaths_game"),
      champion: mostDeathsGame ? normalizeChampionId(mostDeathsGame.champion, champions) : null,
      value: mostDeathsGame ? `${mostDeathsGame.deaths}` : null,
      color: "var(--place-low)",
      sortKey: "games_desc",
    },
    {
      id: "most_assists_game",
      label: t("spotlight_most_assists_game"),
      champion: mostAssistsGame ? normalizeChampionId(mostAssistsGame.champion, champions) : null,
      value: mostAssistsGame ? `${mostAssistsGame.assists}` : null,
      color: "var(--accent-text)",
      sortKey: "games_desc",
    },
  ];

  const spotlightsMultikills = [
    {
      id: "avg_doubles",
      label: t("spotlight_highest_doubles"),
      champion: highestAvgDoublesChampion?.champion ?? null,
      value: highestAvgDoublesChampion ? highestAvgDoublesChampion.avg.toFixed(2) : null,
      color: "var(--text-secondary)",
      sampleCount: highestAvgDoublesChampion?.count,
      sortKey: "highest_doubles",
    },
    {
      id: "best_doubles_game",
      label: t("spotlight_best_doubles_game"),
      champion: bestSingleGameDoubles ? normalizeChampionId(bestSingleGameDoubles.champion, champions) : null,
      value: bestSingleGameDoubles ? `${bestSingleGameDoubles.double_kills}` : null,
      color: "var(--accent-text)",
      sortKey: "best_doubles_game",
    },
    {
      id: "avg_triples",
      label: t("spotlight_highest_triples"),
      champion: highestAvgTriplesChampion?.champion ?? null,
      value: highestAvgTriplesChampion ? highestAvgTriplesChampion.avg.toFixed(2) : null,
      color: "var(--text-secondary)",
      sampleCount: highestAvgTriplesChampion?.count,
      sortKey: "highest_triples",
    },
    {
      id: "best_triples_game",
      label: t("spotlight_best_triples_game"),
      champion: bestSingleGameTriples ? normalizeChampionId(bestSingleGameTriples.champion, champions) : null,
      value: bestSingleGameTriples ? `${bestSingleGameTriples.triple_kills}` : null,
      color: "var(--accent-text)",
      sortKey: "best_triples_game",
    },
  ];

  const spotlightsEconomy = [
    {
      id: "avg_gold",
      label: t("spotlight_highest_gold"),
      champion: highestAvgGoldChampion?.champion ?? null,
      value: highestAvgGoldChampion ? Math.round(highestAvgGoldChampion.avg).toLocaleString() : null,
      color: "var(--text-secondary)",
      sampleCount: highestAvgGoldChampion?.count,
      sortKey: "highest_gold",
    },
    {
      id: "best_gold_game",
      label: t("spotlight_best_gold_game"),
      champion: bestSingleGameGold ? normalizeChampionId(bestSingleGameGold.champion, champions) : null,
      value: bestSingleGameGold ? Math.round(bestSingleGameGold.gold_earned).toLocaleString() : null,
      color: "var(--accent-text)",
      sortKey: "best_gold_game",
    },
  ];

  const spotlightsSurvivalDamage = [
    {
      id: "avg_damage",
      label: t("spotlight_highest_damage"),
      champion: highestAvgDamageChampion?.champion ?? null,
      value: highestAvgDamageChampion ? Math.round(highestAvgDamageChampion.avg).toLocaleString() : null,
      color: "var(--text-secondary)",
      sampleCount: highestAvgDamageChampion?.count,
      sortKey: "highest_damage",
    },
    {
      id: "best_damage_game",
      label: t("spotlight_best_damage_game"),
      champion: bestSingleGameDamage ? normalizeChampionId(bestSingleGameDamage.champion, champions) : null,
      value: bestSingleGameDamage ? Math.round(bestSingleGameDamage.damage_dealt).toLocaleString() : null,
      color: "var(--accent-text)",
      sortKey: "best_damage_game",
    },
    {
      id: "avg_damage_taken",
      label: t("spotlight_highest_damage_taken"),
      champion: highestAvgDamageTakenChampion?.champion ?? null,
      value: highestAvgDamageTakenChampion ? Math.round(highestAvgDamageTakenChampion.avg).toLocaleString() : null,
      color: "var(--text-secondary)",
      sampleCount: highestAvgDamageTakenChampion?.count,
      sortKey: "highest_damage_taken",
    },
    {
      id: "best_damage_taken_game",
      label: t("spotlight_best_damage_taken_game"),
      champion: bestSingleGameDamageTaken ? normalizeChampionId(bestSingleGameDamageTaken.champion, champions) : null,
      value: bestSingleGameDamageTaken ? Math.round(bestSingleGameDamageTaken.damage_taken).toLocaleString() : null,
      color: "var(--accent-text)",
      sortKey: "best_damage_taken_game",
    },
    {
      id: "avg_healing",
      label: t("spotlight_highest_healing"),
      champion: highestAvgHealingChampion?.champion ?? null,
      value: highestAvgHealingChampion ? Math.round(highestAvgHealingChampion.avg).toLocaleString() : null,
      color: "var(--text-secondary)",
      sampleCount: highestAvgHealingChampion?.count,
      sortKey: "highest_healing",
    },
    {
      id: "best_healing_game",
      label: t("spotlight_best_healing_game"),
      champion: bestSingleGameHealing ? normalizeChampionId(bestSingleGameHealing.champion, champions) : null,
      value: bestSingleGameHealing ? Math.round(bestSingleGameHealing.healing).toLocaleString() : null,
      color: "var(--accent-text)",
      sortKey: "best_healing_game",
    },
    {
      id: "avg_hp",
      label: t("spotlight_highest_hp"),
      champion: highestAvgHpChampion?.champion ?? null,
      value: highestAvgHpChampion ? Math.round(highestAvgHpChampion.avg).toLocaleString() : null,
      color: "var(--text-secondary)",
      sampleCount: highestAvgHpChampion?.count,
      sortKey: "highest_hp",
    },
    {
      id: "best_hp_game",
      label: t("spotlight_best_hp_game"),
      champion: bestSingleGameHp ? normalizeChampionId(bestSingleGameHp.champion, champions) : null,
      value: bestSingleGameHp ? Math.round(bestSingleGameHp.max_hp).toLocaleString() : null,
      color: "var(--accent-text)",
      sortKey: "best_hp_game",
    },
  ];

  return [
    { key: "wins", title: t("overview_highlights_wins"), icon: "🏆", items: spotlightsWinsPlacements },
    { key: "combat", title: t("overview_highlights_combat"), icon: "⚔️", items: spotlightsCombatKda },
    { key: "multikill", title: t("overview_highlights_multikill"), icon: "🗡️", items: spotlightsMultikills },
    { key: "economy", title: t("overview_highlights_economy"), icon: "💰", items: spotlightsEconomy },
    { key: "survival", title: t("overview_highlights_survival"), icon: "🛡️", items: spotlightsSurvivalDamage },
  ];
}
