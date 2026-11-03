// ================= O MOTOR DE RECOMENDAÇÃO =================
// O itemStats e o augmentStats contam. Este ficheiro decide.
//
// A diferença não é cosmética. Até aqui a recomendação era "ordena pelo
// desvio face à média e corta nos primeiros", e isso tem dois defeitos que
// davam conselhos errados com toda a confiança do mundo:
//
//   1. UM ITEM COM 5 JOGOS E 80% DE PÓDIO passava à frente de um com 200
//      jogos e 52%. O primeiro número é ruído (quatro pódios em cinco
//      partidas acontece por sorte a qualquer item), o segundo é um facto —
//      e a lista mostrava-os pela ordem contrária. O filtro de mínimo de
//      jogos não resolve: seja onde for que se ponha o corte, as linhas logo
//      acima dele continuam a ser as mais ruidosas e a ordenação põe-nas no
//      topo precisamente por isso.
//
//   2. CADA ESCOLHA ERA AVALIADA SOZINHA. Mas uma build não é uma lista dos
//      seis melhores itens: é um conjunto, e há itens que valem muito mais
//      (ou muito menos) ao lado de certos outros. Recomendar os seis com
//      maior desvio individual podia devolver seis itens que ninguém junta.
//
// O que isto faz, em duas ideias:
//
//   ENCOLHIMENTO (shrinkage). Uma percentagem vinda de poucos jogos é
//   empurrada para o que já sabemos de uma amostra maior, na proporção
//   exata da evidência que tem. São três níveis encadeados, do mais largo
//   para o mais estreito:
//        geral (todos os campeões, todos os jogadores)
//          -> este campeão (todos os jogadores)
//            -> este campeão, as minhas partidas
//   Cada nível é a expectativa a priori do seguinte. Com 2 jogos teus o
//   resultado é praticamente o do campeão; com 40, é praticamente o teu. Não
//   há corte: a transição é contínua e é a própria amostra que decide o
//   quanto pesa. É o mesmo encadeamento que permite recomendar algo para um
//   campeão que nunca jogaste — a estimativa cai para o nível de cima em vez
//   de dar lista vazia.
//
//   SINERGIA. Além de cada escolha, contam-se os PARES que aparecem juntos
//   (item+item, augment+augment, item+augment) e mede-se se o par rende mais
//   do que a soma das partes. A build é construída de forma gulosa: escolhe
//   a melhor peça, depois a melhor peça DADO o que já está escolhido, e
//   assim por diante. É o que torna possível dizer "este item porque já
//   tens aquele".
//
// Tudo isto sai dos dados que a app já guarda (ver o cabeçalho do
// augmentStats.js para as duas populações). Não há um único pedido novo à
// Riot.
import { computeItemStats } from "./itemStats";
import { computeAugmentStats } from "./augmentStats";
import { groupWithBaseline } from "./statGroups";
import { normalizeItems, ALWAYS_EXCLUDED_ITEM_NAMES } from "./items";
import { normalizeChampionId } from "./champions";
import { ITEM_TIER, ITEM_TIER_ORDER } from "./itemTiers";
import { AUGMENT_RARITY_ORDER } from "./augments";

// ================= OS PESOS =================
// Um peso é "quantos jogos de evidência vale a expectativa a priori". Com
// peso 30, um item precisa de 30 jogos para a sua própria taxa pesar metade
// da estimativa final; com 90, pesa três quartos.
//
// Estes valores são só o recurso de último minuto: o peso que conta é
// ESTIMADO dos próprios dados, prateleira a prateleira e nível a nível (ver
// estimateWeight). Escolher um número à mão era a parte frágil disto — com
// dados de teste puramente aleatórios, pesos fixos ainda deixavam o topo da
// lista a +16 pontos percentuais, ou seja, inventavam uma recomendação onde
// não havia sinal nenhum. Estimado, esse caso dá zero, que é a resposta
// certa.
//
// Ficam a servir de omissão quando a prateleira tem linhas de menos para a
// estimativa querer dizer algo (menos de três), onde vale mais um valor
// razoável do que uma conta sobre nada.
export const PRIOR = {
  global: 25,
  champion: 30,
  mine: 10,
  solo: 25,
  pair: 35,
};

// Limites do peso estimado. O mínimo impede que uma prateleira com muita
// dispersão real se convença de que dois jogos bastam; o máximo é o "não há
// aqui sinal nenhum", em que a estimativa fica praticamente na média mesmo
// com amostras grandes.
const WEIGHT_MIN = 8;
const WEIGHT_MAX = 600;

// Variância de UMA observação de pódio, em pontos percentuais ao quadrado:
// p(1-p)·10⁴, a variância de uma Bernoulli na escala das percentagens. É o
// quanto uma taxa de pódio oscila por puro acaso, e é a régua contra a qual
// se mede se a dispersão observada entre linhas é sinal ou ruído.
function samplingUnit(rate) {
  const p = Math.min(Math.max((rate || 0) / 100, 0.02), 0.98);
  return p * (1 - p) * 10000;
}

// ================= O PESO, ESTIMADO DOS DADOS =================
// Empirical Bayes pelo método dos momentos. A ideia numa linha: a dispersão
// que se vê entre as linhas de uma prateleira é a soma de duas coisas — a
// dispersão verdadeira (uns itens são mesmo melhores) e a que a amostragem
// produz sozinha. A segunda sabe-se calcular exactamente. O que sobra é a
// primeira, e a razão entre as duas É o peso do encolhimento:
//
//     peso = variância de uma observação / variância verdadeira entre linhas
//
// Daí sai o comportamento que se quer, sem nenhum número escolhido à mão:
//   - prateleira onde os itens diferem muito  -> peso baixo, confia-se nos
//     dados de cada linha depressa;
//   - prateleira onde a dispersão toda se explica por acaso -> peso no
//     máximo, e todas as linhas ficam na média. Nada a recomendar, que é a
//     conclusão honesta.
//
// "samples" são as linhas da prateleira, cada uma com os seus jogos e o seu
// desvio face à média da prateleira (que é zero em média, por construção).
function estimateWeight(samples, baselineRate, fallback) {
  const n = samples.length;
  const games = samples.reduce((sum, r) => sum + r.games, 0);
  if (n < 3 || !games) return fallback;

  const unit = samplingUnit(baselineRate);

  // Dispersão observada dos desvios, ponderada pelos jogos de cada linha.
  const observed = samples.reduce((sum, r) => sum + r.games * r.delta * r.delta, 0) / games;
  // A parte dela que a amostragem explica por si: cada linha contribui
  // unit/jogos, e a média ponderada disso é n·unit/total.
  const noise = (n * unit) / games;

  // A dispersão observada é ela própria uma média de n termos e traz o seu
  // erro: cerca de sqrt(2/n) em termos relativos. Exigir que a dispersão real
  // sobreviva a um erro padrão disso é o que impede uma prateleira com poucas
  // linhas de se convencer de que há sinal onde só há ruído — e sem isto era
  // exactamente o que acontecia ao nível "as minhas partidas", onde há
  // dezenas de linhas de uma ou duas observações: metade das vezes a conta
  // caía no peso mínimo e devolvia ao ruído todo o peso que lhe tinha sido
  // tirado.
  const real = observed - noise - observed * Math.sqrt(2 / n);
  if (real <= 0) return WEIGHT_MAX;

  return Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, unit / real));
}

// A sinergia é a parte mais frágil da conta (amostras menores, mais pares a
// olhar) e não pode mandar na recomendação. Isto limita-a a uma correção de
// alguns pontos percentuais: chega para desempatar e para reordenar peças
// parecidas, não chega para pôr um item fraco no topo.
const SYNERGY_CAP = 8;

// Quantas peças tem uma build de Arena, por prateleira. Seis compras: a
// Arena só deixa levar UM prismático e umas botas, o resto do inventário é
// Legendary. A sétima slot é o trinket, que vem de graça e não se escolhe.
export const BUILD_SLOTS = [
  { tier: ITEM_TIER.PRISMATIC, count: 1 },
  { tier: ITEM_TIER.LEGENDARY, count: 4 },
  { tier: ITEM_TIER.BOOTS, count: 1 },
];

// Confiança do que se está a dizer, para a interface poder marcá-la em vez
// de mostrar todos os números com o mesmo aplomb. Os cortes são sobre a
// amostra REAL de cada linha, não sobre a amostra da tab.
export const CONFIDENCE = { HIGH: "high", MEDIUM: "medium", LOW: "low" };

function confidenceOf(support) {
  const mine = support.mine || 0;
  const champion = support.champion || 0;
  if (mine >= 12 || champion >= 40) return CONFIDENCE.HIGH;
  if (mine >= 5 || champion >= 12) return CONFIDENCE.MEDIUM;
  return CONFIDENCE.LOW;
}

function clamp(value, limit) {
  return Math.max(-limit, Math.min(limit, value));
}

// ================= UM NÍVEL DE EVIDÊNCIA =================
// Recebe as linhas já calculadas pelo itemStats/augmentStats e parte-as por
// prateleira com a média de cada uma (ver lib/statGroups.js). O "delta" que
// vem de lá é exactamente o que este motor precisa: o desvio observado face
// à média da PRÓPRIA prateleira, dentro desta população.
//
// Centrar em cada nível é o que permite encadeá-los. Um campeão forte tem
// todos os itens acima da média geral; se os níveis fossem comparados em
// taxas absolutas, a estimativa do campeão forte herdava a força do campeão
// e não dizia nada sobre o item. Em desvios, a força do campeão desaparece
// das duas pontas e o que sobra é comparável.
function makeLevel(name, fallbackWeight, rows, idKey, shelfOf, order) {
  const shelves = groupWithBaseline(rows, (r) => shelfOf(r[idKey]), { order });

  const baselines = new Map();
  const weights = new Map();
  const byId = new Map();

  for (const g of shelves) {
    baselines.set(g.key, { top3Rate: g.baseline.top3Rate, picks: g.baseline.picks });
    // O peso é por prateleira, não por nível: os prismáticos diferem muito
    // mais entre si do que as botas, e um peso único para as duas tratava a
    // dispersão real de uma como o ruído da outra.
    weights.set(g.key, estimateWeight(g.rows, g.baseline.top3Rate, fallbackWeight));
    for (const r of g.rows) byId.set(String(r[idKey]), r);
  }

  return {
    name,
    baselines,
    byId,
    weightFor: (shelf) => weights.get(shelf) ?? fallbackWeight,
  };
}

// O encadeamento propriamente dito, do nível mais largo para o mais estreito.
//
// Devolve, por id: o desvio estimado ("effect"), quanto cada nível contribuiu
// para ele ("shares"), a amostra de cada nível ("support") e os números crus
// do nível mais estreito que tem dados — estes últimos só para mostrar, nunca
// para ordenar.
function blendLevels(levels, ids, shelfOf) {
  const out = [];

  for (const id of ids) {
    const shelf = shelfOf(id);
    if (shelf == null) continue;

    let effect = 0;
    const support = {};
    const shares = [];

    // Os números crus do nível mais estreito com dados — é o que responde a
    // "isto vem de quantos jogos e com que taxa", e tem de ser o nível mais
    // específico, porque é esse que o utilizador pensa estar a ver.
    let raw = null;

    for (const level of levels) {
      const row = level.byId.get(id);
      const games = row?.games || 0;
      support[level.name] = games;

      // A fatia deste nível na estimativa final. Sem jogos é zero e o nível
      // passa ao lado sem mexer em nada.
      const own = games / (games + level.weightFor(shelf));

      for (const s of shares) s.share *= 1 - own;
      shares.push({ level: level.name, share: own });

      effect = (row?.delta ?? 0) * own + effect * (1 - own);

      if (games > 0) {
        raw = {
          games,
          wins: row.wins,
          top3: row.top3,
          winRate: row.winRate,
          top3Rate: row.top3Rate,
          avgPlacement: row.avgPlacement,
          observed: row.delta,
        };
      }
    }

    // De onde vem, na prática, o número que se está a mostrar. É isto que
    // deixa a interface escrever "pelos teus jogos" ou "pelos dados gerais"
    // em vez de apresentar tudo como se fosse pessoal.
    const evidence = shares.reduce(
      (a, b) => (b.share > a.share ? b : a),
      shares[0] || { level: "global" }
    );

    out.push({
      id: String(id),
      shelf,
      effect,
      support,
      shares,
      evidence: evidence.level,
      confidence: confidenceOf(support),
      ...(raw || {
        games: 0,
        wins: 0,
        top3: 0,
        winRate: 0,
        top3Rate: 0,
        avgPlacement: null,
        observed: 0,
      }),
    });
  }

  return out;
}

// A média a mostrar ao lado do título da prateleira. Prefere-se a do campeão
// (é contra ela que a escolha real se faz) mas só quando tem observações que
// cheguem; senão cai para a geral. A do nível "mine" nunca serve: muda de
// partida para partida e fazia o número de referência saltar.
const BASELINE_MIN_PICKS = 10;

function shelfBaseline(levels, shelf) {
  let chosen = { top3Rate: 0, picks: 0 };

  for (const level of levels) {
    if (level.name === "mine") continue;
    const b = level.baselines.get(shelf);
    if (!b) continue;
    if (b.picks >= BASELINE_MIN_PICKS) chosen = b;
    else if (!chosen.picks) chosen = b;
  }

  return chosen;
}

// ================= PARES =================
// Conta, na população de todos os jogadores, quantas vezes cada par apareceu
// junto e com que resultado. Três mapas porque são três perguntas diferentes:
// item+item (a build), augment+augment (o caminho dos augments) e
// item+augment (a ponte entre os dois, que é o que permite dizer "com este
// augment compra aquilo").
//
// Só participantes com lugar exato, e só itens COM prateleira — sem este
// segundo filtro os pares enchiam-se de consumíveis e de poções, que
// aparecem em todo o lado e não são escolhas.
export function collectCombos(
  matches,
  { championId = null, champions = [], itemTiersMap = null, itemsMap = null } = {}
) {
  const items = new Map();
  const augments = new Map();
  const itemPairs = new Map();
  const augmentPairs = new Map();
  const itemAugment = new Map();
  const total = { games: 0, top3: 0 };

  const bump = (map, key, top3) => {
    const row = map.get(key) || { games: 0, top3: 0 };
    row.games += 1;
    row.top3 += top3;
    map.set(key, row);
  };

  for (const m of matches || []) {
    for (const p of m.participants || []) {
      if (p.placement == null) continue;
      if (championId && normalizeChampionId(p.champion, champions) !== championId) continue;

      const top3 = p.placement <= 3 ? 1 : 0;
      total.games += 1;
      total.top3 += top3;

      const ownItems = [...new Set(normalizeItems(p.items).map((it) => String(it.itemID)))].filter(
        (id) => (!itemTiersMap || itemTiersMap[id]) && !ALWAYS_EXCLUDED_ITEM_NAMES.has(itemsMap?.[id])
      );
      const ownAugments = [...new Set((p.augments || []).map(String))];

      for (const id of ownItems) bump(items, id, top3);
      for (const id of ownAugments) bump(augments, id, top3);

      for (let i = 0; i < ownItems.length; i += 1) {
        for (let j = i + 1; j < ownItems.length; j += 1) {
          bump(itemPairs, comboKey(ownItems[i], ownItems[j]), top3);
        }
      }
      for (let i = 0; i < ownAugments.length; i += 1) {
        for (let j = i + 1; j < ownAugments.length; j += 1) {
          bump(augmentPairs, comboKey(ownAugments[i], ownAugments[j]), top3);
        }
      }
      for (const it of ownItems) {
        for (const a of ownAugments) bump(itemAugment, `${it}|${a}`, top3);
      }
    }
  }

  return { total, items, augments, itemPairs, augmentPairs, itemAugment };
}

// A chave de um par é simétrica — "A com B" e "B com A" são a mesma
// observação e tinham de cair na mesma entrada.
function comboKey(a, b) {
  return String(a) < String(b) ? `${a}|${b}` : `${b}|${a}`;
}

// O desvio de uma peça sozinha, medido contra a média de TODA a população
// (não da prateleira). É a peça de comparação da sinergia e tem de estar na
// mesma escala do par: o par "prismático + botas" também não pertence a
// prateleira nenhuma.
function soloEffect(level, map, id) {
  const row = map.get(String(id));
  if (!row?.games) return 0;
  const observed = (row.top3 / row.games) * 100 - level.base;
  return observed * (row.games / (row.games + PRIOR.solo));
}

// Sinergia: o que o par rende A MAIS do que já se esperava das duas peças
// separadas. A expectativa é aditiva (média da população + desvio de cada
// uma), por isso um par de dois itens bons sai com sinergia zero se render
// exactamente o que dois itens bons rendem — o que é o correcto. Sinergia
// positiva quer dizer que juntos valem mais do que somados.
//
// Encolhida como todo o resto, e contra o mesmo encadeamento de níveis: um
// par visto 4 vezes neste campeão herda o que o par vale em geral.
function comboSynergy(levels, mapName, aId, bId, aMap, bMap) {
  const key = mapName === "itemAugment" ? `${aId}|${bId}` : comboKey(aId, bId);
  let effect = 0;

  for (const level of levels) {
    const pair = level.combos[mapName].get(key);
    const games = pair?.games || 0;
    const own = games / (games + level.pairWeights[mapName]);

    const observed = games
      ? (pair.top3 / pair.games) * 100 -
        level.base -
        soloEffect(level, level.combos[aMap], aId) -
        soloEffect(level, level.combos[bMap], bId)
      : 0;

    effect = observed * own + effect * (1 - own);
  }

  return clamp(effect, SYNERGY_CAP);
}

// ================= A PARTE QUE NÃO DEPENDE DO CAMPEÃO =================
// O nível geral e os pares gerais passam por TODOS os participantes de todas
// as partidas — com um histórico grande são centenas de milhares de
// incrementos. Nada disso muda quando se troca de campeão ou de população,
// por isso fica separado: a interface calcula isto uma vez (memorizado nas
// partidas) e passa-o em "context" a cada conselheiro. Sem esta divisão,
// mudar de campeão no seletor recalculava a parte mais caro de tudo.
export function buildGlobalContext({ matches, itemsMap = null, itemTiersMap = null } = {}) {
  return {
    itemRows: computeItemStats(matches, { allPlayers: true, itemsMap }).rows,
    augmentRows: computeAugmentStats(matches, { allPlayers: true }).rows,
    combos: collectCombos(matches, { itemTiersMap, itemsMap }),
  };
}

// ================= O CONSELHEIRO =================
// Junta tudo e devolve um objecto que a interface consome sem fazer contas:
// prateleiras ordenadas, acesso por id, e as três funções de sinergia já
// ligadas aos níveis certos.
//
// "includeMine" liga o terceiro nível (as minhas partidas com este campeão).
// Desligado, a recomendação é a de todos os jogadores com o campeão; ligado,
// é a mesma coisa ajustada ao que me corre bem — e o ajuste é proporcional à
// evidência, não um corte. É esta a diferença entre os dois botões de
// população, que antes eram duas amostras sem relação uma com a outra.
export function buildAdvisor({
  matches,
  championId = null,
  champions = [],
  itemsMap = null,
  itemTiersMap = null,
  augmentsMap = null,
  includeMine = false,
  context = null,
} = {}) {
  const itemShelfOf = (id) => itemTiersMap?.[id] ?? null;
  const augmentShelfOf = (id) => augmentsMap?.[id]?.rarity ?? null;

  const base = context || buildGlobalContext({ matches, itemsMap, itemTiersMap });

  // ---- níveis dos itens ----
  const itemLevels = [
    makeLevel("global", PRIOR.global, base.itemRows, "itemId", itemShelfOf, ITEM_TIER_ORDER),
  ];

  if (championId) {
    itemLevels.push(
      makeLevel(
        "champion",
        PRIOR.champion,
        computeItemStats(matches, { allPlayers: true, championId, champions, itemsMap }).rows,
        "itemId",
        itemShelfOf,
        ITEM_TIER_ORDER
      )
    );
  }

  if (includeMine) {
    itemLevels.push(
      makeLevel(
        "mine",
        PRIOR.mine,
        computeItemStats(matches, { allPlayers: false, championId, champions, itemsMap }).rows,
        "itemId",
        itemShelfOf,
        ITEM_TIER_ORDER
      )
    );
  }

  // ---- níveis dos augments ----
  const augmentLevels = [
    makeLevel(
      "global",
      PRIOR.global,
      base.augmentRows,
      "augmentId",
      augmentShelfOf,
      AUGMENT_RARITY_ORDER
    ),
  ];

  if (championId) {
    augmentLevels.push(
      makeLevel(
        "champion",
        PRIOR.champion,
        computeAugmentStats(matches, { allPlayers: true, championId, champions }).rows,
        "augmentId",
        augmentShelfOf,
        AUGMENT_RARITY_ORDER
      )
    );
  }

  if (includeMine) {
    augmentLevels.push(
      makeLevel(
        "mine",
        PRIOR.mine,
        computeAugmentStats(matches, { allPlayers: false, championId, champions }).rows,
        "augmentId",
        augmentShelfOf,
        AUGMENT_RARITY_ORDER
      )
    );
  }

  const items = assemble(itemLevels, itemShelfOf, ITEM_TIER_ORDER);
  const augments = assemble(augmentLevels, augmentShelfOf, AUGMENT_RARITY_ORDER);

  // ---- níveis dos pares ----
  const comboLevels = [withBase(base.combos)];
  if (championId) {
    comboLevels.push(
      withBase(collectCombos(matches, { championId, champions, itemTiersMap, itemsMap }))
    );
  }

  return {
    championId,
    items,
    augments,
    levels: { items: itemLevels, augments: augmentLevels, combos: comboLevels },
    itemSynergy: (a, b) => comboSynergy(comboLevels, "itemPairs", a, b, "items", "items"),
    augmentSynergy: (a, b) =>
      comboSynergy(comboLevels, "augmentPairs", a, b, "augments", "augments"),
    itemAugmentSynergy: (itemId, augmentId) =>
      comboSynergy(comboLevels, "itemAugment", itemId, augmentId, "items", "augments"),
  };
}

// Um nível de pares, com a média da população e o peso de encolhimento de
// cada um dos três mapas — estimado dos próprios pares, pela mesma conta das
// prateleiras. É aqui que isto mais se nota: havendo interacção verdadeira
// entre peças, os pares que a têm sobressaem; não havendo, a sinergia toda
// colapsa para zero e a build volta a ser escolhida só pelo mérito de cada
// peça. Antes, com um peso fixo, um par visto poucas vezes conseguia inventar
// um "combina com" que não existia.
function withBase(combos) {
  const level = {
    combos,
    base: combos.total.games ? (combos.total.top3 / combos.total.games) * 100 : 0,
  };

  level.pairWeights = {
    itemPairs: estimatePairWeight(level, "itemPairs", "items", "items"),
    augmentPairs: estimatePairWeight(level, "augmentPairs", "augments", "augments"),
    itemAugment: estimatePairWeight(level, "itemAugment", "items", "augments"),
  };

  return level;
}

// Nota sobre a conta: ao contrário dos desvios de uma prateleira, estas
// sinergias não têm média zero por construção — se o modelo aditivo tender a
// sobrestimar, há um desvio sistemático. Esse desvio entra como dispersão e
// portanto AUMENTA o encolhimento, que é o lado seguro para errar.
function estimatePairWeight(level, mapName, aMap, bMap) {
  const samples = [];

  for (const [key, pair] of level.combos[mapName]) {
    if (!pair.games) continue;
    const [a, b] = key.split("|");
    samples.push({
      games: pair.games,
      delta:
        (pair.top3 / pair.games) * 100 -
        level.base -
        soloEffect(level, level.combos[aMap], a) -
        soloEffect(level, level.combos[bMap], b),
    });
  }

  return estimateWeight(samples, level.base, PRIOR.pair);
}

// Prateleiras prontas a desenhar + acesso por id. Uma linha entra se tiver
// alguma observação no campeão (ou em mim) ou se a amostra geral for sólida —
// é esta segunda cláusula que faz a tab ter o que dizer sobre um campeão que
// nunca se jogou, em vez de aparecer vazia.
const GLOBAL_ONLY_MIN_GAMES = 20;

function assemble(levels, shelfOf, order) {
  const ids = new Set();
  for (const level of levels) for (const id of level.byId.keys()) ids.add(id);

  const rows = blendLevels(levels, ids, shelfOf).filter(
    (r) =>
      (r.support.champion || 0) > 0 ||
      (r.support.mine || 0) > 0 ||
      (r.support.global || 0) >= GLOBAL_ONLY_MIN_GAMES
  );

  const byId = new Map(rows.map((r) => [r.id, r]));

  const byShelf = new Map();
  for (const row of rows) {
    if (!byShelf.has(row.shelf)) byShelf.set(row.shelf, []);
    byShelf.get(row.shelf).push(row);
  }

  const keys = [
    ...order.filter((k) => byShelf.has(k)),
    ...[...byShelf.keys()].filter((k) => !order.includes(k)),
  ];

  const shelves = keys.map((key) => ({
    key,
    baseline: shelfBaseline(levels, key),
    rows: byShelf.get(key).sort((a, b) => b.effect - a.effect),
  }));

  return { shelves, byId, rows };
}

// ================= A BUILD SUGERIDA =================
// Não é "os seis itens com maior desvio": é um conjunto construído peça a
// peça, em que cada peça é escolhida já a saber o que está no resto da build.
//
// A ordem por que as slots se preenchem é a ordem por que as decisões se
// tomam a jogar — primeiro o prismático (a escolha única que define a
// partida), depois o corpo da build, as botas no fim. Isso faz com que a
// sinergia empurre sempre na direcção certa: os Legendary são escolhidos para
// acompanhar o prismático, e não o contrário.
//
// "owned" (o inventário ao vivo) não é um filtro, é um ponto de partida: as
// peças já compradas tomam as suas slots, e as que faltam são escolhidas para
// combinar com elas. É a diferença entre uma lista que se leria num site e um
// conselho sobre a partida que está a acontecer.
//
// "takenAugments" faz o mesmo pelo outro lado — nada nos dados ao vivo diz
// que augments se levou (a Riot não os expõe), por isso vêm de quem estiver a
// usar a app os marcar. Com eles, a build passa a ser escolhida para os
// acompanhar.
export function suggestBuild(
  advisor,
  { owned = [], takenAugments = [], slots = BUILD_SLOTS } = {}
) {
  const ownedIds = [...new Set(normalizeItems(owned).map((it) => String(it.itemID)))];
  const taken = [...new Set((takenAugments || []).map(String))];

  const ownedByTier = new Map();
  for (const id of ownedIds) {
    const row = advisor.items.byId.get(id);
    const tier = row?.shelf;
    if (!tier) continue;
    if (!ownedByTier.has(tier)) ownedByTier.set(tier, []);
    ownedByTier.get(tier).push(row);
  }

  const chosen = [];
  const used = new Set();
  const result = [];

  // A pontuação de um candidato: o seu próprio desvio mais a sinergia MÉDIA
  // com o que já está na build. Média e não soma — com soma, uma build de
  // cinco peças dava sempre mais sinergia total do que uma de duas e a
  // pontuação crescia com o tamanho da build em vez de medir o encaixe.
  const score = (row) => {
    let synergy = 0;

    if (chosen.length) {
      synergy +=
        chosen.reduce((sum, c) => sum + advisor.itemSynergy(row.id, c.id), 0) / chosen.length;
    }
    if (taken.length) {
      synergy +=
        taken.reduce((sum, a) => sum + advisor.itemAugmentSynergy(row.id, a), 0) / taken.length;
    }

    return { total: row.effect + synergy, synergy };
  };

  for (const slot of slots) {
    const shelf = advisor.items.shelves.find((s) => s.key === slot.tier);
    const already = ownedByTier.get(slot.tier) || [];

    // As que já estão compradas ocupam as suas slots primeiro — e entram em
    // "chosen", porque é com elas que as restantes têm de combinar.
    for (const row of already.slice(0, slot.count)) {
      used.add(row.id);
      chosen.push(row);
      result.push({ tier: slot.tier, row, owned: true, reasons: [], synergy: 0 });
    }

    const open = slot.count - Math.min(already.length, slot.count);

    for (let i = 0; i < open; i += 1) {
      const candidates = (shelf?.rows || []).filter((r) => !used.has(r.id));
      if (!candidates.length) break;

      let best = null;
      for (const row of candidates) {
        const s = score(row);
        if (!best || s.total > best.score) best = { row, score: s.total, synergy: s.synergy };
      }

      // Uma peça abaixo da média da prateleira não é conselho: é melhor a
      // slot ficar vazia e dizer-se que não há nada a recomendar. Vale para
      // as sugestões, não para o que já está comprado.
      if (!best || best.score <= 0) break;

      used.add(best.row.id);
      result.push({
        tier: slot.tier,
        row: best.row,
        owned: false,
        synergy: best.synergy,
        reasons: reasonsFor(advisor, best.row, chosen, taken, best.synergy),
      });
      chosen.push(best.row);
    }
  }

  // A próxima compra: a primeira slot da build que ainda não está no
  // inventário. Com a build já construída pela ordem das decisões, a
  // "primeira" é literalmente a próxima — não há aqui mais nenhuma conta.
  const nextBuy = result.find((s) => !s.owned) || null;

  const suggested = result.filter((s) => !s.owned);

  return {
    slots: result,
    nextBuy,
    // O desvio médio das peças sugeridas. Médio e não somado, porque somar
    // seis desvios dava um número enorme que ninguém sabe interpretar — e que
    // seria falso, por os desvios não serem aditivos.
    lift: suggested.length ? suggested.reduce((n, s) => n + s.row.effect, 0) / suggested.length : 0,
    confidence: weakest(suggested.map((s) => s.row.confidence)),
  };
}

// A confiança de um conjunto é a da sua peça mais fraca — uma build com cinco
// peças sólidas e uma adivinhada não é uma build sólida.
function weakest(list) {
  if (list.includes(CONFIDENCE.LOW)) return CONFIDENCE.LOW;
  if (list.includes(CONFIDENCE.MEDIUM)) return CONFIDENCE.MEDIUM;
  return list.length ? CONFIDENCE.HIGH : CONFIDENCE.LOW;
}

// Porque é que esta peça está aqui. Duas razões no máximo, e sempre as
// concretas: de onde vêm os dados, e com o que é que encaixa. Uma
// recomendação sem o "porquê" obriga a acreditar nela; com o porquê, dá para
// discordar — e discordar de uma linha é melhor do que desconfiar da tab
// toda.
function reasonsFor(advisor, row, chosen, taken, synergy) {
  const reasons = [{ kind: "evidence", level: row.evidence, games: row.support[row.evidence] || 0 }];

  if (synergy > 0.5) {
    let best = null;

    for (const c of chosen) {
      const value = advisor.itemSynergy(row.id, c.id);
      if (!best || value > best.value) best = { value, with: c.id, type: "item" };
    }
    for (const a of taken) {
      const value = advisor.itemAugmentSynergy(row.id, a);
      if (!best || value > best.value) best = { value, with: a, type: "augment" };
    }

    if (best && best.value > 0.5) {
      reasons.push({ kind: "synergy", with: best.with, type: best.type, value: best.value });
    }
  }

  return reasons;
}

// ================= OS AUGMENTS A ESCOLHER =================
// A Arena oferece três augments da mesma raridade de cada vez, e a escolha é
// obrigatória: ao contrário dos itens, não há a opção de não levar nenhum. Por
// isso aqui não se exige desvio positivo — mostra-se o melhor do que há,
// mesmo quando o melhor é mau, porque é isso que vai acontecer na ronda.
//
// O que muda face a ordenar por desvio: os já levados saem da lista (não
// voltam a ser oferecidos) e os que sobram são pontuados a saber o que já
// está na conta — augments e itens. É o mesmo princípio da build: a terceira
// escolha depende das duas primeiras.
export function suggestAugments(
  advisor,
  { taken = [], owned = [], perRarity = 3, rarities = AUGMENT_RARITY_ORDER } = {}
) {
  const takenIds = [...new Set((taken || []).map(String))];
  const ownedIds = [...new Set(normalizeItems(owned).map((it) => String(it.itemID)))];

  const score = (row) => {
    let synergy = 0;

    if (takenIds.length) {
      synergy +=
        takenIds.reduce((sum, a) => sum + advisor.augmentSynergy(row.id, a), 0) / takenIds.length;
    }
    if (ownedIds.length) {
      synergy +=
        ownedIds.reduce((sum, it) => sum + advisor.itemAugmentSynergy(it, row.id), 0) /
        ownedIds.length;
    }

    return synergy;
  };

  return advisor.augments.shelves
    .filter((shelf) => rarities.includes(shelf.key))
    .map((shelf) => {
      const rows = shelf.rows
        .filter((r) => !takenIds.includes(r.id))
        .map((row) => {
          const synergy = score(row);
          return {
            ...row,
            synergy,
            total: row.effect + synergy,
            reasons: augmentReasons(advisor, row, takenIds, ownedIds, synergy),
          };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, perRarity);

      return { key: shelf.key, baseline: shelf.baseline, rows };
    })
    .filter((shelf) => shelf.rows.length > 0);
}

function augmentReasons(advisor, row, taken, owned, synergy) {
  const reasons = [{ kind: "evidence", level: row.evidence, games: row.support[row.evidence] || 0 }];

  if (synergy > 0.5) {
    let best = null;

    for (const a of taken) {
      const value = advisor.augmentSynergy(row.id, a);
      if (!best || value > best.value) best = { value, with: a, type: "augment" };
    }
    for (const it of owned) {
      const value = advisor.itemAugmentSynergy(it, row.id);
      if (!best || value > best.value) best = { value, with: it, type: "item" };
    }

    if (best && best.value > 0.5) {
      reasons.push({ kind: "synergy", with: best.with, type: best.type, value: best.value });
    }
  }

  return reasons;
}
