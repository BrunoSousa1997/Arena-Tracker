import { describe, it, expect } from "vitest";
import { classifyItem, buildItemTierMap, ITEM_TIER } from "./itemTiers";

// Entradas no formato do item.json do Data Dragon.
const item = (price, { tags = [], arena = true } = {}) => ({
  gold: { total: price },
  tags,
  maps: { 11: true, 30: arena },
});

describe("classifyItem", () => {
  it("2750 é prismático", () => {
    expect(classifyItem("447100", item(2750))).toBe(ITEM_TIER.PRISMATIC);
  });

  it("2500 é legendary", () => {
    expect(classifyItem("223001", item(2500))).toBe(ITEM_TIER.LEGENDARY);
  });

  it("500 com etiqueta de botas é botas", () => {
    expect(classifyItem("223006", item(500, { tags: ["Boots"] }))).toBe(ITEM_TIER.BOOTS);
  });

  // O caso que obriga a existir a segunda cláusula: o Overlord's Bloodmail é
  // prismático mas custa o preço de um Legendary.
  it("apanha o prismático fora de preço pela gama de ids", () => {
    expect(classifyItem("447111", item(2500))).toBe(ITEM_TIER.PRISMATIC);
  });

  it("ignora itens que não são jogáveis na Arena", () => {
    expect(classifyItem("3031", item(2750, { arena: false }))).toBeNull();
  });

  it("ignora consumíveis, vouchers e passivos de augment", () => {
    expect(classifyItem("2003", item(0))).toBeNull();
    expect(classifyItem("220010", item(750))).toBeNull();
    expect(classifyItem("220007", item(4000))).toBeNull();
  });

  // "Legendary Fighter Item" e companhia são entradas de montra, não itens
  // que alguém acabe a partida a ter.
  it("ignora as entradas de montra a 2250", () => {
    expect(classifyItem("220001", item(2250))).toBeNull();
  });

  it("não rebenta com entradas em falta", () => {
    expect(classifyItem("1", null)).toBeNull();
    expect(classifyItem("1", {})).toBeNull();
  });
});

describe("buildItemTierMap", () => {
  it("indexa por número e deixa de fora o que não tem tier", () => {
    const map = buildItemTierMap({
      447100: item(2750),
      223001: item(2500),
      223006: item(500, { tags: ["Boots"] }),
      2003: item(0),
    });

    expect(map).toEqual({
      447100: ITEM_TIER.PRISMATIC,
      223001: ITEM_TIER.LEGENDARY,
      223006: ITEM_TIER.BOOTS,
    });
  });
});
