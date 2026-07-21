// ================= TIER DOS ITENS DA ARENA =================
// A Arena tem três prateleiras de itens e comprar de uma não é alternativa a
// comprar de outra: as botas são um slot à parte, os Legendary são o corpo da
// build e o Prismatic é a escolha única e cara que define a partida. Misturar
// as três numa lista ordenada por desvio dava uma recomendação inútil — os
// prismáticos ganham quase sempre, e "leva um prismático" não é conselho,
// é a descrição do modo de jogo.
//
// O problema é que NADA nos dados diz o tier. Nem o Data Dragon nem o
// Community Dragon têm campo de raridade para itens (os augments têm, os
// itens não). Verificado contra o item.json de 2026-07 (patch 16.14), a
// classificação sai de dois sinais, ambos necessários:
//
//   - PREÇO. Na Arena os preços são fixos por prateleira e não variam de
//     item para item: 2500 é Legendary (118 itens), 2750 é Prismatic (48),
//     500 é botas (8). Não é coincidência nem aproximação — é a grelha de
//     preços do modo, e não há um único item de outro tier nesses valores.
//
//   - GAMA DE IDS 447xxx. Apanha o único prismático que foge ao preço, o
//     Overlord's Bloodmail (447111), que custa 2500 como um Legendary. Sem
//     esta segunda cláusula ia parar à prateleira errada.
//
// Se a Riot mexer na grelha de preços, isto degrada para "sem tier" (o item
// deixa de aparecer nas secções por prateleira) em vez de o classificar mal —
// preferível, porque um item na prateleira errada é uma recomendação errada
// e ninguém repara, enquanto uma prateleira a encolher salta à vista.

export const ITEM_TIER = {
  PRISMATIC: "prismatic",
  LEGENDARY: "legendary",
  BOOTS: "boots",
};

// A ordem por que as prateleiras se mostram: o prismático primeiro porque é
// a escolha que mais muda a partida e a que se decide mais cedo.
export const ITEM_TIER_ORDER = [ITEM_TIER.PRISMATIC, ITEM_TIER.LEGENDARY, ITEM_TIER.BOOTS];

const PRICE_LEGENDARY = 2500;
const PRICE_PRISMATIC = 2750;
const PRICE_BOOTS = 500;

// Mapa 30 = Rings of Wrath, a Arena. Um item que não seja jogável lá não tem
// tier nenhum nesta app, por mais que exista na Summoner's Rift.
const ARENA_MAP_ID = "30";

// "item" é a entrada crua do item.json do Data Dragon.
export function classifyItem(id, item) {
  if (!item) return null;
  if (!(item.maps || {})[ARENA_MAP_ID]) return null;

  const price = item.gold?.total ?? 0;

  // As botas primeiro: são as únicas com uma etiqueta própria a dizer o que
  // são, e o preço delas (500) não colide com mais nada.
  if ((item.tags || []).includes("Boots")) {
    return price === PRICE_BOOTS ? ITEM_TIER.BOOTS : null;
  }

  if (price === PRICE_PRISMATIC || String(id).startsWith("447")) {
    return ITEM_TIER.PRISMATIC;
  }

  if (price === PRICE_LEGENDARY) return ITEM_TIER.LEGENDARY;

  // Consumíveis, vouchers de estatísticas, os passivos que os augments dão
  // (preço 0) e as entradas de montra tipo "Legendary Fighter Item" — nada
  // disto é um item que se recomende.
  return null;
}

// id -> tier, a partir do objeto "data" do item.json. Só inclui os itens que
// têm tier, para o mapa não carregar 700 entradas nulas.
export function buildItemTierMap(data) {
  const map = {};
  for (const [id, item] of Object.entries(data || {})) {
    const tier = classifyItem(id, item);
    if (tier) map[Number(id)] = tier;
  }
  return map;
}
