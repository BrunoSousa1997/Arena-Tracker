import { describe, it, expect, vi, afterEach } from "vitest";
import { getRoast, detectRoastSituation, SITUATIONS, ROASTS, GENERIC, GENERIC_ROAST_CHANCE } from "./roasts";

afterEach(() => vi.restoreAllMocks());

// Campeões mínimos só com o que o detetor lê (id + name, para normalizeChampionId).
const champions = [
  { id: "Yasuo", name: "Yasuo" },
  { id: "Ahri", name: "Ahri" },
  { id: "Zed", name: "Zed" },
];

// Constrói partidas fáceis de ler — mais recentes primeiro, como vem de getMatches.
const game = (champion, win, daysAgo = 1) => ({
  champion,
  win,
  created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
});

describe("detectRoastSituation", () => {
  it("estreia absoluta quando nunca jogou o campeão", () => {
    const matches = [game("Ahri", true), game("Zed", false)];
    expect(detectRoastSituation("Yasuo", { matches, champions })).toBe("firstEverPlay");
  });

  it("estreia tem prioridade sobre a maré de derrotas", () => {
    // Três derrotas seguidas (seria lossStreak), mas nenhuma com o campeão em jogo.
    const matches = [game("Ahri", false), game("Zed", false), game("Ahri", false)];
    expect(detectRoastSituation("Yasuo", { matches, champions })).toBe("firstEverPlay");
  });

  it("0 vitórias em muitas partidas do próprio campeão", () => {
    const matches = Array.from({ length: 6 }, () => game("Yasuo", false));
    expect(detectRoastSituation("Yasuo", { matches, champions })).toBe("zeroWinsManyGames");
  });

  it("com poucas partidas do campeão sem vitórias NÃO dispara zeroWinsManyGames", () => {
    // 3 jogos, 0 vitórias -> abaixo do limiar de 6; cai na maré (lossStreak).
    const matches = [game("Yasuo", false), game("Yasuo", false), game("Yasuo", false)];
    expect(detectRoastSituation("Yasuo", { matches, champions })).toBe("lossStreak");
  });

  it("maré de derrotas nas últimas 3 partidas globais", () => {
    const matches = [game("Ahri", false), game("Zed", false), game("Ahri", false), game("Zed", true)];
    // Já jogou Yasuo antes (não é estreia) e tem vitória com ele (não é zeroWins).
    matches.push(game("Yasuo", true, 10));
    expect(detectRoastSituation("Yasuo", { matches, champions })).toBe("lossStreak");
  });

  it("maré de vitórias nas últimas 3 partidas globais", () => {
    const matches = [game("Ahri", true), game("Zed", true), game("Ahri", true), game("Yasuo", true, 10)];
    expect(detectRoastSituation("Yasuo", { matches, champions })).toBe("winStreak");
  });

  it("madrugada quando não há nenhuma outra situação", () => {
    const now = new Date();
    now.setHours(3, 0, 0, 0);
    // Histórico morno: uma vitória e uma derrota com o campeão, sem maré nem maratona.
    const matches = [game("Yasuo", true, 5), game("Ahri", false, 6), game("Yasuo", false, 7)];
    expect(detectRoastSituation("Yasuo", { matches, champions, now })).toBe("lateNight");
  });

  it("sem situação nenhuma devolve null", () => {
    const now = new Date();
    now.setHours(15, 0, 0, 0);
    const matches = [game("Yasuo", true, 5), game("Ahri", false, 6), game("Yasuo", false, 7)];
    expect(detectRoastSituation("Yasuo", { matches, champions, now })).toBeNull();
  });
});

describe("getRoast com situação", () => {
  it("usa o banco próprio do campeão quando existe para a situação", () => {
    // Math.random alto (>= GENERIC_ROAST_CHANCE) força o banco do campeão.
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const bank = ROASTS.Yasuo.lossStreak.map((e) => e.pt);
    const phrase = getRoast("Yasuo", 0, "pt", "lossStreak");
    expect(bank).toContain(phrase);
  });

  it("cai no banco genérico quando o campeão não tem a situação", () => {
    // "Aphelios" não tem winStreak próprio (não está no batch das 3 situações
    // com winStreak) -> cai no genérico. Usa uma situação que nenhum campeão
    // personaliza para garantir o fallback.
    const bank = SITUATIONS.winStreak.map((e) => e.pt);
    const phrase = getRoast("Aphelios", 0, "pt", "winStreak");
    expect(bank).toContain(phrase);
  });

  it("sem situação mantém o comportamento por nível de vitórias", () => {
    // Random alto -> banco do campeão (o de sempre, sem cair no genérico).
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const zeroBank = ROASTS.Ahri.zero.map((e) => e.pt);
    expect(zeroBank).toContain(getRoast("Ahri", 0, "pt", null));
  });

  it("devolve inglês quando pedido", () => {
    // winStreak não é personalizada por nenhum campeão -> banco genérico.
    const bankEn = SITUATIONS.winStreak.map((e) => e.en);
    expect(bankEn).toContain(getRoast("Zed", 0, "en", "winStreak"));
  });
});

describe("getRoast usa o genérico de vez em quando (GENERIC_ROAST_CHANCE)", () => {
  it("com random abaixo do limiar sai o genérico mesmo tendo o campeão a sua (nível)", () => {
    vi.spyOn(Math, "random").mockReturnValue(GENERIC_ROAST_CHANCE / 2);
    const genericZero = GENERIC.zero.map((e) => e.pt);
    expect(genericZero).toContain(getRoast("Yasuo", 0, "pt", null));
  });

  it("com random abaixo do limiar sai o genérico mesmo tendo o campeão a sua (situação)", () => {
    vi.spyOn(Math, "random").mockReturnValue(GENERIC_ROAST_CHANCE / 2);
    const genericLoss = SITUATIONS.lossStreak.map((e) => e.pt);
    expect(genericLoss).toContain(getRoast("Yasuo", 0, "pt", "lossStreak"));
  });

  it("com random acima do limiar sai o do campeão", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const champLoss = ROASTS.Yasuo.lossStreak.map((e) => e.pt);
    expect(champLoss).toContain(getRoast("Yasuo", 0, "pt", "lossStreak"));
  });

  it("ao longo de muitas chamadas aparecem ambos os bancos", () => {
    const champ = new Set(ROASTS.Yasuo.lossStreak.map((e) => e.pt));
    const generic = new Set(SITUATIONS.lossStreak.map((e) => e.pt));
    let sawChamp = false;
    let sawGeneric = false;
    for (let i = 0; i < 500; i++) {
      const phrase = getRoast("Yasuo", 0, "pt", "lossStreak");
      if (champ.has(phrase)) sawChamp = true;
      if (generic.has(phrase)) sawGeneric = true;
    }
    expect(sawChamp).toBe(true);
    expect(sawGeneric).toBe(true);
  });
});

describe("ROASTS (integridade do banco unificado)", () => {
  const TIERS = ["zero", "few", "many"];
  const CORE_SITUATIONS = ["lossStreak", "zeroWinsManyGames", "firstEverPlay"];

  it("todos os campeões têm os 3 níveis por vitórias e as 3 situações principais", () => {
    for (const [champ, entry] of Object.entries(ROASTS)) {
      for (const key of [...TIERS, ...CORE_SITUATIONS]) {
        expect(Array.isArray(entry[key]), `${champ}.${key}`).toBe(true);
        expect(entry[key].length, `${champ}.${key} vazio`).toBeGreaterThan(0);
      }
    }
  });

  it("todas as frases têm pt e en não vazios", () => {
    for (const [champ, entry] of Object.entries(ROASTS)) {
      for (const [key, bank] of Object.entries(entry)) {
        bank.forEach((phrase, i) => {
          expect(typeof phrase.pt, `${champ}.${key}[${i}].pt`).toBe("string");
          expect(phrase.pt.length, `${champ}.${key}[${i}].pt vazio`).toBeGreaterThan(0);
          expect(typeof phrase.en, `${champ}.${key}[${i}].en`).toBe("string");
          expect(phrase.en.length, `${champ}.${key}[${i}].en vazio`).toBeGreaterThan(0);
        });
      }
    }
  });

  it("só usa chaves conhecidas (níveis por vitórias ou situações do banco genérico)", () => {
    const valid = new Set([...TIERS, ...Object.keys(SITUATIONS)]);
    for (const [champ, entry] of Object.entries(ROASTS)) {
      for (const key of Object.keys(entry)) {
        expect(valid.has(key), `${champ}.${key} desconhecida`).toBe(true);
      }
    }
  });
});

describe("bancos genéricos (GENERIC e SITUATIONS)", () => {
  it("todas as frases genéricas têm pt e en não vazios", () => {
    for (const [nome, banco] of [["GENERIC", GENERIC], ["SITUATIONS", SITUATIONS]]) {
      for (const [key, bank] of Object.entries(banco)) {
        bank.forEach((phrase, i) => {
          expect(typeof phrase.pt, `${nome}.${key}[${i}].pt`).toBe("string");
          expect(phrase.pt.length, `${nome}.${key}[${i}].pt vazio`).toBeGreaterThan(0);
          expect(typeof phrase.en, `${nome}.${key}[${i}].en`).toBe("string");
          expect(phrase.en.length, `${nome}.${key}[${i}].en vazio`).toBeGreaterThan(0);
        });
      }
    }
  });
});
