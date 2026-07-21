import { describe, it, expect } from "vitest";
import { computeItemStats, recommendCore, coreProgress, sortItemRows } from "./itemStats";

// Atalho: uma partida minha com um lugar, um campeão e uma lista de itens.
const mine = (placement, items, champion = "Jhin") => ({ placement, champion, items });

// Uma partida onde o que interessa são os participantes, não a minha linha.
const withParticipants = (participants) => ({ placement: 1, champion: "Jhin", items: [], participants });

const CHAMPIONS = [{ id: "Jhin", name: "Jhin" }, { id: "Darius", name: "Darius" }];

describe("computeItemStats", () => {
  it("conta jogos, vitórias e pódio por item", () => {
    const { rows } = computeItemStats([
      mine(1, [100, 200]),
      mine(3, [100]),
      mine(7, [100]),
      mine(2, [200]),
    ]);

    const i100 = rows.find((r) => r.itemId === "100");
    expect(i100.games).toBe(3);
    expect(i100.wins).toBe(1);
    expect(i100.top3).toBe(2);
    expect(i100.top3Rate).toBeCloseTo(66.67, 1);
    expect(i100.avgPlacement).toBeCloseTo((1 + 3 + 7) / 3, 5);
  });

  // A razão de existir da deduplicação: o inventário tem 7 slots e pode ter
  // o mesmo item repetido, mas isso é UMA partida, não duas.
  it("conta um item repetido no inventário uma só vez", () => {
    const { rows, baseline } = computeItemStats([mine(1, [100, 100, 100])]);
    expect(rows.find((r) => r.itemId === "100").games).toBe(1);
    expect(baseline.picks).toBe(1);
  });

  it("aceita os dois formatos de item (objetos e ids em bruto)", () => {
    const { rows } = computeItemStats([
      mine(1, [{ itemID: 100, count: 2 }]),
      mine(2, [100]),
    ]);
    expect(rows.find((r) => r.itemId === "100").games).toBe(2);
  });

  it("ignora partidas sem lugar exato", () => {
    const { baseline } = computeItemStats([mine(null, [100]), mine(1, [100])]);
    expect(baseline.picks).toBe(1);
  });

  it("filtra por campeão nas minhas partidas", () => {
    const { rows } = computeItemStats(
      [mine(1, [100], "Jhin"), mine(8, [100], "Darius")],
      { championId: "Jhin", champions: CHAMPIONS }
    );
    expect(rows.find((r) => r.itemId === "100").games).toBe(1);
    expect(rows.find((r) => r.itemId === "100").top3Rate).toBe(100);
  });

  // O filtro por campeão na população "todos" aplica-se ao PARTICIPANTE, não
  // à partida — é isso que faz da amostra grande uma amostra sobre o campeão.
  it("filtra o participante (não a partida) na população de todos", () => {
    const { rows } = computeItemStats(
      [
        withParticipants([
          { champion: "Jhin", placement: 1, items: [100] },
          { champion: "Darius", placement: 8, items: [100] },
        ]),
      ],
      { allPlayers: true, championId: "Jhin", champions: CHAMPIONS }
    );

    const i100 = rows.find((r) => r.itemId === "100");
    expect(i100.games).toBe(1);
    expect(i100.top3Rate).toBe(100);
  });

  it("exclui os itens sem valor informativo quando há itemsMap", () => {
    const { rows } = computeItemStats([mine(1, [100, 3340])], {
      itemsMap: { 100: "Infinity Edge", 3340: "Oracle Lens" },
    });
    expect(rows.map((r) => r.itemId)).toEqual(["100"]);
  });

  // A baseline descreve a população REAL, por isso conta também o item que
  // depois é excluído das linhas.
  it("mantém o item excluído dentro da baseline", () => {
    const { baseline } = computeItemStats([mine(1, [100, 3340])], {
      itemsMap: { 100: "Infinity Edge", 3340: "Oracle Lens" },
    });
    expect(baseline.picks).toBe(2);
  });

  it("o delta é a diferença em pontos face à baseline", () => {
    const { baseline, rows } = computeItemStats([
      mine(1, [100]),
      mine(2, [100]),
      mine(8, [200]),
      mine(7, [200]),
    ]);

    expect(baseline.top3Rate).toBe(50);
    expect(rows.find((r) => r.itemId === "100").delta).toBe(50);
    expect(rows.find((r) => r.itemId === "200").delta).toBe(-50);
  });
});

describe("recommendCore", () => {
  const rows = [
    { itemId: "1", games: 10, delta: 5 },
    { itemId: "2", games: 10, delta: 20 },
    { itemId: "3", games: 2, delta: 40 },
    { itemId: "4", games: 10, delta: -10 },
    { itemId: "5", games: 10, delta: 12 },
  ];

  it("devolve os de maior desvio, por ordem", () => {
    const core = recommendCore(rows, { size: 3, minGames: 5 });
    expect(core.map((r) => r.itemId)).toEqual(["2", "5", "1"]);
  });

  it("exclui os que não passam o mínimo de jogos", () => {
    // O item "3" tem o maior desvio de todos, mas com 2 jogos é ruído.
    const core = recommendCore(rows, { size: 3, minGames: 5 });
    expect(core.map((r) => r.itemId)).not.toContain("3");
  });

  it("nunca recomenda um item abaixo da média", () => {
    const core = recommendCore(rows, { size: 5, minGames: 5 });
    expect(core.map((r) => r.itemId)).not.toContain("4");
  });
});

describe("coreProgress", () => {
  const core = [{ itemId: "100" }, { itemId: "200" }, { itemId: "300" }];

  it("separa o que já se tem do que falta", () => {
    const { have, missing } = coreProgress(core, [{ itemID: 100, count: 1 }, { itemID: 300, count: 1 }]);
    expect(have.map((r) => r.itemId)).toEqual(["100", "300"]);
    expect(missing.map((r) => r.itemId)).toEqual(["200"]);
  });

  it("com o inventário vazio falta tudo", () => {
    const { have, missing } = coreProgress(core, []);
    expect(have).toEqual([]);
    expect(missing).toHaveLength(3);
  });

  it("aceita ids em bruto no inventário", () => {
    const { have } = coreProgress(core, [100]);
    expect(have.map((r) => r.itemId)).toEqual(["100"]);
  });
});

describe("sortItemRows", () => {
  it("aplica o mínimo de jogos antes de ordenar", () => {
    const rows = [
      { itemId: "1", games: 3, delta: 90, winRate: 90 },
      { itemId: "2", games: 20, delta: 5, winRate: 5 },
    ];
    expect(sortItemRows(rows, "delta", 10).map((r) => r.itemId)).toEqual(["2"]);
  });
});
