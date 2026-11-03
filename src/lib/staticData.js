import { AUGMENTS_URL } from "./augments";

// ================= DE ONDE VÊM OS DADOS ESTÁTICOS =================
// Nomes de campeões, de itens, de feitiços e de augments, mais o patch a que
// pertencem. Dentro do Electron isto vem todo do processo principal, que o
// guarda em disco e serve a última cópia boa quando a rede não responde (ver
// electron/staticData.js). É o que faz os tooltips continuarem a dizer
// "Infinity Edge" em vez de "Item #3031" sem internet.
//
// Fora do Electron (vite aberto direto no browser) não há cache nenhuma: os
// quatro ficheiros são pedidos à rede aqui, como a app fazia antes.
//
// Em qualquer dos casos devolve a MESMA forma — os JSON já parseados, e null
// no que não se conseguiu obter — para o useStaticData não ter de saber de
// onde veio nada disto.
const VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";
const DDRAGON = "https://ddragon.leagueoflegends.com/cdn";

export function dragonBase(patch) {
  return patch ? `${DDRAGON}/${patch}` : null;
}

function parse(text, name) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    // O processo principal já valida o JSON antes de o gravar, por isso isto
    // só acontece com uma cache estragada à mão. Melhor perder os nomes de um
    // ficheiro do que o arranque inteiro.
    console.warn(`[staticdata] ${name} ilegível`, err?.message || err);
    return null;
  }
}

async function fromMainProcess() {
  const raw = await window.electron.getStaticData();
  return {
    patch: raw?.patch || null,
    champion: parse(raw?.champion, "champion.json"),
    summoner: parse(raw?.summoner, "summoner.json"),
    item: parse(raw?.item, "item.json"),
    augments: parse(raw?.augments, "cherry-augments.json"),
  };
}

async function fromNetwork() {
  const json = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.json();
  };
  const orNull = (p) => p.catch(() => null);

  const versions = await orNull(json(VERSIONS_URL));
  const patch = versions?.[0] || null;
  const base = dragonBase(patch);

  const [champion, summoner, item, augments] = await Promise.all([
    base ? orNull(json(`${base}/data/en_US/champion.json`)) : null,
    base ? orNull(json(`${base}/data/en_US/summoner.json`)) : null,
    base ? orNull(json(`${base}/data/en_US/item.json`)) : null,
    orNull(json(AUGMENTS_URL)),
  ]);

  return { patch, champion, summoner, item, augments };
}

export function loadStaticData() {
  const hasCache =
    typeof window !== "undefined" && typeof window.electron?.getStaticData === "function";
  return hasCache ? fromMainProcess() : fromNetwork();
}
