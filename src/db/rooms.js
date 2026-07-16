import { supabase } from "./supabase";

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
export async function inviteToRoom(roomId, fromUsername, toUsername) {
  const { error } = await supabase
    .from("challenge_invites")
    .insert([{ room_id: roomId, from_username: fromUsername, to_username: toUsername }]);

  // 23505 = já convidado. Não é erro para quem carregou no botão outra vez.
  if (error && error.code !== "23505") {
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

// ================= TEMPO REAL =================
// Só funciona com as tabelas publicadas em "supabase_realtime" (ver o bloco
// final de supabase/schema.sql) — sem isso a subscrição liga-se na mesma e
// nunca recebe nada.
export function subscribeToRoom(roomId, onChange) {
  const channel = supabase
    .channel(`room-${roomId}`)
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
    .channel(`invites-${username}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "challenge_invites", filter: `to_username=eq.${username}` },
      onChange
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
