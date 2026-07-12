import { supabase } from "./supabase";

// ================= ENSURE USER =================
export async function ensureUser(username) {
  const { data, error } = await supabase
    .from("wins")
    .select("username")
    .eq("username", username);

  if (error) {
    console.error("ensureUser error:", error);
    return;
  }

  if (!data || data.length === 0) {
    const { error: insertError } = await supabase
      .from("wins")
      .insert([
        {
          username,
          champions: [],
        },
      ]);

    if (insertError) {
      console.error("ensureUser insert error:", insertError);
    }
  }else console.log("criado user")
}

// ================= GET =================
export async function getWins(username) {
  const { data, error } = await supabase
    .from("wins")
    .select("champions")
    .eq("username", username)
    .maybeSingle(); // 🔥 FIX AQUI

  if (error) {
    console.error("getWins error:", error);
    return [];
  }

  return data?.champions || [];
}

// ================= ADD =================
export async function addWin(username, champion) {
    console.log(username, champion)
  const { data, error } = await supabase
    .from("wins")
    .select("champions")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error("addWin select error:", error);
    return;
  }

  let current = data?.champions;
  console.log(current)
  // 🔥 se não existir row → cria
  if (!current) {
    const { error: insertError } = await supabase.from("wins").insert([
      {
        username,
        champions: [champion],
      },
    ]);

    if (insertError) console.error(insertError);
    return;
  }

  if (current.includes(champion)) return;

  const updated = [...current, champion];
  console.log(updated)
  const { error: updateError } = await supabase
    .from("wins")
    .update({ champions: updated })
    .eq("username", username);
  if (updateError) {
    console.error("addWin update error:", updateError);
  }
}

// ================= MATCHES (histórico de partidas de Arena) =================
// "extra" carrega as estatísticas ao estilo op.gg que a Live Client Data
// watcher conseguir capturar (ver electron.js) — nem todas estão sempre
// disponíveis (ex: dano/ouro só vêm de uma sincronização com a Riot API),
// por isso tudo aqui tem fallback para null em vez de obrigar o valor.
export async function addMatch(username, champion, kills, deaths, assists, win, items, teamSize, extra = {}) {
  const { error } = await supabase.from("matches").insert([
    {
      username,
      champion,
      kills: kills ?? 0,
      deaths: deaths ?? 0,
      assists: assists ?? 0,
      win: !!win,
      items: items || [],
      team_size: teamSize ?? null,
      cs: extra.cs ?? null,
      vision_score: extra.visionScore ?? null,
      champ_level: extra.champLevel ?? null,
      game_duration: extra.gameDuration ?? null,
      damage_dealt: extra.damageDealt ?? null,
      damage_taken: extra.damageTaken ?? null,
      gold_earned: extra.goldEarned ?? null,
      multikill: extra.multikill ?? null,
      summoner1: extra.summoner1 ?? null,
      summoner2: extra.summoner2 ?? null,
      healing: extra.healing ?? null,
      max_hp: extra.maxHp ?? null,
    },
  ]);

  if (error) {
    console.error("addMatch error:", error);
  }
}

// ================= IMPORTAÇÃO (Riot API) =================
export async function getImportedMatchIds(username) {
  const { data, error } = await supabase
    .from("matches")
    .select("riot_match_id")
    .eq("username", username)
    .not("riot_match_id", "is", null);

  if (error) {
    console.error("getImportedMatchIds error:", error);
    return new Set();
  }

  return new Set((data || []).map((r) => r.riot_match_id));
}

export async function addMatchesBulk(username, matches) {
  if (!matches || !matches.length) return { success: true, inserted: 0 };

  const rows = matches.map((m) => ({
    username,
    champion: m.champion,
    kills: m.kills ?? 0,
    deaths: m.deaths ?? 0,
    assists: m.assists ?? 0,
    win: !!m.win,
    items: m.items || [],
    placement: m.placement ?? null,
    augments: m.augments || [],
    team_size: m.teamSize ?? null,
    riot_match_id: m.matchId || null,
    damage_dealt: m.damageDealt ?? null,
    damage_taken: m.damageTaken ?? null,
    gold_earned: m.goldEarned ?? null,
    cs: m.cs ?? null,
    vision_score: m.visionScore ?? null,
    champ_level: m.champLevel ?? null,
    game_duration: m.gameDuration ?? null,
    multikill: m.multikill ?? null,
    summoner1: m.summoner1 ?? null,
    summoner2: m.summoner2 ?? null,
    healing: m.healing ?? null,
    participants: m.participants || null,
    created_at: m.gameEndTimestamp
      ? new Date(m.gameEndTimestamp).toISOString()
      : new Date().toISOString(),
  }));

  const { error } = await supabase.from("matches").insert(rows);

  if (error) {
    console.error("addMatchesBulk error:", error);
    // Causa mais comum: a tabela "matches" na Supabase ainda não tem as
    // colunas riot_match_id/items/placement/augments — corre de novo o
    // supabase_matches_table.sql mais recente.
    return { success: false, error: error.message || String(error), inserted: 0 };
  }

  return { success: true, inserted: rows.length };
}

export async function getMatches(username) {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, riot_match_id, champion, kills, deaths, assists, win, items, placement, augments, team_size, " +
        "damage_dealt, damage_taken, gold_earned, cs, vision_score, champ_level, game_duration, multikill, " +
        "summoner1, summoner2, healing, max_hp, participants, created_at"
    )
    .eq("username", username)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getMatches error:", error);
    return [];
  }

  return data || [];
}

// ================= CORRIGIR FORMATO (team_size) EM FALTA =================
// Algumas partidas antigas foram guardadas antes de existir a coluna
// team_size e ficaram com o valor a null. Isto faz a soma "2v2 + 3v3" não
// coincidir com "Todos os formatos" no resumo. Esta função grava o
// team_size correto (2 ou 3) num lote de ids já identificados pelo App.jsx
// (por heurística de "lugar" ou por nova consulta à Riot API).
export async function updateTeamSizeForIds(ids, teamSize) {
  if (!ids || !ids.length) return { success: true, updated: 0 };

  const { error } = await supabase
    .from("matches")
    .update({ team_size: teamSize })
    .in("id", ids);

  if (error) {
    console.error("updateTeamSizeForIds error:", error);
    return { success: false, error: error.message || String(error) };
  }

  return { success: true, updated: ids.length };
}

// ================= ENRIQUECER PARTIDAS ANTIGAS (dano/ouro/CS/etc.) =================
// Uma partida com riot_match_id é sempre tratada como "já importada" (ver
// getImportedMatchIds) e por isso uma sincronização normal ou "Sincronizar
// tudo" nunca a revisita — mesmo que lhe faltem colunas que não existiam
// quando foi importada da primeira vez (ex: dano, ouro, CS, vision score).
// Esta função faz um UPDATE direto na linha já existente (nunca um INSERT),
// com os campos que o App.jsx já foi buscar de novo à Riot API.
export async function updateMatchDetails(id, details) {
  const { error } = await supabase
    .from("matches")
    .update({
      team_size: details.teamSize ?? null,
      damage_dealt: details.damageDealt ?? null,
      damage_taken: details.damageTaken ?? null,
      gold_earned: details.goldEarned ?? null,
      cs: details.cs ?? null,
      vision_score: details.visionScore ?? null,
      champ_level: details.champLevel ?? null,
      game_duration: details.gameDuration ?? null,
      multikill: details.multikill ?? null,
      summoner1: details.summoner1 ?? null,
      summoner2: details.summoner2 ?? null,
      healing: details.healing ?? null,
      participants: details.participants || null,
    })
    .eq("id", id);

  if (error) {
    console.error("updateMatchDetails error:", error);
    return { success: false, error: error.message || String(error) };
  }

  return { success: true };
}

// ================= REMOVE =================
export async function removeWin(username, champion) {
  const { data, error } = await supabase
    .from("wins")
    .select("champions")
    .eq("username", username)
    .maybeSingle(); // 🔥 FIX AQUI

  if (error) {
    console.error("removeWin select error:", error);
    return;
  }

  const current = data?.champions || [];

  const updated = current.filter((c) => c !== champion);

  const { error: updateError } = await supabase
    .from("wins")
    .update({ champions: updated })
    .eq("username", username);

  if (updateError) {
    console.error("removeWin update error:", updateError);
  }
}