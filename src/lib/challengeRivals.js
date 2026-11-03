// Quem já desafiou quem — a lista de "convites rápidos" dos Desafios.
//
// Não há tabela de amigos nesta app, e pedir o nome escrito à mão era a única
// forma de convidar alguém: quem joga desafios joga-os quase sempre com as
// MESMAS pessoas, por isso escrever o nome outra vez a cada sala era trabalho
// repetido sem necessidade. Isto deriva essa lista do histórico de desafios
// que já é lido para a aba (ver getChallengeHistory) — zero pedidos novos à
// base de dados.
//
// A fotografia em "results" é a fonte: traz username + identidade Riot de
// cada participante tal como estava no fim desse desafio (ver persistFinish
// em views/Challenges.jsx).

// Nome a mostrar de um rival: identidade Riot quando existe (é por ela que
// as pessoas se conhecem dentro do jogo), com o username da app como recurso.
export function rivalDisplayName(rival) {
  if (!rival) return "";
  if (rival.riotGameName && rival.riotTagLine) return `${rival.riotGameName}#${rival.riotTagLine}`;
  return rival.riotGameName || rival.username;
}

// Iniciais para o avatar redondo dos chips de convite rápido — duas letras no
// máximo, para caber num círculo de 28px.
export function rivalInitials(rival) {
  const source = (rival?.riotGameName || rival?.username || "?").trim();
  const words = source.split(/[\s_.-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

// Rivais recentes, do mais recente para o mais antigo.
//
// Ordenado por última vez que jogaram contigo e NÃO por quantas vezes: quem
// esteve no desafio de ontem é quem provavelmente volta a ser convidado hoje,
// mesmo que outra pessoa apareça mais vezes no total. O nº de desafios vai
// no resultado só como contexto a mostrar no chip.
//
// Uma pessoa que trocou de Riot ID aparece com o nome do desafio mais
// recente: a identidade é relida sempre que se encontra uma participação mais
// nova, para o chip não ficar preso num nome que já ninguém reconhece.
export function recentRivals(rooms, selfUsername, { limit = 8 } = {}) {
  const byUsername = new Map();

  for (const room of Array.isArray(rooms) ? rooms : []) {
    const results = Array.isArray(room?.results) ? room.results : [];
    const playedAt = room?.finished_at ? new Date(room.finished_at).getTime() : 0;

    for (const r of results) {
      if (!r?.username || r.username === selfUsername) continue;

      const existing = byUsername.get(r.username);
      if (!existing) {
        byUsername.set(r.username, {
          username: r.username,
          riotGameName: r.riot_game_name || null,
          riotTagLine: r.riot_tag_line || null,
          challenges: 1,
          lastPlayedAt: playedAt,
        });
        continue;
      }

      existing.challenges += 1;
      if (playedAt > existing.lastPlayedAt) {
        existing.lastPlayedAt = playedAt;
        existing.riotGameName = r.riot_game_name || existing.riotGameName;
        existing.riotTagLine = r.riot_tag_line || existing.riotTagLine;
      }
    }
  }

  return [...byUsername.values()]
    .sort(
      (a, b) =>
        b.lastPlayedAt - a.lastPlayedAt ||
        b.challenges - a.challenges ||
        a.username.localeCompare(b.username)
    )
    .slice(0, limit);
}

// Resumo do que a conta já fez em desafios — os números do cabeçalho da aba
// (jogados, vencidos, melhor pontuação). Lido da mesma fotografia em
// "results", por isso é exatamente o que se viu no placar de cada desafio.
//
// Uma vitória conta em qualquer dos dois formatos: individual (a sala guarda
// winner_username) e equipas (cada membro da equipa vencedora fica com
// won:true em "results") — a mesma regra de getChallengeWinCount.
export function challengeRecord(rooms, selfUsername) {
  let played = 0;
  let won = 0;
  let bestScore = 0;

  for (const room of Array.isArray(rooms) ? rooms : []) {
    played += 1;
    const results = Array.isArray(room?.results) ? room.results : [];
    const mine = results.find((r) => r?.username === selfUsername);
    if (mine && Number.isFinite(mine.total)) bestScore = Math.max(bestScore, mine.total);
    if (room?.winner_username === selfUsername || mine?.won) won += 1;
  }

  return { played, won, bestScore, winRate: played ? Math.round((won / played) * 100) : 0 };
}

// Uma pessoa pode ter mais do que uma conta ("wins.username") para a mesma
// identidade Riot — reinstalações antigas antes de "wins" ter constraint de
// unicidade (ver ponto 6b em supabase/schema.sql), ou contas sem Riot ID
// preenchido. Sem isto, a pesquisa de convite mostrava a mesma pessoa duas
// vezes e era fácil convidar a conta errada (uma que já ninguém usa). Fica
// só a primeira ocorrência por identidade — a RPC já devolve por ordem de
// "has_matches desc", por isso a conta ativa tende a vir primeiro.
export function dedupeByIdentity(rows) {
  const seen = new Set();
  const result = [];
  for (const r of rows || []) {
    const key =
      r.riot_game_name && r.riot_tag_line
        ? `${r.riot_game_name.toLowerCase()}#${r.riot_tag_line.toLowerCase()}`
        : r.username.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(r);
  }
  return result;
}
