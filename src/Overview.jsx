import { useMemo } from "react";
import { motion } from "framer-motion";
import { placementColor, placementText, isLastPlace, top3Rate as calcTop3Rate } from "./placement";
import { normalizeChampionId } from "./champions";
import { buildFormatBuckets, bestFormatAvg, bestFormatKda } from "./formatStats";
import { useLanguage } from "./i18n";
import Tooltip from "./Tooltip";

function avgOf(sum, count) {
  return count ? sum / count : null;
}

// Fundo translúcido por trás dos números com resultado no resumo de topo —
// mesma ideia do StatsBar (ver chipStyle lá), para o "0%"/streaks também
// terem presença própria em vez de só texto colorido sobre fundo neutro.
function heroChipStyle(color) {
  return {
    padding: "4px 10px",
    borderRadius: 9,
    background: `color-mix(in srgb, ${color} 14%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
  };
}

// Duração em segundos -> "m:ss", para os destaques de vitória mais rápida e
// partida mais longa (mesma lógica usada no Histórico, ver MatchHistory.jsx).
function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const HEATMAP_WEEKS = 18;

function dayKey(date) {
  // Chave local (não UTC) para não desalinhar o dia por causa do fuso —
  // toISOString() converte para UTC primeiro, o que podia empurrar uma
  // partida jogada à noite para o dia seguinte/anterior no grid.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Gap máximo entre o fim de uma partida e o início da seguinte para as
// contar como a mesma "sessão" (sentada a jogar) — a Arena não dá o horário
// de início, só o de fim, por isso isto é sempre uma aproximação baseada
// nos "created_at" de partidas seguidas.
const SESSION_GAP_MINUTES = 90;

// Agrupa partidas (já ordenadas da mais recente para a mais antiga, ver
// db/api.js) em sessões: sempre que o intervalo até à partida anterior no
// grupo ultrapassa SESSION_GAP_MINUTES, começa uma sessão nova.
function buildSessions(matches) {
  const withDate = matches.filter((m) => m.created_at);
  if (!withDate.length) return [];

  const sessions = [];
  let current = null;

  withDate.forEach((m) => {
    const time = new Date(m.created_at).getTime();
    if (current) {
      const lastTime = new Date(current.matches[current.matches.length - 1].created_at).getTime();
      const gapMs = lastTime - time;
      if (gapMs > SESSION_GAP_MINUTES * 60000) {
        sessions.push(current);
        current = null;
      }
    }
    if (!current) current = { matches: [] };
    current.matches.push(m);
  });
  if (current) sessions.push(current);

  return sessions.map((s) => {
    const ms = s.matches;
    const newest = new Date(ms[0].created_at);
    const oldest = new Date(ms[ms.length - 1].created_at);

    // O que interessa aqui é o LUGAR em que se ficou, não só vitória/derrota
    // — só cai de volta para vitória/derrota nas partidas antigas (só Live
    // Client Data) que não têm lugar exato nenhum.
    const withPlacement = ms.filter((m) => m.placement != null);
    const avgPlacement = withPlacement.length
      ? withPlacement.reduce((sum, m) => sum + m.placement, 0) / withPlacement.length
      : null;
    const bestPlacement = withPlacement.length
      ? Math.min(...withPlacement.map((m) => m.placement))
      : null;
    const top3Count = withPlacement.filter((m) => m.placement <= 3).length;
    const wins = ms.filter((m) => m.win).length;

    let bestTop3Streak = 0;
    let run = 0;
    ms.forEach((m) => {
      const isTop3 = m.placement != null ? m.placement <= 3 : m.win;
      if (isTop3) {
        run += 1;
        bestTop3Streak = Math.max(bestTop3Streak, run);
      } else {
        run = 0;
      }
    });

    return {
      games: ms.length,
      withPlacementCount: withPlacement.length,
      avgPlacement,
      bestPlacement,
      top3Count,
      wins,
      bestTop3Streak,
      start: oldest,
      end: newest,
      durationMin: Math.max(1, Math.round((newest - oldest) / 60000)),
    };
  });
}

function heatColor(games) {
  if (!games) return "rgba(var(--soft-rgb),0.08)";
  if (games === 1) return "rgba(var(--accent-rgb),0.35)";
  if (games <= 3) return "rgba(var(--accent-rgb),0.6)";
  return "rgba(var(--accent-rgb),0.9)";
}

// Grid ao estilo GitHub contributions: semanas como colunas (domingo a
// sábado em cada coluna), terminando sempre no sábado da semana atual para o
// grid ficar sempre alinhado, mesmo quando a última partida foi há dias.
function buildHeatmapWeeks(dayMap, weeksCount) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const totalDays = weeksCount * 7;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - totalDays + 1);

  const weeks = [];
  const cursor = new Date(startDate);
  for (let w = 0; w < weeksCount; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const key = dayKey(cursor);
      const entry = dayMap[key];
      days.push({
        date: new Date(cursor),
        key,
        games: entry?.games || 0,
        wins: entry?.wins || 0,
        future: cursor > today,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);
  }
  return weeks;
}

export default function Overview({ matches, wins, champions, DRAGON, onOpenChampionStats }) {
  const { t, lang } = useLanguage();
  const champName = (id) => champions.find((c) => c.id === id)?.name || id;

  const recentForm = useMemo(() => matches.slice(0, 8), [matches]);

  // matches vem sempre ordenado do mais recente para o mais antigo (ver
  // db/api.js: .order("created_at", { ascending: false })), por isso o
  // streak atual é só percorrer a partir do início até a sequência quebrar.
  // O melhor streak (de vitórias) é o maior conjunto de vitórias seguidas em
  // toda a história — a direção da varrida não importa para isso, só a
  // sequência entre partidas adjacentes.
  const streaks = useMemo(() => {
    if (!matches.length) return { current: 0, currentType: null, bestWin: 0 };

    let current = 0;
    let currentType = null;
    for (const m of matches) {
      const isWin = !!m.win;
      if (current === 0) {
        current = 1;
        currentType = isWin ? "win" : "loss";
      } else if ((currentType === "win") === isWin) {
        current += 1;
      } else {
        break;
      }
    }

    let bestWin = 0;
    let run = 0;
    matches.forEach((m) => {
      if (m.win) {
        run += 1;
        bestWin = Math.max(bestWin, run);
      } else {
        run = 0;
      }
    });

    return { current, currentType, bestWin };
  }, [matches]);

  // Jogadores premade — para cada colega de equipa com quem já se jogou
  // (a Arena já teve formato de 2v2, e agora é 3v3, por isso um lugar final
  // pode ter mais do que um colega), quantas partidas, vitórias e top3
  // saíram juntos. "participants" já traz todos os jogadores da partida (ver
  // extractAllParticipants em electron.js); os colegas de equipa são quem
  // partilha o mesmo lugar final e não é o próprio jogador. Nota: não há
  // forma de distinguir com certeza um parceiro premade de alguém
  // emparelhado por matchmaking — isto assume premade sempre que se repete
  // o mesmo colega em várias partidas.
  const duoSynergy = useMemo(() => {
    const map = {};
    matches.forEach((m) => {
      if (!m.participants?.length || m.placement == null) return;
      const teammates = m.participants.filter((p) => !p.isSelf && p.placement === m.placement);
      if (!teammates.length) return;

      teammates.forEach((teammate) => {
        const key = teammate.name || (lang === "en" ? "Unknown partner" : "Parceiro desconhecido");
        if (!map[key]) map[key] = { name: key, games: 0, wins: 0, top3: 0 };
        map[key].games += 1;
        if (m.win) map[key].wins += 1;
        if (m.placement <= 3) map[key].top3 += 1;
      });
    });

    return Object.values(map)
      .filter((d) => d.games >= 2)
      .map((d) => ({
        ...d,
        // Métrica principal por Top 3 (chegar ao pódio já conta como bom
        // resultado na Arena); o 1º lugar (vitória "a sério") fica à parte.
        top3Rate: Math.round((d.top3 / d.games) * 100),
        top1Rate: Math.round((d.wins / d.games) * 100),
      }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 6);
  }, [matches, lang]);

  // Só sessões com pelo menos 2 partidas (uma partida sozinha não é bem uma
  // "sessão") e só as mais recentes, para não sobrecarregar o ecrã com
  // histórico antigo.
  const sessions = useMemo(
    () => buildSessions(matches).filter((s) => s.games >= 2).slice(0, 6),
    [matches]
  );

  const heatmapWeeks = useMemo(() => {
    const dayMap = {};
    matches.forEach((m) => {
      if (!m.created_at) return;
      const key = dayKey(new Date(m.created_at));
      if (!dayMap[key]) dayMap[key] = { games: 0, wins: 0 };
      dayMap[key].games += 1;
      if (m.win) dayMap[key].wins += 1;
    });
    return buildHeatmapWeeks(dayMap, HEATMAP_WEEKS);
  }, [matches]);

  // Um mês só ganha legenda na primeira semana em que aparece, para não
  // repetir o nome em todas as colunas desse mês (igual ao GitHub).
  const monthLabels = useMemo(() => {
    let lastMonth = null;
    return heatmapWeeks.map((week) => {
      const firstDay = week[0].date;
      const monthKey = `${firstDay.getFullYear()}-${firstDay.getMonth()}`;
      if (monthKey === lastMonth) return null;
      lastMonth = monthKey;
      return firstDay.toLocaleDateString(lang === "en" ? "en-US" : "pt-PT", { month: "short" });
    });
  }, [heatmapWeeks, lang]);

  const perChampion = useMemo(() => {
    const map = {};

    matches.forEach((rawMatch) => {
      // Normaliza a id do campeão antes de agrupar — partidas antigas podem
      // ter ficado com uma variante de capitalização diferente da canónica
      // (ver champions.js), e sem isto o mesmo campeão aparecia duas vezes
      // com contagens (incluindo vitórias) divididas e por isso erradas.
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
    }));
  }, [matches, champions]);

  // Mesmas partidas, mas separadas por formato (team_size) — usado só para
  // os destaques baseados em média (ver bestFormatAvg/bestFormatKda em
  // formatStats.js), que precisam de comparar formatos entre si em vez de
  // os misturar. Partilhado com MatchReports.jsx para os dois lados da app
  // usarem sempre o mesmo critério e nunca mostrarem líderes diferentes para
  // a mesma métrica.
  const perChampionByFormat = useMemo(
    () => buildFormatBuckets(matches, champions),
    [matches, champions]
  );

  const topChampion = useMemo(
    () => [...perChampion].sort((a, b) => b.wins - a.wins)[0],
    [perChampion]
  );

  const mostGamesChampion = useMemo(
    () => [...perChampion].sort((a, b) => b.games - a.games)[0],
    [perChampion]
  );

  // Best/pior KDA — ver bestFormatKda: compara o KDA de cada formato em
  // separado (não uma média cega de 2v2+3v3 juntos) para nunca contradizer o
  // que já se vê num formato específico.
  const bestKdaChampion = useMemo(() => {
    let top = null;
    perChampion.forEach((c) => {
      const r = bestFormatKda(perChampionByFormat[c.champion], 2, "max");
      if (r && (!top || r.kda > top.kda)) top = { champion: c.champion, kda: r.kda, games: r.games };
    });
    return top;
  }, [perChampion, perChampionByFormat]);

  const worstKdaChampion = useMemo(() => {
    let bottom = null;
    perChampion.forEach((c) => {
      const r = bestFormatKda(perChampionByFormat[c.champion], 2, "min");
      if (r && (!bottom || r.kda < bottom.kda)) bottom = { champion: c.champion, kda: r.kda, games: r.games };
    });
    return bottom;
  }, [perChampion, perChampionByFormat]);

  const mostTop3Champion = useMemo(
    () => [...perChampion].filter((c) => c.top3 > 0).sort((a, b) => b.top3 - a.top3)[0],
    [perChampion]
  );

  const mostBelowTop3Champion = useMemo(
    () => [...perChampion].filter((c) => c.belowTop3 > 0).sort((a, b) => b.belowTop3 - a.belowTop3)[0],
    [perChampion]
  );

  const mostLastPlaceChampion = useMemo(
    () => [...perChampion].filter((c) => c.lastPlace > 0).sort((a, b) => b.lastPlace - a.lastPlace)[0],
    [perChampion]
  );

  // Mínimo de 2 partidas com o dado em causa — sem isto, um único jogo raro
  // (ex: 1 partida com dano altíssimo) podia colocar um campeão no topo do
  // destaque só por sorte de amostra. E, tal como o KDA acima, comparamos o
  // formato 2v2 e o 3v3 em separado (bestFormatAvg) em vez de os misturar —
  // "todos os formatos" nunca mostra um valor mais baixo do que já se via
  // filtrado a um formato específico.
  const highestAvgDamageChampion = useMemo(() => {
    let top = null;
    perChampion.forEach((c) => {
      const r = bestFormatAvg(perChampionByFormat[c.champion], "damageDealtSum", "damageDealtCount");
      if (r && (!top || r.avg > top.avg)) top = { champion: c.champion, avg: r.avg, count: r.count };
    });
    return top;
  }, [perChampion, perChampionByFormat]);

  const highestAvgHealingChampion = useMemo(() => {
    let top = null;
    perChampion.forEach((c) => {
      const r = bestFormatAvg(perChampionByFormat[c.champion], "healingSum", "healingCount");
      if (r && (!top || r.avg > top.avg)) top = { champion: c.champion, avg: r.avg, count: r.count };
    });
    return top;
  }, [perChampion, perChampionByFormat]);

  const highestAvgDamageTakenChampion = useMemo(() => {
    let top = null;
    perChampion.forEach((c) => {
      const r = bestFormatAvg(perChampionByFormat[c.champion], "damageTakenSum", "damageTakenCount");
      if (r && (!top || r.avg > top.avg)) top = { champion: c.champion, avg: r.avg, count: r.count };
    });
    return top;
  }, [perChampion, perChampionByFormat]);

  const highestAvgHpChampion = useMemo(() => {
    let top = null;
    perChampion.forEach((c) => {
      const r = bestFormatAvg(perChampionByFormat[c.champion], "hpSum", "hpCount");
      if (r && (!top || r.avg > top.avg)) top = { champion: c.champion, avg: r.avg, count: r.count };
    });
    return top;
  }, [perChampion, perChampionByFormat]);

  const highestAvgGoldChampion = useMemo(() => {
    let top = null;
    perChampion.forEach((c) => {
      const r = bestFormatAvg(perChampionByFormat[c.champion], "goldSum", "goldCount");
      if (r && (!top || r.avg > top.avg)) top = { champion: c.champion, avg: r.avg, count: r.count };
    });
    return top;
  }, [perChampion, perChampionByFormat]);

  const highestAvgDoublesChampion = useMemo(() => {
    let top = null;
    perChampion.forEach((c) => {
      const r = bestFormatAvg(perChampionByFormat[c.champion], "doubleKillsSum", "doubleKillsCount");
      if (r && (!top || r.avg > top.avg)) top = { champion: c.champion, avg: r.avg, count: r.count };
    });
    return top;
  }, [perChampion, perChampionByFormat]);

  const highestAvgTriplesChampion = useMemo(() => {
    let top = null;
    perChampion.forEach((c) => {
      const r = bestFormatAvg(perChampionByFormat[c.champion], "tripleKillsSum", "tripleKillsCount");
      if (r && (!top || r.avg > top.avg)) top = { champion: c.champion, avg: r.avg, count: r.count };
    });
    return top;
  }, [perChampion, perChampionByFormat]);

  // Recordes de UMA partida (não médias) — a partida com mais dano, mais
  // cura e mais dano sofrido de sempre, seja qual for o campeão.
  const bestSingleGameDamage = useMemo(
    () =>
      [...matches]
        .filter((m) => m.damage_dealt != null)
        .sort((a, b) => b.damage_dealt - a.damage_dealt)[0],
    [matches]
  );

  const bestSingleGameHealing = useMemo(
    () =>
      [...matches]
        .filter((m) => m.healing != null)
        .sort((a, b) => b.healing - a.healing)[0],
    [matches]
  );

  const bestSingleGameDamageTaken = useMemo(
    () =>
      [...matches]
        .filter((m) => m.damage_taken != null)
        .sort((a, b) => b.damage_taken - a.damage_taken)[0],
    [matches]
  );

  const bestSingleGameHp = useMemo(
    () =>
      [...matches]
        .filter((m) => m.max_hp != null)
        .sort((a, b) => b.max_hp - a.max_hp)[0],
    [matches]
  );

  const bestSingleGameGold = useMemo(
    () =>
      [...matches]
        .filter((m) => m.gold_earned != null)
        .sort((a, b) => b.gold_earned - a.gold_earned)[0],
    [matches]
  );

  // Recordes globais de uma partida só — não são "por campeão" como os de
  // cima, são só o jogo em que aconteceu, seja qual for o campeão.
  const fastestWin = useMemo(
    () =>
      [...matches]
        .filter((m) => m.win && m.game_duration != null)
        .sort((a, b) => a.game_duration - b.game_duration)[0],
    [matches]
  );

  const longestGame = useMemo(
    () =>
      [...matches]
        .filter((m) => m.game_duration != null)
        .sort((a, b) => b.game_duration - a.game_duration)[0],
    [matches]
  );

  const mostKillsGame = useMemo(
    () =>
      [...matches]
        .filter((m) => (m.kills || 0) > 0)
        .sort((a, b) => b.kills - a.kills)[0],
    [matches]
  );

  const mostDeathsGame = useMemo(
    () =>
      [...matches]
        .filter((m) => (m.deaths || 0) > 0)
        .sort((a, b) => b.deaths - a.deaths)[0],
    [matches]
  );

  const mostAssistsGame = useMemo(
    () =>
      [...matches]
        .filter((m) => (m.assists || 0) > 0)
        .sort((a, b) => b.assists - a.assists)[0],
    [matches]
  );

  const bestSingleGameDoubles = useMemo(
    () =>
      [...matches]
        .filter((m) => (m.double_kills || 0) > 0)
        .sort((a, b) => b.double_kills - a.double_kills)[0],
    [matches]
  );

  const bestSingleGameTriples = useMemo(
    () =>
      [...matches]
        .filter((m) => (m.triple_kills || 0) > 0)
        .sort((a, b) => b.triple_kills - a.triple_kills)[0],
    [matches]
  );

  const coverage = champions.length
    ? Math.round((wins.length / champions.length) * 100)
    : 0;

  // Cada destaque abre logo o campeão nas Estatísticas, já filtrado pela
  // mesma métrica do cartão (sortKey) — em vez de só abrir a linha do
  // campeão, o filtro/ordenação da lista passa logo a refletir o que se
  // clicou (ex: clicar em "Maior dano médio" ordena e filtra a lista de
  // Estatísticas por esse mesmo critério).
  const openStats = (championId, sortKey) => onOpenChampionStats?.(championId, sortKey);

  // Os destaques agrupam-se por TEMA (vitórias/lugares, combate/KDA, kills
  // múltiplos, economia, sobrevivência/dano) em vez de por "tipo de cálculo"
  // (média por campeão vs. recorde de uma partida só) — assim uma média e o
  // recorde-numa-partida do MESMO assunto (ex: ouro médio + mais ouro numa
  // partida) ficam lado a lado, em vez de espalhados por secções diferentes
  // só por um ser média e o outro um valor único. Cada destaque mostra só o
  // valor absoluto do lado direito (ex: "3", não "3V-0D") — o header do
  // cartão já diz o que é a métrica. "sortKey" liga cada cartão ao filtro
  // equivalente na tab Estatísticas (ver MatchReports.jsx).

  // Tema 1 — vitórias e lugares (contagens por campeão + recordes globais de
  // duração de partida, que também são "sobre resultado/vitória").
  const spotlightsWinsPlacements = [
    topChampion && {
      label: t("spotlight_most_first"),
      champion: topChampion.champion,
      value: `${topChampion.wins}`,
      color: "var(--place-good)",
      sortKey: "most_wins",
    },
    mostTop3Champion && {
      label: t("spotlight_most_top3"),
      champion: mostTop3Champion.champion,
      value: `${mostTop3Champion.top3}`,
      color: placementColor(3),
      sortKey: "most_top3_count",
    },
    mostGamesChampion && {
      label: t("spotlight_most_games"),
      champion: mostGamesChampion.champion,
      value: `${mostGamesChampion.games}`,
      color: "var(--text-secondary)",
      sortKey: "games_desc",
    },
    mostBelowTop3Champion && {
      label: t("spotlight_most_below_top3"),
      champion: mostBelowTop3Champion.champion,
      value: `${mostBelowTop3Champion.belowTop3}`,
      color: placementColor(7),
      sortKey: "most_below_top3",
    },
    mostLastPlaceChampion && {
      label: t("spotlight_most_last"),
      champion: mostLastPlaceChampion.champion,
      value: `${mostLastPlaceChampion.lastPlace}`,
      color: "var(--place-low)",
      sortKey: "most_last",
    },
    fastestWin && {
      label: t("spotlight_fastest_win"),
      champion: normalizeChampionId(fastestWin.champion, champions),
      value: formatDuration(fastestWin.game_duration),
      color: "var(--place-good)",
      sortKey: "games_desc",
    },
    longestGame && {
      label: t("spotlight_longest_game"),
      champion: normalizeChampionId(longestGame.champion, champions),
      value: formatDuration(longestGame.game_duration),
      color: "var(--text-secondary)",
      sortKey: "games_desc",
    },
  ].filter(Boolean);

  // Tema 2 — combate/KDA: KDA médio (melhor e pior) + os recordes de uma
  // partida sobre kills/deaths/assists.
  const spotlightsCombatKda = [
    bestKdaChampion && {
      label: t("spotlight_best_kda"),
      champion: bestKdaChampion.champion,
      value: bestKdaChampion.kda.toFixed(1),
      color: "var(--accent-text)",
      sampleCount: bestKdaChampion.games,
      sortKey: "kda_desc",
    },
    worstKdaChampion && {
      label: t("spotlight_worst_kda"),
      champion: worstKdaChampion.champion,
      value: worstKdaChampion.kda.toFixed(1),
      color: "var(--place-low)",
      sampleCount: worstKdaChampion.games,
      sortKey: "worst_kda",
    },
    mostKillsGame && {
      label: t("spotlight_most_kills_game"),
      champion: normalizeChampionId(mostKillsGame.champion, champions),
      value: `${mostKillsGame.kills}`,
      color: "var(--accent-text)",
      sortKey: "games_desc",
    },
    mostDeathsGame && {
      label: t("spotlight_most_deaths_game"),
      champion: normalizeChampionId(mostDeathsGame.champion, champions),
      value: `${mostDeathsGame.deaths}`,
      color: "var(--place-low)",
      sortKey: "games_desc",
    },
    mostAssistsGame && {
      label: t("spotlight_most_assists_game"),
      champion: normalizeChampionId(mostAssistsGame.champion, champions),
      value: `${mostAssistsGame.assists}`,
      color: "var(--accent-text)",
      sortKey: "games_desc",
    },
  ].filter(Boolean);

  // Tema 3 — kills múltiplos: médias por campeão + recorde numa partida,
  // double e triple kill lado a lado.
  const spotlightsMultikills = [
    highestAvgDoublesChampion && {
      label: t("spotlight_highest_doubles"),
      champion: highestAvgDoublesChampion.champion,
      value: highestAvgDoublesChampion.avg.toFixed(2),
      color: "var(--text-secondary)",
      sampleCount: highestAvgDoublesChampion.count,
      sortKey: "highest_doubles",
    },
    bestSingleGameDoubles && {
      label: t("spotlight_best_doubles_game"),
      champion: normalizeChampionId(bestSingleGameDoubles.champion, champions),
      value: `${bestSingleGameDoubles.double_kills}`,
      color: "var(--accent-text)",
      sortKey: "best_doubles_game",
    },
    highestAvgTriplesChampion && {
      label: t("spotlight_highest_triples"),
      champion: highestAvgTriplesChampion.champion,
      value: highestAvgTriplesChampion.avg.toFixed(2),
      color: "var(--text-secondary)",
      sampleCount: highestAvgTriplesChampion.count,
      sortKey: "highest_triples",
    },
    bestSingleGameTriples && {
      label: t("spotlight_best_triples_game"),
      champion: normalizeChampionId(bestSingleGameTriples.champion, champions),
      value: `${bestSingleGameTriples.triple_kills}`,
      color: "var(--accent-text)",
      sortKey: "best_triples_game",
    },
  ].filter(Boolean);

  // Tema 4 — economia: ouro médio + recorde de ouro numa partida.
  const spotlightsEconomy = [
    highestAvgGoldChampion && {
      label: t("spotlight_highest_gold"),
      champion: highestAvgGoldChampion.champion,
      value: Math.round(highestAvgGoldChampion.avg).toLocaleString(),
      color: "var(--text-secondary)",
      sampleCount: highestAvgGoldChampion.count,
      sortKey: "highest_gold",
    },
    bestSingleGameGold && {
      label: t("spotlight_best_gold_game"),
      champion: normalizeChampionId(bestSingleGameGold.champion, champions),
      value: Math.round(bestSingleGameGold.gold_earned).toLocaleString(),
      color: "var(--accent-text)",
      sortKey: "best_gold_game",
    },
  ].filter(Boolean);

  // Tema 5 — sobrevivência e dano: dano dado/recebido, cura e HP máximo,
  // médias por campeão junto do recorde de cada um numa partida só.
  const spotlightsSurvivalDamage = [
    highestAvgDamageChampion && {
      label: t("spotlight_highest_damage"),
      champion: highestAvgDamageChampion.champion,
      value: Math.round(highestAvgDamageChampion.avg).toLocaleString(),
      color: "var(--text-secondary)",
      sampleCount: highestAvgDamageChampion.count,
      sortKey: "highest_damage",
    },
    bestSingleGameDamage && {
      label: t("spotlight_best_damage_game"),
      champion: normalizeChampionId(bestSingleGameDamage.champion, champions),
      value: Math.round(bestSingleGameDamage.damage_dealt).toLocaleString(),
      color: "var(--accent-text)",
      sortKey: "best_damage_game",
    },
    highestAvgDamageTakenChampion && {
      label: t("spotlight_highest_damage_taken"),
      champion: highestAvgDamageTakenChampion.champion,
      value: Math.round(highestAvgDamageTakenChampion.avg).toLocaleString(),
      color: "var(--text-secondary)",
      sampleCount: highestAvgDamageTakenChampion.count,
      sortKey: "highest_damage_taken",
    },
    bestSingleGameDamageTaken && {
      label: t("spotlight_best_damage_taken_game"),
      champion: normalizeChampionId(bestSingleGameDamageTaken.champion, champions),
      value: Math.round(bestSingleGameDamageTaken.damage_taken).toLocaleString(),
      color: "var(--accent-text)",
      sortKey: "best_damage_taken_game",
    },
    highestAvgHealingChampion && {
      label: t("spotlight_highest_healing"),
      champion: highestAvgHealingChampion.champion,
      value: Math.round(highestAvgHealingChampion.avg).toLocaleString(),
      color: "var(--text-secondary)",
      sampleCount: highestAvgHealingChampion.count,
      sortKey: "highest_healing",
    },
    bestSingleGameHealing && {
      label: t("spotlight_best_healing_game"),
      champion: normalizeChampionId(bestSingleGameHealing.champion, champions),
      value: Math.round(bestSingleGameHealing.healing).toLocaleString(),
      color: "var(--accent-text)",
      sortKey: "best_healing_game",
    },
    highestAvgHpChampion && {
      label: t("spotlight_highest_hp"),
      champion: highestAvgHpChampion.champion,
      value: Math.round(highestAvgHpChampion.avg).toLocaleString(),
      color: "var(--text-secondary)",
      sampleCount: highestAvgHpChampion.count,
      sortKey: "highest_hp",
    },
    bestSingleGameHp && {
      label: t("spotlight_best_hp_game"),
      champion: normalizeChampionId(bestSingleGameHp.champion, champions),
      value: Math.round(bestSingleGameHp.max_hp).toLocaleString(),
      color: "var(--accent-text)",
      sortKey: "best_hp_game",
    },
  ].filter(Boolean);

  // Grupos com título + lista, na ordem em que aparecem no ecrã — só entram
  // no render os que tiverem pelo menos 1 cartão.
  const spotlightGroups = [
    { key: "wins", title: t("overview_highlights_wins"), icon: "🏆", items: spotlightsWinsPlacements },
    { key: "combat", title: t("overview_highlights_combat"), icon: "⚔️", items: spotlightsCombatKda },
    { key: "multikill", title: t("overview_highlights_multikill"), icon: "🗡️", items: spotlightsMultikills },
    { key: "economy", title: t("overview_highlights_economy"), icon: "💰", items: spotlightsEconomy },
    { key: "survival", title: t("overview_highlights_survival"), icon: "🛡️", items: spotlightsSurvivalDamage },
  ].filter((g) => g.items.length > 0);

  // Resumo rápido de carreira, sempre visível no topo — em vez de a única
  // informação de destaque ser a barra de progresso do roster, junta-se aqui
  // o essencial (jogos totais, taxas de Top 3/Top 1, sequência atual) para
  // dar uma fotografia completa num único relance, antes de descer para as
  // secções mais detalhadas. O "winrate" principal é por Top 3 (chegar ao
  // pódio conta como bom resultado na Arena), com o 1º lugar mostrado à
  // parte, já que são metas diferentes.
  const totalGames = matches.length;
  const totalWins = matches.filter((m) => m.win).length;
  const top1RatePct = totalGames ? Math.round((totalWins / totalGames) * 100) : 0;
  const top3RatePct = calcTop3Rate(matches);

  return (
    <div style={styles.wrap}>
      {/* HERO — progresso do roster + estatísticas rápidas de carreira,
          tudo num único cartão de destaque em vez de uma barra isolada. */}
      <div style={styles.hero}>
        <div style={styles.heroTop}>
          <div>
            <div style={styles.heroKicker}>{t("overview_roster_progress")}</div>
            <div style={styles.heroBig}>{coverage}%</div>
            <div style={styles.progressText}>
              {wins.length} / {champions.length}
            </div>
          </div>

          <div style={styles.heroStatsRow}>
            <div style={styles.heroStat}>
              <div style={styles.heroStatValue}>{totalGames}</div>
              <div style={styles.heroStatLabel}>{t("overview_total_games")}</div>
            </div>
            <div style={styles.heroStatDivider} />
            <div style={{ ...styles.heroStat, ...heroChipStyle(placementColor(3)) }}>
              <div style={{ ...styles.heroStatValue, color: placementColor(3) }}>
                {top3RatePct}%
              </div>
              <div style={styles.heroStatLabel}>{t("overview_top3_rate")}</div>
            </div>
            <div style={styles.heroStatDivider} />
            <div style={{ ...styles.heroStat, ...heroChipStyle("var(--place-good)") }}>
              <div style={{ ...styles.heroStatValue, color: "var(--place-good)" }}>
                {top1RatePct}%
              </div>
              <div style={styles.heroStatLabel}>{t("overview_top1_rate")}</div>
            </div>
            {streaks.current > 1 && (
              <>
                <div style={styles.heroStatDivider} />
                <div
                  style={{
                    ...styles.heroStat,
                    ...heroChipStyle(
                      streaks.currentType === "win" ? "var(--place-good)" : "var(--place-low)"
                    ),
                  }}
                >
                  <div
                    style={{
                      ...styles.heroStatValue,
                      color: streaks.currentType === "win" ? "var(--place-good)" : "var(--place-low)",
                    }}
                  >
                    {streaks.currentType === "win" ? "🔥" : "❄️"} {streaks.current}
                  </div>
                  <div style={styles.heroStatLabel}>
                    {streaks.currentType === "win" ? t("streak_wins_suffix") : t("streak_losses_suffix")}
                  </div>
                </div>
              </>
            )}
            {streaks.bestWin > 1 && (
              <>
                <div style={styles.heroStatDivider} />
                <Tooltip label={t("streak_best_tooltip")}>
                  <div style={styles.heroStat}>
                    <div style={styles.heroStatValue}>🏆 {streaks.bestWin}</div>
                    <div style={styles.heroStatLabel}>{t("streak_best_label")}</div>
                  </div>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        <div style={styles.progressTrack}>
          <motion.div
            style={styles.progressFill}
            initial={{ width: 0 }}
            animate={{ width: `${coverage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* FORMA RECENTE — a sequência atual/melhor já aparece no cartão de
          destaque no topo, aqui fica só a fileira visual das últimas partidas. */}
      {recentForm.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📈 {t("overview_recent_form")}</h2>
          <div style={styles.formRow}>
            {recentForm.map((m, i) => {
              // Se já houver o lugar exato (via Riot API) mostramos esse
              // número; partidas antigas (só Live Client Data) mostram V/D
              // como reserva, já que não têm o dado de lugar.
              const hasPlacement = !!m.placement;
              // Partidas antigas (só Live Client Data) não têm lugar exato —
              // caem no mesmo par bom/mau usado para o resto do pódio, em
              // vez de uma cor à parte.
              const color = hasPlacement
                ? placementColor(m.placement)
                : m.win
                ? "var(--place-good)"
                : "var(--place-low)";
              const label = hasPlacement ? placementText(m.placement) : m.win ? (lang === "en" ? "W" : "V") : (lang === "en" ? "L" : "D");
              const title = hasPlacement
                ? `${champName(m.champion)} — ${placementText(m.placement)} ${lang === "en" ? "place" : "lugar"}`
                : `${champName(m.champion)} (${lang === "en" ? "no placement data" : "sem dado de lugar"})`;

              return (
                <Tooltip key={i} label={title}>
                  <div
                    style={{
                      ...styles.formPill,
                      background: `color-mix(in srgb, ${color} 15%, transparent)`,
                      color,
                      border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
                    }}
                  >
                    {label}
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {/* ATIVIDADE + SESSÕES + PREMADE lado a lado — as três são cartões
          curtos (a atividade tem scroll horizontal próprio, ver
          heatmapScroll), por isso partilham a mesma fileira em vez de cada
          uma ocupar a largura toda do ecrã (o grid volta a empilhar em
          colunas menos largas conforme o espaço disponível, ver
          threeColGrid). */}
      {(matches.length > 0 || sessions.length > 0 || duoSynergy.length > 0) && (
        <div style={styles.threeColGrid}>
          {/* ATIVIDADE — grid de contribuições ao estilo GitHub, uma célula
              por dia das últimas ~18 semanas, cor mais forte quanto mais
              partidas jogadas nesse dia. */}
          {matches.length > 0 && (
            <div style={{ ...styles.section, ...styles.equalHeightCard }}>
              <h2 style={styles.sectionTitle}>📅 {t("overview_activity")}</h2>
              {/* O gráfico ocupa muito menos altura que as listas de Sessões/
                  Premade ao lado — em vez de deixar um vazio estranho por
                  baixo quando o cartão estica para acompanhar essas duas,
                  centra-se verticalmente no espaço disponível. */}
              <div style={styles.heatmapBody}>
                <div style={styles.heatmapScroll}>
                  <div style={styles.heatmapGrid}>
                    {heatmapWeeks.map((week, wi) => (
                      <div key={wi} style={styles.heatmapCol}>
                        <div style={styles.heatmapMonthLabel}>{monthLabels[wi] || ""}</div>
                        {week.map((day) => (
                          <Tooltip
                            key={day.key}
                            label={
                              day.future
                                ? day.date.toLocaleDateString(lang === "en" ? "en-US" : "pt-PT")
                                : `${day.date.toLocaleDateString(lang === "en" ? "en-US" : "pt-PT")} · ${
                                    day.games
                                      ? `${day.games} ${lang === "en" ? "games" : "jogos"} (${day.wins}${
                                          lang === "en" ? "W" : "V"
                                        })`
                                      : lang === "en"
                                      ? "no games"
                                      : "sem jogos"
                                  }`
                            }
                          >
                            <div
                              style={{
                                ...styles.heatmapCell,
                                background: day.future ? "transparent" : heatColor(day.games),
                                border: day.future ? "1px dashed rgba(var(--border-rgb),0.25)" : "none",
                              }}
                            />
                          </Tooltip>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={styles.heatmapLegend}>
                  <span>{t("heatmap_less")}</span>
                  {[0, 1, 2, 4].map((g) => (
                    <div key={g} style={{ ...styles.heatmapCell, background: heatColor(g) }} />
                  ))}
                  <span>{t("heatmap_more")}</span>
                </div>
              </div>
            </div>
          )}

          {/* SESSÕES — partidas seguidas na mesma sentada, agrupadas por um
              gap máximo entre elas (ver SESSION_GAP_MINUTES); a Arena não dá
              a hora de início de cada partida, só a de fim, por isso isto é
              sempre uma aproximação. */}
          {sessions.length > 0 && (
            <div style={{ ...styles.section, ...styles.equalHeightCard }}>
              <h2 style={styles.sectionTitle}>⏱️ {t("overview_sessions")}</h2>
              <div style={styles.sessionList}>
                {sessions.map((s, i) => (
                  <div key={i} style={styles.sessionRow}>
                    <div style={styles.sessionDate}>
                      {s.start.toLocaleDateString(lang === "en" ? "en-US" : "pt-PT")}
                      <span style={styles.sessionTime}>
                        {" "}
                        {s.start.toLocaleTimeString(lang === "en" ? "en-US" : "pt-PT", { hour: "2-digit", minute: "2-digit" })}
                        –
                        {s.end.toLocaleTimeString(lang === "en" ? "en-US" : "pt-PT", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span style={styles.sessionStat}>
                      {s.games} {lang === "en" ? "games" : "jogos"}
                    </span>
                    {s.withPlacementCount > 0 ? (
                      <>
                        <span
                          style={{
                            ...styles.sessionWinrate,
                            color: placementColor(Math.round(s.avgPlacement)),
                          }}
                        >
                          {t("session_avg_placement")}: {s.avgPlacement.toFixed(1)}º
                        </span>
                        <span style={styles.sessionStat}>
                          {t("session_best")}: {placementText(s.bestPlacement)}
                        </span>
                        <span style={styles.sessionStat}>
                          {s.top3Count}/{s.withPlacementCount} Top3
                        </span>
                        <span style={styles.sessionStat}>
                          {s.wins}{lang === "en" ? "W" : "V"} ({lang === "en" ? "1st" : "1º"})
                        </span>
                      </>
                    ) : (
                      <span
                        style={{
                          ...styles.sessionWinrate,
                          color: s.wins >= s.games / 2 ? "var(--place-good)" : "var(--place-low)",
                        }}
                      >
                        {s.wins}{lang === "en" ? "W" : "V"}/{s.games}
                      </span>
                    )}
                    {s.bestTop3Streak > 1 && (
                      <span style={styles.sessionStreak}>🔥 {s.bestTop3Streak}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PREMADE — conta qualquer colega de equipa repetido, seja em
              2v2 ou 3v3. */}
          {duoSynergy.length > 0 && (
            <div style={{ ...styles.section, ...styles.equalHeightCard }}>
              <h2 style={styles.sectionTitle}>🤝 {t("overview_duo_synergy")}</h2>
              <div style={styles.duoList}>
                {duoSynergy.map((d) => (
                  <div key={d.name} style={styles.duoRow}>
                    <span style={styles.duoName}>{d.name}</span>
                    <span style={styles.duoGames}>
                      {d.games} {lang === "en" ? "games" : "jogos"}
                    </span>
                    <span style={styles.duoStat}>
                      {d.wins}{lang === "en" ? "W" : "V"} ({d.top1Rate}%)
                    </span>
                    <span
                      style={{
                        ...styles.duoWinrate,
                        color: d.top3Rate >= 50 ? "var(--place-good)" : "var(--place-low)",
                      }}
                    >
                      {t("stat_top3_short")} {d.top3Rate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SPOTLIGHTS — cada cartão é um atalho: clicar abre logo o campeão
          nas Estatísticas, já expandido, em vez de obrigar a ir procurá-lo.
          Agrupados em 3 blocos (melhores médias / pontos a melhorar /
          recordes de uma partida), cada um com o seu subtítulo, em vez de
          uma única grelha longa e indiferenciada — assim dá para perceber
          logo o que é cada cartão só pelo grupo em que está. */}
      {spotlightGroups.length > 0 && (
        <div>
          <h2 style={styles.spotlightSectionTitle}>🏆 {t("overview_highlights")}</h2>

          {spotlightGroups.map((group, gi) => (
            <div
              key={group.key}
              style={{ ...styles.spotlightGroup, marginTop: gi === 0 ? 0 : 18 }}
            >
              <h3 style={styles.spotlightGroupTitle}>
                {group.icon} {group.title}
              </h3>
              <div style={styles.spotlightRow}>
                {group.items.map((sp) => (
                  <div
                    key={sp.label}
                    className="clickableCard"
                    style={styles.spotlightCard}
                    onClick={() => openStats(sp.champion, sp.sortKey)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      openStats(sp.champion, sp.sortKey);
                    }}
                  >
                    <div style={styles.spotlightHeader}>
                      {sp.label}
                      {sp.sampleCount != null && (
                        <span style={styles.spotlightSampleCount}>
                          {" "}
                          · {sp.sampleCount}
                          {lang === "en" ? "g" : "j"}
                        </span>
                      )}
                    </div>
                    <div style={styles.spotlightBody}>
                      {sp.champion ? (
                        <Tooltip label={champName(sp.champion)}>
                          <div style={styles.spotlightChampWrap}>
                            {DRAGON && (
                              <img
                                src={`${DRAGON}/img/champion/${sp.champion}.png`}
                                style={styles.spotlightIcon}
                              />
                            )}
                            <span style={styles.spotlightChampName}>{champName(sp.champion)}</span>
                          </div>
                        </Tooltip>
                      ) : (
                        // Alguns destaques são recordes globais sem campeão associado
                        // (ex: partida mais longa) — mantém a mesma altura de linha
                        // do cartão em vez de encolher só por faltar o ícone.
                        <div style={styles.spotlightChampWrap} />
                      )}
                      {/* O valor fica sempre na própria linha, a toda a largura do
                          cartão, em vez de disputar espaço horizontal com o nome do
                          campeão (era isso que cortava valores longos, ex: "Triple
                          Kill" ou números grandes de dano/ouro em cartões estreitos). */}
                      <div style={{ ...styles.spotlightValue, color: sp.color }} title={String(sp.value)}>
                        {sp.value}
                      </div>
                    </div>
                    <div style={styles.spotlightHint}>{t("overview_see_more")}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!matches.length && (
        <div style={styles.empty}>{t("overview_empty")}</div>
      )}
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
    padding: 20,
    textAlign: "center",
    color: "var(--text-secondary)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-xl)",
  },


  section: {
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.92), rgba(var(--panel-deep-rgb),0.96))",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-2xl)",
    padding: 16,
    boxShadow: "0 6px 20px rgba(0,0,0,0.16)",
  },

  sectionTitle: { marginBottom: 10, color: "var(--accent-text)" },

  // Cartão de destaque no topo — junta o progresso do roster e as
  // estatísticas rápidas de carreira (jogos, winrate, sequências) num único
  // relance, em vez de uma barra de progresso isolada sem mais contexto.
  hero: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    background: "linear-gradient(135deg, rgba(var(--accent-rgb),0.14), rgba(var(--panel-deep-rgb),0.97))",
    border: "1px solid rgba(var(--accent-rgb),0.3)",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
  },

  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 18,
  },

  heroKicker: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "var(--text-muted)",
    marginBottom: 2,
  },

  heroBig: {
    fontSize: 38,
    fontWeight: 900,
    color: "var(--accent-text)",
    lineHeight: 1.05,
  },

  heroStatsRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },

  heroStat: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  heroStatDivider: {
    width: 1,
    alignSelf: "stretch",
    background: "rgba(var(--border-rgb),0.35)",
  },

  heroStatValue: {
    fontSize: 18,
    fontWeight: 800,
    color: "var(--text-body)",
    whiteSpace: "nowrap",
  },

  heroStatLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    whiteSpace: "nowrap",
  },

  // Atividade, sessões e sinergia de duo lado a lado em ecrãs largos (as três
  // cabem em cartões relativamente curtos) — volta a empilhar em menos
  // colunas conforme o espaço disponível, sem precisar de media queries.
  // "alignItems" fica no valor por omissão (stretch) de propósito: os três
  // cartões esticam sempre para a altura do mais alto da fileira (normalmente
  // Sessões, com mais linhas), em vez de cada um ficar só do tamanho do seu
  // próprio conteúdo — era isso que fazia a Atividade (pouco conteúdo) parecer
  // cortada/estranha ao lado de Sessões.
  threeColGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },

  // Aplicado junto com "section" nos três cartões da threeColGrid — sem isto,
  // esticar o cartão (grid stretch) só alargava a caixa exterior; o conteúdo
  // continuava agarrado ao topo, deixando um vazio estranho por baixo em vez
  // de ocupar o espaço extra de forma intencional.
  equalHeightCard: {
    display: "flex",
    flexDirection: "column",
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },

  progressText: {
    fontSize: 12,
    color: "var(--text-secondary)",
  },

  progressTrack: {
    height: 10,
    borderRadius: "var(--radius-sm)",
    background: "rgba(0,0,0,0.35)",
    overflow: "hidden",
    marginTop: 4,
  },

  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #9aa0a6, var(--accent-solid-light))",
    borderRadius: "var(--radius-sm)",
  },

  formRow: {
    display: "flex",
    gap: 8,
  },

  formPill: {
    width: 28,
    height: 28,
    borderRadius: "var(--radius-md)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
  },

  sessionList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  sessionRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    padding: "8px 10px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  sessionDate: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--text-body)",
    flex: 1,
    minWidth: 0,
  },

  sessionTime: {
    fontSize: 11,
    fontWeight: 500,
    color: "var(--text-secondary)",
  },

  sessionStat: {
    fontSize: 11,
    color: "var(--text-secondary)",
  },

  sessionWinrate: {
    fontSize: 12.5,
    fontWeight: 800,
    minWidth: 70,
    textAlign: "right",
  },

  sessionStreak: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--accent-text)",
  },

  duoList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  duoRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    padding: "8px 10px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  duoName: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--text-body)",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  duoGames: {
    fontSize: 11,
    color: "var(--text-secondary)",
  },

  duoStat: {
    fontSize: 11,
    color: "var(--text-secondary)",
  },

  duoWinrate: {
    fontSize: 12.5,
    fontWeight: 800,
    minWidth: 52,
    textAlign: "right",
  },

  // Envolve o gráfico + legenda para poder centrá-los verticalmente quando o
  // cartão estica para acompanhar a altura de Sessões/Premade ao lado (ver
  // equalHeightCard).
  heatmapBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    padding: "12px 0",
  },

  heatmapScroll: {
    overflowX: "auto",
    paddingBottom: 4,
    maxWidth: "100%",
  },

  heatmapGrid: {
    display: "flex",
    gap: 5,
    width: "fit-content",
    margin: "0 auto",
  },

  heatmapCol: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  heatmapMonthLabel: {
    fontSize: 10,
    color: "var(--text-muted)",
    height: 14,
    lineHeight: "14px",
    marginBottom: 2,
    whiteSpace: "nowrap",
  },

  heatmapCell: {
    width: 16,
    height: 16,
    borderRadius: "var(--radius-xs)",
  },

  heatmapLegend: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    fontSize: 11,
    color: "var(--text-muted)",
  },

  spotlightSectionTitle: {
    marginBottom: 10,
    color: "var(--accent-text)",
  },

  spotlightGroup: {
    display: "flex",
    flexDirection: "column",
  },

  // Subtítulo de cada grupo (Melhores por campeão / Pontos a melhorar /
  // Recordes de uma partida) — mais discreto que o título principal
  // ("🏆 Destaques" acima), só para separar visualmente os 3 blocos sem
  // competir com ele.
  spotlightGroupTitle: {
    marginBottom: 8,
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // Grelha responsiva — cada cartão nunca fica mais estreito que 172px (dava
  // para cortar valores mais compridos, ex: "Triple Kill" ou números grandes
  // de dano/ouro, com o mínimo antigo de 150px), e o número de colunas por
  // linha ajusta-se sozinho à largura da janela.
  spotlightRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(172px, 1fr))",
    gap: 10,
  },

  spotlightCard: {
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.92), rgba(var(--panel-deep-rgb),0.96))",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-xl)",
    overflow: "hidden",
    cursor: "pointer",
    transition: "border-color 0.15s ease",
    display: "flex",
    flexDirection: "column",
  },

  // Faixa de cabeçalho com fundo próprio, distinto do corpo do cartão.
  spotlightHeader: {
    padding: "7px 10px",
    fontSize: 10.5,
    lineHeight: 1.25,
    color: "var(--text-secondary)",
    background: "rgba(var(--accent-rgb),0.14)",
    borderBottom: "1px solid rgba(var(--border-rgb),0.4)",
    minHeight: 30,
    display: "flex",
    alignItems: "center",
  },

  spotlightSampleCount: {
    color: "var(--text-muted)",
    fontWeight: 500,
  },

  // Antes o nome do campeão e o valor competiam pela mesma linha horizontal
  // (space-between) — em cartões estreitos ou com valores compridos (ex:
  // "Triple Kill", números grandes de dano/ouro) o valor acabava cortado.
  // Agora o valor fica sempre na sua própria linha, a toda a largura do
  // cartão, por baixo do campeão.
  spotlightBody: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "10px 10px",
  },

  // Ícone + nome do campeão lado a lado (à esquerda) — antes só o ícone
  // aparecia, obrigando a passar o rato por cima para saber de quem se trata.
  spotlightChampWrap: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
    minHeight: 24,
  },

  spotlightIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    pointerEvents: "none",
    flexShrink: 0,
  },

  spotlightChampName: {
    fontSize: 11.5,
    fontWeight: 600,
    color: "var(--text-body)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },

  // "minWidth: 0" é o que permite o ellipsis funcionar dentro de um
  // container flex (sem isto o texto simplesmente transbordava e ficava
  // cortado pelo "overflow: hidden" do cartão, em vez de mostrar "...").
  spotlightValue: {
    fontSize: 18,
    fontWeight: 800,
    width: "100%",
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  spotlightHint: {
    padding: "0 10px 8px",
    fontSize: 10,
    color: "var(--accent-text)",
    fontWeight: 600,
  },
};
