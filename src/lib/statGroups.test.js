import { describe, it, expect } from "vitest";
import { groupWithBaseline } from "./statGroups";

// Linhas no formato que o computeAugmentStats/computeItemStats devolvem.
const row = (id, games, top3, wins = 0) => ({
  id,
  games,
  top3,
  wins,
  top3Rate: (top3 / games) * 100,
  delta: 0,
});

describe("groupWithBaseline", () => {
  it("recalcula o delta contra a média do próprio grupo", () => {
    // Grupo A: 50% de pódio no total. A linha de 80% fica +30, a de 20% fica -30.
    const groups = groupWithBaseline(
      [row("a1", 10, 8), row("a2", 10, 2)],
      () => "A"
    );

    expect(groups[0].baseline.top3Rate).toBe(50);
    expect(groups[0].rows.find((r) => r.id === "a1").delta).toBe(30);
    expect(groups[0].rows.find((r) => r.id === "a2").delta).toBe(-30);
  });

  // O ponto de tudo isto: um grupo forte e um grupo fraco deixam de se
  // contaminar. Sem separação, TODAS as linhas do grupo forte davam positivo.
  it("um grupo forte não empurra o outro para negativo", () => {
    const groups = groupWithBaseline(
      [row("forte1", 10, 9), row("forte2", 10, 7), row("fraco1", 10, 3), row("fraco2", 10, 1)],
      (r) => (r.id.startsWith("forte") ? "forte" : "fraco"),
      { order: ["forte", "fraco"] }
    );

    const forte = groups.find((g) => g.key === "forte");
    const fraco = groups.find((g) => g.key === "fraco");

    // Dentro de cada grupo há sempre um acima e um abaixo da própria média.
    expect(forte.rows.map((r) => r.delta)).toEqual([10, -10]);
    expect(fraco.rows.map((r) => r.delta)).toEqual([10, -10]);
  });

  it("respeita a ordem pedida e omite grupos vazios", () => {
    const groups = groupWithBaseline([row("x", 5, 3)], () => "b", { order: ["a", "b", "c"] });
    expect(groups.map((g) => g.key)).toEqual(["b"]);
  });

  it("mostra no fim um grupo fora da ordem esperada em vez de o perder", () => {
    const groups = groupWithBaseline(
      [row("x", 5, 3), row("y", 5, 1)],
      (r) => (r.id === "x" ? "conhecido" : "novo"),
      { order: ["conhecido"] }
    );
    expect(groups.map((g) => g.key)).toEqual(["conhecido", "novo"]);
  });

  it("deixa de fora as linhas sem grupo", () => {
    const groups = groupWithBaseline(
      [row("x", 5, 3), row("y", 5, 1)],
      (r) => (r.id === "x" ? "A" : null)
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].rows.map((r) => r.id)).toEqual(["x"]);
  });

  it("aplica a ordenação pedida dentro de cada grupo", () => {
    const groups = groupWithBaseline(
      [row("baixo", 10, 2), row("alto", 10, 8)],
      () => "A",
      { sort: (a, b) => b.delta - a.delta }
    );
    expect(groups[0].rows.map((r) => r.id)).toEqual(["alto", "baixo"]);
  });

  it("não rebenta sem linhas", () => {
    expect(groupWithBaseline(null, () => "A")).toEqual([]);
  });
});
