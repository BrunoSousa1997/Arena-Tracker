import { describe, it, expect } from "vitest";
import { recentRivals, rivalDisplayName, rivalInitials, challengeRecord } from "./challengeRivals";

// Salas como vêm de getChallengeHistory: a fotografia final em "results".
function room({ finishedAt, results, winner = null }) {
  return { finished_at: finishedAt, winner_username: winner, results };
}

function result(username, extra = {}) {
  return { username, riot_game_name: null, riot_tag_line: null, total: 0, rank: 1, ...extra };
}

describe("recentRivals", () => {
  it("exclui a própria conta", () => {
    const rooms = [room({ finishedAt: "2026-01-02", results: [result("me"), result("rita")] })];
    expect(recentRivals(rooms, "me").map((r) => r.username)).toEqual(["rita"]);
  });

  it("ordena pelo desafio mais recente, não por quantas vezes jogaram", () => {
    const rooms = [
      room({ finishedAt: "2026-01-10", results: [result("me"), result("nuno")] }),
      room({ finishedAt: "2026-01-02", results: [result("me"), result("rita")] }),
      room({ finishedAt: "2026-01-01", results: [result("me"), result("rita")] }),
    ];
    expect(recentRivals(rooms, "me").map((r) => r.username)).toEqual(["nuno", "rita"]);
  });

  it("conta quantos desafios partilhados", () => {
    const rooms = [
      room({ finishedAt: "2026-01-02", results: [result("me"), result("rita")] }),
      room({ finishedAt: "2026-01-01", results: [result("me"), result("rita")] }),
    ];
    expect(recentRivals(rooms, "me")[0].challenges).toBe(2);
  });

  it("usa a identidade Riot da participação mais recente", () => {
    const rooms = [
      room({
        finishedAt: "2026-01-01",
        results: [result("rita", { riot_game_name: "RitaVelha", riot_tag_line: "EUW" })],
      }),
      room({
        finishedAt: "2026-02-01",
        results: [result("rita", { riot_game_name: "RitaNova", riot_tag_line: "PT1" })],
      }),
    ];
    const [rita] = recentRivals(rooms, "me");
    expect(rivalDisplayName(rita)).toBe("RitaNova#PT1");
  });

  it("respeita o limite", () => {
    const rooms = ["a", "b", "c"].map((u, i) =>
      room({ finishedAt: `2026-01-0${i + 1}`, results: [result(u)] })
    );
    expect(recentRivals(rooms, "me", { limit: 2 })).toHaveLength(2);
  });

  it("aguenta salas sem results", () => {
    expect(recentRivals([{ finished_at: "2026-01-01" }, null], "me")).toEqual([]);
    expect(recentRivals(null, "me")).toEqual([]);
  });
});

describe("rivalDisplayName / rivalInitials", () => {
  it("cai no username quando não há identidade Riot", () => {
    expect(rivalDisplayName({ username: "bruno" })).toBe("bruno");
    expect(rivalInitials({ username: "bruno" })).toBe("BR");
  });

  it("usa duas palavras do nome quando existem", () => {
    expect(rivalInitials({ riotGameName: "Dark Wolf" })).toBe("DW");
  });
});

describe("challengeRecord", () => {
  it("conta jogados, vitórias individuais e em equipa, e a melhor pontuação", () => {
    const rooms = [
      room({ finishedAt: "2026-01-03", winner: "me", results: [result("me", { total: 120 })] }),
      room({ finishedAt: "2026-01-02", results: [result("me", { total: 40, won: true })] }),
      room({ finishedAt: "2026-01-01", results: [result("me", { total: 10 })] }),
    ];
    expect(challengeRecord(rooms, "me")).toEqual({
      played: 3,
      won: 2,
      bestScore: 120,
      winRate: 67,
    });
  });

  it("sem desafios devolve zeros", () => {
    expect(challengeRecord([], "me")).toEqual({ played: 0, won: 0, bestScore: 0, winRate: 0 });
  });
});
