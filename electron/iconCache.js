const { ipcMain, net, protocol } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const { getCurrentPatch, DDRAGON_ORIGIN, CDRAGON_BASE } = require("./dataDragon");
const { cacheDir: userDataDir, writeFileAtomic } = require("./diskCache");

// ================= CACHE DE ÍCONES (Data Dragon) =================
// Os ícones de item/campeão/feitiço vinham todos diretos do CDN, um pedido
// HTTP por ícone. Uma linha do Histórico expandida mostra a build de TODOS os
// jogadores da partida — até 16 jogadores × 6 itens, perto de 100 ícones de
// uma vez — e o Chromium só abre 6 ligações por host, por isso a fila levava
// ~8 segundos a desenhar as builds.
//
// Dois detalhes do CDN tornavam isto pior do que parecia:
//   1. A Data Dragon não manda "Cache-Control" nenhum (só ETag/Last-Modified),
//      portanto o Chromium guarda os ícones por heurística — nada garantido.
//   2. O URL do CDN inclui o patch. De duas em duas semanas o patch muda, o
//      URL muda com ele e TODA a cache do Chromium morre, mesmo que o PNG do
//      item seja byte a byte o mesmo.
//
// Aqui os ícones ficam em disco em userData, com chave no id do item/campeão
// e SEM o patch no caminho — um patch novo deixa de custar nada, e os ícones
// passam a funcionar sem rede. O renderer pede-os por "at-img://item/3031.png"
// (ver src/lib/icons.js); quem traduz isso para um caminho em disco, ou para
// um download quando é a primeira vez, é o handler do protocolo lá em baixo.
const SCHEME = "at-img";

const CDN = `${DDRAGON_ORIGIN}/cdn`;

// Um nome de ficheiro só: "3031.png", "Ahri.png", "SummonerFlash.png". Nada de
// barras, pontos ou ".." — o nome entra num path.join e num URL.
const SAFE_FILE = /^[A-Za-z0-9_-]{1,64}\.png$/;

// Para os augments as barras fazem parte do nome
// ("assets/ux/cherry/augments/icons/adapt_small.png"). Cada segmento tem de
// começar por letra ou dígito e não leva pontos: é isso que torna ".."
// impossível de escrever, sem precisar de o procurar. Verificado contra os 594
// caminhos reais da lista da Arena — nenhum é recusado.
const SAFE_ASSET_PATH = /^(?:[a-z0-9][a-z0-9_-]*\/){1,11}[a-z0-9][a-z0-9_-]*\.png$/;

// Cada "kind" do protocolo diz de onde vem o ícone e que forma tem o nome. É
// também a lista de valores aceites — o kind e o nome vêm os dois do renderer
// e são tratados como qualquer outro input: o que não passar aqui não chega ao
// disco nem à rede.
//
// O {patch} marca as origens cujo URL o leva. Os augments não têm: a Riot não
// os publica em Data Dragon nenhum (ver src/lib/augments.js) e o Community
// Dragon serve sempre "latest".
const KINDS = {
  item: { base: `${CDN}/{patch}/img/item`, name: SAFE_FILE },
  champion: { base: `${CDN}/{patch}/img/champion`, name: SAFE_FILE },
  spell: { base: `${CDN}/{patch}/img/spell`, name: SAFE_FILE },
  augment: { base: CDRAGON_BASE, name: SAFE_ASSET_PATH },
};

// O patch só é pedido por quem precisa dele no URL. Sem isto, um ícone de
// augment que já estivesse em disco deixava de aparecer só porque o
// versions.json não respondeu.
async function upstreamUrl(kind, file) {
  const { base } = KINDS[kind];
  if (!base.includes("{patch}")) return `${base}/${file}`;

  const patch = await getCurrentPatch();
  if (!patch) throw new Error("sem patch (offline?)");
  return `${base.replace("{patch}", patch)}/${file}`;
}

// Quantos downloads em paralelo no pré-aquecimento. Seis é o mesmo limite por
// host que o Chromium usa, e o pré-aquecimento corre em segundo plano — não
// vale a pena ser mais agressivo do que o browser seria.
const PREFETCH_CONCURRENCY = 6;

let cacheDir = null;
// Pedidos em curso, para que 16 jogadores com o mesmo item não disparem 16
// downloads do mesmo PNG — todos esperam no primeiro.
const inflight = new Map();

function iconPath(kind, file) {
  return path.join(cacheDir, kind, file);
}

// ================= MANIFESTO (patch + ETags) =================
// Como a chave do disco não tem o patch, precisamos de saber à parte com que
// patch cada ícone foi descarregado: é o que permite revalidar os ícones
// quando o patch muda (ver prefetchIcons) em vez de confiar que um PNG nunca
// é retocado. Um JSON só, escrito uma vez no fim de cada pré-aquecimento.
let manifest = null;

async function loadManifest() {
  if (manifest) return manifest;
  try {
    manifest = JSON.parse(await fs.readFile(path.join(cacheDir, "manifest.json"), "utf8"));
    if (!manifest || typeof manifest !== "object") throw new Error("formato");
    manifest.etags = manifest.etags || {};
  } catch {
    manifest = { patch: null, etags: {} };
  }
  return manifest;
}

async function saveManifest() {
  if (!manifest) return;
  try {
    await writeFileAtomic(path.join(cacheDir, "manifest.json"), JSON.stringify(manifest));
  } catch (err) {
    // Perder o manifesto custa uma revalidação a mais no próximo patch, nada
    // mais — não vale uma falha visível ao utilizador.
    console.warn("[icons] não consegui gravar o manifesto", err?.message || err);
  }
}

// ================= DOWNLOAD =================
// Devolve o Buffer do ícone, ou null se o CDN respondeu 304 (o ficheiro que
// está em disco continua bom).
async function downloadIcon(kind, file, { etag } = {}) {
  const url = await upstreamUrl(kind, file);
  const res = await net.fetch(url, etag ? { headers: { "If-None-Match": etag } } : undefined);

  if (res.status === 304) return null;
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  await writeFileAtomic(iconPath(kind, file), buf);

  (await loadManifest()).etags[`${kind}/${file}`] = res.headers.get("etag") || null;
  return buf;
}

// Buffer do ícone, de disco ou do CDN à primeira vez.
function ensureIcon(kind, file) {
  const key = `${kind}/${file}`;
  const pending = inflight.get(key);
  if (pending) return pending;

  const task = (async () => {
    try {
      return await fs.readFile(iconPath(kind, file));
    } catch {
      // Não está em disco — segue para o download.
    }
    return (await downloadIcon(kind, file)) || fs.readFile(iconPath(kind, file));
  })();

  inflight.set(key, task);
  // Quem chamou é que trata do erro; este ramo existe só para limpar o mapa
  // (e para o Node não ver uma rejeição sem dono).
  task.catch(() => {}).finally(() => inflight.delete(key));
  return task;
}

// ================= PRÉ-AQUECIMENTO =================
// O renderer manda a lista de ícones que as partidas em cache vão precisar
// (ver useIconPrefetch) e nós enchemos o disco em segundo plano, enquanto o
// utilizador está na Visão Geral. Quando ele chega ao Histórico já não há
// pedido nenhum para fazer — é isto que mata a espera de ~8s.
let prefetching = null;

async function runPool(tasks) {
  let next = 0;
  const workers = Array.from({ length: Math.min(PREFETCH_CONCURRENCY, tasks.length) }, async () => {
    while (next < tasks.length) await tasks[next++]();
  });
  await Promise.all(workers);
}

async function prefetchIcons(payload) {
  // Um pré-aquecimento de cada vez: o sync acaba, as partidas mudam e o
  // renderer volta a pedir — sem isto ficavam dois pools a competir pela
  // mesma rede e pelo mesmo disco.
  if (prefetching) return prefetching;

  prefetching = (async () => {
    const wanted = [];
    for (const kind of Object.keys(KINDS)) {
      for (const name of payload?.[kind] || []) {
        // Os ids chegam sem extensão ("3031", "Ahri"); os caminhos dos
        // augments já a trazem, porque é assim que vêm na lista do Community
        // Dragon. Aceitar as duas formas evita um ".png.png".
        const file = String(name).toLowerCase().endsWith(".png") ? String(name) : `${name}.png`;
        if (KINDS[kind].name.test(file)) wanted.push([kind, file]);
      }
    }
    if (!wanted.length) return { downloaded: 0, revalidated: 0, failed: 0 };

    const patch = await getCurrentPatch();
    const man = await loadManifest();
    // Patch novo: os ícones em disco ainda servem (e são usados enquanto isto
    // corre), mas perguntamos ao CDN com If-None-Match se algum foi retocado.
    // Quase todos respondem 304, por isso custa pouco e corre uma vez por
    // patch.
    const stale = !!patch && man.patch !== patch;

    let downloaded = 0;
    let revalidated = 0;
    let failed = 0;

    await runPool(
      wanted.map(([kind, file]) => async () => {
        const key = `${kind}/${file}`;
        let onDisk = true;
        try {
          await fs.access(iconPath(kind, file));
        } catch {
          onDisk = false;
        }
        if (onDisk && !stale) return;

        try {
          const res = await downloadIcon(kind, file, {
            etag: onDisk ? man.etags[key] : null,
          });
          if (res) downloaded += 1;
          else revalidated += 1;
        } catch {
          // Um ícone que falha não interessa a ninguém: fica para a próxima
          // vez, e entretanto o protocolo tenta-o outra vez quando a view o
          // pedir. Só o total é reportado.
          failed += 1;
        }
      })
    );

    if (patch && !failed) man.patch = patch;
    await saveManifest();

    const total = { downloaded, revalidated, failed, requested: wanted.length };
    console.log("[icons] pré-aquecimento", total);
    return total;
  })();

  try {
    return await prefetching;
  } finally {
    prefetching = null;
  }
}

// ================= REGISTO =================
// Tem de correr antes de app.whenReady() — a seguir ao "ready" o Chromium já
// não aceita esquemas novos, e sem "standard: true" o at-img:// não é um URL
// com host e caminho (o new URL() abaixo deixava de conseguir separá-los).
function registerIconScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true },
    },
  ]);
}

function registerIconCacheHandlers() {
  cacheDir = userDataDir("icon-cache");

  protocol.handle(SCHEME, async (request) => {
    let parsed;
    try {
      const url = new URL(request.url);
      parsed = {
        kind: url.hostname,
        file: decodeURIComponent(url.pathname).replace(/^\//, ""),
      };
    } catch {
      return new Response(null, { status: 400, headers: { "cache-control": "no-store" } });
    }

    const { kind, file } = parsed;
    if (!KINDS[kind] || !KINDS[kind].name.test(file)) {
      return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
    }

    try {
      const buf = await ensureIcon(kind, file);
      return new Response(buf, {
        headers: {
          "content-type": "image/png",
          // O ficheiro é imutável para este URL (a chave é o id, não o
          // patch), portanto o Chromium pode servi-lo da sua própria cache
          // sem nos voltar a chamar — o disco é lido uma vez por sessão.
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      // Sem rede e sem ficheiro: 404 com "no-store" para o Chromium não
      // guardar a falha e tentar outra vez quando a rede voltar. A view
      // esconde o ícone no onError.
      return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
    }
  });

  ipcMain.handle("icons:prefetch", (_event, payload) => prefetchIcons(payload));
}

// O prefetchIcons sai também porque o scripts/verify-icons.js o chama direto,
// sem renderer nenhum para disparar o IPC.
module.exports = { registerIconScheme, registerIconCacheHandlers, prefetchIcons };
