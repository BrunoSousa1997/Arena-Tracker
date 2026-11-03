import { describe, it, expect, afterEach, vi } from "vitest";

// O módulo decide uma vez, ao carregar, se há cache de ícones (é uma
// propriedade do ambiente, não de cada chamada) — por isso cada caso aqui tem
// de o reimportar com o "window" que quer testar.
async function loadIcons({ electron } = {}) {
  vi.resetModules();
  if (electron === undefined) delete globalThis.window;
  else globalThis.window = { electron };
  return import("./icons.js");
}

// Um caminho real da lista da Arena, já em minúsculas e sem o prefixo
// "/lol-game-data/assets" — é a forma com que o lib/augments.js os entrega.
const AUGMENT_PATH = "assets/ux/cherry/augments/icons/adapt_small.png";
const CDRAGON = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default";

afterEach(() => {
  delete globalThis.window;
});

const DRAGON = "https://ddragon.leagueoflegends.com/cdn/16.21.1";

describe("icons dentro do Electron", () => {
  const withCache = () => loadIcons({ electron: { prefetchIcons: () => {} } });

  it("manda os ícones pelo protocolo da cache, sem patch no caminho", async () => {
    const { itemIcon, championIcon, spellIcon } = await withCache();

    expect(itemIcon(3031, DRAGON)).toBe("at-img://item/3031.png");
    expect(championIcon("Ahri", DRAGON)).toBe("at-img://champion/Ahri.png");
    expect(spellIcon("SummonerFlash.png", DRAGON)).toBe("at-img://spell/SummonerFlash.png");
  });

  it("manda os augments pela cache, com o caminho inteiro", async () => {
    const { augmentIcon } = await withCache();

    // As barras ficam como estão: é o caminho que identifica o augment, e é
    // assim que o protocolo o recebe (ver electron/iconCache.js).
    expect(augmentIcon(AUGMENT_PATH, CDRAGON)).toBe(`at-img://augment/${AUGMENT_PATH}`);
    // Com ou sem a barra à cabeça dá o mesmo — o lib/augments.js já a tira,
    // mas o helper não fica dependente disso.
    expect(augmentIcon(`/${AUGMENT_PATH}`, CDRAGON)).toBe(`at-img://augment/${AUGMENT_PATH}`);
  });

  it("não precisa do patch para nada", async () => {
    const { itemIcon, championIcon, canShowIcons } = await withCache();

    // É isto que faz os ícones aparecerem antes de o versions.json responder
    // (e sem rede nenhuma para ele responder).
    expect(itemIcon(3031, null)).toBe("at-img://item/3031.png");
    expect(championIcon("Jhin", undefined)).toBe("at-img://champion/Jhin.png");
    expect(canShowIcons(null)).toBe(true);
  });
});

describe("icons fora do Electron (vite no browser)", () => {
  const noCache = () => loadIcons({ electron: undefined });

  it("volta ao CDN, com o patch", async () => {
    const { itemIcon, championIcon, spellIcon } = await noCache();

    expect(itemIcon(3031, DRAGON)).toBe(`${DRAGON}/img/item/3031.png`);
    expect(championIcon("Ahri", DRAGON)).toBe(`${DRAGON}/img/champion/Ahri.png`);
    expect(spellIcon("SummonerFlash.png", DRAGON)).toBe(`${DRAGON}/img/spell/SummonerFlash.png`);
  });

  it("sem patch não inventa URL nenhum", async () => {
    const { itemIcon, canShowIcons } = await noCache();

    expect(itemIcon(3031, null)).toBeUndefined();
    expect(canShowIcons(null)).toBe(false);
    expect(canShowIcons(DRAGON)).toBe(true);
  });

  it("os augments voltam à Community Dragon", async () => {
    const { augmentIcon } = await noCache();

    expect(augmentIcon(AUGMENT_PATH, CDRAGON)).toBe(`${CDRAGON}/${AUGMENT_PATH}`);
    expect(augmentIcon(AUGMENT_PATH, null)).toBeUndefined();
    expect(augmentIcon(null, CDRAGON)).toBeUndefined();
  });
});

describe("ids que não servem", () => {
  it("não pede '.../undefined.png' por um id que falta", async () => {
    // O bug que já aconteceu uma vez com as builds vindas de "participants"
    // (ver src/lib/items.js): um id undefined ia parar ao URL tal e qual.
    const { itemIcon, championIcon } = await loadIcons({
      electron: { prefetchIcons: () => {} },
    });

    expect(itemIcon(undefined, DRAGON)).toBeUndefined();
    expect(itemIcon(null, DRAGON)).toBeUndefined();
    expect(itemIcon("", DRAGON)).toBeUndefined();
    expect(championIcon(undefined, DRAGON)).toBeUndefined();
  });
});
