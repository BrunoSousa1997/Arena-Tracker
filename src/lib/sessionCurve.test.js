import { describe, it, expect } from "vitest";
import {
  sessionCurve,
  splitSessions,
  normalizedPlacement,
  MIN_GAMES_PER_BUCKET,
} from "./sessionCurve";

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

describe("sessionCurve", () => {
  it("conta a posição dentro da sentada pela ordem cronológica", () => {
    // Uma sentada: 1º, depois 4º, depois 6º. A app entrega ao contrário —
    // se a curva lesse a lista como vem, a "primeira partida" seria o 6º.
    const { buckets } = sessionCurve(feed([match(0, 1), match(30, 4), match(60, 6)]));

    expect(buckets[0].avgPlacement).toBe(1);
    expect(buckets[1].avgPlacement).toBe(4);
    expect(buckets[2].avgPlacement).toBe(6);
  });

  it("junta no balde-cauda tudo o que passa do máximo", () => {
    const long = Array.from({ length: 9 }, (_, i) => match(i * 20, 3));
    const { buckets } = sessionCurve(feed(long), { maxBucket: 6 });

    expect(buckets).toHaveLength(6);
    expect(buckets[5].isTail).toBe(true);
    // 9 partidas: 5 nos baldes 1-5, as outras 4 na cauda.
    expect(buckets[5].games).toBe(4);
  });

  it("soma sentadas diferentes no mesmo balde", () => {
    const first = [match(0, 1), match(20, 1)];
    const second = [match(300, 5), match(320, 5)];
    const { buckets, sessions } = sessionCurve(feed([...first, ...second]));

    expect(sessions).toBe(2);
    // Duas primeiras-partidas (1º e 5º) e duas segundas-partidas (1º e 5º).
    expect(buckets[0].games).toBe(2);
    expect(buckets[0].avgPlacement).toBe(3);
    expect(buckets[1].avgPlacement).toBe(3);
  });

  it("marca como fraco o balde sem amostra que chegue", () => {
    const { buckets } = sessionCurve(feed([match(0, 1), match(20, 2)]));
    expect(buckets[0].thin).toBe(true);
    expect(buckets[0].games).toBeLessThan(MIN_GAMES_PER_BUCKET);
  });

  it("não emite veredicto sem amostra dos dois lados", () => {
    const { verdict } = sessionCurve(feed([match(0, 1), match(20, 6)]));
    expect(verdict.type).toBe("insufficient");
  });

  // Muitas sentadas de 2 partidas: sempre bom à primeira, mau à segunda.
  // É o padrão que a funcionalidade existe para apanhar.
  const manySessions = (placements) =>
    feed(
      placements.flatMap((pair, s) =>
        pair.map((p, i) => match(s * 300 + i * 20, p))
      )
    );

  it("deteta a descida ao longo da sentada", () => {
    const games = manySessions(Array.from({ length: 10 }, () => [1, 6]));
    const { verdict } = sessionCurve(games);

    expect(verdict.type).toBe("declines");
    expect(verdict.delta).toBeCloseTo(5, 5);
  });

  it("deteta a subida (aquecer a jogar)", () => {
    const games = manySessions(Array.from({ length: 10 }, () => [6, 1]));
    const { verdict } = sessionCurve(games);

    expect(verdict.type).toBe("improves");
    expect(verdict.delta).toBeCloseTo(-5, 5);
  });

  it("chama estável ao que oscila pouco", () => {
    // Meia dúzia de décimas de diferença não é um padrão.
    const games = manySessions([
      ...Array.from({ length: 9 }, () => [3, 3]),
      [3, 4],
    ]);
    const { verdict } = sessionCurve(games);

    expect(verdict.type).toBe("flat");
  });

  it("devolve baldes vazios sem partidas", () => {
    const { buckets, sessions, verdict } = sessionCurve([]);
    expect(sessions).toBe(0);
    expect(verdict.type).toBe("insufficient");
    expect(buckets.every((b) => b.games === 0)).toBe(true);
  });
});
