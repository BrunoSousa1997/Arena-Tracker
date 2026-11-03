import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

// O LanguageProvider lê o idioma do localStorage, que não existe em Node. O
// mínimo para o provider arrancar, e fixa o português para as asserções
// poderem procurar texto concreto. Tem de estar antes do import do i18n.
globalThis.localStorage = {
  getItem: () => "pt",
  setItem: () => {},
};

const { LanguageProvider } = await import("../lib/i18n");
const InGame = (await import("./InGame")).default;

// ================= A TAB "EM JOGO", DESENHADA A SÉRIO =================
// Isto não testa números — para isso há o recommend.test.js. Testa que a tab
// se desenha: com partida a decorrer, sem partida, e sem dados nenhuns. É o
// que apanha o erro que um teste de biblioteca nunca apanha (um estilo que
// não existe, uma prop que chega undefined, uma chave de tradução trocada) e
// que de outra forma só aparecia ao abrir a app com um jogo a decorrer — o
// momento mais caro de todos para descobrir que o ecrã está em branco.
const CHAMPIONS = [
  { id: "Jhin", name: "Jhin" },
  { id: "Darius", name: "Darius" },
];

const ITEM_TIERS = { 2000: "prismatic", 2001: "prismatic", 3000: "legendary", 3001: "legendary", 3002: "legendary", 3003: "legendary", 3004: "legendary", 4000: "boots" };

const ITEMS = {
  2000: "Prisma A",
  2001: "Prisma B",
  3000: "Lenda A",
  3001: "Lenda B",
  3002: "Lenda C",
  3003: "Lenda D",
  3004: "Lenda E",
  4000: "Botas",
};

const AUGMENTS = {
  10: { id: 10, name: "Augment Prisma", rarity: 2, icon: null },
  11: { id: 11, name: "Outro Prisma", rarity: 2, icon: null },
  30: { id: 30, name: "Augment Ouro", rarity: 1, icon: null },
  31: { id: 31, name: "Outro Ouro", rarity: 1, icon: null },
};

function makeMatches(n = 60) {
  let seed = 11;
  const rnd = (max) => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max);
  };

  const player = (champion) => ({
    champion: champion || CHAMPIONS[rnd(2)].id,
    placement: 1 + rnd(8),
    items: [2000 + rnd(2), 4000, 3000 + rnd(5), 3000 + rnd(5)],
    augments: [10 + rnd(2), 30 + rnd(2)],
  });

  return Array.from({ length: n }, () => {
    const me = player("Jhin");
    return {
      ...me,
      created_at: "2026-01-01T00:00:00.000Z",
      participants: [{ ...me, isSelf: true }, ...Array.from({ length: 15 }, () => player())],
    };
  });
}

const render = (props) =>
  renderToStaticMarkup(
    createElement(LanguageProvider, null, createElement(InGame, props))
  );

const baseProps = {
  matches: makeMatches(),
  champions: CHAMPIONS,
  augmentsMap: AUGMENTS,
  itemsMap: ITEMS,
  itemTiersMap: ITEM_TIERS,
  DRAGON: "https://ddragon/x",
  liveChampionAlert: null,
};

describe("InGame", () => {
  it("desenha-se sem partida a decorrer", () => {
    const html = render(baseProps);

    expect(html).toContain("Build sugerida");
    expect(html).toContain("Sem partida");
    // Fora de partida não há inventário, por isso não há próxima compra.
    expect(html).not.toContain("Próxima compra");
  });

  it("desenha a build sugerida com as prateleiras todas", () => {
    const html = render(baseProps);

    // Uma slot por prateleira, com nome de item verdadeiro em cada uma.
    expect(html).toContain("Prismáticos");
    expect(html).toContain("Legendary");
    expect(html).toContain("Botas");
    expect(html).toMatch(/Prisma [AB]/);
    expect(html).toMatch(/Lenda [A-E]/);
  });

  it("com partida a decorrer mostra a próxima compra e marca o que já tens", () => {
    const html = render({
      ...baseProps,
      liveChampionAlert: {
        championId: "Jhin",
        gameEnded: false,
        hasWin: false,
        kda: { kills: 3, deaths: 1, assists: 4 },
        items: [{ itemID: 2000, count: 1 }],
        lobby: [
          { champion: "Darius", isSelf: false, isDead: false },
          { champion: "Jhin", isSelf: true, isDead: false },
        ],
        roast: null,
        challengeRoom: null,
      },
    });

    expect(html).toContain("A decorrer");
    expect(html).toContain("Próxima compra");
    expect(html).toContain("Nesta partida");
    // O prismático que já está no inventário aparece marcado, não repetido.
    expect(html).toContain("tens");
  });

  it("desenha-se sem partidas nenhumas em vez de estourar", () => {
    const html = render({ ...baseProps, matches: [], liveChampionAlert: null });
    expect(html.length).toBeGreaterThan(0);
  });

  it("aguenta mapas de itens e de augments ainda não carregados", () => {
    // O Data Dragon e o Community Dragon chegam por fetch e podem não ter
    // chegado quando a tab abre — sem prateleiras não há recomendação, mas
    // também não pode haver ecrã branco.
    const html = render({ ...baseProps, itemsMap: null, augmentsMap: null, itemTiersMap: null });
    expect(html).toContain("Build sugerida");
  });
});
