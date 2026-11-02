import { describe, it, expect } from "vitest";
import { splitSessions, normalizedPlacement } from "./sessionCurve";

// Constrói uma partida com um "created_at" a N minutos do início da série.
// As listas destes testes são escritas da mais ANTIGA para a mais recente
// (lê-se melhor) e invertidas no fim com "feed", porque é ao contrário que a
// app entrega as partidas (ver db/api.js).
const BASE = new Date("2026-08-01T20:00:00Z").getTime();

const match = (minutesFromStart, placement, teamSize = 3) => ({
  created_at: new Date(BASE + minutesFromStart * 60000).toISOString(),
  placement,
  team_size: teamSize,
});

// A ordem que a app usa: da mais recente para a mais antiga.
const feed = (list) => [...list].reverse();

describe("normalizedPlacement", () => {
  it("deixa o formato de hoje (6 equipas) intacto", () => {
    expect(normalizedPlacement(match(0, 1))).toBe(1);
    expect(normalizedPlacement(match(0, 4))).toBe(4);
    expect(normalizedPlacement(match(0, 6))).toBe(6);
  });

  it("põe o formato antigo (8 equipas) na mesma escala", () => {
    // Extremos ancorados: 1º continua 1º, último continua último.
    expect(normalizedPlacement(match(0, 1, 2))).toBe(1);
    expect(normalizedPlacement(match(0, 8, 2))).toBe(6);

    // O 4º de 8 estava a meio da tabela; na escala de 6 aterra pouco acima do
    // meio, e NÃO em 4º (que em 6 equipas já é a metade de baixo). É esta a
    // correção que impede as partidas antigas de puxarem a média.
    const fourthOfEight = normalizedPlacement(match(0, 4, 2));
    expect(fourthOfEight).toBeCloseTo(3.14, 2);
    expect(fourthOfEight).toBeLessThan(4);
  });

  it("ignora partidas sem lugar registado", () => {
    expect(normalizedPlacement(match(0, null))).toBeNull();
    expect(normalizedPlacement(undefined)).toBeNull();
  });
});

describe("splitSessions", () => {
  it("parte quando o intervalo passa dos 90 minutos", () => {
    const sessions = splitSessions(
      feed([match(0, 1), match(20, 2), match(200, 3), match(220, 4)])
    );

    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toHaveLength(2);
    expect(sessions[1]).toHaveLength(2);
  });

  it("mantém junto o que está dentro do intervalo", () => {
    const sessions = splitSessions(feed([match(0, 1), match(80, 2), match(160, 3)]));
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toHaveLength(3);
  });

  it("não se engasga com listas vazias ou sem data", () => {
    expect(splitSessions([])).toEqual([]);
    expect(splitSessions([{ placement: 1 }])).toEqual([]);
  });
});
