import { describe, it, expect } from "vitest";
import { normalizeRiotId, regionForTag } from "./riotTags";

describe("normalizeRiotId", () => {
  it("deixa em paz um par já correto", () => {
    expect(normalizeRiotId("SrSousa", "EUW")).toEqual({ gameName: "SrSousa", tagLine: "EUW" });
  });

  it("tira o # que a pessoa escreveu na tag", () => {
    expect(normalizeRiotId("SrSousa", "#EUW")).toEqual({ gameName: "SrSousa", tagLine: "EUW" });
  });

  it("tira espaços à volta dos dois campos", () => {
    expect(normalizeRiotId("  SrSousa  ", "  EUW ")).toEqual({ gameName: "SrSousa", tagLine: "EUW" });
  });

  it("parte o Riot ID completo colado no campo do nome", () => {
    expect(normalizeRiotId("SrSousa#EUW", "")).toEqual({ gameName: "SrSousa", tagLine: "EUW" });
  });

  it("a tag vinda do nome ganha à que estava escolhida", () => {
    // Colar "Nome#NA1" com o menu ainda em EUW: o que a pessoa colou é mais
    // deliberado do que o valor por omissão do menu.
    expect(normalizeRiotId("SrSousa#NA1", "EUW")).toEqual({ gameName: "SrSousa", tagLine: "NA1" });
  });

  it("mantém a tag escolhida se o nome tiver um # sem nada a seguir", () => {
    expect(normalizeRiotId("SrSousa#", "EUW")).toEqual({ gameName: "SrSousa", tagLine: "EUW" });
  });

  it("aguenta espaços à volta do # colado", () => {
    expect(normalizeRiotId("SrSousa # EUW", "")).toEqual({ gameName: "SrSousa", tagLine: "EUW" });
  });

  it("aguenta nomes com espaços lá dentro (são válidos na Riot)", () => {
    expect(normalizeRiotId("Sr Sousa#EUW", "")).toEqual({ gameName: "Sr Sousa", tagLine: "EUW" });
  });

  it("não rebenta com campos vazios ou em falta", () => {
    expect(normalizeRiotId("", "")).toEqual({ gameName: "", tagLine: "" });
    expect(normalizeRiotId(undefined, undefined)).toEqual({ gameName: "", tagLine: "" });
    expect(normalizeRiotId(null, null)).toEqual({ gameName: "", tagLine: "" });
  });

  it("remove vários # em vez de só o primeiro", () => {
    expect(normalizeRiotId("SrSousa", "##EUW#")).toEqual({ gameName: "SrSousa", tagLine: "EUW" });
  });
});

describe("regionForTag", () => {
  it("resolve o servidor a partir das tags conhecidas", () => {
    expect(regionForTag("EUW")).toBe("europe");
    expect(regionForTag("NA1")).toBe("americas");
    expect(regionForTag("KR")).toBe("asia");
  });

  it("devolve null para uma tag desconhecida", () => {
    expect(regionForTag("ZZZ")).toBeNull();
  });
});
