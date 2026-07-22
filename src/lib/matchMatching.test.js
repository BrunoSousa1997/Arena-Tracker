import { describe, it, expect } from "vitest";
import { findBestSyncedMatch, consumeBestMatches } from "./matchMatching";

// Instante base para as âncoras/created_at dos testes.
const T0 = new Date("2026-07-22T12:00:00.000Z").getTime();
const at = (offsetMs) => new Date(T0 + offsetMs).toISOString();

// Uma linha de "matches" mínima como as que estas funções veem.
function match({ champion, kills = 0, deaths = 0, assists = 0, offsetMs = 0, id = 1 }) {
  return { id, champion, kills, deaths, assists, created_at: at(offsetMs) };
}

describe("findBestSyncedMatch", () => {
  it("casa por campeão + KDA exatos dentro da janela", () => {
    const target = { champion: "Jinx", kills: 5, deaths: 2, assists: 7, anchorTime: at(0) };
    const candidates = [match({ champion: "Jinx", kills: 5, deaths: 2, assists: 7, offsetMs: 60_000, id: 1 })];
    expect(findBestSyncedMatch(target, candidates)?.id).toBe(1);
  });

  it("casa mesmo com o KDA off-by-one (poll final falhado)", () => {
    // Ao vivo ficou 4/2/7; a Riot diz 5/2/7 (o último abate escapou ao poll).
    const target = { champion: "Jinx", kills: 4, deaths: 2, assists: 7, anchorTime: at(0) };
    const candidates = [match({ champion: "Jinx", kills: 5, deaths: 2, assists: 7, offsetMs: 90_000, id: 9 })];
    expect(findBestSyncedMatch(target, candidates)?.id).toBe(9);
  });

  it("desambigua dois jogos com o MESMO KDA pela proximidade no tempo", () => {
    const target = { champion: "Ashe", kills: 3, deaths: 2, assists: 5, anchorTime: at(30 * 60_000) };
    const candidates = [
      match({ champion: "Ashe", kills: 3, deaths: 2, assists: 5, offsetMs: 2 * 60_000, id: 1 }), // longe
      match({ champion: "Ashe", kills: 3, deaths: 2, assists: 5, offsetMs: 31 * 60_000, id: 2 }), // perto
    ];
    expect(findBestSyncedMatch(target, candidates)?.id).toBe(2);
  });

  it("devolve null quando não há candidato", () => {
    const target = { champion: "Lux", kills: 1, deaths: 1, assists: 1, anchorTime: at(0) };
    expect(findBestSyncedMatch(target, [])).toBeNull();
  });

  it("exclui candidatos de campeão diferente", () => {
    const target = { champion: "Lux", kills: 5, deaths: 2, assists: 7, anchorTime: at(0) };
    const candidates = [match({ champion: "Veigar", kills: 5, deaths: 2, assists: 7, offsetMs: 60_000, id: 1 })];
    expect(findBestSyncedMatch(target, candidates)).toBeNull();
  });

  it("exclui candidatos fora da janela temporal", () => {
    const target = { champion: "Jinx", kills: 5, deaths: 2, assists: 7, anchorTime: at(0) };
    const candidates = [
      match({ champion: "Jinx", kills: 5, deaths: 2, assists: 7, offsetMs: 3 * 60 * 60_000, id: 1 }), // +3h
    ];
    expect(findBestSyncedMatch(target, candidates)).toBeNull();
  });

  it("respeita a folga pequena para trás mas rejeita o que está muito antes", () => {
    const target = { champion: "Jinx", kills: 5, deaths: 2, assists: 7, anchorTime: at(0) };
    const before = [match({ champion: "Jinx", kills: 5, deaths: 2, assists: 7, offsetMs: -5 * 60_000, id: 1 })];
    expect(findBestSyncedMatch(target, before)?.id).toBe(1); // 5min antes, dentro da folga
    const wayBefore = [match({ champion: "Jinx", kills: 5, deaths: 2, assists: 7, offsetMs: -30 * 60_000, id: 2 })];
    expect(findBestSyncedMatch(target, wayBefore)).toBeNull(); // 30min antes, fora
  });

  it("rejeita um jogo do mesmo campeão com KDA demasiado diferente", () => {
    const target = { champion: "Jinx", kills: 1, deaths: 0, assists: 0, anchorTime: at(0) };
    const candidates = [match({ champion: "Jinx", kills: 12, deaths: 8, assists: 3, offsetMs: 60_000, id: 1 })];
    expect(findBestSyncedMatch(target, candidates)).toBeNull();
  });

  it("sem âncora, casa só por campeão + KDA", () => {
    const target = { champion: "Jinx", kills: 5, deaths: 2, assists: 7, anchorTime: null };
    const candidates = [match({ champion: "Jinx", kills: 5, deaths: 2, assists: 7, offsetMs: 999 * 60 * 60_000, id: 1 })];
    expect(findBestSyncedMatch(target, candidates)?.id).toBe(1);
  });
});

describe("consumeBestMatches", () => {
  it("dois jogos idênticos não casam com a mesma partida", () => {
    const targets = [
      { champion: "Ashe", kills: 3, deaths: 2, assists: 5, anchorTime: at(0) },
      { champion: "Ashe", kills: 3, deaths: 2, assists: 5, anchorTime: at(35 * 60_000) },
    ];
    const candidates = [
      match({ champion: "Ashe", kills: 3, deaths: 2, assists: 5, offsetMs: 1 * 60_000, id: 1 }),
      match({ champion: "Ashe", kills: 3, deaths: 2, assists: 5, offsetMs: 36 * 60_000, id: 2 }),
    ];
    const pairs = consumeBestMatches(targets, candidates);
    expect(pairs).toHaveLength(2);
    const ids = pairs.map((p) => p.match.id).sort();
    expect(ids).toEqual([1, 2]); // cada alvo consumiu uma partida distinta
  });

  it("só devolve pares para os alvos que arranjaram partida", () => {
    const targets = [
      { champion: "Jinx", kills: 5, deaths: 2, assists: 7, anchorTime: at(0) },
      { champion: "Lux", kills: 1, deaths: 1, assists: 1, anchorTime: at(0) }, // sem candidato
    ];
    const candidates = [match({ champion: "Jinx", kills: 5, deaths: 2, assists: 7, offsetMs: 60_000, id: 1 })];
    const pairs = consumeBestMatches(targets, candidates);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].match.id).toBe(1);
    expect(pairs[0].target.champion).toBe("Jinx");
  });
});
