const { ipcMain, net } = require("electron");
const fs = require("node:fs/promises");

const { getCurrentPatch, DDRAGON_ORIGIN, CDRAGON_ORIGIN } = require("./dataDragon");
const { cacheDir, writeFileAtomic } = require("./diskCache");

// ================= DADOS ESTÁTICOS (nomes, tiers, raridades) =================
// Os ícones já vivem em disco (electron/iconCache.js), mas os NOMES não: o
// champion.json, o item.json, o summoner.json e a lista de augments do
// Community Dragon eram pedidos à rede a cada arranque, do renderer. Sem
// internet a app abria com ícones e sem uma única palavra — tooltips a dizer
// "Item #3031", campeões sem nome, augments como "#2003" — e com o patch a
// falhar nem os ícones apareciam, porque tudo pendia do versions.json.
//
// Aqui estes quatro ficheiros ficam em disco e a app arranca com a última
// cópia boa quando a rede não responde. Três deles mudam a cada patch (itens
// novos, nomes mudados), por isso a chave é o patch: static-cache/<patch>/.
// A lista de augments não é versionada pelo Community Dragon, mas segue a
// mesma pasta — um patch novo traz também a lista nova, que é exatamente
// quando ela muda.
//
// O que isto NÃO faz: não fica a vigiar a rede. Decide uma vez por arranque,
// como o renderer fazia, e guarda o resultado em memória — a app reinicia a
// cada atualização, que é quando um patch novo interessa.
const DDRAGON = `${DDRAGON_ORIGIN}/cdn`;
const CDRAGON = `${CDRAGON_ORIGIN}/latest/plugins/rcp-be-lol-game-data/global/default`;

// O "patch" de cada entrada diz se o URL depende do patch atual. A lista de
// augments não depende (o Community Dragon serve sempre "latest"), mas é
// guardada na pasta do patch como as outras.
const FILES = {
  champion: { url: (p) => `${DDRAGON}/${p}/data/en_US/champion.json`, patch: true },
  summoner: { url: (p) => `${DDRAGON}/${p}/data/en_US/summoner.json`, patch: true },
  item: { url: (p) => `${DDRAGON}/${p}/data/en_US/item.json`, patch: true },
  augments: { url: () => `${CDRAGON}/v1/cherry-augments.json`, patch: false },
};

// Uma rede lenta a responder não deve prender o arranque: ao fim disto
// desistimos do pedido e ficamos com o que está em disco.
const REQUEST_TIMEOUT_MS = 8000;

const LAST_PATCH_FILE = "last-patch";

function root(...parts) {
  return cacheDir("static-cache", ...parts);
}

// O patch vem do nome de uma pasta que nós próprios escrevemos, mas é lido do
// disco e entra num path.join — por isso é validado como qualquer outro
// caminho vindo de fora ("16.21.1", "15.1.1"...).
const SAFE_PATCH = /^[0-9]+(\.[0-9]+)*$/;

async function readLastPatch() {
  try {
    const patch = (await fs.readFile(root(LAST_PATCH_FILE), "utf8")).trim();
    return SAFE_PATCH.test(patch) ? patch : null;
  } catch {
    return null;
  }
}

async function fetchText(url) {
  const res = await net.fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const text = await res.text();
  // O CDN já respondeu 200 a servir HTML de erro mais do que uma vez; gravar
  // isso em disco deixava a cache envenenada até ao patch seguinte.
  JSON.parse(text);
  return text;
}

// Lê um ficheiro da cache, ou null se não existir — ou se não for JSON.
// Validar à leitura e não só à escrita parece exagero (a escrita é atómica e
// já valida), mas um ficheiro estragado por outra via, como um disco com
// problemas, ficava de pé até ao patch seguinte a deixar a app sem nomes.
// Assim é tratado como se não existisse: vai-se outra vez à rede.
async function readJsonText(file) {
  try {
    const text = await fs.readFile(file, "utf8");
    JSON.parse(text);
    return text;
  } catch {
    return null;
  }
}

// Apaga as pastas dos patches antigos. Sem isto, cada patch deixava para trás
// ~2 MB de JSON que ninguém mais vai ler.
async function pruneOtherPatches(keep) {
  try {
    for (const entry of await fs.readdir(root(), { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === keep) continue;
      if (!SAFE_PATCH.test(entry.name)) continue;
      await fs.rm(root(entry.name), { recursive: true, force: true });
    }
  } catch {
    // Pasta ainda não existe, ou um ficheiro preso por outro processo: ficar
    // com lixo em disco é melhor do que falhar o arranque por causa dele.
  }
}

// Um ficheiro: do disco se já lá estiver para este patch, senão da rede. Se a
// rede falhar e houver uma cópia de um patch anterior, serve essa — um nome
// de item do patch passado é quase sempre certo, e é sempre melhor do que
// "Item #3031".
async function loadFile(name, patch, fallbackPatch) {
  const target = patch ? root(patch, `${name}.json`) : null;

  if (target) {
    const text = await readJsonText(target);
    if (text) return { text, source: "disk" };
  }

  if (patch || !FILES[name].patch) {
    try {
      const text = await fetchText(FILES[name].url(patch));
      if (target) await writeFileAtomic(target, text);
      return { text, source: "network" };
    } catch (err) {
      console.warn(`[staticdata] falhou ${name}`, err?.message || err);
    }
  }

  // Sem rede: a última cópia boa, mesmo que seja de outro patch.
  if (fallbackPatch && fallbackPatch !== patch) {
    const text = await readJsonText(root(fallbackPatch, `${name}.json`));
    if (text) return { text, source: "stale" };
  }

  // Nem isso. Quem chamou fica com null e mostra os ids.
  return { text: null, source: null };
}

let cached = null;

async function loadStaticData() {
  const lastPatch = await readLastPatch();
  const patch = (await getCurrentPatch()) || lastPatch;

  const names = Object.keys(FILES);
  const results = await Promise.all(names.map((name) => loadFile(name, patch, lastPatch)));

  const files = {};
  const source = {};
  names.forEach((name, i) => {
    files[name] = results[i].text;
    source[name] = results[i].source;
  });

  // O patch só passa a ser "o último bom" depois de termos mesmo os dados
  // dele em disco: senão um arranque com rede a meio gás apontava o
  // last-patch para uma pasta vazia e o fallback deixava de ter para onde ir.
  const complete = names.every((name) => source[name] === "disk" || source[name] === "network");
  if (patch && complete && patch !== lastPatch) {
    await writeFileAtomic(root(LAST_PATCH_FILE), patch);
    await pruneOtherPatches(patch);
  }

  console.log("[staticdata]", { patch, ...source });
  return { patch: patch || null, source, ...files };
}

// Uma vez por arranque, e uma só mesmo: a janela principal e a sobreposição
// carregam o mesmo bundle e pedem isto as duas.
function getStaticData() {
  if (!cached) {
    cached = loadStaticData().catch((err) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}

function registerStaticDataHandlers() {
  ipcMain.handle("staticdata:get", () => getStaticData());
}

// O loadStaticData (sem a memória do getStaticData) sai para o
// scripts/verify-static-data.js o poder correr mais de uma vez por processo.
module.exports = { registerStaticDataHandlers, getStaticData, loadStaticData };
