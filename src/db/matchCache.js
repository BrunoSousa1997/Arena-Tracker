import { supabase } from "./supabase";

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
