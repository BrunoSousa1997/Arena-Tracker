import { describe, it, expect } from "vitest";
import { championMatchesTerm, normalizeChampionId, parseSearchTerms } from "./champions";

const champ = (id, name = id) => ({ id, name });

describe("parseSearchTerms", () => {
  it("parte a pesquisa por vírgulas e tira os espaços à volta", () => {
    expect(parseSearchTerms("Annie, zed ,  Lux")).toEqual(["Annie", "zed", "Lux"]);
  });

  // As fichas da consulta rápida reescrevem a pesquisa a partir desta lista,
  // por isso os termos têm de sair como foram escritos — só a comparação é
  // que ignora maiúsculas.
  it("mantém como foi escrito, mas não repete o mesmo campeão", () => {
    expect(parseSearchTerms("Annie, annie, ANNIE")).toEqual(["Annie"]);
  });

  it("aceita ponto-e-vírgula e mudança de linha como separadores", () => {
    expect(parseSearchTerms("annie;zed\nlux")).toEqual(["annie", "zed", "lux"]);
  });

  // A razão de não separar por espaços: há campeões com nome composto, e
  // parti-los daria dois termos que não encontram ninguém.
  it("não parte nomes compostos", () => {
    expect(parseSearchTerms("miss fortune")).toEqual(["miss fortune"]);
    expect(parseSearchTerms("miss fortune, lee sin")).toEqual(["miss fortune", "lee sin"]);
  });

  it("devolve lista vazia para pesquisa vazia ou só separadores", () => {
    expect(parseSearchTerms("")).toEqual([]);
    expect(parseSearchTerms("   ")).toEqual([]);
    expect(parseSearchTerms(" , ; ")).toEqual([]);
    expect(parseSearchTerms(null)).toEqual([]);
  });
});

describe("championMatchesTerm", () => {
  it("encontra por pedaço do nome, sem ligar a maiúsculas", () => {
    expect(championMatchesTerm(champ("Annie"), "ann")).toBe(true);
    expect(championMatchesTerm(champ("Annie"), "ANN")).toBe(true);
    expect(championMatchesTerm(champ("Annie"), "zed")).toBe(false);
  });

  it("encontra por nome composto e pelo id interno quando difere do nome", () => {
    expect(championMatchesTerm(champ("MissFortune", "Miss Fortune"), "miss fortune")).toBe(true);
    // O caso que obriga a comparar também o id: escrever "wukong"...
    expect(championMatchesTerm(champ("MonkeyKing", "Wukong"), "wukong")).toBe(true);
    // ...e o contrário, escrever o id legado, também encontra.
    expect(championMatchesTerm(champ("MonkeyKing", "Wukong"), "monkeyking")).toBe(true);
  });

  // Sem isto, um termo vazio (o que sobra depois da última vírgula, enquanto
  // ainda não se escreveu o campeão seguinte) dava-se como encontrado em
  // TODOS os campeões, e a consulta rápida enchia-se com os 173.
  it("não encontra nada com termo vazio", () => {
    expect(championMatchesTerm(champ("Annie"), "")).toBe(false);
    expect(championMatchesTerm(champ("Annie"), "   ")).toBe(false);
  });
});

describe("normalizeChampionId", () => {
  it("corrige a capitalização para a id canónica da Data Dragon", () => {
    const champions = [champ("Fiddlesticks"), champ("Annie")];
    expect(normalizeChampionId("FiddleSticks", champions)).toBe("Fiddlesticks");
    expect(normalizeChampionId("Annie", champions)).toBe("Annie");
  });

  it("devolve o valor original quando não há lista ou não há correspondência", () => {
    expect(normalizeChampionId("Annie", [])).toBe("Annie");
    expect(normalizeChampionId("Desconhecido", [champ("Annie")])).toBe("Desconhecido");
    expect(normalizeChampionId("", [champ("Annie")])).toBe("");
  });
});
