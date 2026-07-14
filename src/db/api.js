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
      double_kills: extra.doubleKills ?? null,
      triple_kills: extra.tripleKills ?? null,
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

// ================= CACHE PARTILHADA DE PARTIDAS (entre users) =================
// Uma partida de Arena tem sempre vários jogadores reais (16 na de 2, 18 na
// de 3) — se um amigo já importou esta mesma partida antes (estava na tua
// equipa ou era adversário), já temos os dados de TODOS os participantes
// guardados em "participants" (ver extractAllParticipants em electron.js),
// incluindo os teus. Reaproveitar isso poupa um pedido à Riot API por
// partida — e como a maioria dos users partilha a mesma key do proxy (ver
// riot-proxy/worker.js), isto poupa o limite de pedidos a toda a gente, não
// só a quem está a sincronizar.
// IMPORTANTE: "excludeUsername" tem de ser sempre a tua própria conta.
// Bug já visto sem isto: ao enriquecer uma partida tua que só tinha o
// "participants" desatualizado (sem doubleKills), a única linha encontrada
// na cache era a TUA PRÓPRIA (mesmo riot_match_id, participants não-nulo) —
// e essa reconstrução escrevia de volta doubleKills/tripleKills a 0 (por
// estarem undefined nessa versão antiga), apagando um valor que já estava
// certo. Excluir sempre a própria conta força a cache a só servir dados de
// OUTRO user que já tenha sincronizado esta partida.
export async function getMatchCacheByIds(matchIds, excludeUsername) {
  if (!matchIds || !matchIds.length) return new Map();

  // O "in()" da PostgREST tem um limite prático de tamanho de URL — em lotes
  // de 200 para nunca nos aproximarmos disso, mesmo com muitas partidas.
  const CHUNK = 200;
  const chunks = [];
  for (let i = 0; i < matchIds.length; i += CHUNK) {
    chunks.push(matchIds.slice(i, i + CHUNK));
  }

  // Em paralelo, não um lote de cada vez — os lotes são fatias disjuntas de
  // matchIds (o mesmo id nunca aparece em dois), por isso a ordem de chegada
  // não muda o resultado final, só a rapidez. Num resync completo (muitos
  // ids a verificar), isto era o passo mais lento da cache partilhada.
  const results = await Promise.all(
    chunks.map((chunk) => {
      let query = supabase
        .from("matches")
        .select("riot_match_id, team_size, game_duration, participants, created_at")
        .in("riot_match_id", chunk)
        .not("participants", "is", null);

      if (excludeUsername) query = query.neq("username", excludeUsername);

      return query;
    })
  );

  const map = new Map();
  results.forEach(({ data, error }) => {
    if (error) {
      console.error("getMatchCacheByIds error:", error);
      return;
    }

    (data || []).forEach((row) => {
      // Se mais do que um amigo já importou a mesma partida, a primeira
      // linha encontrada serve — os participantes são os mesmos em todas.
      if (!map.has(row.riot_match_id)) map.set(row.riot_match_id, row);
    });
  });

  return map;
}

// Um participante só serve como fonte de cache se tiver TODOS os campos que
// uma extração atual guardaria — senão corremos o mesmo risco de novo no
// futuro (um campo novo adicionado mais tarde a extractAllParticipants,
// ainda em falta numa linha antiga que passe o filtro "participants não
// nulo"). Verificar undefined em vez de falsy: 0 kills/dano é um valor
// válido, não "em falta".
function isParticipantComplete(p) {
  return (
    p.damageDealt !== undefined &&
    p.doubleKills !== undefined &&
    p.tripleKills !== undefined &&
    p.cs !== undefined &&
    p.champLevel !== undefined
  );
}

function multikillFromCounts(doubleKills, tripleKills) {
  if (tripleKills) return 3;
  if (doubleKills) return 2;
  return 0;
}

// Localiza a nossa própria entrada dentro de "participants" de uma partida
// que outro user importou — é a única forma de saber "qual destes 16-18
// jogadores sou eu". Tenta primeiro por puuid (estável, nunca muda) e só cai
// para o nome Riot se a linha em cache for antiga e ainda não tiver puuid
// guardado por participante (ver extractAllParticipants em electron.js) —
// nome pode diferir por maiúsculas/espaços ou por o Riot ID ter mudado desde
// que o amigo importou esta partida, o que antes fazia isto falhar em
// silêncio e cair sempre para um pedido à Riot API mesmo havendo cache.
function findSelfInParticipants(participants, puuid, gameName) {
  if (puuid) {
    const byPuuid = participants.find((p) => p.puuid && p.puuid === puuid);
    if (byPuuid) return byPuuid;
  }
  if (!gameName) return null;
  const needle = gameName.trim().toLowerCase();
  return participants.find((p) => p.name && p.name.trim().toLowerCase() === needle) || null;
}

// Reconstrói o registo de uma partida (mesmo formato que uma importação
// normal via Riot API produziria) a partir de uma linha já em cache — sem
// pedir nada à Riot. Devolve null se não encontrar a nossa entrada (não
// devia acontecer para uma partida onde realmente jogámos).
export function buildMatchFromCache(matchId, cached, puuid, gameName) {
  const participants = cached.participants || [];
  const me = findSelfInParticipants(participants, puuid, gameName);
  // Nunca aceitar uma linha em cache com dados a meio — sem isto, tentar
  // reconstruir a partir de um "participants" desatualizado dava valores
  // a 0 onde já podia ter havido um número real (ver aviso em
  // getMatchCacheByIds). Cai para null (= "não uses a cache, pede à Riot API").
  if (!me || !isParticipantComplete(me)) return null;

  return {
    matchId,
    champion: me.champion,
    kills: me.kills ?? 0,
    deaths: me.deaths ?? 0,
    assists: me.assists ?? 0,
    win: me.placement === 1,
    placement: me.placement ?? null,
    items: me.items || [],
    augments: me.augments || [],
    gameEndTimestamp: cached.created_at ? new Date(cached.created_at).getTime() : Date.now(),
    teamSize: cached.team_size ?? null,
    damageDealt: me.damageDealt ?? 0,
    damageTaken: me.damageTaken ?? 0,
    goldEarned: me.goldEarned ?? 0,
    cs: me.cs ?? 0,
    visionScore: me.visionScore ?? 0,
    champLevel: me.champLevel ?? null,
    gameDuration: cached.game_duration ?? null,
    multikill: multikillFromCounts(me.doubleKills, me.tripleKills),
    doubleKills: me.doubleKills ?? 0,
    tripleKills: me.tripleKills ?? 0,
    summoner1: me.summoner1 ?? null,
    summoner2: me.summoner2 ?? null,
    healing: me.healing ?? 0,
    // Mesmo array partilhado, só com "isSelf" recalculado para quem está
    // agora a sincronizar (o resto dos campos é igual para toda a gente).
    participants: participants.map((p) => ({ ...p, isSelf: p === me })),
  };
}

// Mesma reconstrução que buildMatchFromCache, mas só com o subconjunto de
// campos que o backfill/enriquecimento precisa de atualizar numa partida já
// existente (ver updateMatchDetails) — sem os campos que uma partida já
// importada não muda (champion/kills/placement/etc.).
export function buildBackfillDetailsFromCache(cached, puuid, gameName) {
  const participants = cached.participants || [];
  const me = findSelfInParticipants(participants, puuid, gameName);
  if (!me || !isParticipantComplete(me)) return null;

  return {
    teamSize: cached.team_size ?? null,
    damageDealt: me.damageDealt ?? 0,
    damageTaken: me.damageTaken ?? 0,
    goldEarned: me.goldEarned ?? 0,
    cs: me.cs ?? 0,
    visionScore: me.visionScore ?? 0,
    champLevel: me.champLevel ?? null,
    gameDuration: cached.game_duration ?? null,
    multikill: multikillFromCounts(me.doubleKills, me.tripleKills),
    doubleKills: me.doubleKills ?? 0,
    tripleKills: me.tripleKills ?? 0,
    summoner1: me.summoner1 ?? null,
    summoner2: me.summoner2 ?? null,
    healing: me.healing ?? 0,
    participants: participants.map((p) => ({ ...p, isSelf: p === me })),
  };
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
        "double_kills, triple_kills, summoner1, summoner2, healing, max_hp, participants, created_at"
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
