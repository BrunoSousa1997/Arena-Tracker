// ================= CASAR UM JOGO AO VIVO COM A PARTIDA DA RIOT =================
// Lógica pura (sem rede nem React, testada à parte) para reconhecer, entre as
// partidas já sincronizadas da Riot API, qual corresponde a um jogo que a Live
// Client Data seguiu ao vivo.
//
// Substitui o critério antigo — "campeão + kills + deaths + assists EXATOS" —
// que falhava em dois casos reais:
//   (a) dois jogos na mesma sessão com o MESMO KDA (ex: dois 3/2/5 seguidos);
//   (b) o último poll de 3s do live client perde o abate/morte final, e o KDA
//       gravado ao vivo nunca chega a bater certo com o da Riot.
//
// A ideia: o campeão + a PROXIMIDADE NO TEMPO já identificam quase sempre a
// partida (raramente se joga o mesmo campeão duas vezes na mesma hora), e o
// KDA passa a ser um desempate tolerante em vez de uma igualdade rígida.
//
// Sobre o tempo: o "created_at" de uma partida da Riot é o instante em que ela
// ACABOU de verdade. Para quem fica em 3º-8º lugar, o jogo ao vivo termina no
// cliente desse jogador ANTES de a partida acabar para quem sobra — por isso a
// janela é sobretudo para a FRENTE do fim ao vivo (ver WINDOW_AFTER_MS), com
// só uma pequena folga para trás para desvios de relógio (SLACK_BEFORE_MS).

// Folga para trás do instante de fim ao vivo (desvios de relógio entre a
// máquina e a Riot).
export const SLACK_BEFORE_MS = 10 * 60 * 1000;
// Quanto para a frente do fim ao vivo é que a partida da Riot ainda pode ter
// acabado — cobre o tempo extra que a Arena continua para quem não foi logo
// eliminado. Generoso mas limitado, para não apanhar a partida seguinte.
export const WINDOW_AFTER_MS = 60 * 60 * 1000;
// Distância máxima de KDA (|Δk|+|Δd|+|Δa|) aceitável. Um poll final falhado
// erra por 1-2; isto trava um jogo genuinamente diferente do mesmo campeão que
// caia por acaso dentro da janela.
export const MAX_KDA_DISTANCE = 6;

function kdaDistance(a, b) {
  return (
    Math.abs((a.kills ?? 0) - (b.kills ?? 0)) +
    Math.abs((a.deaths ?? 0) - (b.deaths ?? 0)) +
    Math.abs((a.assists ?? 0) - (b.assists ?? 0))
  );
}

function timeMs(value) {
  const t = value == null ? NaN : new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

// O melhor candidato para um alvo, ou null se nenhum servir.
//
// "target": { champion, kills, deaths, assists, anchorTime } — anchorTime é o
// instante de fim do jogo ao vivo (o "after" do auto-sync, ou o finished_at/
// started_at da linha de challenge_games).
// "candidates": linhas de "matches" (têm champion, kills, deaths, assists,
// created_at). Devem estar já filtradas a partidas sincronizadas
// (riot_match_id não nulo) por quem chama, mas a filtragem por campeão/janela é
// feita aqui para a regra viver toda num sítio.
export function findBestSyncedMatch(target, candidates, opts = {}) {
  const {
    slackBeforeMs = SLACK_BEFORE_MS,
    windowAfterMs = WINDOW_AFTER_MS,
    maxKdaDistance = MAX_KDA_DISTANCE,
  } = opts;

  if (!target?.champion) return null;
  const anchor = timeMs(target.anchorTime);

  let best = null;
  let bestKda = Infinity;
  let bestTime = Infinity;

  for (const c of candidates || []) {
    if (c.champion !== target.champion) continue;

    // Sem âncora conhecida (dado antigo sem timestamp), não se filtra por
    // tempo — cai-se só no campeão + KDA, que é o que há.
    let timeDist = 0;
    if (anchor != null) {
      const ct = timeMs(c.created_at);
      if (ct == null) continue;
      if (ct < anchor - slackBeforeMs || ct > anchor + windowAfterMs) continue;
      timeDist = Math.abs(ct - anchor);
    }

    const kda = kdaDistance(target, c);
    if (kda > maxKdaDistance) continue;

    // Menor distância de KDA primeiro; empate decide-se pela partida mais
    // próxima no tempo.
    if (kda < bestKda || (kda === bestKda && timeDist < bestTime)) {
      best = c;
      bestKda = kda;
      bestTime = timeDist;
    }
  }

  return best;
}

// Casa uma lista de alvos aos melhores candidatos, CONSUMINDO cada candidato no
// máximo uma vez — dois jogos idênticos (mesmo campeão e KDA na mesma janela)
// não podem casar com a mesma partida da Riot. Devolve [{ target, match }] só
// para os alvos que arranjaram par.
export function consumeBestMatches(targets, candidates, opts = {}) {
  const pool = [...(candidates || [])];
  const pairs = [];

  for (const target of targets || []) {
    const match = findBestSyncedMatch(target, pool, opts);
    if (!match) continue;
    const idx = pool.indexOf(match);
    if (idx !== -1) pool.splice(idx, 1);
    pairs.push({ target, match });
  }

  return pairs;
}
