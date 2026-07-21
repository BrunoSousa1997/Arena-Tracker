// ================= ESTATÍSTICAS POR ITEM =================
// Gémeo do augmentStats.js, com a mesma métrica (taxa de pódio e desvio face
// à média da população) aplicada aos itens em vez dos augments. Vale a pena
// ler o cabeçalho desse ficheiro primeiro: o porquê do top 3 em vez do 1º
// lugar, e o porquê de haver duas populações, é exatamente o mesmo aqui.
//
// O que É diferente, e é a limitação que a interface tem de dizer em voz
// alta: os dados guardados são o INVENTÁRIO FINAL de cada partida, sem ordem
// nem timings (ver buildArenaMatchRecord em electron/riotApi.js — são os
// campos item0..item6 tal como estavam no fim). Isto responde a "que itens
// aparecem nas builds que chegam ao pódio", não a "por que ordem comprar".
// Chamar-lhe "build order" seria mentira; por isso o vocabulário aqui é
// sempre "core" — o conjunto, não o caminho.
import { normalizeChampionId } from "./champions";
import { normalizeItems, ALWAYS_EXCLUDED_ITEM_NAMES } from "./items";

// Mais alto do que o dos augments (5). Numa partida levam-se 4 augments mas
// até 6 itens, e os itens repetem-se muito mais entre partidas — com o mesmo
// mínimo, a lista enchia-se de itens vistos 5 ou 6 vezes cuja percentagem
// ainda é ruído. Continua a ser mudável na interface.
export const DEFAULT_MIN_GAMES = 8;

// Quantos itens formam o "core" recomendado. Três porque é o que cabe numa
// leitura de relance a meio de uma partida, e porque a partir daí o desvio
// dos itens seguintes já é indistinguível do ruído na maior parte das
// amostras que esta app tem.
export const CORE_SIZE = 3;

function isTop3(placement) {
  return placement != null && placement <= 3;
}

// Uma "observação" é um par (item, resultado dessa partida) — no máximo UMA
// por item e por jogador-partida.
//
// A deduplicação por Set não é cosmética: o inventário tem 7 slots e pode
// perfeitamente ter o mesmo item repetido (duas poções, por exemplo). Sem
// deduplicar, esse item contava duas vezes o MESMO resultado, o que não lhe
// muda a percentagem mas infla artificialmente o "games" — e "games" é o que
// o filtro de mínimo usa para decidir em que linhas se pode confiar. Um item
// consumível de compra dupla passaria o filtro com metade da evidência real.
function collectObservations(matches, allPlayers, championId, champions) {
  const observations = [];
  const sameChampion = (raw) =>
    !championId || normalizeChampionId(raw, champions) === championId;

  const push = (items, placement) => {
    const seen = new Set();
    for (const { itemID } of normalizeItems(items)) {
      if (seen.has(itemID)) continue;
      seen.add(itemID);
      observations.push({ itemId: String(itemID), placement });
    }
  };

  for (const m of matches || []) {
    if (allPlayers) {
      for (const p of m.participants || []) {
        if (p.placement == null) continue;
        if (!sameChampion(p.champion)) continue;
        push(p.items, p.placement);
      }
    } else {
      if (!sameChampion(m.champion)) continue;
      // Sem lugar exato não há nada de útil a dizer — mesma regra do
      // augmentStats, e pelo mesmo motivo (partidas antigas só capturadas ao
      // vivo têm vitória/derrota mas não o lugar).
      if (m.placement == null) continue;
      push(m.items, m.placement);
    }
  }

  return observations;
}

// Devolve { baseline, rows }, com a mesma forma do computeAugmentStats para
// a interface poder tratar os dois da mesma maneira.
//
// "itemsMap" (id -> nome) é opcional e serve só para excluir os itens que
// não dizem nada (ver ALWAYS_EXCLUDED_ITEM_NAMES em items.js). Sem ele nada
// é excluído — degrada, não parte, porque o mapa vem de um fetch ao Data
// Dragon que pode ainda não ter chegado quando esta tab abre.
export function computeItemStats(
  matches,
  { allPlayers = false, championId = null, champions = [], itemsMap = null } = {}
) {
  const observations = collectObservations(matches, allPlayers, championId, champions);

  const byItem = new Map();
  let totalTop3 = 0;
  let totalWins = 0;

  for (const obs of observations) {
    let row = byItem.get(obs.itemId);
    if (!row) {
      row = { itemId: obs.itemId, games: 0, wins: 0, top3: 0, placementSum: 0 };
      byItem.set(obs.itemId, row);
    }

    row.games += 1;
    row.placementSum += obs.placement;
    if (obs.placement === 1) {
      row.wins += 1;
      totalWins += 1;
    }
    if (isTop3(obs.placement)) {
      row.top3 += 1;
      totalTop3 += 1;
    }
  }

  // A baseline conta TODAS as observações, incluindo as dos itens excluídos
  // abaixo. É de propósito: a média da população tem de descrever a
  // população real, e o Oracle Lens está em praticamente todas as partidas —
  // tirá-lo da baseline mas não das partidas deslocava a média contra a qual
  // todos os outros itens são medidos.
  const total = observations.length;
  const baseline = {
    picks: total,
    winRate: total ? (totalWins / total) * 100 : 0,
    top3Rate: total ? (totalTop3 / total) * 100 : 0,
  };

  const rows = [...byItem.values()]
    .filter((r) => !ALWAYS_EXCLUDED_ITEM_NAMES.has(itemsMap?.[r.itemId]))
    .map((r) => ({
      itemId: r.itemId,
      games: r.games,
      wins: r.wins,
      top3: r.top3,
      winRate: (r.wins / r.games) * 100,
      top3Rate: (r.top3 / r.games) * 100,
      avgPlacement: r.placementSum / r.games,
      delta: (r.top3 / r.games) * 100 - baseline.top3Rate,
    }))
    .sort((a, b) => b.games - a.games);

  return { baseline, rows };
}

export const ITEM_SORTS = {
  games: (a, b) => b.games - a.games,
  winRate: (a, b) => b.winRate - a.winRate,
  top3Rate: (a, b) => b.top3Rate - a.top3Rate,
  delta: (a, b) => b.delta - a.delta,
  worst: (a, b) => a.delta - b.delta,
  avgPlacement: (a, b) => a.avgPlacement - b.avgPlacement,
};

export function sortItemRows(rows, sortKey, minGames = DEFAULT_MIN_GAMES) {
  const cmp = ITEM_SORTS[sortKey] || ITEM_SORTS.games;
  return rows.filter((r) => r.games >= minGames).sort(cmp);
}

// Os "size" itens com maior desvio positivo que passam o mínimo de jogos.
//
// Deliberadamente NÃO é "os itens que mais aparecem em partidas de pódio":
// essa versão devolvia sempre os itens mais comprados do jogo, que aparecem
// em todo o lado precisamente por serem os mais comprados — em partidas de
// pódio e nas outras por igual. Ordenar pelo desvio responde à pergunta
// certa, que é qual a diferença que o item faz, e não o quão popular é.
export function recommendCore(rows, { size = CORE_SIZE, minGames = DEFAULT_MIN_GAMES } = {}) {
  return rows
    .filter((r) => r.games >= minGames && r.delta > 0)
    .sort(ITEM_SORTS.delta)
    .slice(0, size);
}

// Cruza o core recomendado com o que o jogador tem no inventário NESTE
// momento (ver liveChampionAlert.items em hooks/useLiveGame.js, alimentado
// pela Live Client Data de 3 em 3 segundos).
//
// É esta função que justifica a tab existir: uma lista de itens recomendados
// é uma coisa que se lê num site qualquer antes da partida, mas "destes três
// já tens dois, falta-te este" só se consegue dizer com o inventário ao vivo
// na mão, e é a única forma desta informação chegar no momento em que ainda
// dá para agir sobre ela.
export function coreProgress(core, currentItems) {
  const owned = new Set(normalizeItems(currentItems).map((it) => String(it.itemID)));

  const have = [];
  const missing = [];
  for (const row of core) {
    (owned.has(row.itemId) ? have : missing).push(row);
  }

  return { have, missing };
}
