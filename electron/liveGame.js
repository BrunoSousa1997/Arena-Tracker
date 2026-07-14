const https = require("https");
const { getWindow } = require("./windowState");
const { ARENA_GAME_MODE, teamSizeFromPlayerCount } = require("./arenaShared");

// ================= LIVE CLIENT DATA (Arena match tracking) =================
// API local e oficial da Riot (https://127.0.0.1:2999/liveclientdata/...),
// só ativa durante uma partida, só leitura. Não interage com o processo do
// jogo nem com a memória, por isso não tem qualquer risco de ban.

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
  const win = getWindow();
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
  const win = getWindow();
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
  const win = getWindow();
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

module.exports = { startLiveGameWatcher };
