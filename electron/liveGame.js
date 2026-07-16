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
// ================= SEQUÊNCIAS "SEM MORRER" (para os desafios) =================
// A Live Client Data dá-nos os contadores a EVOLUIR (de 3 em 3s), não só o
// total final — por isso, ao contrário do histórico importado da Riot API
// (só totais), aqui dá para saber cada corrida de kills/assists entre mortes.
// Regra: uma sequência é kills (ou assists) que se juntam enquanto o nº de
// deaths não sobe; assim que sobe, quebra e começa outra. Guardamos TODAS as
// sequências da partida (não só a maior) — a pontuação soma o bónus de cada
// uma (ver challengeScoring.js).
//
// Limitação do método: amostramos de 3 em 3s, não cada evento. Se num mesmo
// intervalo houver uma kill E uma morte, não sabemos a ordem — por isso, se
// as deaths subiram nesse intervalo, damos a sequência por quebrada e não
// creditamos as kills desse intervalo (conservador, subconta no caso raro em
// vez de inflar).
let liveKillStreak = 0; // corrida de kills a decorrer
let liveKillStreaks = []; // corridas de kills já terminadas por uma morte
let liveAssistStreak = 0;
let liveAssistStreaks = [];
let liveLastKills = 0;
let liveLastDeaths = 0;
let liveLastAssists = 0;

// Junta as corridas já terminadas com a que está a decorrer (se tiver algo) —
// é a lista completa "até agora". Guardada em liveGameState a cada poll, para
// o GameEnd a ler já pronta.
function currentStreaks(finished, ongoing) {
  return ongoing > 0 ? [...finished, ongoing] : [...finished];
}
// Avisa a interface uma única vez por partida sobre qual campeão está a ser
// jogado (ver sendActiveChampion) — sem isto reenviaríamos o mesmo aviso a
// cada poll (de 3 em 3 segundos) enquanto a partida decorre.
let liveChampionAnnounced = false;
// Já enviámos o resultado desta partida para a interface? Isto viaja no
// "livegame:sessionEnded" (ver endLiveSession) para o banner saber se deve
// ficar a mostrar o resultado ou simplesmente desaparecer — sem isto havia
// uma corrida entre o resultado (que a interface processa de forma
// assíncrona, com escritas na BD pelo meio) e o fim da sessão.
let liveResultSent = false;

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

// A partida deixou de existir: acabou e o cliente fechou, saíste a meio
// (alt-F4), ou o jogo estoirou. Antes disto o processo principal limpava o
// seu estado em silêncio e a interface nunca sabia — o banner ficava preso a
// dizer "a jogar" para sempre, mesmo já fora do jogo.
//
// "hadResult" diz se o resultado chegou a ser enviado (evento GameEnd) antes
// da API morrer: se sim, o banner deve ficar a mostrar o resultado (e o
// lembrete para sincronizar); se não, saímos sem resultado nenhum e o banner
// só tem de desaparecer.
function endLiveSession() {
  const hadResult = liveResultSent;

  liveGamePhase = "idle";
  liveGameState = null;
  liveGameFailures = 0;
  liveChampionAnnounced = false;
  liveGameMaxPlayers = 0;
  liveGameMaxHp = 0;
  liveResultSent = false;
  liveKillStreak = 0;
  liveKillStreaks = [];
  liveAssistStreak = 0;
  liveAssistStreaks = [];
  liveLastKills = 0;
  liveLastDeaths = 0;
  liveLastAssists = 0;

  console.log("[livegame] sessão terminada (hadResult=" + hadResult + ")");
  const win = getWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send("livegame:sessionEnded", { hadResult });
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
      liveResultSent = false;
      // Semeia os contadores com o que o jogador JÁ tem neste primeiro poll,
      // em vez de 0 — se a app abrir a meio de uma partida, as kills que já
      // existiam não devem contar como uma sequência acabada de fazer. Com a
      // semente igual ao valor atual, o primeiro diff é 0.
      liveKillStreak = 0;
      liveKillStreaks = [];
      liveAssistStreak = 0;
      liveAssistStreaks = [];
      liveLastKills = me.scores?.kills ?? 0;
      liveLastDeaths = me.scores?.deaths ?? 0;
      liveLastAssists = me.scores?.assists ?? 0;
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

      // Sequências "sem morrer" (ver comentário junto às variáveis lá em
      // cima): kills/assists juntam-se enquanto as deaths não sobem; quando
      // sobem, quebra. Guarda a maior de cada tipo.
      const kNow = me.scores?.kills ?? 0;
      const dNow = me.scores?.deaths ?? 0;
      const aNow = me.scores?.assists ?? 0;

      if (dNow > liveLastDeaths) {
        // Morreu — as duas sequências quebram. A que estava a decorrer, se
        // tinha algo, guarda-se na lista antes de reiniciar. As kills/assists
        // que possam ter vindo no mesmo intervalo não se creditam (não
        // sabemos se foram antes ou depois da morte).
        if (liveKillStreak > 0) liveKillStreaks.push(liveKillStreak);
        if (liveAssistStreak > 0) liveAssistStreaks.push(liveAssistStreak);
        liveKillStreak = 0;
        liveAssistStreak = 0;
      } else {
        liveKillStreak += Math.max(0, kNow - liveLastKills);
        liveAssistStreak += Math.max(0, aNow - liveLastAssists);
      }
      liveLastKills = kNow;
      liveLastDeaths = dNow;
      liveLastAssists = aNow;

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
        killStreaks: currentStreaks(liveKillStreaks, liveKillStreak),
        assistStreaks: currentStreaks(liveAssistStreaks, liveAssistStreak),
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
        liveResultSent = true;
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
          // TODAS as sequências de kills/assists sem morrer, medidas ao vivo
          // (ver comentário junto às variáveis) — só existem para partidas
          // jogadas com a app aberta; as importadas da Riot API ficam sem isto.
          killStreaks: liveGameState.killStreaks ?? null,
          assistStreaks: liveGameState.assistStreaks ?? null,
        });
      }
    }
  } catch (err) {
    liveGameFailures += 1;

    // API deixou de responder (fim de jogo, alt-F4, etc.) -> volta ao estado
    // inicial E avisa a interface (ver endLiveSession). Só faz sentido
    // avisar se chegou a haver partida: fora de jogo a API não responde
    // sempre, e isso não é o "fim" de nada — seria um aviso a cada 3 falhas,
    // para sempre, com o jogo fechado.
    if (liveGameFailures >= 3) {
      if (liveGamePhase === "idle") {
        liveGameFailures = 0;
      } else {
        endLiveSession();
      }
    }
  }
}

function startLiveGameWatcher() {
  setInterval(() => {
    pollLiveGame();
  }, 3000);
}

module.exports = { startLiveGameWatcher };
