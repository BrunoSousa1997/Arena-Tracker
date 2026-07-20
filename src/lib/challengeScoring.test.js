import { describe, it, expect } from "vitest";
import {
  scoreGame,
  scorePlayer,
  sumStreakBonus,
  SCORE_POINTS,
  ARCHETYPE_MULTIPLIER,
  CHAMPION_ARCHETYPE,
  DEFAULT_RULES,
} from "./challengeScoring";

// Campeões mínimos só com o que o motor lê (id + tags) — ver
// classMultiplier em challengeScoring.js.
const champions = [
  { id: "Zed", name: "Zed", tags: ["Assassin"] },
  { id: "Leona", name: "Leona", tags: ["Tank", "Support"] },
  { id: "Garen", name: "Garen", tags: ["Fighter", "Tank"] },
  { id: "Unknown", name: "Unknown", tags: [] },
];

// Regras sem handicap — isola a soma de pontos do multiplicador de classe,
// que é testado à parte mais abaixo.
const NO_HANDICAP = { ...DEFAULT_RULES, classHandicap: false };

function game(overrides = {}) {
  return {
    champion: "Unknown",
    kills: 0,
    deaths: 0,
    assists: 0,
    damage_dealt: 0,
    damage_taken: 0,
    healing: 0,
    double_kills: 0,
    triple_kills: 0,
    // Listas explícitas: o motor distingue "[] = não houve sequências" de
    // "ausente = partida importada, reconstrói como puder".
    kill_streaks: [],
    assist_streaks: [],
    death_streaks: [],
    ...overrides,
  };
}

describe("sumStreakBonus", () => {
  // A escalada é POR ABATE dentro da sequência (ver streakBonus):
  //   abate:  1  2  3  4  5  6  7  8  9
  //   extra:  0  0  0 +1 +1 +2 +2 +3 +3
  it("não dá bónus até ao limiar", () => {
    expect(sumStreakBonus([0])).toBe(0);
    expect(sumStreakBonus([3])).toBe(0);
  });

  it("acumula o extra de cada abate acima do limiar", () => {
    expect(sumStreakBonus([4])).toBe(1); // 0+0+0+1
    expect(sumStreakBonus([5])).toBe(2); // 0+0+0+1+1
    expect(sumStreakBonus([6])).toBe(4); // +2
    expect(sumStreakBonus([7])).toBe(6); // +2
    expect(sumStreakBonus([9])).toBe(12);
  });

  it("sobe de nível de 2 em 2 depois do limiar", () => {
    // A diferença entre sequências consecutivas É o extra desse abate.
    const extraAt = (n) => sumStreakBonus([n]) - sumStreakBonus([n - 1]);
    expect(extraAt(4)).toBe(1);
    expect(extraAt(5)).toBe(1);
    expect(extraAt(6)).toBe(2);
    expect(extraAt(7)).toBe(2);
    expect(extraAt(8)).toBe(3);
  });

  it("bate certo com o exemplo de referência: 5 abates = 2+2+2+3+3", () => {
    const kills = 5;
    const total = kills * SCORE_POINTS.kill + sumStreakBonus([kills]);
    expect(total).toBe(12);
  });

  it("devolve SÓ o extra, nunca o valor normal dos abates", () => {
    // Se sumStreakBonus incluísse o valor base de cada abate, uma sequência
    // de 5 daria 12 (ou 10) aqui em vez de 2 — e o total da partida ficaria
    // com os abates contados duas vezes.
    expect(sumStreakBonus([5])).toBe(2);
    expect(sumStreakBonus([5])).toBeLessThan(5 * SCORE_POINTS.kill);
  });

  it("soma TODAS as sequências, não só a maior", () => {
    expect(sumStreakBonus([5, 5])).toBe(4);
    expect(sumStreakBonus([7, 5, 3])).toBe(8);
  });

  it("aguenta entradas em falta ou inválidas", () => {
    expect(sumStreakBonus([])).toBe(0);
    expect(sumStreakBonus(null)).toBe(0);
    expect(sumStreakBonus(undefined)).toBe(0);
  });
});

describe("scoreGame — pontos base", () => {
  it("conta abates, mortes e assistências", () => {
    const res = scoreGame(game({ kills: 3, deaths: 2, assists: 4 }), {
      champions,
      rules: NO_HANDICAP,
    });
    // 3*2 + 2*(-1) + 4*1 = 8
    expect(res.parts.kills).toBe(6);
    expect(res.parts.deaths).toBe(-2);
    expect(res.parts.assists).toBe(4);
    expect(res.total).toBe(8);
  });

  it("mortes tiram pontos", () => {
    const res = scoreGame(game({ deaths: 5 }), { champions, rules: NO_HANDICAP });
    expect(res.total).toBe(-5);
  });

  it("converte dano, cura e dano sofrido por divisão inteira", () => {
    const res = scoreGame(
      game({
        damage_dealt: 25_000, // /10000 -> 2
        healing: 12_000, // /5000  -> 2
        damage_taken: 9_999, // /10000 -> 0 (não chega ao patamar)
      }),
      { champions, rules: NO_HANDICAP }
    );
    expect(res.parts.damage).toBe(2);
    expect(res.parts.healing).toBe(2);
    expect(res.parts.taken).toBe(0);
  });

  it("conta multikills", () => {
    const res = scoreGame(game({ double_kills: 2, triple_kills: 1 }), {
      champions,
      rules: NO_HANDICAP,
    });
    expect(res.parts.doubles).toBe(2 * SCORE_POINTS.doubleKill);
    expect(res.parts.triples).toBe(1 * SCORE_POINTS.tripleKill);
  });
});

describe("scoreGame — sequências", () => {
  it("premeia sequências de abates e assistências", () => {
    const res = scoreGame(game({ kill_streaks: [5], assist_streaks: [7] }), {
      champions,
      rules: NO_HANDICAP,
    });
    expect(res.parts.killStreak).toBe(2);
    expect(res.parts.assistStreak).toBe(6);
  });

  it("penaliza sequências de mortes", () => {
    const res = scoreGame(game({ death_streaks: [5] }), { champions, rules: NO_HANDICAP });
    // Negativo: é a única categoria de sequência que tira pontos.
    expect(res.parts.deathStreak).toBe(-2);
  });

  it("não conta os abates duas vezes quando há sequência", () => {
    // O caso do exemplo de referência, ponta-a-ponta: 5 abates seguidos sem
    // morrer. "kills" traz o valor normal (5x2=10) e "killStreak" SÓ o extra
    // da escalada (+2) — somados dão os 12 esperados. Se alguma das duas
    // parcelas incluísse a outra, o total disparava para 22.
    const res = scoreGame(game({ kills: 5, deaths: 0, kill_streaks: [5] }), {
      champions,
      rules: NO_HANDICAP,
    });

    expect(res.parts.kills).toBe(10);
    expect(res.parts.killStreak).toBe(2);
    expect(res.total).toBe(12);
  });

  it("aplica a mesma escalada às assistências (importa para suportes)", () => {
    // Um suporte raramente faz abates, por isso a escalada tem de valer
    // também para assistências, senão essas classes ficavam de fora do
    // bónus. 5 assistências seguidas sem morrer = 1+1+1+2+2 = 7.
    const res = scoreGame(game({ assists: 5, deaths: 0, assist_streaks: [5] }), {
      champions,
      rules: NO_HANDICAP,
    });

    expect(res.parts.assists).toBe(5);
    expect(res.parts.assistStreak).toBe(2);
    expect(res.total).toBe(7);
  });

  it("a escalada das assistências é igual à dos abates", () => {
    for (const n of [3, 4, 5, 6, 7, 9]) {
      const kill = scoreGame(game({ kills: n, kill_streaks: [n] }), {
        champions,
        rules: NO_HANDICAP,
      });
      const assist = scoreGame(game({ assists: n, assist_streaks: [n] }), {
        champions,
        rules: NO_HANDICAP,
      });
      expect(assist.parts.assistStreak).toBe(kill.parts.killStreak);
    }
  });

  it("aplica a mesma escalada às mortes, mas a tirar (e sem duplicar)", () => {
    // Espelho exato do caso dos abates: 5 mortes seguidas sem abate/assist.
    // "deaths" traz o valor normal (5x-1) e "deathStreak" só o extra da
    // escalada (-2) — ou seja -1-1-1-2-2 = -7.
    const res = scoreGame(game({ deaths: 5, death_streaks: [5] }), {
      champions,
      rules: NO_HANDICAP,
    });

    expect(res.parts.deaths).toBe(-5);
    expect(res.parts.deathStreak).toBe(-2);
    expect(res.total).toBe(-7);
  });

  it("a escalada das mortes é simétrica à dos abates", () => {
    // Mesma sequência, sinal oposto — se um dia divergirem, isto apanha.
    for (const n of [3, 4, 5, 6, 7, 9]) {
      const kill = scoreGame(game({ kills: n, kill_streaks: [n] }), {
        champions,
        rules: NO_HANDICAP,
      });
      const death = scoreGame(game({ deaths: n, death_streaks: [n] }), {
        champions,
        rules: NO_HANDICAP,
      });
      // "|| 0" porque negar 0 dá -0, e o motor devolve sempre +0 quando não
      // há penalização nenhuma (ver deathStreak em scoreGame).
      expect(death.parts.deathStreak).toBe(-kill.parts.killStreak || 0);
    }
  });

  it("trata [] como 'não houve sequências', não como dado em falta", () => {
    // Partida capturada ao vivo, acabada sem morrer, mas sem nenhuma corrida
    // longa o suficiente — não deve cair no fallback de partida importada.
    const res = scoreGame(game({ kills: 9, deaths: 0, kill_streaks: [] }), {
      champions,
      rules: NO_HANDICAP,
    });
    expect(res.parts.killStreak).toBe(0);
  });

  it("reconstrói a sequência quando a partida foi importada sem morrer", () => {
    // Sem kill_streaks (partida da Riot API) e sem mortes: a partida toda é
    // uma sequência só.
    const m = game({ kills: 9, deaths: 0 });
    delete m.kill_streaks;
    delete m.assist_streaks;
    const res = scoreGame(m, { champions, rules: NO_HANDICAP });
    expect(res.parts.killStreak).toBe(sumStreakBonus([9]));
  });

  it("não inventa sequências numa partida importada com mortes", () => {
    // Com mortes pelo meio não há como saber onde as corridas quebraram.
    const m = game({ kills: 9, deaths: 3 });
    delete m.kill_streaks;
    delete m.assist_streaks;
    const res = scoreGame(m, { champions, rules: NO_HANDICAP });
    expect(res.parts.killStreak).toBe(0);
  });

  it("não inventa sequências de mortes se houve abates a interromper", () => {
    const m = game({ kills: 4, deaths: 9 });
    delete m.death_streaks;
    const res = scoreGame(m, { champions, rules: NO_HANDICAP });
    expect(res.parts.deathStreak).toBe(0);
  });
});

describe("scoreGame — handicap por arquétipo", () => {
  it("aplica o multiplicador do arquétipo do campeão", () => {
    // Zed está mapeado como Assassin em CHAMPION_ARCHETYPE — as tags do
    // Data Dragon já não entram nesta conta.
    expect(CHAMPION_ARCHETYPE.Zed).toBe("Assassin");
    const res = scoreGame(game({ champion: "Zed", kills: 5 }), {
      champions,
      rules: DEFAULT_RULES,
    });
    expect(res.multiplier).toBeCloseTo(ARCHETYPE_MULTIPLIER.Assassin, 5);
    expect(res.total).toBeCloseTo(10 * ARCHETYPE_MULTIPLIER.Assassin, 5);
  });

  it("usa o arquétipo próprio, não as tags (Leona é Engage, não Tank/Support)", () => {
    // Era exatamente isto que a versão por tags não conseguia: Leona tem
    // tags Tank/Support, mas o papel real dela na Arena é engage.
    expect(CHAMPION_ARCHETYPE.Leona).toBe("Engage");
    const res = scoreGame(game({ champion: "Leona", kills: 5 }), {
      champions,
      rules: DEFAULT_RULES,
    });
    expect(res.multiplier).toBeCloseTo(ARCHETYPE_MULTIPLIER.Engage, 5);
  });

  it("é neutro para campeões fora do mapa", () => {
    const res = scoreGame(game({ champion: "Unknown", kills: 5 }), {
      champions,
      rules: DEFAULT_RULES,
    });
    expect(res.multiplier).toBe(1);
  });

  it("todos os arquétipos do mapa têm multiplicador definido", () => {
    // Um campeão mapeado para um arquétipo sem valor cairia em silêncio
    // para x1 — este teste transforma esse esquecimento em falha visível.
    for (const arch of new Set(Object.values(CHAMPION_ARCHETYPE))) {
      expect(ARCHETYPE_MULTIPLIER[arch], `arquétipo sem multiplicador: ${arch}`).toBeTypeOf("number");
    }
  });

  it("pode ser desligado sem afetar a base", () => {
    const m = game({ champion: "Zed", kills: 5 });
    const on = scoreGame(m, { champions, rules: DEFAULT_RULES });
    const off = scoreGame(m, { champions, rules: NO_HANDICAP });
    expect(on.base).toBe(off.base);
    expect(off.multiplier).toBe(1);
  });
});

describe("scoreGame — regra 'só KDA'", () => {
  it("ignora dano, cura e multikills mas mantém as sequências", () => {
    const m = game({
      kills: 3,
      deaths: 1,
      assists: 2,
      damage_dealt: 50_000,
      healing: 20_000,
      damage_taken: 30_000,
      double_kills: 3,
      triple_kills: 2,
      kill_streaks: [5],
    });
    const res = scoreGame(m, { champions, rules: { ...NO_HANDICAP, onlyKda: true } });

    expect(res.parts.damage).toBe(0);
    expect(res.parts.healing).toBe(0);
    expect(res.parts.taken).toBe(0);
    expect(res.parts.doubles).toBe(0);
    expect(res.parts.triples).toBe(0);
    // Sequências continuam a contar (são kills/assists).
    expect(res.parts.killStreak).toBe(2);
    // 3*2 - 1 + 2 + 2 = 9
    expect(res.total).toBe(9);
  });
});

describe("scorePlayer", () => {
  it("soma várias partidas", () => {
    const res = scorePlayer([game({ kills: 2 }), game({ kills: 3 })], {
      champions,
      rules: NO_HANDICAP,
    });
    expect(res.countedGames).toBe(2);
    expect(res.total).toBe(10);
  });

  it("sem partidas dá zero", () => {
    const res = scorePlayer([], { champions, rules: NO_HANDICAP });
    expect(res.total).toBe(0);
    expect(res.countedGames).toBe(0);
  });

  it("por omissão não exclui partidas partilhadas com adversários", () => {
    const shared = game({
      kills: 5,
      participants: [{ isSelf: true, name: "Eu#EUW" }, { name: "Rival#EUW" }],
    });
    const res = scorePlayer([shared], {
      champions,
      rules: NO_HANDICAP,
      opponents: [{ name: "Rival#EUW" }],
    });
    expect(res.countedGames).toBe(1);
  });

  it("com 'onlySoloGames' exclui partidas onde caiu um adversário do desafio", () => {
    const shared = game({
      kills: 5,
      participants: [{ isSelf: true, name: "Eu#EUW" }, { name: "Rival#EUW" }],
    });
    const solo = game({
      kills: 5,
      participants: [{ isSelf: true, name: "Eu#EUW" }, { name: "Estranho#EUW" }],
    });

    const res = scorePlayer([shared, solo], {
      champions,
      rules: { ...NO_HANDICAP, onlySoloGames: true },
      opponents: [{ name: "Rival#EUW" }],
    });

    expect(res.countedGames).toBe(1);
    expect(res.total).toBe(10);
  });

  it("com 'onlySoloGames' compara por puuid quando existe", () => {
    const shared = game({
      kills: 5,
      participants: [{ isSelf: true, puuid: "meu" }, { puuid: "rival-puuid" }],
    });
    const res = scorePlayer([shared], {
      champions,
      rules: { ...NO_HANDICAP, onlySoloGames: true },
      opponents: [{ puuid: "rival-puuid" }],
    });
    expect(res.countedGames).toBe(0);
  });

  it("nunca exclui a própria linha ao comparar adversários", () => {
    // "isSelf" tem de ser ignorado, senão um jogador excluía-se a si mesmo.
    const m = game({ kills: 5, participants: [{ isSelf: true, name: "Eu#EUW" }] });
    const res = scorePlayer([m], {
      champions,
      rules: { ...NO_HANDICAP, onlySoloGames: true },
      opponents: [{ name: "Eu#EUW" }],
    });
    expect(res.countedGames).toBe(1);
  });
});

describe("robustez a dados em falta", () => {
  it("aguenta uma partida sem campos nenhuns", () => {
    const res = scoreGame({}, { champions, rules: DEFAULT_RULES });
    expect(res.total).toBe(0);
    expect(Number.isFinite(res.total)).toBe(true);
  });

  it("aguenta valores nulos", () => {
    const res = scoreGame(
      { kills: null, deaths: null, assists: null, damage_dealt: null },
      { champions, rules: NO_HANDICAP }
    );
    expect(res.total).toBe(0);
  });
});
