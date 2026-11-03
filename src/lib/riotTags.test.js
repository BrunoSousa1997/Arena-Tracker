import { describe, it, expect } from "vitest";
import { parseRiotId, regionForTag } from "./riotTags";

describe("parseRiotId", () => {
  it("parte o Riot ID completo e resolve o servidor pela tag", () => {
    expect(parseRiotId("SrSousa#EUW")).toEqual({
      gameName: "SrSousa",
      tagLine: "EUW",
      region: "europe",
      knownTag: true,
    });
  });

  it("diz que falta a tag quando só vem o nome", () => {
    // É este o caso que o formulário tem de apanhar e explicar: sem tag não
    // há sincronização possível.
    expect(parseRiotId("SrSousa")).toEqual({
      gameName: "SrSousa",
      tagLine: "",
      region: null,
      knownTag: false,
    });
  });

  it("aceita a tag em minúsculas e devolve-a na caixa oficial", () => {
    expect(parseRiotId("SrSousa#euw")).toMatchObject({ tagLine: "EUW", region: "europe" });
    expect(parseRiotId("SrSousa#na1")).toMatchObject({ tagLine: "NA1", region: "americas" });
  });

  it("não adivinha servidor para uma tag fora da lista", () => {
    // Uma tag pode ser mudada para qualquer coisa ("#1234"). Aí o servidor
    // tem de ser perguntado, e é o knownTag false que faz o menu aparecer.
    expect(parseRiotId("SrSousa#1234")).toEqual({
      gameName: "SrSousa",
      tagLine: "1234",
      region: null,
      knownTag: false,
    });
  });

  it("tira espaços à volta do # colado", () => {
    expect(parseRiotId("  SrSousa # EUW  ")).toMatchObject({
      gameName: "SrSousa",
      tagLine: "EUW",
    });
  });

  it("mantém nomes com espaços lá dentro (são válidos na Riot)", () => {
    expect(parseRiotId("Sr Sousa#EUW")).toMatchObject({ gameName: "Sr Sousa", tagLine: "EUW" });
  });

  it("remove # a mais em vez de só o primeiro", () => {
    expect(parseRiotId("SrSousa##EUW#")).toMatchObject({ gameName: "SrSousa", tagLine: "EUW" });
  });

  it("devolve o nome vazio quando só vem a tag", () => {
    expect(parseRiotId("#EUW")).toMatchObject({ gameName: "", tagLine: "EUW" });
  });

  it("trata um # sem nada a seguir como tag em falta", () => {
    expect(parseRiotId("SrSousa#")).toMatchObject({ gameName: "SrSousa", tagLine: "" });
  });

  it("não rebenta com o campo vazio ou em falta", () => {
    const empty = { gameName: "", tagLine: "", region: null, knownTag: false };
    expect(parseRiotId("")).toEqual(empty);
    expect(parseRiotId(undefined)).toEqual(empty);
    expect(parseRiotId(null)).toEqual(empty);
  });
});

describe("regionForTag", () => {
  it("resolve o servidor a partir das tags conhecidas", () => {
    expect(regionForTag("EUW")).toBe("europe");
    expect(regionForTag("NA1")).toBe("americas");
    expect(regionForTag("KR")).toBe("asia");
  });

  it("ignora a caixa e os espaços", () => {
    expect(regionForTag(" euw ")).toBe("europe");
    expect(regionForTag("na1")).toBe("americas");
  });

  it("devolve null para uma tag desconhecida ou vazia", () => {
    expect(regionForTag("ZZZ")).toBeNull();
    expect(regionForTag("")).toBeNull();
    expect(regionForTag(undefined)).toBeNull();
  });
});
