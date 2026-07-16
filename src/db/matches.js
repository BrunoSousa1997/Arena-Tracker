import { supabase } from "./supabase";

// ================= MATCHES (histórico de partidas de Arena) =================
// "extra" carrega as estatísticas ao estilo op.gg que a Live Client Data
// watcher conseguir capturar (ver electron.js) — nem todas estão sempre
// disponíveis (ex: dano/ouro só vêm de uma sincronização com a Riot API),
// por isso tudo aqui tem fallback para null em vez de obrigar o valor.
export async function addMatch(username, champion, kills, deaths, assists, win, items, teamSize, extra = {}) {
  try {
    const { data, error } = await supabase.from("matches").insert([
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
        double_kills: extra.doubleKills ?? null,
        triple_kills: extra.tripleKills ?? null,
        summoner1: extra.summoner1 ?? null,
        summoner2: extra.summoner2 ?? null,
        healing: extra.healing ?? null,
        max_hp: extra.maxHp ?? null,
        // Lista de TODAS as sequências de kills/assists sem morrer. Só existem
        // para partidas jogadas com a app aberta (Live Client Data) — as
        // importadas da Riot API não têm a evolução dos contadores, por isso
        // ficam null. Ver liveGame.js e challengeScoring.js.
        kill_streaks: extra.killStreaks ?? null,
        assist_streaks: extra.assistStreaks ?? null,
      },
    ]);

    if (error) {
      console.error("❌ addMatch DB error:", error.code, error.message, { username, champion, details: error.details });
      return { success: false, error };
    }

    console.log("✅ addMatch success:", { username, champion, data });
    return { success: true, data };
  } catch (e) {
    console.error("❌ addMatch exception:", e.message, { username, champion });
    return { success: false, error: e };
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
    double_kills: m.doubleKills ?? null,
    triple_kills: m.tripleKills ?? null,
    summoner1: m.summoner1 ?? null,
    summoner2: m.summoner2 ?? null,
    healing: m.healing ?? null,
    participants: m.participants || null,
    created_at: m.gameEndTimestamp
      ? new Date(m.gameEndTimestamp).toISOString()
      : new Date().toISOString(),
  }));

  console.log(`📥 Importing ${rows.length} matches for ${username} from Riot API...`);

  const { error, data } = await supabase.from("matches").insert(rows);

  if (error) {
    console.error("❌ addMatchesBulk failed:", error.code, error.message, {
      username,
      count: rows.length,
      details: error.details,
      hint: error.hint,
    });
    return { success: false, error: error.message || String(error), inserted: 0 };
  }

  console.log(`✅ addMatchesBulk success: ${rows.length} matches inserted`);
  return { success: true, inserted: rows.length, data };
}

export async function getMatches(username) {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, riot_match_id, champion, kills, deaths, assists, win, items, placement, augments, team_size, " +
        "damage_dealt, damage_taken, gold_earned, cs, vision_score, champ_level, game_duration, multikill, " +
        "double_kills, triple_kills, summoner1, summoner2, healing, max_hp, kill_streaks, assist_streaks, " +
        "participants, created_at"
    )
    .eq("username", username)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getMatches error:", error);
    return [];
  }

  return data || [];
}

// Recuperar jogos em falta: procura por jogos onde o jogador está em
// "participants" mas não está ainda associado ao seu username. Útil quando
// a Live Client Data falha mas a Riot API tem os dados (ex: reiniciou a app
// a meio do jogo).
export async function recoverOrphanMatches(username, riotGameName, riotTagLine) {
  if (!riotGameName) {
    console.warn("recoverOrphanMatches: riotGameName is required");
    return { success: false, error: "riotGameName required", recovered: 0 };
  }

  try {
    console.log(`🔍 Searching for orphaned matches with riot_game_name="${riotGameName}"...`);

    // Estratégia: busca TODOS os matches com participants (foi importado via Riot API)
    // Depois filtra localmente por nome do jogador
    const { data: allMatches, error: searchError } = await supabase
      .from("matches")
      .select("id, riot_match_id, champion, kills, deaths, assists, win, items, placement, augments, team_size, damage_dealt, damage_taken, gold_earned, cs, vision_score, champ_level, game_duration, multikill, double_kills, triple_kills, summoner1, summoner2, healing, participants, username, created_at")
      .not("participants", "is", null);

    if (searchError) {
      console.error("❌ Search error:", searchError.message);
      return { success: false, error: searchError.message, recovered: 0 };
    }

    // Filtra localmente: encontra matches onde o jogador está em participants
    // MAS ainda não está associado ao seu username
    const searchName = `${riotGameName}${riotTagLine ? '#' + riotTagLine : ''}`.toLowerCase();
    const searchNameShort = riotGameName.toLowerCase();

    const toRecover = (allMatches || []).filter((match) => {
      // Skip se já está associado a este username
      if (match.username === username) return false;

      if (!match.participants || !Array.isArray(match.participants)) return false;

      // Procura o jogador em participants (comparar com nome completo e nome curto)
      return match.participants.some((p) => {
        const pName = (p.name || "").toLowerCase();
        return pName === searchName || pName === searchNameShort;
      });
    });

    console.log(`📊 Found ${toRecover.length} matches where "${riotGameName}" plays but not yet associated`);

    if (!toRecover.length) {
      return { success: true, recovered: 0 };
    }

    console.log(`♻️ Reassigning ${toRecover.length} matches to username "${username}"...`);

    // Regrava cada match com o username correto
    let recovered = 0;
    for (const match of toRecover) {
      const { error: updateError } = await supabase
        .from("matches")
        .update({ username })
        .eq("id", match.id);

      if (updateError) {
        console.error(`❌ Failed to recover match ${match.id}:`, updateError.message);
      } else {
        recovered++;
        console.log(`✅ Recovered: ${match.champion} (match ID: ${match.id})`);
      }
    }

    console.log(`🎉 Recovery complete: ${recovered}/${toRecover.length} matches reassigned`);
    return { success: true, recovered };
  } catch (e) {
    console.error("❌ recoverOrphanMatches exception:", e.message);
    return { success: false, error: e.message, recovered: 0 };
  }
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
      double_kills: details.doubleKills ?? null,
      triple_kills: details.tripleKills ?? null,
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
