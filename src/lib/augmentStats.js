// ================= ESTATÍSTICAS POR AUGMENT =================
// Os augments são o modo — a Arena decide-se muito mais no que se escolhe de
// três em três rondas do que no campeão. Até aqui os augments só serviam para
// contar os mais FREQUENTES por campeão, que diz o que costumas levar mas não
// diz se te corre bem. Isto responde à pergunta que interessa: com este
// augment ganhas mais ou menos do que ganhas em média?
//
// Nada disto pede o que quer que seja à Riot. Os augments já estão guardados
// em duas camadas:
//   - "matches.augments"                -> os teus, nas tuas partidas;
//   - "matches.participants[].augments" -> os de TODA a gente na partida.
// A segunda existe porque a importação guarda os 16-18 participantes (ver
// extractAllParticipants em electron/riotApi.js) e é uma amostra uma ordem de
// grandeza maior — com 500 partidas tuas tens ~2000 escolhas tuas, mas
// ~32 000 escolhas no total. Para um augment que só apanhaste três vezes, a
// tua própria taxa não vale nada e a global já vale alguma coisa.
import { normalizeChampionId } from "./champions";

// Abaixo disto uma percentagem é ruído, não sinal: com 2 jogos, uma vitória
// dá "50% de vitórias" e não quer dizer absolutamente nada. É o valor por
// omissão do filtro na interface, onde pode ser mudado.
export const DEFAULT_MIN_GAMES = 5;

// Na Arena o que conta como bom resultado é o pódio, não só o 1º lugar — e é
// a única métrica que se compara entre formatos, porque o 3º lugar em 8
// equipas e em 6 equipas significam a mesma coisa ("chegaste ao pódio"),
// enquanto o "lugar médio" não é comparável entre os dois (a escala é 1-8
// contra 1-6). Por isso o desvio face à média usa sempre o top 3.
function isTop3(placement) {
  return placement != null && placement <= 3;
}

// Uma "escolha" é um par (augment, resultado dessa partida). Extrai-as das
// partidas, ou do próprio jogador ou de todos os participantes.
//
// "championId" (opcional) restringe às escolhas feitas COM esse campeão. Onde
// o filtro se aplica muda com a população, e é isso que o torna útil:
//   - "mine" filtra a PARTIDA (o campeão da partida é o meu);
//   - "all"  filtra o PARTICIPANTE, não a partida — de uma partida onde eu
//     joguei Jhin, interessam as escolhas do Jhin adversário tanto como as
//     minhas, e não interessam as do Darius ao lado. Filtrar a partida aqui
//     dava a amostra errada (todos os campeões de partidas onde eu calhei a
//     jogar aquele) e destruía a razão de existir desta população.
function collectPicks(matches, allPlayers, championId, champions) {
  const picks = [];
  const sameChampion = (raw) =>
    !championId || normalizeChampionId(raw, champions) === championId;

  for (const m of matches || []) {
    if (allPlayers) {
      for (const p of m.participants || []) {
        if (p.placement == null) continue;
        if (!sameChampion(p.champion)) continue;
        for (const a of p.augments || []) {
          picks.push({ augmentId: String(a), placement: p.placement });
        }
      }
    } else {
      if (!sameChampion(m.champion)) continue;
      // Sem lugar exato não dá para dizer nada de útil — as partidas antigas
      // só capturadas ao vivo têm vitória/derrota mas não o lugar (ver
      // liveGame.js), e incluí-las com um "placement" inventado envenenava
      // as médias.
      if (m.placement == null) continue;
      for (const a of m.augments || []) {
        picks.push({ augmentId: String(a), placement: m.placement });
      }
    }
  }

  return picks;
}

// Devolve { baseline, rows } — "rows" já ordenado por nº de jogos, para a
// interface poder reordenar como quiser sem depender da ordem de entrada.
//
// "baseline" é a média de TODAS as escolhas da mesma população, e é o que
// torna cada linha acionável: 40% de top 3 é bom ou mau? Depende de qual é a
// tua média. O "delta" responde a isso em pontos percentuais.
//
// Com "championId", a baseline passa a ser a média DESSE campeão, não a
// geral — e é isso que se quer. Um campeão forte tem todos os augments acima
// da média geral e um fraco tem todos abaixo; comparados contra a média
// geral, os deltas mediriam sobretudo a força do campeão e a coluna ficava
// toda verde ou toda vermelha, sem dizer nada sobre os augments. Contra a
// média do próprio campeão, o delta volta a isolar o que interessa: dentro
// deste campeão, quais é que puxam para cima.
export function computeAugmentStats(
  matches,
  { allPlayers = false, championId = null, champions = [] } = {}
) {
  const picks = collectPicks(matches, allPlayers, championId, champions);

  const byAugment = new Map();
  let totalTop3 = 0;
  let totalWins = 0;

  for (const pick of picks) {
    let row = byAugment.get(pick.augmentId);
    if (!row) {
      row = { augmentId: pick.augmentId, games: 0, wins: 0, top3: 0, placementSum: 0 };
      byAugment.set(pick.augmentId, row);
    }

    row.games += 1;
    row.placementSum += pick.placement;
    if (pick.placement === 1) {
      row.wins += 1;
      totalWins += 1;
    }
    if (isTop3(pick.placement)) {
      row.top3 += 1;
      totalTop3 += 1;
    }
  }

  const total = picks.length;
  const baseline = {
    picks: total,
    winRate: total ? (totalWins / total) * 100 : 0,
    top3Rate: total ? (totalTop3 / total) * 100 : 0,
  };

  const rows = [...byAugment.values()]
    .map((r) => ({
      augmentId: r.augmentId,
      games: r.games,
      wins: r.wins,
      top3: r.top3,
      winRate: (r.wins / r.games) * 100,
      top3Rate: (r.top3 / r.games) * 100,
      avgPlacement: r.placementSum / r.games,
      // Pontos percentuais acima/abaixo da média da população. É este o
      // número que diz "leva este" ou "foge deste".
      delta: (r.top3 / r.games) * 100 - baseline.top3Rate,
    }))
    .sort((a, b) => b.games - a.games);

  return { baseline, rows };
}

export const AUGMENT_SORTS = {
  games: (a, b) => b.games - a.games,
  winRate: (a, b) => b.winRate - a.winRate,
  top3Rate: (a, b) => b.top3Rate - a.top3Rate,
  delta: (a, b) => b.delta - a.delta,
  worst: (a, b) => a.delta - b.delta,
  avgPlacement: (a, b) => a.avgPlacement - b.avgPlacement,
};

export function sortAugmentRows(rows, sortKey, minGames = DEFAULT_MIN_GAMES) {
  const cmp = AUGMENT_SORTS[sortKey] || AUGMENT_SORTS.games;
  return rows.filter((r) => r.games >= minGames).sort(cmp);
}
