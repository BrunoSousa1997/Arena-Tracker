import { supabase } from "./supabase";
import { findBestSyncedMatch, consumeBestMatches } from "../lib/matchMatching";

// O cliente Supabase reutiliza um canal Realtime existente sempre que se
// pede outro com o MESMO nome (ver RealtimeClient.channel) — em vez de criar
// um novo, devolve o já aberto. Duas subscrições independentes ao mesmo
// "tópico" (ex: useNotifications.js, que corre sempre, e Challenges.jsx, só
// enquanto essa tab está aberta, ambas a pedir "invites-<username>") acabam
// as duas a mexer no MESMO canal — e registar um `.on(...)` novo num canal
// que já fez `.subscribe()` LANÇA uma exceção síncrona dentro do useEffect,
// que sem Error Boundary derruba a app inteira. Um sufixo único por chamada
// garante que cada `subscribeTo*` tem sempre o seu próprio canal.
let channelSeq = 0;
function uniqueChannelName(topic) {
  return `${topic}-${Date.now()}-${++channelSeq}`;
}

// ================= DESAFIOS (salas) =================
// Ver supabase/schema.sql, secção 9, para as tabelas e o aviso sobre não
// haver autenticação nenhuma nesta app.

// Alfabeto sem caracteres ambíguos (0/O, 1/I/l) — o código é para ser lido em
// voz alta ou escrito à mão no Discord, e "O" vs "0" é o erro mais fácil de
// cometer.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;

function generateRoomCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

// Cria a sala e mete já lá o host — quem cria está sempre dentro, não faz
// sentido criar uma sala e ficar de fora dela.
//
// O código é aleatório, por isso pode (raramente) colidir com um já
// existente; a coluna é UNIQUE, logo a base de dados rejeita — tentamos
// outra vez em vez de rebentar na cara do utilizador.
export async function createRoom({ name, hostUsername, maxPlayers, targetGames, rules, rulesConfig, identity }) {
  const MAX_ATTEMPTS = 5;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from("challenge_rooms")
      .insert([
        {
          code,
          name: name.trim(),
          host_username: hostUsername,
          max_players: maxPlayers,
          target_games: targetGames,
          rules: rules || "basic",
          // Só faz sentido guardar afinações quando as regras SÃO as
          // específicas — em "basic" valem sempre as por omissão (ver
          // activeRules em Challenges.jsx).
          rules_config: rules === "custom" ? rulesConfig || null : null,
          status: "lobby",
        },
      ])
      .select()
      .single();

    if (!error) {
      const joined = await joinRoom(data.id, hostUsername, identity);
      if (!joined.success) return joined;
      return { success: true, room: data };
    }

    // 23505 = unique_violation. Só o código repetido justifica repetir.
    if (error.code !== "23505") {
      console.error("createRoom error:", error);
      return { success: false, error: error.message || String(error) };
    }
  }

  return { success: false, error: "room-code-collision" };
}

export async function joinRoom(roomId, username, identity = {}) {
  const { error } = await supabase.from("challenge_room_players").insert([
    {
      room_id: roomId,
      username,
      riot_game_name: identity.riotGameName || null,
      riot_tag_line: identity.riotTagLine || null,
    },
  ]);

  // Já lá estar não é erro nenhum — é o caso normal de reabrir a app ou
  // carregar duas vezes; o UNIQUE(room_id, username) é que garante isso.
  if (error && error.code !== "23505") {
    console.error("joinRoom error:", error);
    return { success: false, error: error.message || String(error) };
  }

  return { success: true };
}

export async function getRoomByCode(code) {
  const { data, error } = await supabase
    .from("challenge_rooms")
    .select("*")
    .ilike("code", code.trim())
    .maybeSingle();

  if (error) {
    console.error("getRoomByCode error:", error);
    return null;
  }
  return data;
}

export async function getRoom(roomId) {
  const { data, error } = await supabase
    .from("challenge_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    console.error("getRoom error:", error);
    return null;
  }
  return data;
}

export async function getRoomPlayers(roomId) {
  const { data, error } = await supabase
    .from("challenge_room_players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("getRoomPlayers error:", error);
    return [];
  }
  return data || [];
}

// A sala em que esta conta está agora (se alguma) — a verdade vive no
// servidor, não em localStorage: assim reabrir a app, ou abri-la noutro
// sítio, mostra sempre o estado real em vez de um palpite local.
export async function getMyActiveRoom(username) {
  const { data, error } = await supabase
    .from("challenge_room_players")
    .select("room_id, challenge_rooms!inner(*)")
    .eq("username", username)
    .in("challenge_rooms.status", ["lobby", "running"])
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getMyActiveRoom error:", error);
    return null;
  }
  return data?.challenge_rooms || null;
}

// ================= HISTÓRICO =================
// Desafios já terminados de que esta conta fez parte, mais recente primeiro
// — a sala fica na base de dados depois de terminar (ver finishRoom), por
// isso não precisamos de guardar histórico à parte.
export async function getChallengeHistory(username, limit = 30) {
  const { data, error } = await supabase
    .from("challenge_room_players")
    .select("room_id, challenge_rooms!inner(*)")
    .eq("username", username)
    .eq("challenge_rooms.status", "finished")
    .order("finished_at", { ascending: false, referencedTable: "challenge_rooms" })
    .limit(limit);

  if (error) {
    console.error("getChallengeHistory error:", error);
    return [];
  }
  return (data || []).map((r) => r.challenge_rooms);
}

// Quantos desafios esta conta já venceu — base da conquista "challenge_wins"
// (ver lib/achievementStats.js). Um COUNT direto chega, não precisa dos
// dados todos.
export async function getChallengeWinCount(username) {
  if (!username) return 0;

  const { count, error } = await supabase
    .from("challenge_rooms")
    .select("id", { count: "exact", head: true })
    .eq("status", "finished")
    .eq("winner_username", username);

  if (error) {
    console.error("getChallengeWinCount error:", error);
    return 0;
  }
  return count || 0;
}

export async function leaveRoom(roomId, username) {
  const { error } = await supabase
    .from("challenge_room_players")
    .delete()
    .eq("room_id", roomId)
    .eq("username", username);

  if (error) {
    console.error("leaveRoom error:", error);
    return { success: false, error: error.message || String(error) };
  }
  return { success: true };
}

// Quanto tempo tem de passar entre desistências da mesma conta. Sem isto,
// desistir era grátis e repetível: criar sala -> desistir logo -> o outro
// jogador fica sozinho em prova e "ganha" o desafio na hora, tantas vezes
// quantas se quisesse (ver getChallengeWinCount, que alimenta a conquista
// de vitórias em desafios). Um intervalo obrigatório torna essa farmagem
// lenta o suficiente para não valer a pena, sem estorvar quem desiste de um
// desafio a sério de vez em quando.
export const FORFEIT_COOLDOWN_MS = 60 * 60 * 1000;

// Não se pode desistir NO INSTANTE em que o desafio arranca. Era esse o
// exploit de raiz: numa sala de 2, quem desiste deixa o outro sozinho em
// prova e o desafio termina logo com ele como vencedor (ver ScoreBoard) —
// dois combinados farmavam vitórias em segundos, sem jogar nada.
//
// Exige-se então uma de duas coisas: ter jogado pelo menos uma partida no
// desafio (aí houve jogo a sério, desistir é legítimo), ou ter esperado
// este tempo desde o arranque (rede de segurança para quem afinal não pode
// mesmo jogar não ficar preso na sala para sempre).
export const FORFEIT_MIN_WAIT_MS = 15 * 60 * 1000;

// Desistir do desafio já a decorrer. Ao contrário de leaveRoom (que apaga o
// lugar na sala, e com ele o desafio do histórico desta conta), isto MANTÉM
// tudo — a linha fica, os pontos já feitos ficam, o desafio continua a
// aparecer no histórico — só marca o jogador como tendo desistido: cai para
// último lugar no placar e o desafio deixa de esperar por ele para terminar
// (ver ScoreBoard em Challenges.jsx).
//
// As travas anti-farm (cooldown de FORFEIT_COOLDOWN_MS e mínimo de
// FORFEIT_MIN_WAIT_MS, ver acima) são agora impostas NO SERVIDOR, dentro da
// função rpc_forfeit_challenge (ver supabase/schema.sql) — antes eram só do
// lado do cliente, que um build modificado contornava. Devolve os mesmos
// códigos de sempre ("forfeit-cooldown"/"forfeit-too-early" + retryInMs) para
// a UI (ver handleForfeit em Challenges.jsx) não precisar de mudar.
export async function forfeitChallenge(roomId, username) {
  const { data, error } = await supabase.rpc("rpc_forfeit_challenge", {
    p_room_id: roomId,
    p_username: username,
  });

  if (error) {
    console.error("forfeitChallenge error:", error);
    return { success: false, error: error.message || String(error) };
  }
  if (!data?.success) {
    return { success: false, error: data?.error, retryInMs: data?.retry_in_ms };
  }
  return { success: true };
}

// Inicia o desafio — de "lobby" para "running". Só o anfitrião, imposto no
// servidor (ver rpc_start_room em supabase/schema.sql).
export async function startRoom(roomId, hostUsername) {
  const { data, error } = await supabase.rpc("rpc_start_room", {
    p_room_id: roomId,
    p_host_username: hostUsername,
  });

  if (error) {
    console.error("startRoom error:", error);
    return { success: false, error: error.message || String(error) };
  }
  if (!data?.success) return { success: false, error: data?.error };
  return { success: true };
}

// Termina o desafio — chamado só pelo anfitrião (ver ScoreBoard em
// Challenges.jsx), assim que TODOS os jogadores atingem target_games. Ao
// contrário de closeRoom, isto NÃO apaga a sala: fica com status "finished"
// e vira uma entrada de histórico (ver getChallengeHistory) e conta para a
// conquista de vitórias em desafios (ver getChallengeWinCount).
// "hostUsername" (a conta ativa de quem persiste o fim) é verificado no
// servidor contra o anfitrião real da sala (ver rpc_finish_room em
// supabase/schema.sql) — só o anfitrião termina. As "results"/scoring_rules
// (a fotografia com que fica o histórico) continuam a ser calculadas no
// cliente (ver persistFinish em Challenges.jsx); a RPC valida quem pede e o
// estado, não recalcula a pontuação.
export async function finishRoom(roomId, { winnerUsername, results, scoringRules, hostUsername }) {
  const { data, error } = await supabase.rpc("rpc_finish_room", {
    p_room_id: roomId,
    p_host_username: hostUsername,
    p_winner_username: winnerUsername || null,
    p_results: results || null,
    p_scoring_rules: scoringRules || null,
  });

  if (error) {
    console.error("finishRoom error:", error);
    return { success: false, error: error.message || String(error) };
  }
  if (!data?.success) return { success: false, error: data?.error };
  return { success: true };
}

// Sair sendo host desfaz a sala: sem host não há quem a comece, e deixar uma
// sala órfã só ia confundir quem lá estivesse à espera. O "cascade" das
// tabelas leva jogadores e convites atrás. Só o anfitrião pode desfazer,
// imposto no servidor (ver rpc_close_room em supabase/schema.sql) — antes
// qualquer cliente apagava QUALQUER sala por id.
export async function closeRoom(roomId, hostUsername) {
  const { data, error } = await supabase.rpc("rpc_close_room", {
    p_room_id: roomId,
    p_host_username: hostUsername,
  });

  if (error) {
    console.error("closeRoom error:", error);
    return { success: false, error: error.message || String(error) };
  }
  if (!data?.success) return { success: false, error: data?.error };
  return { success: true };
}

// ================= CONVITES =================
// "upsert" (não insert) — se já existir uma linha para (room_id, to_username)
// de uma vez anterior, REPÕE-A a "pending" em vez de a ignorar. Um insert
// simples com 23505 tratado como sucesso (versão antiga) deixava o convite
// preso em "declined" para sempre: reconvidar depois de recusado inseria
// zero linhas novas e o destinatário nunca mais via nada.
export async function inviteToRoom(roomId, fromUsername, toUsername) {
  const { error } = await supabase.from("challenge_invites").upsert(
    [
      {
        room_id: roomId,
        from_username: fromUsername,
        to_username: toUsername,
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ],
    { onConflict: "room_id,to_username" }
  );

  if (error) {
    console.error("inviteToRoom error:", error);
    return { success: false, error: error.message || String(error) };
  }
  return { success: true };
}

export async function getPendingInvites(username) {
  const { data, error } = await supabase
    .from("challenge_invites")
    .select("*, challenge_rooms!inner(*)")
    .eq("to_username", username)
    .eq("status", "pending")
    .eq("challenge_rooms.status", "lobby")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPendingInvites error:", error);
    return [];
  }
  return data || [];
}

export async function respondToInvite(inviteId, status) {
  const { error } = await supabase
    .from("challenge_invites")
    .update({ status })
    .eq("id", inviteId);

  if (error) {
    console.error("respondToInvite error:", error);
    return { success: false, error: error.message || String(error) };
  }
  return { success: true };
}

// ================= JOGOS DO DESAFIO (coleção própria) =================
// Ao contrário de "matches" (histórico normal, alimentado pelo sync com a
// Riot API em useRiotSync.js — em NADA alterado por nenhuma destas funções),
// cada partida jogada dentro de um challenge tem a sua PRÓPRIA linha aqui:
// nasce "live" quando a partida começa (startChallengeGame), atualiza-se a
// cada poll da Live Client Data com KDA/streaks (updateChallengeGameProgress),
// fecha com o resultado quando a partida acaba (finishChallengeGame), e é
// enriquecida à parte com dano/cura/multikills assim que esses dados
// aparecerem em "matches" pelo sync normal (enrichChallengeGame +
// findSyncedMatchDetails, que só LÊ "matches", nunca escreve). Toda esta
// máquina de estados vive em useLiveGame.js.

// Cria a linha "a decorrer" assim que a partida começa. Devolve a linha
// criada para useLiveGame.js guardar o id e ir atualizando.
export async function startChallengeGame(roomId, username, champion = null) {
  const { data, error } = await supabase
    .from("challenge_games")
    .insert([{ room_id: roomId, username, champion, status: "live" }])
    .select()
    .single();

  if (error) {
    console.error("startChallengeGame error:", error);
    return null;
  }
  return data;
}

// KDA + streaks atuais — chamado a cada poll (3s) enquanto a partida decorre.
export async function updateChallengeGameProgress(
  gameId,
  { champion, kills, deaths, assists, killStreaks, assistStreaks, deathStreaks }
) {
  const { error } = await supabase
    .from("challenge_games")
    .update({
      champion: champion || null,
      kills: kills ?? 0,
      deaths: deaths ?? 0,
      assists: assists ?? 0,
      kill_streaks: killStreaks || [],
      assist_streaks: assistStreaks || [],
      death_streaks: deathStreaks || [],
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId);

  if (error) console.error("updateChallengeGameProgress error:", error);
}

// Partida acabou com resultado conhecido (Win/Lose) — fecha o jogo com o KDA
// final. Ainda sem dano/cura/multikills (ver enrichChallengeGame).
export async function finishChallengeGame(
  gameId,
  { champion, kills, deaths, assists, win, killStreaks, assistStreaks, deathStreaks }
) {
  const { error } = await supabase
    .from("challenge_games")
    .update({
      champion: champion || null,
      kills: kills ?? 0,
      deaths: deaths ?? 0,
      assists: assists ?? 0,
      win: !!win,
      kill_streaks: killStreaks || [],
      assist_streaks: assistStreaks || [],
      death_streaks: deathStreaks || [],
      status: "finished",
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId);

  if (error) console.error("finishChallengeGame error:", error);
}

// Sessão morreu sem NENHUM resultado (saiu a meio, jogo estoirou, fechou-se
// a app) — a partida FICA, com tudo o que já tinha acumulado. Um desafio
// nunca tira pontos a ninguém: o KDA/streaks mais recentes já foram
// gravados nesta linha pelo poll de 3 em 3s (ver
// updateChallengeGameProgress), por isso basta fechá-la, sem lhe tocar nos
// valores. Só o resultado (win) é que fica por saber — não houve evento
// GameEnd que o dissesse.
//
// (Uma versão anterior APAGAVA a linha aqui, o que fazia desaparecer do
// placar tudo o que se tinha feito nessa partida.)
export async function closeUnfinishedChallengeGame(gameId) {
  const { error } = await supabase
    .from("challenge_games")
    .update({ status: "finished", finished_at: new Date().toISOString() })
    .eq("id", gameId);

  if (error) console.error("closeUnfinishedChallengeGame error:", error);
}

// Vai buscar a "matches" (só LÊ — nunca escreve, nunca altera o que o sync
// normal já fez) o dano/cura/multikills desta partida, para copiar para a
// linha do challenge. Mesma heurística de correspondência que hasSyncedMatch
// (campeão + janela temporal + KDA mais próximo, ver findBestSyncedMatch),
// tolerante a um poll final que perdeu o abate/morte derradeiro.
export async function findSyncedMatchDetails(username, { champion, kills, deaths, assists, after }) {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "champion, kills, deaths, assists, created_at, " +
        "damage_dealt, damage_taken, healing, double_kills, triple_kills, participants"
    )
    .eq("username", username)
    .eq("champion", champion)
    .not("riot_match_id", "is", null)
    .gte("created_at", after);

  if (error) {
    console.error("findSyncedMatchDetails error:", error);
    return null;
  }

  return findBestSyncedMatch({ champion, kills, deaths, assists, anchorTime: after }, data || []);
}

// Copia dano/cura/multikills para a linha do challenge assim que aparecerem
// em "matches" (chamado pelo retry em useLiveGame.js, ver
// findSyncedMatchDetails acima).
export async function enrichChallengeGame(
  gameId,
  { damageDealt, damageTaken, healing, doubleKills, tripleKills, participants }
) {
  const { error } = await supabase
    .from("challenge_games")
    .update({
      damage_dealt: damageDealt ?? null,
      damage_taken: damageTaken ?? null,
      healing: healing ?? null,
      double_kills: doubleKills ?? null,
      triple_kills: tripleKills ?? null,
      // Necessário para a regra "só jogos sem adversários do desafio" (ver
      // onlySoloGames em challengeScoring.js) — sem isto, essa regra não
      // tinha como saber quem mais esteve nesta Arena.
      participants: participants || null,
      status: "enriched",
    })
    .eq("id", gameId);

  if (error) console.error("enrichChallengeGame error:", error);
}

// ================= JOGOS DA SALA (placar) =================
// O placar precisa dos jogos de TODOS os jogadores da sala, não só da conta
// ativa neste dispositivo — RLS aberta (ver schema.sql), por isso dá para ir
// buscar diretamente pelos usernames dos jogadores da sala. Devolve TODOS os
// estados (live/finished/enriched) numa só consulta — o ScoreBoard separa a
// partida "a decorrer" (status live) das já terminadas.
export async function getRoomChallengeGames(usernames, sinceISO) {
  if (!usernames?.length) return [];

  const { data, error } = await supabase
    .from("challenge_games")
    .select(
      "id, username, champion, kills, deaths, assists, win, damage_dealt, damage_taken, healing, " +
        "double_kills, triple_kills, kill_streaks, assist_streaks, death_streaks, participants, " +
        "status, started_at, updated_at"
    )
    .in("username", usernames)
    .gte("started_at", sinceISO)
    .order("started_at", { ascending: true });

  if (error) {
    console.error("getRoomChallengeGames error:", error);
    return [];
  }
  return data || [];
}

// ================= RECUPERAR JOGOS EM FALTA (botão manual) =================
// Uma partida só entra num desafio se a Live Client Data a apanhar do início
// (ver startChallengeGame, chamado por useLiveGame.js) — se a app estiver
// fechada, abrir a meio do jogo, ou a sala só passar a "running" depois de a
// partida começar, essa partida fica perdida para o desafio, mesmo estando
// no histórico normal.
//
// Isto repesca-as: procura em "matches" partidas desta conta jogadas depois
// do início do desafio que ainda não tenham linha em challenge_games, e
// cria-as lá já completas (a esta altura "matches" já tem dano/cura/
// multikills, por isso entram direto como "enriched", sem precisar do ciclo
// de enriquecimento).
//
// Só LÊ de "matches" — nunca escreve nem altera nada do histórico normal
// nem do sync (ver useRiotSync.js, que isto não toca).
export async function recoverMissingChallengeGames(roomId, username, sinceISO) {
  const [matchesRes, existingRes] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "champion, kills, deaths, assists, win, damage_dealt, damage_taken, healing, " +
          "double_kills, triple_kills, kill_streaks, assist_streaks, death_streaks, " +
          "participants, game_duration, created_at"
      )
      .eq("username", username)
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: true }),
    supabase
      .from("challenge_games")
      .select("champion, kills, deaths, assists, started_at")
      .eq("room_id", roomId)
      .eq("username", username),
  ]);

  if (matchesRes.error) {
    console.error("recoverMissingChallengeGames (matches) error:", matchesRes.error);
    return { success: false, recovered: 0 };
  }
  if (existingRes.error) {
    console.error("recoverMissingChallengeGames (games) error:", existingRes.error);
    return { success: false, recovered: 0 };
  }

  // Uma partida já registada no desafio é reconhecida pelo mesmo campeão +
  // KDA exatos — o mesmo critério que hasSyncedMatch/findSyncedMatchDetails
  // já usam para casar uma captura ao vivo com a linha da Riot API. Cada
  // linha existente só "consome" uma partida (splice), para dois jogos
  // idênticos no mesmo desafio não colapsarem num só.
  const pool = [...(existingRes.data || [])];
  const toInsert = [];
  const sinceTime = new Date(sinceISO).getTime();

  for (const m of matchesRes.data || []) {
    // O "created_at" de uma partida é o momento em que ela ACABOU, por isso
    // o filtro da consulta acima ainda deixa passar uma partida que já
    // estava a decorrer quando o desafio arrancou (começou antes, acabou
    // depois) — essa não foi jogada dentro do desafio e não deve contar.
    // Com "game_duration" (segundos) dá para recuar até ao início real e
    // exigir que TAMBÉM ele seja depois do arranque. Sem duração conhecida
    // (partidas antigas), fica-se pelo critério do fim, que é o que há.
    if (m.game_duration) {
      const startedAt = new Date(m.created_at).getTime() - m.game_duration * 1000;
      if (startedAt < sinceTime) continue;
    }

    const idx = pool.findIndex(
      (g) =>
        g.champion === m.champion &&
        g.kills === (m.kills ?? 0) &&
        g.deaths === (m.deaths ?? 0) &&
        g.assists === (m.assists ?? 0)
    );

    if (idx !== -1) {
      pool.splice(idx, 1);
      continue;
    }

    toInsert.push({
      room_id: roomId,
      username,
      champion: m.champion,
      kills: m.kills ?? 0,
      deaths: m.deaths ?? 0,
      assists: m.assists ?? 0,
      win: !!m.win,
      damage_dealt: m.damage_dealt ?? null,
      damage_taken: m.damage_taken ?? null,
      healing: m.healing ?? null,
      double_kills: m.double_kills ?? null,
      triple_kills: m.triple_kills ?? null,
      kill_streaks: m.kill_streaks || [],
      assist_streaks: m.assist_streaks || [],
      death_streaks: m.death_streaks || [],
      participants: m.participants || null,
      status: "enriched",
      started_at: m.created_at,
      updated_at: new Date().toISOString(),
      finished_at: m.created_at,
    });
  }

  if (!toInsert.length) return { success: true, recovered: 0 };

  const { error } = await supabase.from("challenge_games").insert(toInsert);
  if (error) {
    console.error("recoverMissingChallengeGames (insert) error:", error);
    return { success: false, recovered: 0 };
  }

  console.log(`🔁 ${toInsert.length} partida(s) recuperada(s) para o desafio ${roomId}`);
  return { success: true, recovered: toInsert.length };
}

// ================= ENRIQUECER JOGOS JÁ REGISTADOS (dados de combate) =================
// Complemento de recoverMissingChallengeGames: aquela CRIA linhas para
// partidas que o desafio nunca chegou a registar; esta preenche as linhas que
// JÁ existem mas ficaram sem dano/cura/dano recebido/multikills.
//
// Isso acontece sempre que a captura ao vivo fechou a partida (finishChallengeGame
// -> status "finished") mas o ciclo de enriquecimento automático (ver
// enrichChallengeGame + scheduleAutoSync em useLiveGame.js) não chegou a
// completar-se — app fechada logo a seguir ao jogo, sync da Riot ainda por
// fazer, etc. Sem dano/cura, um desafio cujas regras contam essas categorias
// fica com pontuações incompletas.
//
// Casa cada linha "finished" sem dano com a partida correspondente em "matches"
// (mesmo campeão + KDA exatos, o critério de sempre), mas SÓ com partidas já
// sincronizadas com a Riot API (riot_match_id preenchido) — são as únicas que
// têm dano/cura. Por isso o botão que chama isto sincroniza primeiro com a
// Riot. Só LÊ de "matches", nunca escreve lá.
export async function enrichFinishedChallengeGames(roomId, username, sinceISO) {
  const [gamesRes, matchesRes] = await Promise.all([
    supabase
      .from("challenge_games")
      .select("id, champion, kills, deaths, assists, started_at, finished_at")
      .eq("room_id", roomId)
      .eq("username", username)
      .eq("status", "finished")
      .is("damage_dealt", null),
    supabase
      .from("matches")
      .select(
        "champion, kills, deaths, assists, created_at, damage_dealt, damage_taken, healing, " +
          "double_kills, triple_kills, participants"
      )
      .eq("username", username)
      .not("riot_match_id", "is", null)
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: true }),
  ]);

  if (gamesRes.error) {
    console.error("enrichFinishedChallengeGames (games) error:", gamesRes.error);
    return { success: false, enriched: 0 };
  }
  if (matchesRes.error) {
    console.error("enrichFinishedChallengeGames (matches) error:", matchesRes.error);
    return { success: false, enriched: 0 };
  }

  // Casa cada linha por enriquecer à melhor partida da Riot (campeão + janela
  // temporal a partir do fim do jogo + KDA mais próximo), consumindo cada
  // partida no máximo uma vez — dois jogos idênticos não roubam os dados um do
  // outro (ver consumeBestMatches em src/lib/matchMatching.js). Tolerante a um
  // poll final que perdeu o abate/morte derradeiro.
  const targets = (gamesRes.data || []).map((g) => ({
    id: g.id,
    champion: g.champion,
    kills: g.kills,
    deaths: g.deaths,
    assists: g.assists,
    anchorTime: g.finished_at || g.started_at,
  }));

  const pairs = consumeBestMatches(targets, matchesRes.data || []);
  let enriched = 0;

  for (const { target, match: m } of pairs) {
    const { error } = await supabase
      .from("challenge_games")
      .update({
        damage_dealt: m.damage_dealt ?? null,
        damage_taken: m.damage_taken ?? null,
        healing: m.healing ?? null,
        double_kills: m.double_kills ?? null,
        triple_kills: m.triple_kills ?? null,
        participants: m.participants || null,
        status: "enriched",
      })
      .eq("id", target.id);

    if (error) console.error("enrichFinishedChallengeGames (update) error:", error);
    else enriched++;
  }

  return { success: true, enriched };
}

// Qualquer mudança nos jogos desta sala (nova partida a começar, KDA a
// atualizar, partida a terminar ou a ganhar dano/cura) — um canal por sala,
// filtrado por room_id (mesma convenção de subscribeToRoom).
export function subscribeToChallengeGames(roomId, onChange) {
  const channel = supabase
    .channel(uniqueChannelName(`challenge-games-${roomId}`))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "challenge_games", filter: `room_id=eq.${roomId}` },
      onChange
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ================= TEMPO REAL =================
// Só funciona com as tabelas publicadas em "supabase_realtime" (ver o bloco
// final de supabase/schema.sql) — sem isso a subscrição liga-se na mesma e
// nunca recebe nada.
export function subscribeToRoom(roomId, onChange) {
  const channel = supabase
    .channel(uniqueChannelName(`room-${roomId}`))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "challenge_room_players", filter: `room_id=eq.${roomId}` },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "challenge_rooms", filter: `id=eq.${roomId}` },
      onChange
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToInvites(username, onChange) {
  const channel = supabase
    .channel(uniqueChannelName(`invites-${username}`))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "challenge_invites", filter: `to_username=eq.${username}` },
      onChange
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
