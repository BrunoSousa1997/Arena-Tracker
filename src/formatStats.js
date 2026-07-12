// Helpers partilhados entre a Visão Geral e as Estatísticas para lidar com
// médias que dependem do formato (2v2 vs 3v3). Os dois formatos têm
// dinâmicas de dano/cura diferentes (equipas e ritmo de jogo diferentes),
// por isso uma média direta de "todos os formatos" misturando os dois não é
// um número com significado — e pior, produzia discrepâncias visíveis entre
// a Visão Geral e as Estatísticas (ex: o destaque de "maior dano médio"
// mostrava um campeão, mas a lista de Estatísticas ordenada pelo mesmo
// critério mostrava outro no topo), porque cada sítio tinha a sua própria
// lógica de agregação. Estas funções ficam num só sítio para os dois lados
// da app usarem exatamente o mesmo critério e nunca voltarem a divergir.
import { normalizeChampionId } from "./champions";

// Agrupa as partidas por campeão E por formato (team_size) — a partir daqui
// dá para comparar o desempenho em cada formato em separado, em vez de os
// somar cegamente.
export function buildFormatBuckets(matches, champions) {
  const map = {};

  matches.forEach((rawMatch) => {
    const champion = normalizeChampionId(rawMatch.champion, champions);
    const format = rawMatch.team_size ?? "unknown";

    if (!map[champion]) map[champion] = {};
    if (!map[champion][format]) {
      map[champion][format] = {
        games: 0,
        k: 0,
        d: 0,
        a: 0,
        damageDealtSum: 0,
        damageDealtCount: 0,
        damageTakenSum: 0,
        damageTakenCount: 0,
        healingSum: 0,
        healingCount: 0,
        hpSum: 0,
        hpCount: 0,
        goldSum: 0,
        goldCount: 0,
        doubleKillsSum: 0,
        doubleKillsCount: 0,
        tripleKillsSum: 0,
        tripleKillsCount: 0,
      };
    }

    const b = map[champion][format];
    b.games += 1;
    b.k += rawMatch.kills || 0;
    b.d += rawMatch.deaths || 0;
    b.a += rawMatch.assists || 0;

    if (rawMatch.damage_dealt != null) {
      b.damageDealtSum += rawMatch.damage_dealt;
      b.damageDealtCount += 1;
    }
    if (rawMatch.damage_taken != null) {
      b.damageTakenSum += rawMatch.damage_taken;
      b.damageTakenCount += 1;
    }
    if (rawMatch.healing != null) {
      b.healingSum += rawMatch.healing;
      b.healingCount += 1;
    }
    if (rawMatch.max_hp != null) {
      b.hpSum += rawMatch.max_hp;
      b.hpCount += 1;
    }
    if (rawMatch.gold_earned != null) {
      b.goldSum += rawMatch.gold_earned;
      b.goldCount += 1;
    }
    if (rawMatch.double_kills != null) {
      b.doubleKillsSum += rawMatch.double_kills;
      b.doubleKillsCount += 1;
    }
    if (rawMatch.triple_kills != null) {
      b.tripleKillsSum += rawMatch.triple_kills;
      b.tripleKillsCount += 1;
    }
  });

  return map;
}

// Melhor média entre os formatos disponíveis (não uma média cega dos dois
// juntos) — garante que "todos os formatos" nunca mostra um valor mais
// baixo do que já se via filtrado a um formato específico.
export function bestFormatAvg(buckets, sumKey, countKey, minCount = 2) {
  let best = null;
  Object.values(buckets || {}).forEach((b) => {
    if (b[countKey] >= minCount) {
      const avg = b[sumKey] / b[countKey];
      if (!best || avg > best.avg) best = { avg, count: b[countKey] };
    }
  });
  return best;
}

// Igual, mas para o KDA — "mode" controla se queremos o melhor ("max", para
// o líder de melhor KDA) ou o pior ("min", para o líder de pior KDA).
export function bestFormatKda(buckets, minGames = 2, mode = "max") {
  let best = null;
  Object.values(buckets || {}).forEach((b) => {
    if (b.games >= minGames) {
      const kda = (b.k + b.a) / Math.max(b.d, 1);
      if (!best || (mode === "max" ? kda > best.kda : kda < best.kda)) {
        best = { kda, games: b.games };
      }
    }
  });
  return best;
}
