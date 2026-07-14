require("dotenv").config();

const {
  app,
  BrowserWindow,
  screen,
  Menu,
  globalShortcut,
  ipcMain,
  dialog,
} = require("electron");

const path = require("path");
const fs = require("fs");
const https = require("https");
const { autoUpdater } = require("electron-updater");
const Store = require("electron-store");

const store = new Store();

Menu.setApplicationMenu(null);

let win;

function createWindow() {
  console.log("Electron main process iniciou");
  const savedBounds = store.get("windowBounds");

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    x: savedBounds?.x,
    y: savedBounds?.y,
    width: savedBounds?.width || width,
    height: savedBounds?.height || height,

    minWidth: 900,
    minHeight: 600,

    frame: false,
    show: false,
    backgroundColor: "#0b0f1a",

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.setAutoHideMenuBar(true);

  // 👇 AQUI
  win.once("ready-to-show", () => {
    win.show();
    win.maximize(); // <- abre maximized
  });
  console.log("PRELOAD PATH:", path.join(__dirname, "preload.js"));
  win.setAutoHideMenuBar(true);

  if (process.env.ELECTRON_START_URL) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, "dist/index.html"));
  }

  win.once("ready-to-show", () => {
    win.show();
  });

  win.on("close", () => {
    store.set("windowBounds", win.getBounds());
  });

  // ================= IPC (BOTÕES WINDOW) =================
  ipcMain.handle("window:minimize", () => win.minimize());
  ipcMain.handle("window:maximize", () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.handle("window:close", () => win.close());
  ipcMain.handle("window:isMaximized", () => win.isMaximized());
  // fullscreen shortcuts
  globalShortcut.register("F11", () => {
    win.setFullScreen(!win.isFullScreen());
  });

  globalShortcut.register("Escape", () => {
    if (win.isFullScreen()) win.setFullScreen(false);
  });

  // Atalho global (funciona mesmo com o League em foco, ex: na seleção de
  // campeão da Arena) para trazer a app para a frente já na tab Coleção com
  // a busca pronta a usar — a forma mais rápida de confirmar se já há
  // vitória com um campeão sem teres de sair do League por completo.
  globalShortcut.register("Control+Shift+A", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    win.webContents.send("quickcheck:open");
  });
}

// ================= AUTO UPDATE =================
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function sendUpdaterStatus(status, data) {
  console.log("[updater]", status, data || "");
  if (win && !win.isDestroyed()) {
    win.webContents.send("updater:status", { status, data });
  }
}

autoUpdater.on("checking-for-update", () => {
  sendUpdaterStatus("checking");
});

autoUpdater.on("update-available", (info) => {
  sendUpdaterStatus("available", { version: info?.version });
});

autoUpdater.on("update-not-available", () => {
  sendUpdaterStatus("not-available");
});

autoUpdater.on("download-progress", (progress) => {
  sendUpdaterStatus("downloading", { percent: progress?.percent || 0 });
});

autoUpdater.on("update-downloaded", (info) => {
  sendUpdaterStatus("downloaded", { version: info?.version });
});

autoUpdater.on("error", (err) => {
  sendUpdaterStatus("error", { message: err?.message || String(err) });
});

ipcMain.handle("updater:check", () => {
  return autoUpdater.checkForUpdates().catch((err) => {
    sendUpdaterStatus("error", { message: err?.message || String(err) });
  });
});

ipcMain.handle("updater:install", () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle("app:getVersion", () => app.getVersion());

// ================= LIVE CLIENT DATA (Arena match tracking) =================
// API local e oficial da Riot (https://127.0.0.1:2999/liveclientdata/...),
// só ativa durante uma partida, só leitura. Não interage com o processo do
// jogo nem com a memória, por isso não tem qualquer risco de ban.
const ARENA_GAME_MODE = "CHERRY";

// A Arena já teve formatos diferentes: 8 equipas de 2 (16 jogadores) e 6
// equipas de 3 (18 jogadores). Isso muda o significado de "lugar" (não há
// 7º/8º lugar possível no formato de 3), por isso guardamos sempre quantos
// jogadores por equipa teve cada partida, a partir do nº total de jogadores.
function teamSizeFromPlayerCount(n) {
  if (n === 16) return 2;
  if (n === 18) return 3;
  return null;
}

let liveGameState = null; // { riotId, champion, kills, deaths, assists }
let liveGamePhase = "idle"; // idle -> active -> ended -> idle
let liveGameFailures = 0;
// Maior nº de jogadores visto durante a partida ativa (não só o do poll mais
// recente) — perto do fim de uma Arena de 3 (elimination), a Live Client
// Data API por vezes deixa de listar em "allPlayers" jogadores já
// eliminados, o que fazia o último poll antes do "GameEnd" ler 16 jogadores
// numa partida que na realidade era de 18 (3v3), marcando-a como 2v2 mesmo
// já não existindo esse formato há muito tempo. Usar o máximo (o roster
// inteiro reporta-se sempre no início da partida) evita essa leitura errada.
let liveGameMaxPlayers = 0;
// Maior "HP máximo" (championStats.maxHealth, Live Client Data) visto
// durante a partida ativa — este valor só sobe (níveis + itens de vida), por
// isso o máximo entre polls já É o pico real da partida, sem precisar de
// nenhuma correção como a de "liveGameMaxPlayers" acima.
let liveGameMaxHp = 0;
// Avisa a interface uma única vez por partida sobre qual campeão está a ser
// jogado (ver sendActiveChampion) — sem isto reenviaríamos o mesmo aviso a
// cada poll (de 3 em 3 segundos) enquanto a partida decorre.
let liveChampionAnnounced = false;

// ================= DATA DRAGON (só para mapear id -> nome de spell) =================
// A Riot API (match-v5) devolve os feitiços de invocador como ids numéricos
// (summoner1Id/summoner2Id); a Live Client Data API já devolve o nome
// ("Flash", "Heal"...) diretamente em me.summonerSpells. Para guardar sempre
// o mesmo formato (nome) nas duas fontes, resolvemos o id->nome uma única
// vez aqui e ficamos com o resultado em cache — não vale a pena pedir isto
// à Data Dragon em cada partida importada.
let summonerSpellNameCache = null;

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 8000 }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(new Error(`GET ${url} -> status ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

async function getSummonerSpellNameMap() {
  if (summonerSpellNameCache) return summonerSpellNameCache;

  try {
    const versions = await httpsGetJson("https://ddragon.leagueoflegends.com/api/versions.json");
    const patch = versions[0];
    const data = await httpsGetJson(
      `https://ddragon.leagueoflegends.com/cdn/${patch}/data/en_US/summoner.json`
    );

    const map = {};
    Object.values(data.data || {}).forEach((spell) => {
      map[Number(spell.key)] = spell.name;
    });

    summonerSpellNameCache = map;
    return map;
  } catch (err) {
    console.warn("[ddragon] falhou mapa de feitiços de invocador", err?.message || err);
    return {};
  }
}

function liveClientRequest(pathName) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        host: "127.0.0.1",
        port: 2999,
        path: `/liveclientdata/${pathName}`,
        rejectUnauthorized: false,
        timeout: 3000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            reject(new Error(`status ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

function sendMatchResult(payload) {
  console.log("[livegame] resultado de partida:", payload);
  if (win && !win.isDestroyed()) {
    win.webContents.send("livegame:matchResult", payload);
  }
}

// Avisa a interface, logo que a partida de Arena arranca (muito antes do
// fim), qual campeão está a ser jogado — para a app poder dizer de imediato
// "já tens vitória com este campeão" ou "ainda não tens", sem o jogador
// precisar de ir procurar manualmente na tab Coleção.
function sendActiveChampion(payload) {
  console.log("[livegame] campeão em jogo:", payload);
  if (win && !win.isDestroyed()) {
    win.webContents.send("livegame:activeChampion", payload);
  }
}

// Envia o KDA e a build atuais a cada poll (de 3 em 3s) enquanto a partida
// decorre — ao contrário de sendActiveChampion (só uma vez, no início), isto
// repete-se a partida toda para o banner na interface poder mostrar números
// sempre atualizados. NÃO inclui augments: a Live Client Data API da Riot
// não os expõe (nem para a Arena nem para nenhum modo) — só ficam
// disponíveis depois de a partida terminar e sincronizar pela Riot API.
function sendLiveStats(payload) {
  if (win && !win.isDestroyed()) {
    win.webContents.send("livegame:liveStats", payload);
  }
}

async function pollLiveGame() {
  try {
    const allData = await liveClientRequest("allgamedata");
    liveGameFailures = 0;

    const gameMode = allData?.gameData?.gameMode;
    const activePlayer = allData?.activePlayer;
    const players = allData?.allPlayers || [];

    const activeRiotId = activePlayer?.riotId || activePlayer?.summonerName;
    const me = players.find(
      (p) => (p.riotId || p.summonerName) === activeRiotId
    );

    if (liveGamePhase === "idle" && me) {
      liveGamePhase = "active";
      liveChampionAnnounced = false;
      liveGameMaxPlayers = 0;
      liveGameMaxHp = 0;
    }

    if (liveGamePhase === "active" && me) {
      // Atualiza o máximo de jogadores visto até agora nesta partida — ver
      // comentário junto à declaração de "liveGameMaxPlayers" mais acima.
      liveGameMaxPlayers = Math.max(liveGameMaxPlayers, players.length);

      // "HP máximo" (vida total, não a vida atual) só vem em detalhe no
      // activePlayer.championStats — allPlayers não traz isto para nenhum
      // jogador (nem sequer o próprio). Guardamos o maior valor visto (sobe
      // com níveis/itens de vida ao longo da partida).
      const maxHealth = activePlayer?.championStats?.maxHealth;
      if (maxHealth) liveGameMaxHp = Math.max(liveGameMaxHp, maxHealth);

      liveGameState = {
        riotId: activeRiotId,
        champion: me.championName,
        gameMode,
        kills: me.scores?.kills ?? 0,
        deaths: me.scores?.deaths ?? 0,
        assists: me.scores?.assists ?? 0,
        cs: me.scores?.creepScore ?? 0,
        visionScore: me.scores?.wardScore ?? 0,
        champLevel: me.level ?? null,
        summoner1: me.summonerSpells?.summonerSpellOne?.displayName || null,
        summoner2: me.summonerSpells?.summonerSpellTwo?.displayName || null,
        items: (me.items || []).map((item) => ({
          itemID: item.itemID,
          count: item.count,
        })),
        teamSize: teamSizeFromPlayerCount(liveGameMaxPlayers),
        maxHp: liveGameMaxHp || null,
      };

      if (gameMode === ARENA_GAME_MODE && me.championName) {
        if (!liveChampionAnnounced) {
          liveChampionAnnounced = true;
          sendActiveChampion({ champion: me.championName });
        }

        // KDA + build atuais, reenviados a cada poll (ver sendLiveStats).
        sendLiveStats({
          kills: liveGameState.kills,
          deaths: liveGameState.deaths,
          assists: liveGameState.assists,
          items: liveGameState.items,
        });
      }
    }

    const events = allData?.events?.Events || [];
    const gameEndEvent = events.find((e) => e.EventName === "GameEnd");

    if (gameEndEvent && liveGamePhase === "active" && liveGameState) {
      liveGamePhase = "ended";

      if (
        liveGameState.gameMode === ARENA_GAME_MODE &&
        (gameEndEvent.Result === "Win" || gameEndEvent.Result === "Lose")
      ) {
        sendMatchResult({
          riotId: liveGameState.riotId,
          champion: liveGameState.champion,
          kills: liveGameState.kills,
          deaths: liveGameState.deaths,
          assists: liveGameState.assists,
          items: liveGameState.items || [],
          win: gameEndEvent.Result === "Win",
          teamSize: liveGameState.teamSize ?? null,
          maxHp: liveGameState.maxHp ?? null,
          cs: liveGameState.cs ?? null,
          visionScore: liveGameState.visionScore ?? null,
          champLevel: liveGameState.champLevel ?? null,
          summoner1: liveGameState.summoner1 ?? null,
          summoner2: liveGameState.summoner2 ?? null,
          // A Live Client Data API não expõe dano/ouro acumulados nem duração
          // final da partida de forma fiável — só o que a Riot API (via
          // sincronização) traz depois com precisão. EventTime é o único
          // valor de duração que temos aqui (segundos desde o início).
          gameDuration: gameEndEvent.EventTime ? Math.round(gameEndEvent.EventTime) : null,
          damageDealt: null,
          damageTaken: null,
          goldEarned: null,
          multikill: null,
        });
      }
    }
  } catch (err) {
    liveGameFailures += 1;

    // API deixou de responder (fim de jogo, alt-F4, etc.) -> volta ao estado inicial
    if (liveGameFailures >= 3) {
      liveGamePhase = "idle";
      liveGameState = null;
      liveGameFailures = 0;
      liveChampionAnnounced = false;
      liveGameMaxPlayers = 0;
      liveGameMaxHp = 0;
    }
  }
}

function startLiveGameWatcher() {
  setInterval(() => {
    pollLiveGame();
  }, 3000);
}

// ================= EXPORTAR HISTÓRICO =================
ipcMain.handle("export:saveFile", async (_event, { defaultName, content }) => {
  const result = await dialog.showSaveDialog(win, {
    title: "Exportar histórico de partidas",
    defaultPath: defaultName,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false };
  }

  try {
    fs.writeFileSync(result.filePath, content, "utf8");
    return { success: true, path: result.filePath };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// ================= RIOT API (histórico oficial de Arena) =================
// Duas formas de falar com a Riot API:
//
// 1) Chave local (.env, RIOT_API_KEY) — usada só se estiver definida. Nunca
//    é enviada para o bundle da interface, só é lida aqui.
// 2) Proxy (Cloudflare Worker, ver riot-proxy/worker.js) — usado sempre que
//    NÃO existe chave local. É o caminho para os amigos: instalam a app e
//    já funciona, sem precisarem de nenhuma chave nem ficheiro .env. A
//    chave real (Production API Key) vive só no Worker (variável de
//    ambiente encriptada, nunca no repositório) — se um dia precisares de a
//    trocar, atualiza-se num único sítio e já funciona para todos os que
//    já têm a app instalada, sem reenviar nada a ninguém.
const RIOT_API_KEY = process.env.RIOT_API_KEY || null;

// URL público do Worker — não é secreto (a chave fica só do lado do
// Worker), por isso pode ficar aqui no código normalmente. Substitui pelo
// teu depois de fazeres o deploy (ver riot-proxy/INSTRUCOES.md).
const RIOT_PROXY_BASE_URL = "https://arena-tracker-proxy.bruno-sousa-1997.workers.dev";

function riotApiAvailable() {
  return Boolean(RIOT_API_KEY) || !RIOT_PROXY_BASE_URL.includes("SUBSTITUI-PELO-TEU-WORKER");
}

// HISTÓRICO: filtrar o pedido de ids por "queue" tinha sido abandonado
// porque um teste antigo com queue=1700/1710 (os valores documentados na
// altura em static.developer.riotgames.com/docs/lol/queues.json) continuava
// a deixar partidas de Arena de fora — concluiu-se que o filtro "queue=" não
// era fiável para a Arena, e passou-se a pedir sempre o histórico completo
// (todos os modos) e decidir partida a partida, já com os detalhes
// completos, se é Arena ou não (match.info.gameMode === "CHERRY", ver
// ARENA_GAME_MODE). Isso é seguro mas caro: para uma conta que jogue muito
// fora da Arena, a esmagadora maioria dos pedidos (caros, 1 por partida)
// eram gastos em partidas que nem eram Arena, só para as descartar depois.
//
// Verificado ao vivo (2026-07-14, ver arenaDiag/console durante um "Reparar
// tudo" com 501 partidas de Arena já confirmadas de uma conta real): a causa
// não era o filtro "queue=" em si ser pouco fiável — era o valor estar
// desatualizado. A Riot mudou o queueId da Arena ao longo do tempo: partidas
// mais antigas usam 1700, mais recentes usam 1750 (não documentado à data
// desta descoberta). Nas 501 partidas confirmadas amostradas, SÓ estes dois
// valores apareceram, sempre com mapId=30 e gameMode="CHERRY" — zero
// exceções. Isso permite voltar a filtrar por queue na listagem (barata, 1
// pedido por 100 ids) para nunca mais pedir detalhes completos (caros) de
// partidas que não são Arena — ver ARENA_QUEUE_IDS abaixo.
//
// Por segurança (não temos garantia de que não exista uma 3ª variante nalgum
// canto que esta amostra não cobriu — outra região, outro formato raro),
// mantém-se o gameMode==="CHERRY" como verificação final depois dos
// detalhes virem (ver fetchOneMatchDetail/fetchOneBackfillDetail) — sem
// custo extra, e continua a ser a fonte da verdade. O "Reparar tudo"
// continua a servir de rede de segurança ocasional caso o filtro alguma vez
// deixe passar menos do que devia.
const ARENA_QUEUE_IDS = [1700, 1750];

function riotApiRequest(host, pathName, retriesLeft = 3) {
  return RIOT_API_KEY
    ? riotApiRequestDirect(host, pathName, retriesLeft)
    : riotApiRequestViaProxy(host, pathName, retriesLeft);
}

function riotApiRequestDirect(host, pathName, retriesLeft = 3) {
  // TEMPORÁRIO: ver riotDiag e o log em riotapi:backfillMatchDetails.
  const t0 = Date.now();

  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        host,
        path: pathName,
        headers: { "X-Riot-Token": RIOT_API_KEY },
        timeout: 8000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          const elapsed = Date.now() - t0;
          riotDiag.requests += 1;
          riotDiag.totalMs += elapsed;
          riotDiag.maxMs = Math.max(riotDiag.maxMs, elapsed);

          // A key pessoal tem um limite de pedidos; ao importar mais
          // partidas é normal bater no limite a meio. Em vez de perder essas
          // partidas, esperamos o tempo que a própria Riot API pede
          // (cabeçalho Retry-After) e tentamos de novo.
          if (res.statusCode === 429 && retriesLeft > 0) {
            riotDiag.status429 += 1;
            const retryAfter = parseInt(res.headers["retry-after"], 10) || 2;
            console.warn(
              `[riotapi] 429 em ${pathName} (${elapsed}ms, retry-after=${retryAfter}s, retriesLeft=${retriesLeft})`
            );
            wait((retryAfter + 0.5) * 1000).then(() => {
              riotApiRequestDirect(host, pathName, retriesLeft - 1).then(resolve, reject);
            });
            return;
          }

          if (res.statusCode !== 200) {
            console.warn(`[riotapi] status ${res.statusCode} em ${pathName} (${elapsed}ms)`);
            reject(new Error(`Riot API (${pathName}) -> status ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on("timeout", () => {
      console.warn(`[riotapi] TIMEOUT em ${pathName} (${Date.now() - t0}ms)`);
      req.destroy(new Error("timeout"));
    });
    req.on("error", (err) => {
      console.warn(`[riotapi] erro de rede em ${pathName} (${Date.now() - t0}ms): ${err?.message || err}`);
      reject(err);
    });
  });
}

// Mesma lógica da versão direta, mas via o Worker: é o Worker que
// acrescenta o X-Riot-Token (guardado só do lado dele); nós só pedimos
// /proxy/<host>/<caminho> com o fetch nativo do Electron/Node.
// TEMPORÁRIO: diagnóstico da lentidão do "Reparar tudo" — ver riotDiag
// abaixo e o log no fim de riotapi:backfillMatchDetails. Remover depois de
// perceber onde o tempo está mesmo a ir (pedido lento em si vs. 429s
// repetidos vs. outra coisa).
const riotDiag = { requests: 0, status429: 0, totalMs: 0, maxMs: 0 };

async function riotApiRequestViaProxy(host, pathName, retriesLeft = 3) {
  const proxyUrl = `${RIOT_PROXY_BASE_URL}/proxy/${host}${pathName}`;

  const t0 = Date.now();
  const res = await fetch(proxyUrl);
  const elapsed = Date.now() - t0;
  riotDiag.requests += 1;
  riotDiag.totalMs += elapsed;
  riotDiag.maxMs = Math.max(riotDiag.maxMs, elapsed);

  if (res.status === 429) {
    riotDiag.status429 += 1;
    const retryAfter = parseInt(res.headers.get("retry-after"), 10) || 2;
    console.warn(
      `[riotapi] 429 em ${pathName} (${elapsed}ms, retry-after=${retryAfter}s, retriesLeft=${retriesLeft})`
    );
    if (retriesLeft > 0) {
      await wait((retryAfter + 0.5) * 1000);
      return riotApiRequestViaProxy(host, pathName, retriesLeft - 1);
    }
  }

  if (res.status !== 200) {
    throw new Error(`Riot API via proxy (${pathName}) -> status ${res.status}`);
  }

  return res.json();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Diagnóstico feito com riotDiag (ver riotApiRequestDirect/ViaProxy): o
// limite que realmente trava esta key NÃO é o teto documentado por método
// (ex: match-v5 mostra 2000/10s na dashboard da Riot) — é um limite AGREGADO
// da aplicação, bem mais apertado, que nunca aparece nessa tabela por
// método. Confirmado ao vivo: um lote inicial de 60 pedidos passou bem
// (~13/s, dentro de uma rajada curta tolerada), mas o lote seguinte levou
// 429 em quase todos os pedidos, TODOS com Retry-After=113s — a assinatura
// de teres esgotado um balde de ~100 pedidos/120s. Mais concorrência (tínhamos
// subido para 8) só faz vários pedidos baterem na parede ao mesmo tempo e
// esperarem juntos os mesmos 113s — desperdiça tempo em vez de ganhar.
// Por isso: 1 pedido de cada vez (sem concorrência nenhuma), a um ritmo
// sustentado (ver RIOT_REQUEST_INTERVAL_MS) que nunca chega a tocar nesse
// balde de 120s, para nunca mais provocar 429 nenhum. Isto não torna o
// "Reparar tudo" rápido — o teto é mesmo o que a Riot atribuiu a esta app —
// só deixa de desperdiçar tempo a bater na parede repetidamente. Para ficar
// genuinamente mais rápido, o único caminho correto é pedir um aumento de
// rate limit à Riot na developer portal (não há truque de código para isso).
const FETCH_CONCURRENCY = 1;

// ~80 pedidos/120s (margem abaixo dos ~100/120s observados) = 1 a cada 1.5s.
const RIOT_REQUEST_INTERVAL_MS = 1500;

async function processWithConcurrency(items, concurrency, handler) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await handler(items[current], current);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

// Estatísticas extra ao estilo op.gg extraídas de uma partida da Match-V5
// API para um participante específico — partilhado entre a importação
// normal (riotapi:importHistory) e o backfill de partidas antigas
// (riotapi:backfillMatchDetails), para não duplicar esta lógica duas vezes.
function extractParticipantStats(match, participant, spellNames) {
  const multikill = [
    participant.pentaKills ? 5 : 0,
    participant.quadraKills ? 4 : 0,
    participant.tripleKills ? 3 : 0,
    participant.doubleKills ? 2 : 0,
  ].reduce((max, n) => Math.max(max, n), 0);

  return {
    teamSize: teamSizeFromPlayerCount(match.info?.participants?.length || 0),
    damageDealt: participant.totalDamageDealtToChampions ?? 0,
    damageTaken: participant.totalDamageTaken ?? 0,
    goldEarned: participant.goldEarned ?? 0,
    cs: (participant.totalMinionsKilled ?? 0) + (participant.neutralMinionsKilled ?? 0),
    visionScore: participant.visionScore ?? 0,
    champLevel: participant.champLevel ?? null,
    gameDuration: match.info?.gameDuration ?? null,
    multikill,
    // Contagens reais (não só a categoria máxima acima) — quantas double e
    // triple kills aconteceram nesta partida, para destacar "mais doubles/
    // triples numa partida" e a média por campeão (ver Overview.jsx).
    doubleKills: participant.doubleKills ?? 0,
    tripleKills: participant.tripleKills ?? 0,
    summoner1: spellNames[participant.summoner1Id] || null,
    summoner2: spellNames[participant.summoner2Id] || null,
    healing: participant.totalHeal ?? 0,
  };
}

// Colegas e adversários (estilo op.gg): a Match-V5 API já devolve TODOS os
// participantes da partida (16 na Arena de 2, 18 na de 3), não só o nosso.
// Guardamos uma versão resumida de cada um (campeão, KDA, lugar da equipa,
// build, augments) — agrupar por "placement" no ecrã já separa naturalmente
// cada equipa (colegas partilham sempre o mesmo lugar final na Arena).
//
// "spellNames" agora é obrigatório (antes só existia para o próprio
// jogador, via extractParticipantStats): esta lista passou a ser também a
// CACHE partilhada entre users (ver getMatchCacheByIds em src/db/api.js) —
// se um amigo já importou esta mesma partida, reaproveitamos os dados dele
// aqui guardados em vez de voltar a pedir a partida à Riot API. Para isso
// funcionar para qualquer participante (não só quem sincronizou primeiro),
// todos os campos que uma importação normal guardaria têm de estar aqui,
// não só um subconjunto.
function extractAllParticipants(match, puuid, spellNames) {
  return (match.info?.participants || []).map((p) => ({
    champion: p.championName,
    // Guardado para além do nome (ver "name" abaixo) porque é o único campo
    // estável para um AMIGO se reconhecer a si próprio dentro deste array
    // quando reaproveita esta linha da cache partilhada (ver
    // buildMatchFromCache/buildBackfillDetailsFromCache em src/db/api.js) —
    // "name" pode mudar (Riot ID) ou ter diferenças de maiúsculas/espaços
    // entre o que a Riot devolveu na altura desta importação e o que está
    // guardado na conta do amigo hoje; puuid nunca muda.
    puuid: p.puuid,
    name: p.riotIdGameName || p.summonerName || null,
    kills: p.kills ?? 0,
    deaths: p.deaths ?? 0,
    assists: p.assists ?? 0,
    placement: p.placement ?? null,
    items: [0, 1, 2, 3, 4, 5, 6]
      .map((i) => p[`item${i}`])
      .filter((id) => id && id !== 0),
    augments: [1, 2, 3, 4]
      .map((i) => p[`playerAugment${i}`])
      .filter((a) => a && a !== 0),
    // Estatísticas extra (estilo op.gg) para colegas/adversários — mesmos
    // campos que já guardávamos só para o próprio jogador (ver
    // extractParticipantStats), agora também por participante.
    damageDealt: p.totalDamageDealtToChampions ?? 0,
    damageTaken: p.totalDamageTaken ?? 0,
    goldEarned: p.goldEarned ?? 0,
    healing: p.totalHeal ?? 0,
    cs: (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0),
    visionScore: p.visionScore ?? 0,
    champLevel: p.champLevel ?? null,
    summoner1: spellNames?.[p.summoner1Id] || null,
    summoner2: spellNames?.[p.summoner2Id] || null,
    // Contagens reais (não só a categoria máxima) — para mostrar na lista de
    // colegas/adversários quantos double/triple kills cada um fez, não só
    // se fez algum (ver doubleKills/tripleKills em extractParticipantStats,
    // já usados para o próprio jogador; agora também por participante).
    doubleKills: p.doubleKills ?? 0,
    tripleKills: p.tripleKills ?? 0,
    isSelf: p.puuid === puuid,
  }));
}

// Separado em dois pedidos (antes era um handler só, "riotapi:importHistory")
// — listar ids é barato (1 pedido por 100 partidas), mas ir buscar os
// detalhes de cada partida é o que consome o limite da key partilhada. Ao
// separar, o renderer consegue, entre os dois passos, verificar quais ids
// já têm dados de um amigo em cache na Supabase (ver getMatchCacheByIds em
// src/db/api.js) e só pedir aqui os que faltam mesmo — ver syncActiveAccount
// em App.jsx.
ipcMain.handle("riotapi:listMatchIds", async (_event, { gameName, tagLine, region, since, puuid: knownPuuid }) => {
  if (!riotApiAvailable()) {
    return { success: false, error: "missing-api-key" };
  }

  const host = `${region || "europe"}.api.riotgames.com`;
  // A Riot API só devolve no máximo 100 ids por pedido, por isso para trazer
  // mais histórico paginamos em blocos de 100 (start=0, 100, 200...).
  const PAGE_SIZE = 100;

  // Se já sincronizámos antes, "since" (ms) filtra logo do lado da Riot API
  // (startTime, em segundos) para só trazer partidas novas — muito menos
  // pedidos numa sincronização do dia a dia do que voltar a pedir tudo. Para
  // uma sincronização completa (recuperar partidas em falta), o renderer
  // envia "since: null" de propósito, ignorando a última data conhecida.
  const startTimeParam = since ? `&startTime=${Math.floor(since / 1000)}` : "";

  // Sem limite artificial de partidas: paginamos até a própria Riot API
  // sinalizar o fim (uma página mais curta que o pedido). O único limite
  // que respeitamos é o da API em si — o RIOT_REQUEST_INTERVAL_MS entre
  // pedidos e o retry com Retry-After em riotApiRequest tratam disso. SAFETY_MAX existe
  // só para nunca entrar num loop infinito por alguma resposta inesperada.
  const SAFETY_MAX = 5000;

  try {
    // O puuid de um Riot ID não muda (só muda se o próprio Riot ID mudar) —
    // se o renderer já o tem em cache (ver account.puuid em App.jsx),
    // poupamos aqui um pedido a account-v1 por sincronização.
    const puuid =
      knownPuuid ||
      (
        await riotApiRequest(
          host,
          `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
        )
      ).puuid;

    // Filtrado por queue (ver ARENA_QUEUE_IDS e a nota histórica acima) — um
    // pedido de listagem por cada queueId conhecido da Arena, para nunca
    // pedir detalhes completos (caros) de partidas de outros modos. Um Set
    // porque a mesma partida nunca devia repetir-se entre queueIds
    // diferentes, mas não custa nada garantir.
    const idSet = new Set();
    for (const queueId of ARENA_QUEUE_IDS) {
      let start = 0;
      while (idSet.size < SAFETY_MAX) {
        const batch = await riotApiRequest(
          host,
          `/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${PAGE_SIZE}&queue=${queueId}${startTimeParam}`
        );

        batch.forEach((id) => idSet.add(id));

        start += PAGE_SIZE;
        if (batch.length < PAGE_SIZE) break; // já não há mais partidas nesse intervalo/queue
        await wait(RIOT_REQUEST_INTERVAL_MS);
      }
      await wait(RIOT_REQUEST_INTERVAL_MS);
    }
    const ids = [...idSet];

    return { success: true, puuid, ids };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// Segunda metade do antigo "riotapi:importHistory" — recebe já uma lista
// concreta de ids a resolver (o renderer só manda aqui os que NÃO encontrou
// em cache partilhada) e o puuid já resolvido por "riotapi:listMatchIds",
// para não repetir esse pedido.
// Uma partida por vez (usado dentro do pool de concorrência abaixo) — devolve
// null se não for Arena, se o jogador não constar, ou se o pedido falhar
// (nunca lança, para nunca travar os outros trabalhadores do pool).
// Constrói o registo de uma partida (formato usado tanto pela importação
// normal como pela verificação "canário", ver riotapi:canaryCheck) a partir
// de uma resposta já completa da match-v5. Devolve null se o jogador não
// constar (não devia acontecer, mas por segurança).
function buildArenaMatchRecord(matchId, match, puuid, spellNames) {
  const participant = match.info?.participants?.find((p) => p.puuid === puuid);
  if (!participant) return null;

  const items = [0, 1, 2, 3, 4, 5, 6]
    .map((i) => participant[`item${i}`])
    .filter((id) => id && id !== 0)
    .map((id) => ({ itemID: id, count: 1 }));

  const augments = [1, 2, 3, 4]
    .map((i) => participant[`playerAugment${i}`])
    .filter((a) => a && a !== 0);

  // Na Arena só conta como vitória ficar em 1º lugar — o campo "win"
  // da Riot API nem sempre reflete isso com fiabilidade, por isso
  // usamos sempre o "placement" como fonte da verdade.
  return {
    matchId,
    champion: participant.championName,
    kills: participant.kills ?? 0,
    deaths: participant.deaths ?? 0,
    assists: participant.assists ?? 0,
    win: participant.placement === 1,
    placement: participant.placement ?? null,
    augments,
    items,
    gameEndTimestamp: match.info?.gameEndTimestamp || match.info?.gameCreation || Date.now(),
    ...extractParticipantStats(match, participant, spellNames),
    participants: extractAllParticipants(match, puuid, spellNames),
  };
}

async function fetchOneMatchDetail(host, matchId, puuid, spellNames) {
  try {
    await wait(RIOT_REQUEST_INTERVAL_MS); // ver nota junto a RIOT_REQUEST_INTERVAL_MS
    const match = await riotApiRequest(host, `/lol/match/v5/matches/${matchId}`);
    // Só nos interessa a Arena — descartamos aqui qualquer outro modo
    // (ranked, ARAM, etc.) que venha no histórico geral sem filtro de queue.
    if (match.info?.gameMode !== ARENA_GAME_MODE) return null;

    return buildArenaMatchRecord(matchId, match, puuid, spellNames);
  } catch (err) {
    console.warn("[riotapi] falhou partida", matchId, err?.message || err);
    return null;
  }
}

ipcMain.handle("riotapi:fetchMatchDetails", async (_event, { matchIds, puuid, region }) => {
  if (!riotApiAvailable()) {
    return { success: false, error: "missing-api-key" };
  }

  const host = `${region || "europe"}.api.riotgames.com`;

  try {
    const spellNames = await getSummonerSpellNameMap();

    // TEMPORÁRIO: ver riotDiag — para medir quantas partidas deste sync
    // precisaram mesmo de pedido à Riot (o renderer já filtrou as que
    // encontrou na cache partilhada antes de chamar isto, ver
    // syncActiveAccount em App.jsx; matchIds aqui já são só os "cache miss").
    const diagBefore = { ...riotDiag };
    const t0 = Date.now();

    const results = await processWithConcurrency(matchIds || [], FETCH_CONCURRENCY, (matchId) =>
      fetchOneMatchDetail(host, matchId, puuid, spellNames)
    );

    const elapsedMs = Date.now() - t0;
    const requestsMade = riotDiag.requests - diagBefore.requests;
    const status429s = riotDiag.status429 - diagBefore.status429;
    console.log(
      `[riotapi][diag] fetchMatchDetails: ${matchIds?.length || 0} partidas pedidas à Riot ` +
        `(fora da cache partilhada) em ${elapsedMs}ms | ${requestsMade} pedidos HTTP (${status429s} 429s)`
    );

    return { success: true, matches: results.filter(Boolean) };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// Proteção contra a Riot lançar uma nova season/formato de Arena com um
// queueId ainda fora de ARENA_QUEUE_IDS — já aconteceu uma vez (Season 2,
// patch 26.10, queue 1750 a seguir a 1700) e pode voltar a acontecer. Como a
// listagem normal agora filtra por queue (ver riotapi:listMatchIds), uma
// mudança dessas passaria despercebida para sempre, sem nenhum sinal de
// erro — os pedidos continuam a ter sucesso, só deixam de trazer as
// partidas da season nova.
//
// Verificação leve, pensada para correr só de vez em quando (ver
// CANARY_CHECK_INTERVAL_MS em App.jsx), não a cada sync: olha para as
// CANARY_SAMPLE_SIZE partidas mais recentes da conta SEM filtro de queue
// nenhum, e só pede detalhes completos das que ainda não conhecemos
// ("knownIds", ids já importados ou já encontrados pela listagem filtrada
// deste sync) — na prática, poucos pedidos extra por verificação. Se
// alguma dessas for Arena com um queueId fora de ARENA_QUEUE_IDS, avisa
// (consola) e devolve-a já pronta a importar, em vez de ficar perdida até
// alguém reparar na contagem (como aconteceu desta vez).
const CANARY_SAMPLE_SIZE = 20;

ipcMain.handle("riotapi:canaryCheck", async (_event, { puuid, region, knownIds }) => {
  if (!riotApiAvailable()) {
    return { success: false, error: "missing-api-key" };
  }

  const host = `${region || "europe"}.api.riotgames.com`;
  const known = new Set(knownIds || []);

  try {
    const recentIds = await riotApiRequest(
      host,
      `/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${CANARY_SAMPLE_SIZE}`
    );

    const unknownIds = recentIds.filter((id) => !known.has(id));
    if (!unknownIds.length) {
      return { success: true, newArenaMatches: [], unknownQueueIds: [] };
    }

    const spellNames = await getSummonerSpellNameMap();
    const newArenaMatches = [];
    const unknownQueueIds = new Set();

    for (const matchId of unknownIds) {
      await wait(RIOT_REQUEST_INTERVAL_MS);
      let match;
      try {
        match = await riotApiRequest(host, `/lol/match/v5/matches/${matchId}`);
      } catch (err) {
        console.warn("[riotapi][canary] falhou partida", matchId, err?.message || err);
        continue;
      }

      if (match.info?.gameMode !== ARENA_GAME_MODE) continue;

      const queueId = match.info?.queueId;
      if (!ARENA_QUEUE_IDS.includes(queueId)) {
        unknownQueueIds.add(queueId);
        console.warn(
          `[riotapi][canary] Arena com queueId novo detetado: ${queueId} (matchId=${matchId}) — ` +
            `falta adicionar a ARENA_QUEUE_IDS em electron.js!`
        );
      }

      const record = buildArenaMatchRecord(matchId, match, puuid, spellNames);
      if (record) newArenaMatches.push(record);
    }

    return { success: true, newArenaMatches, unknownQueueIds: [...unknownQueueIds] };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// Partidas antigas foram guardadas antes de existir a coluna team_size (e,
// depois, antes das colunas de dano/ouro/CS/vision/etc.) — uma sincronização
// normal ou "Sincronizar tudo" NÃO chega para as corrigir, porque essas
// partidas já têm riot_match_id gravado e por isso são sempre ignoradas
// como "já importadas" antes de chegarem a este ponto (ver getImportedMatchIds
// em db/api.js). Este handler existe só para essas: volta a consultar a
// Riot API pelas partidas indicadas e devolve todos os campos extra, para o
// renderer fazer um UPDATE nas linhas já existentes (nunca um INSERT novo).
// TEMPORÁRIO: todo o matchId que passa por "Reparar tudo" já é, por
// definição, uma partida de Arena confirmada (só tem riot_match_id guardado
// porque já passou no filtro gameMode==="CHERRY" quando foi importada pela
// primeira vez, ver fetchOneMatchDetail). Isso torna este o dataset ideal
// para veres, com dados reais e não suposições, que queueId/mapId a Riot
// atribui mesmo à Arena — para decidir se é seguro voltar a filtrar por
// "queue" ao listar ids (ver nota em riotapi:listMatchIds sobre esse filtro
// ter sido removido por perder partidas do formato de 3 equipas de 6).
const arenaDiag = new Map();

async function fetchOneBackfillDetail(host, matchId, puuid, spellNames) {
  try {
    await wait(RIOT_REQUEST_INTERVAL_MS); // ver nota junto a RIOT_REQUEST_INTERVAL_MS
    const match = await riotApiRequest(host, `/lol/match/v5/matches/${matchId}`);

    const diagKey = `queue=${match.info?.queueId} map=${match.info?.mapId} mode=${match.info?.gameMode}`;
    arenaDiag.set(diagKey, (arenaDiag.get(diagKey) || 0) + 1);

    const participant = match.info?.participants?.find((p) => p.puuid === puuid);
    if (!participant) return null;

    return {
      matchId,
      ...extractParticipantStats(match, participant, spellNames),
      participants: extractAllParticipants(match, puuid, spellNames),
    };
  } catch (err) {
    console.warn("[riotapi] falhou backfill de detalhes", matchId, err?.message || err);
    return null;
  }
}

ipcMain.handle("riotapi:backfillMatchDetails", async (_event, { matchIds, region, gameName, tagLine, puuid: knownPuuid }) => {
  if (!riotApiAvailable()) {
    return { success: false, error: "missing-api-key" };
  }

  const host = `${region || "europe"}.api.riotgames.com`;

  try {
    // Mesma poupança que em riotapi:listMatchIds acima: só resolve o puuid
    // por account-v1 se o renderer ainda não o tiver em cache.
    const puuid =
      knownPuuid ||
      (
        await riotApiRequest(
          host,
          `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
        )
      ).puuid;
    const spellNames = await getSummonerSpellNameMap();

    const batchStart = Date.now();
    const diagBefore = { ...riotDiag };

    const results = await processWithConcurrency(matchIds || [], FETCH_CONCURRENCY, (matchId) =>
      fetchOneBackfillDetail(host, matchId, puuid, spellNames)
    );

    // TEMPORÁRIO: ver comentário junto a riotDiag acima.
    const batchMs = Date.now() - batchStart;
    const batchRequests = riotDiag.requests - diagBefore.requests;
    const batch429s = riotDiag.status429 - diagBefore.status429;
    const batchTotalMs = riotDiag.totalMs - diagBefore.totalMs;
    console.log(
      `[riotapi][diag] lote de ${matchIds?.length || 0} partidas em ${batchMs}ms | ` +
        `${batchRequests} pedidos (${batch429s} 429s) | ` +
        `média ${batchRequests ? Math.round(batchTotalMs / batchRequests) : 0}ms/pedido | ` +
        `pico ${riotDiag.maxMs}ms`
    );

    // TEMPORÁRIO: ver comentário junto a arenaDiag acima — tally acumulado
    // (persiste entre lotes) de queueId/mapId/gameMode vistos em partidas já
    // confirmadas como Arena.
    console.log("[riotapi][arena-diag] combinações queue/map/mode vistas até agora em partidas de Arena confirmadas:");
    [...arenaDiag.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([key, count]) => console.log(`  ${key}: ${count}`));

    return { success: true, results: results.filter(Boolean) };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
});

// Nota: removemos deliberadamente qualquer integração com a LCU API do
// cliente do League (ex: /lol-summoner/...). A Riot classifica esse serviço
// como "não oficialmente suportado para aplicações de terceiros", por isso
// não o utilizamos. Toda a deteção de conta usa só a Live Client Data API
// (documentada) ou é feita manualmente pelo utilizador.

app.whenReady().then(() => {
  console.log("APP READY");
  createWindow();
  startLiveGameWatcher();
  if (!process.env.ELECTRON_START_URL) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        sendUpdaterStatus("error", { message: err?.message || String(err) });
      });
    }, 2000);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
