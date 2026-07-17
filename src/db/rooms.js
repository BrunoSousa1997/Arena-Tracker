import { supabase } from "./supabase";

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
export async function createRoom({ name, hostUsername, maxPlayers, targetGames, rules, identity }) {
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

// Inicia o desafio — muda o estado de "lobby" para "running" e começa a
// rastrear pontuações. Só o host pode fazer isto.
export async function startRoom(roomId) {
  const { error } = await supabase
    .from("challenge_rooms")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", roomId);

  if (error) {
    console.error("startRoom error:", error);
    return { success: false, error: error.message || String(error) };
  }
  return { success: true };
}

// Termina o desafio — chamado só pelo anfitrião (ver ScoreBoard em
// Challenges.jsx), assim que TODOS os jogadores atingem target_games. Ao
// contrário de closeRoom, isto NÃO apaga a sala: fica com status "finished"
// e vira uma entrada de histórico (ver getChallengeHistory) e conta para a
// conquista de vitórias em desafios (ver getChallengeWinCount).
export async function finishRoom(roomId, { winnerUsername, results }) {
  const { error } = await supabase
    .from("challenge_rooms")
    .update({
      status: "finished",
      finished_at: new Date().toISOString(),
      winner_username: winnerUsername || null,
      results: results || null,
    })
    .eq("id", roomId);

  if (error) {
    console.error("finishRoom error:", error);
    return { success: false, error: error.message || String(error) };
  }
  return { success: true };
}

// Sair sendo host desfaz a sala: sem host não há quem a comece, e deixar uma
// sala órfã só ia confundir quem lá estivesse à espera. O "cascade" das
// tabelas leva jogadores e convites atrás.
export async function closeRoom(roomId) {
  const { error } = await supabase.from("challenge_rooms").delete().eq("id", roomId);

  if (error) {
    console.error("closeRoom error:", error);
    return { success: false, error: error.message || String(error) };
  }
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

// ================= PARTIDAS DO DESAFIO (todos os jogadores) =================
// O placar ao vivo precisa das partidas de TODOS os jogadores da sala, não só
// da conta ativa neste dispositivo — "matches" não tem dono nenhum (RLS
// aberta, ver schema.sql), por isso dá para ir buscar diretamente pelos
// usernames dos jogadores da sala. Só partidas do LiveMode contam (as que
// entram por aqui têm sempre created_at do momento em que a partida acabou),
// por isso basta filtrar por data >= início do desafio.
export async function getRoomMatchesForPlayers(usernames, sinceISO) {
  if (!usernames?.length) return [];

  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, username, champion, kills, deaths, assists, win, placement, damage_dealt, " +
        "damage_taken, healing, double_kills, triple_kills, multikill, kill_streaks, assist_streaks, created_at"
    )
    .in("username", usernames)
    .gte("created_at", sinceISO)
    // Só LiveMode: partidas importadas em lote (riot_match_id) podem ter
    // created_at retroativo (data do jogo, não da sincronização) e não são
    // uma amostra "ao vivo" do desafio — ficam de fora da pontuação.
    .is("riot_match_id", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getRoomMatchesForPlayers error:", error);
    return [];
  }
  return data || [];
}

// Nova partida de qualquer conta — sem filtro por username (o Supabase
// Realtime não filtra por listas "IN"), quem ouve decide se lhe interessa.
export function subscribeToMatches(onInsert) {
  const channel = supabase
    .channel(uniqueChannelName("challenge-live-matches"))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches" }, onInsert)
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

// Convites que ESTA conta enviou (não recebeu) — só usado para a
// confirmação "convite enviado" nas notificações (ver useNotifications.js).
// Canal à parte de subscribeToInvites: cada canal do Realtime só filtra por
// UMA coluna, por isso "de quem enviei" e "quem me convidou" não cabem na
// mesma subscrição.
export function subscribeToSentInvites(username, onChange) {
  const channel = supabase
    .channel(uniqueChannelName(`invites-sent-${username}`))
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "challenge_invites", filter: `from_username=eq.${username}` },
      onChange
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
