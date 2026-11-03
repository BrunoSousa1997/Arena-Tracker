import { describe, it, expect, afterEach, vi } from "vitest";
import { dragonBase, loadStaticData } from "./staticData";

// Os dois caminhos do loadStaticData: pela cache em disco (dentro do Electron)
// e pela rede (vite aberto direto no browser). O que importa testar é que
// devolvem a MESMA forma — é disso que o useStaticData depende para não ter de
// saber de onde vieram os dados.
const ITEM = JSON.stringify({ data: { 3031: { name: "Infinity Edge" } } });
const CHAMPION = JSON.stringify({ data: { Ahri: { id: "Ahri", name: "Ahri" } } });
const SUMMONER = JSON.stringify({ data: { SummonerFlash: { name: "Flash" } } });
const AUGMENTS = JSON.stringify([{ id: 1, nameTRA: "Ultimate Roulette" }]);

afterEach(() => {
  delete globalThis.window;
  delete globalThis.fetch;
  vi.restoreAllMocks();
});

describe("dentro do Electron", () => {
  const withMain = (payload) => {
    globalThis.window = { electron: { getStaticData: () => Promise.resolve(payload) } };
  };

  it("devolve os quatro ficheiros já parseados, e o patch", async () => {
    withMain({
      patch: "16.21.1",
      source: { champion: "disk", summoner: "disk", item: "disk", augments: "disk" },
      champion: CHAMPION,
      summoner: SUMMONER,
      item: ITEM,
      augments: AUGMENTS,
    });

    const data = await loadStaticData();

    expect(data.patch).toBe("16.21.1");
    expect(data.item.data["3031"].name).toBe("Infinity Edge");
    expect(data.champion.data.Ahri.name).toBe("Ahri");
    expect(data.summoner.data.SummonerFlash.name).toBe("Flash");
    expect(data.augments).toHaveLength(1);
  });

  it("sem rede e sem cache devolve tudo a null, sem estourar", async () => {
    // O que o processo principal devolve na primeira abertura de sempre sem
    // internet: a app tem de abrir e mostrar os ids.
    withMain({
      patch: null,
      source: { champion: null, summoner: null, item: null, augments: null },
      champion: null,
      summoner: null,
      item: null,
      augments: null,
    });

    const data = await loadStaticData();

    expect(data).toEqual({ patch: null, champion: null, summoner: null, item: null, augments: null });
  });

  it("um ficheiro ilegível não leva os outros atrás", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    withMain({ patch: "16.21.1", item: "isto não é JSON", champion: CHAMPION });

    const data = await loadStaticData();

    expect(data.item).toBeNull();
    expect(data.champion.data.Ahri.name).toBe("Ahri");
  });
});

describe("fora do Electron", () => {
  it("vai à rede e devolve a mesma forma", async () => {
    const bodies = {
      "versions.json": '["16.21.1","16.20.1"]',
      "champion.json": CHAMPION,
      "summoner.json": SUMMONER,
      "item.json": ITEM,
      "cherry-augments.json": AUGMENTS,
    };
    globalThis.window = {};
    globalThis.fetch = vi.fn((url) => {
      const hit = Object.keys(bodies).find((name) => url.endsWith(name));
      if (!hit) return Promise.resolve({ ok: false, status: 404 });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(bodies[hit])) });
    });

    const data = await loadStaticData();

    expect(data.patch).toBe("16.21.1");
    expect(data.item.data["3031"].name).toBe("Infinity Edge");
    expect(data.augments).toHaveLength(1);
  });

  it("um ficheiro que falha fica a null em vez de rejeitar", async () => {
    globalThis.window = {};
    globalThis.fetch = vi.fn((url) => {
      if (url.endsWith("versions.json")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(["16.21.1"]) });
      }
      if (url.endsWith("item.json")) return Promise.reject(new Error("rede"));
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: {} }) });
    });

    const data = await loadStaticData();

    expect(data.patch).toBe("16.21.1");
    expect(data.item).toBeNull();
    expect(data.champion).toEqual({ data: {} });
  });

  it("sem patch não tenta sequer os ficheiros que dependem dele", async () => {
    globalThis.window = {};
    globalThis.fetch = vi.fn((url) => {
      if (url.endsWith("versions.json")) return Promise.reject(new Error("rede"));
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(AUGMENTS) });
    });

    const data = await loadStaticData();

    expect(data.patch).toBeNull();
    expect(data.item).toBeNull();
    expect(data.champion).toBeNull();
    const pedidos = globalThis.fetch.mock.calls.map(([url]) => url);
    expect(pedidos.some((url) => url.includes("/cdn/"))).toBe(false);
  });
});

describe("dragonBase", () => {
  it("só monta o URL quando há patch", () => {
    expect(dragonBase("16.21.1")).toBe("https://ddragon.leagueoflegends.com/cdn/16.21.1");
    expect(dragonBase(null)).toBeNull();
  });
});
