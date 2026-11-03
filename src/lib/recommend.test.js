import { describe, it, expect } from "vitest";
import { buildAdvisor, suggestBuild, suggestAugments, collectCombos } from "./recommend";

const CHAMPIONS = [
  { id: "Jhin", name: "Jhin" },
  { id: "Darius", name: "Darius" },
];

// 300/301 prismáticos, 100-104 Legendary, 400 botas — a grelha de tiers que
// o itemTiers deriva dos preços, aqui escrita à mão.
const TIERS = {
  300: "prismatic",
  301: "prismatic",
  100: "legendary",
  101: "legendary",
  102: "legendary",
  103: "legendary",
  104: "legendary",
  400: "boots",
};

// 10/11 prismáticos, 30/31 de ouro.
const AUGMENTS = {
  10: { id: 10, rarity: 2 },
  11: { id: 11, rarity: 2 },
  30: { id: 30, rarity: 1 },
  31: { id: 31, rarity: 1 },
};

// "n" partidas em que um participante ficou num lugar com um conjunto de
// itens/augments. Uma partida por observação é o mais simples de ler e dá
// exactamente a mesma conta que participantes empilhados na mesma partida.
function pool(spec) {
  const matches = [];
  for (const s of spec) {
    for (let i = 0; i < (s.n ?? 1); i += 1) {
      matches.push({
        participants: [
          {
            champion: s.champion || "Jhin",
            placement: s.placement,
            items: s.items || [],
            augments: s.augments || [],
          },
        ],
      });
    }
  }
  return matches;
}

const advisorFor = (matches, opts = {}) =>
  buildAdvisor({
    matches,
    champions: CHAMPIONS,
    itemTiersMap: TIERS,
    augmentsMap: AUGMENTS,
    ...opts,
  });

const itemEffect = (advisor, id) => advisor.items.byId.get(String(id)).effect;

describe("encolhimento", () => {
  // O defeito que este motor existe para corrigir: ordenar pela percentagem
  // crua punha um item com 2 jogos e 100% de pódio à frente de um com 60
  // jogos e 70%.
  const matches = pool([
    { n: 50, placement: 1, items: [101] },
    { n: 50, placement: 5, items: [101] },
    { n: 42, placement: 1, items: [100] },
    { n: 18, placement: 5, items: [100] },
    { n: 2, placement: 1, items: [102] },
  ]);

  it("põe a amostra grande à frente da percentagem alta e frágil", () => {
    const advisor = advisorFor(matches, { championId: "Jhin" });

    const solid = advisor.items.byId.get("100");
    const thin = advisor.items.byId.get("102");

    // Cru, o frágil parece melhor...
    expect(thin.top3Rate).toBeGreaterThan(solid.top3Rate);
    // ...mas a estimativa já descontada da amostra diz o contrário.
    expect(solid.effect).toBeGreaterThan(thin.effect);

    const legendary = advisor.items.shelves.find((s) => s.key === "legendary");
    expect(legendary.rows[0].id).toBe("100");
  });

  it("deixa a estimativa de uma amostra mínima quase na média", () => {
    const advisor = advisorFor(matches, { championId: "Jhin" });
    const thin = advisor.items.byId.get("102");

    // Observado +40 e tanto; estimado, uma fracção disso.
    expect(thin.observed).toBeGreaterThan(30);
    expect(thin.effect).toBeLessThan(thin.observed / 3);
  });

  it("marca a confiança e a origem de cada linha", () => {
    const advisor = advisorFor(matches, { championId: "Jhin" });

    expect(advisor.items.byId.get("100").confidence).toBe("high");
    expect(advisor.items.byId.get("100").evidence).toBe("champion");
    expect(advisor.items.byId.get("102").confidence).toBe("low");
  });
});

describe("níveis encadeados", () => {
  // O mesmo item, mau em geral e bom neste campeão. A estimativa do campeão
  // tem de se separar da geral quando tem jogos que o sustentem.
  const matches = pool([
    { n: 60, champion: "Darius", placement: 7, items: [103] },
    { n: 140, champion: "Darius", placement: 1, items: [101] },
    { n: 48, champion: "Jhin", placement: 1, items: [103] },
    { n: 12, champion: "Jhin", placement: 7, items: [103] },
    { n: 30, champion: "Jhin", placement: 7, items: [101] },
  ]);

  it("separa o campeão da média geral", () => {
    const jhin = advisorFor(matches, { championId: "Jhin" });
    const darius = advisorFor(matches, { championId: "Darius" });

    expect(itemEffect(jhin, 103)).toBeGreaterThan(0);
    expect(itemEffect(darius, 103)).toBeLessThan(0);
  });

  it("recomenda a um campeão nunca jogado com os dados gerais", () => {
    // Nenhuma observação de Lux em parte nenhuma — antes disto a tab ficava
    // vazia; agora cai no nível de cima e diz de onde veio.
    const advisor = advisorFor(matches, { championId: "Lux" });
    const row = advisor.items.byId.get("101");

    expect(row).toBeTruthy();
    expect(row.support.champion).toBe(0);
    expect(row.evidence).toBe("global");
    expect(row.effect).toBeGreaterThan(0);
  });

  it("só pesa as minhas partidas com includeMine", () => {
    const mineMatches = [
      ...matches,
      // As minhas: Jhin com 102, sempre em primeiro.
      ...Array.from({ length: 20 }, () => ({
        champion: "Jhin",
        placement: 1,
        items: [102],
        augments: [],
        participants: [{ champion: "Jhin", placement: 1, items: [102], augments: [] }],
      })),
    ];

    const without = advisorFor(mineMatches, { championId: "Jhin" });
    const with_ = advisorFor(mineMatches, { championId: "Jhin", includeMine: true });

    expect(with_.items.byId.get("102").support.mine).toBe(20);
    expect(without.items.byId.get("102").support.mine).toBeUndefined();
    expect(with_.items.byId.get("102").evidence).toBe("mine");
  });
});

describe("sinergia e build sugerida", () => {
  // 100 e 101 valem exactamente o mesmo sozinhos (50% de pódio cada), mas
  // 100 só ganha ao lado do prismático 300 e 101 só ganha sem ele. Nenhuma
  // ordenação por desvio individual consegue distinguir os dois; a sinergia
  // consegue.
  const matches = pool([
    { n: 50, placement: 1, items: [300, 100] },
    { n: 50, placement: 5, items: [104, 100] },
    { n: 50, placement: 1, items: [104, 101] },
    { n: 50, placement: 5, items: [300, 101] },
    { n: 40, placement: 5, items: [301, 104] },
    { n: 30, placement: 1, items: [400] },
    { n: 30, placement: 5, items: [400] },
  ]);

  const advisor = advisorFor(matches, { championId: "Jhin" });

  it("mede o par acima da soma das partes", () => {
    expect(advisor.itemSynergy("300", "100")).toBeGreaterThan(2);
    expect(advisor.itemSynergy("300", "101")).toBeLessThan(-2);
  });

  it("dá sinergia nula a um par que nunca apareceu", () => {
    expect(advisor.itemSynergy("100", "101")).toBe(0);
  });

  it("escolhe o Legendary que encaixa no prismático escolhido", () => {
    const build = suggestBuild(advisor);

    expect(build.slots[0].row.id).toBe("300");
    expect(build.slots[1].row.id).toBe("100");

    // Os desvios individuais de 100 e 101 são iguais — foi a sinergia que
    // desempatou, e isso tem de aparecer nas razões.
    expect(itemEffect(advisor, 100)).toBeCloseTo(itemEffect(advisor, 101), 6);
    expect(build.slots[1].reasons.some((r) => r.kind === "synergy" && r.with === "300")).toBe(true);
  });

  it("respeita as slots de cada prateleira", () => {
    const build = suggestBuild(advisor);

    expect(build.slots.filter((s) => s.tier === "prismatic")).toHaveLength(1);
    expect(build.slots.filter((s) => s.tier === "legendary").length).toBeLessThanOrEqual(4);
    expect(build.slots.filter((s) => s.tier === "boots").length).toBeLessThanOrEqual(1);
  });

  it("parte do inventário e diz a próxima compra", () => {
    const build = suggestBuild(advisor, { owned: [300] });

    const prismatic = build.slots.find((s) => s.tier === "prismatic");
    expect(prismatic.owned).toBe(true);
    expect(prismatic.row.id).toBe("300");

    expect(build.nextBuy.owned).toBe(false);
    expect(build.nextBuy.row.id).toBe("100");
  });

  it("não sugere nada abaixo da média da prateleira", () => {
    const build = suggestBuild(advisor);
    const ids = build.slots.map((s) => s.row.id);

    // 301 e 104 estão os dois abaixo da média das respectivas prateleiras.
    expect(ids).not.toContain("301");
    expect(ids).not.toContain("104");
  });

  it("não repete um item já comprado noutra slot", () => {
    const build = suggestBuild(advisor, { owned: [100] });
    const ids = build.slots.map((s) => s.row.id);

    expect(ids.filter((id) => id === "100")).toHaveLength(1);
  });
});

describe("augments sugeridos", () => {
  const matches = pool([
    { n: 50, placement: 1, augments: [10, 30] },
    { n: 50, placement: 5, augments: [10, 31] },
    { n: 50, placement: 1, augments: [11, 31] },
    { n: 50, placement: 5, augments: [11, 30] },
  ]);

  const advisor = advisorFor(matches, { championId: "Jhin" });

  it("tira da lista os que já levei", () => {
    const shelves = suggestAugments(advisor, { taken: [30] });
    const ids = shelves.flatMap((s) => s.rows.map((r) => r.id));

    expect(ids).not.toContain("30");
    expect(ids).toContain("31");
  });

  it("reordena pelo que encaixa no que já levei", () => {
    const neutral = suggestAugments(advisor);
    const withTaken = suggestAugments(advisor, { taken: [30] });

    const prismatic = (shelves) => shelves.find((s) => s.key === 2).rows;

    // Sozinhos valem o mesmo: sem contexto a ordem é arbitrária, com o
    // augment de ouro já levado deixa de ser.
    expect(prismatic(neutral)[0].effect).toBeCloseTo(prismatic(neutral)[1].effect, 6);
    expect(prismatic(withTaken)[0].id).toBe("10");
    expect(prismatic(withTaken)[0].reasons.some((r) => r.kind === "synergy")).toBe(true);
  });

  it("mostra o melhor de cada raridade mesmo quando nenhum está acima da média", () => {
    // Ao contrário dos itens: a ronda obriga a escolher um dos três.
    const shelves = suggestAugments(advisor);
    expect(shelves.find((s) => s.key === 2).rows.length).toBeGreaterThan(0);
  });
});

describe("collectCombos", () => {
  const matches = pool([
    { n: 3, placement: 1, items: [300, 100], augments: [10] },
    { n: 1, placement: 6, items: [300], augments: [10, 11] },
    { n: 2, champion: "Darius", placement: 1, items: [300, 100] },
  ]);

  it("conta pares de itens, de augments e cruzados", () => {
    const combos = collectCombos(matches, { itemTiersMap: TIERS });

    expect(combos.total.games).toBe(6);
    expect(combos.itemPairs.get("100|300")).toEqual({ games: 5, top3: 5 });
    expect(combos.augmentPairs.get("10|11")).toEqual({ games: 1, top3: 0 });
    expect(combos.itemAugment.get("300|10")).toEqual({ games: 4, top3: 3 });
  });

  it("filtra por campeão no participante", () => {
    const combos = collectCombos(matches, {
      championId: "Darius",
      champions: CHAMPIONS,
      itemTiersMap: TIERS,
    });

    expect(combos.total.games).toBe(2);
    expect(combos.itemPairs.get("100|300")).toEqual({ games: 2, top3: 2 });
  });

  it("ignora itens sem prateleira", () => {
    const combos = collectCombos(pool([{ placement: 1, items: [100, 2003] }]), {
      itemTiersMap: TIERS,
    });

    expect(combos.items.has("2003")).toBe(false);
    expect(combos.itemPairs.size).toBe(0);
  });
});
