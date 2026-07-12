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

// Duração em segundos -> "m:ss", para os destaques de vitória mais rápida e
// partida mais longa (mesma lógica usada no Histórico, ver MatchHistory.jsx).
function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Cada ronda da Arena é um combate 2v2 ou 3v3 — nunca há 4 ou 5 inimigos ao
// mesmo tempo, por isso Quadra/Pentakill nunca acontecem neste modo (ao
// contrário do Convocação da Fenda). Mesmos rótulos usados no Histórico.
const MULTIKILL_LABELS = {
  2: "Double Kill",
  3: "Triple Kill",
};

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

  const bestMultikillEver = useMemo(
    () =>
      [...matches]
        .filter((m) => m.multikill >= 2)
        .sort((a, b) => b.multikill - a.multikill)[0],
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

  // Cada destaque mostra só o valor absoluto do lado direito (ex: "3", não
  // "3V-0D") — o header do cartão já diz o que é a métrica, não precisa de
  // repetir isso no valor. "sortKey" liga cada cartão ao filtro equivalente
  // na tab Estatísticas (ver MatchReports.jsx).
  const spotlights = [
    topChampion && 