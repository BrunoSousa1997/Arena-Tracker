import { describe, it, expect } from "vitest";
import { computeAugmentStats, sortAugmentRows, DEFAULT_MIN_GAMES } from "./augmentStats";

// Atalho: uma partida minha com um dado lugar e uma lista de augments.
const mine = (placement, augments) => ({ placement, augments });

describe("computeAugmentStats — as minhas partidas", () => {
  it("conta jogos, vitórias e top 3 por augment", () => {
    const { rows } = computeAugmentStats([
      mine(1, [10, 20]),
      mine(3, [10]),
      mine(7, [10]),
      mine(2, [20]),
    ]);

    const a10 = rows.find((r) => r.augmentId === "10");
    expect(a10.games).toBe(3);
    expect(a10.wins).toBe(1);
    expect(a10.top3).toBe(2);
    expect(a10.winRate).toBeCloseTo(33.33, 1);
    expect(a10.top3Rate).toBeCloseTo(66.67, 1);
    expect(a10.avgPlacement).toBeCloseTo((1 + 3 + 7) / 3, 5);
  });

  it("a baseline é sobre escolhas, não sobre partidas", () => {
    // 2 partidas, 3 escolhas: duas em top 3 (a de lugar 1) e uma fora.
    const { baseline } = computeAugmentStats([mine(1, [10, 20]), mine(6, [10])]);
    expect(baseline.picks).toBe(3);
    expect(baseline.top3Rate).toBeCloseTo(66.67, 1);
    expect(baseline.winRate).toBeCloseTo(66.67, 1);
  });

  it("o delta é a diferença em pontos face à baseline", () => {
    const { baseline, rows } = computeAugmentStats([
      mine(1, [10]),
      mine(2, [10]),
      mine(8, [20]),
      mine(7, [20]),
    ]);

    expect(baseline.top3Rate).toBe(50);
    expect(rows.find((r) => r.augmentId === "10").delta).toBe(50);
    expect(rows.find((r) => r.augmentId === "20").delta).toBe(-50);
  });

  it("ignora partidas sem lugar (capturas ao vivo antigas)", () => {
    const { rows, baseline } = computeAugmentStats([
      mine(null, [10]),
      { win: true, augments: [10] },
      mine(1, [10]),
    ]);

    expect(baseline.picks).toBe(1);
    expect(rows.find((r) => r.augmentId === "10").games).toBe(1);
  });

  it("trata ids numéricos e em texto como o mesmo augment", () => {
    const { rows } = computeAugmentStats([mine(1, [10]), mine(4, ["10"])]);
    expect(rows).toHaveLength(1);
    expect(rows[0].games).toBe(2);
  });

  it("não rebenta com partidas sem augments nem com lista vazia", () => {
    expect(computeAugmentStats([]).rows).toEqual([]);
    expect(computeAugmentStats(undefined).rows).toEqual([]);
    expect(computeAugmentStats([mine(1, undefined)]).rows).toEqual([]);
  });
});

describe("computeAugmentStats — todos os participantes", () => {
  it("usa os augments e o lugar de cada participante", () => {
    const matches = [
      {
        placement: 1,
        augments: [10],
        participants: [
          { placement: 1, augments: [10, 20] },
          { placement: 5, augments: [20] },
        ],
      },
    ];

    const { rows, baseline } = computeAugmentStats(matches, { allPlayers: true });
    expect(baseline.picks).toBe(3);

    const a20 = rows.find((r) => r.augmentId === "20");
    expect(a20.games).toBe(2);
    expect(a20.top3).toBe(1);
  });

  it("a amostra global é maior que a pessoal nos mesmos dados", () => {
    const matches = [
      {
        placement: 1,
        augments: [10],
        participants: [
          { placement: 1, augments: [10] },
          { placement: 2, augments: [10] },
          { placement: 8, augments: [10] },
        ],
      },
    ];

    expect(computeAugmentStats(matches).baseline.picks).toBe(1);
    expect(computeAugmentStats(matches, { allPlayers: true }).baseline.picks).toBe(3);
  });

  it("ignora participantes sem lugar", () => {
    const matches = [{ participants: [{ placement: null, augments: [10] }] }];
    expect(computeAugmentStats(matches, { allPlayers: true }).rows).toEqual([]);
  });
});

describe("sortAugmentRows", () => {
  const rows = [
    { augmentId: "a", games: 10, winRate: 10, top3Rate: 30, delta: -20, avgPlacement: 5 },
    { augmentId: "b", games: 3, winRate: 90, top3Rate: 99, delta: 49, avgPlacement: 1 },
    { augmentId: "c", games: 20, winRate: 50, top3Rate: 60, delta: 10, avgPlacement: 3 },
  ];

  it("esconde augments com amostra pequena demais", () => {
    // "b" tem a melhor taxa de todas, e é exactamente por isso que tem de
    // ficar de fora: 3 jogos não sustentam 99%.
    const out = sortAugmentRows(rows, "top3Rate", DEFAULT_MIN_GAMES);
    expect(out.map((r) => r.augmentId)).toEqual(["c", "a"]);
  });

  it("ordena pelos piores quando pedido", () => {
    const out = sortAugmentRows(rows, "worst", 1);
    expect(out[0].augmentId).toBe("a");
  });

  it("ordena o lugar médio por ordem crescente (menor é melhor)", () => {
    const out = sortAugmentRows(rows, "avgPlacement", 1);
    expect(out.map((r) => r.augmentId)).toEqual(["b", "c", "a"]);
  });

  it("cai para ordenação por jogos com uma chave desconhecida", () => {
    const out = sortAugmentRows(rows, "inexistente", 1);
    expect(out[0].augmentId).toBe("c");
  });
});
