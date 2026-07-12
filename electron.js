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
// Usa a Personal/Production API key da Riot (guardada em .env, só lida aqui
// no processo principal — nunca é enviada para o bundle da interface).
const RIOT_API_KEY = process.env.RIOT_API_KEY;
// A Riot só documenta 1700 ("Arena") e 1710 ("Arena", lobby de 16
// jogadores — confirmado em static.developer.riotgames.com/docs/lol/
// queues.json) e NÃO existe nenhuma queue própria para o formato de 6
// equipas de 3. Filtrar o pedido de ids por "queue" continuava a deixar de
// fora partidas desse formato (provavelmente porque a Riot as indexa só
// sob 1700, e o filtro "queue=" na própria API nem sempre é fiável para a
// Arena). Por isso já não filtramos por queue nenhuma ao pedir ids — pedimos
// o histórico recente sem filtro de queue e decidimos partida a partida,
// depois de a ler, se é Arena ou não (match.info.gameMode === "CHERRY",
// ver ARENA_GAME_MODE). Menos eficiente para contas com muitos jogos fora
// da Arena, mas é a única forma de não depender de um queueId que pode
// estar desatualizado ou incompleto do lado da Riot.

function riotApiRequest(host, pathName, retriesLeft = 3) {
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
          // A key pessoal tem um limite de pedidos; ao importar mais
          // partidas é normal bater no limite a meio. Em vez de perder essas
          // partidas, esperamos o tempo que a própria Riot API pede
          // (cabeçalho Retry-After) e tentamos de novo.
          if (res.statusCode === 429 && retriesLeft > 0) {
            const retryAfter = parseInt(res.headers["retry-after"], 10) || 2;
            wait((retryAfter + 0.5) * 1000).then(() => {
              riotApiRequest(host, pathName, retriesLeft - 1).then(resolve, reject);
            });
            return;
          }

          if (res.statusCode !== 200) {
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

    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
function extractAllParticipants(match, puuid) {
  return (match.info?.participants || []).map((p) => ({
    champion: p.championName,
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
    isSelf: p.puuid === puuid,
  }));
}

ipcMain.handle("riotapi:importHistory", async (_event, { gameName, tagLine, region, since }) => {
  if (!RIOT_API_KEY) {
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
  // envia "since: null" de propósito, ignorando a última data guardada.
  const startTimeParam = since ? `&startTime=${Math.floor(since / 1000)}` : "";

  // Sem limite artificial de partidas: paginamos até a própria Riot API
  // sinalizar o fim (uma página mais curta que o pedido). O único limite
  // que respeitamos é o da API em si — o "wait(150)" entre pedidos e o
  // retry com Retry-After em riotApiRequest tratam disso. SAFETY_MAX existe
  // só para nunca entrar num loop infinito por alguma resposta inesperada.
  const SAFETY_MAX = 5000;

  try {
    const account = await riotApiRequest(
      host,
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );

    const puuid = account.puuid;

    const ids = [];

    // Sem filtro de "queue" — ver nota acima. Pedimos o histórico recente
    // completo (todos os modos) e filtramos por gameMode depois de ler cada
    // partida.
    let start = 0;
    while (ids.length < SAFETY_MAX) {
      const batch = await riotApiRequest(
        host,
        `/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${PAGE_SIZE}${startTimeParam}`
      );

      ids.push(...batch);

      start += PAGE_SIZE;
      if (batch.length < PAGE_SIZE) break; // já não há mais partidas nesse intervalo
      await wait(150);
    }

    const results = [];

    for (const matchId of ids) {
      await wait(150); // respeita o limite de pedidos por segundo da key pessoal

      try {
        const match = await riotApiRequest(host, `/lol/match/v5/matches/${matchId}`);
        // Só nos interessa a Arena — descartamos aqui qualquer outro modo
        // (ranked, ARAM, etc.) que venha no histórico geral sem filtro de queue.
        if (match.info?.gameMode !== ARENA_GAME_MODE) continue;

        const participant = match.info?.participants?.find((p) => p.puuid === puuid);
        if (!participant) continue;

        const items = [0, 1, 2, 3, 4, 5, 6]
          .map((i) => participant[`item${i}`])
          .filter((id) => id && id !== 0)
          .map((id) => ({ itemID: id, count: 1 }));

        const augments = [1, 2, 3, 4]
          .map((i) => participant[`playerAugment${i}`])
          .filter((a) => a && a !== 0);

        const spellNames = await getSummonerSpellNameMap();

        // Na Arena só conta como vitória ficar em 1º lugar — o campo "win"
        // da Riot API nem sempre reflete isso com fiabilidade, por isso
        // usamos sempre o "placement" como fonte da verdade.
        results.push({
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
          participants: extractAllParticipants(match, puuid),
        });
      } catch (err) {
        console.warn("[riotapi] falhou partida", matchId, err?.message || err);
      }
    }

    return { success: true, matches: results };
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
ipcMain.handle("riotapi:backfillMatchDetails", async (_event, { matchIds, region, gameName, tagLine }) => {
  if (!RIOT_API_KEY) {
    return { success: false, error: "missing-api-key" };
  }

  const host = `${region || "europe"}.api.riotgames.com`;
  const results = [];

  try {
    const account = await riotApiRequest(
      host,
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );
    const puuid = account.puuid;
    const spellNames = await getSummonerSpellNameMap();

    for (const matchId of matchIds || []) {
      await wait(150); // respeita o limite de pedidos por segundo da key pessoal

      try {
        const match = await riotApiRequest(host, `/lol/match/v5/matches/${matchId}`);
        const participant = match.info?.participants?.find((p) => p.puuid === puuid);
        if (!participant) continue;

        results.push({
          matchId,
          ...extractParticipantStats(match, participant, spellNames),
          participants: extractAllParticipants(match, puuid),
        });
      } catch (err) {
        console.warn("[riotapi] falhou backfill de detalhes", matchId, err?.message || err);
      }
    }

    return { success: true, results };
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
