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
