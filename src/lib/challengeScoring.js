// Motor de pontuação dos desafios — lógica pura, sem rede nem React, para
// poder ser testada exaustivamente à parte (é onde a correção mais importa).
// A tab Challenges e o futuro placar consomem isto.
//
// Regras definidas pelo utilizador (ver conversa). O que NÃO entra, e porquê:
//   - "não morrer por combate": a app guarda só os totais finais de cada
//     partida, não nada por ronda nem a linha temporal. Sem o dado, não se
//     inventam pontos.
//   - "ressuscitar teammate": pedido explicitamente para não usar
//     saveAllyFromDeath (não é essa a variável que o utilizador quer).
import { normalizeChampionId } from "./champions";

export const SCORE_POINTS = {
  kill: 2,
  death: -1,
  assist: 1,
  // "por cada X = 1 ponto" (divisão inteira, ver scoreGame).
  damageDealtPer: 10000,
  healingPer: 5000,
  damageTakenPer: 10000,
  doubleKill: 2,
  tripleKill: 3,
  // Streak: por cada "step" kills/assists acima de "threshold", +1 ponto —
  // só em partidas acabadas sem morrer (ver scoreGame).
  streakThreshold: 3,
  streakStep: 2,
};

// Handicap por classe para nivelar o campo (ver conversa): tanks/bruisers
// juntam naturalmente mais pontos (dano recebido, sobrevivência, assists),
// por isso descem; assassinos e classes de output baixo sobem. São valores
// de partida, pensados para afinar depois de ver números reais — vivem aqui,
// num só sítio, exatamente para isso.
export const CLASS_MULTIPLIER = {
  Assassin: 1.15,
  Mage: 1.08,
  Marksman: 1.05,
  Support: 1.1,
  Fighter: 0.95,
  Tank: 0.88,
};

export const DEFAULT_RULES = {
  classHandicap: true,
  // "só contar jogos onde não estão os dois": se dois (ou mais) do desafio
  // caíram na mesma Arena, afetaram-se diretamente no lugar final, por isso o
  // jogo não é uma amostra independente — fica de fora.
  onlySoloGames: false,
  // "só contar pontos por kills, assists e deaths": modo simples, ignora
  // dano/cura/recebido e multikills. As streaks (que são kills/assists) ficam.
  onlyKda: false,
};

// Média das classes do campeão — um Fighter+Tank (ex: Sett) fica entre as
// duas, em vez de herdar só uma. 1 (neutro) para campeões sem tag conhecida.
function classMultiplier(championId, champions) {
  const id = normalizeChampionId(championId, champions);
  const tags = champions.find((c) => c.id === id)?.tags || [];
  const applicable = tags.map((tag) => CLASS_MULTIPLIER[tag]).filter((m) => m != null);
  if (!applicable.length) return 1;
  return applicable.reduce((sum, m) => sum + m, 0) / applicable.length;
}

function streakBonus(value) {
  const above = Math.max(0, value - SCORE_POINTS.streakThreshold);
  return Math.floor(above / SCORE_POINTS.streakStep);
}

// Soma o bónus de TODAS as sequências de uma lista (ver streakBonus) — usado
// tanto para partidas já terminadas (scoreGame, abaixo) como para o
// progresso ao vivo de uma partida a decorrer (ver ScoreBoard em
// Challenges.jsx e updateChallengeGameProgress em db/rooms.js), que só tem
// a corrida atual, ainda sem quebrar por nenhuma morte.
export function sumStreakBonus(runs) {
  return (Array.isArray(runs) ? runs : []).reduce((sum, run) => sum + streakBonus(run), 0);
}

// Pontua UMA partida (a linha do próprio jogador). Devolve o detalhe por
// categoria além do total, para o placar poder mostrar de onde vieram os
// pontos em vez de só um número final.
export function scoreGame(match, { champions, rules = DEFAULT_RULES }) {
  const kills = match.kills || 0;
  const deaths = match.deaths || 0;
  const assists = match.assists || 0;

  // Streaks "sem morrer" = corridas de kills/assists entre mortes. Por cada 2
  // acima de 3, +1 ponto — POR CADA sequência, somadas (não só a maior).
  //
  // Duas fontes, por ordem de fidelidade:
  //  1) kill_streaks/assist_streaks — a lista REAL de corridas, medida ao vivo
  //     durante o jogo (ver liveGame.js). Só existe em partidas jogadas com a
  //     app aberta, que é o caso normal de um desafio. Um array vazio [] é
  //     dado válido (jogo sem nenhuma sequência) e NÃO cai para o fallback.
  //  2) Sem isso (partidas importadas da Riot API, só com totais finais): a
  //     versão exata possível é "acabou sem morrer → a partida toda é uma
  //     sequência" ([kills]); com mortes pelo meio não dá para saber as
  //     corridas, e não se inventa — lista vazia.
  const killRuns = Array.isArray(match.kill_streaks)
    ? match.kill_streaks
    : deaths === 0 ? [kills] : [];
  const assistRuns = Array.isArray(match.assist_streaks)
    ? match.assist_streaks
    : deaths === 0 ? [assists] : [];
  // Simétrico, mas ao contrário: corridas de MORTES seguidas sem kill/assist
  // pelo meio penalizam pela mesma regra (por cada 2 acima de 3, -1 ponto,
  // em cima do -1 fixo por morte). Sem kill_streaks/assist_streaks nem
  // death_streaks reais (partida importada), só dá para reconstruir se não
  // houve NENHUM kill/assist a interromper — senão não se sabe onde as
  // mortes se agruparam, e não se inventa.
  const deathRuns = Array.isArray(match.death_streaks)
    ? match.death_streaks
    : kills === 0 && assists === 0 ? [deaths] : [];

  const killStreak = sumStreakBonus(killRuns);
  const assistStreak = sumStreakBonus(assistRuns);
  const deathStreak = -sumStreakBonus(deathRuns);

  const parts = {
    kills: kills * SCORE_POINTS.kill,
    deaths: deaths * SCORE_POINTS.death,
    assists: assists * SCORE_POINTS.assist,
    killStreak,
    assistStreak,
    deathStreak,
    damage: 0,
    healing: 0,
    taken: 0,
    doubles: 0,
    triples: 0,
  };

  if (!rules.onlyKda) {
    parts.damage = Math.floor((match.damage_dealt || 0) / SCORE_POINTS.damageDealtPer);
    parts.healing = Math.floor((match.healing || 0) / SCORE_POINTS.healingPer);
    parts.taken = Math.floor((match.damage_taken || 0) / SCORE_POINTS.damageTakenPer);
    parts.doubles = (match.double_kills || 0) * SCORE_POINTS.doubleKill;
    parts.triples = (match.triple_kills || 0) * SCORE_POINTS.tripleKill;
  }

  const base = Object.values(parts).reduce((sum, v) => sum + v, 0);
  const multiplier = rules.classHandicap ? classMultiplier(match.champion, champions) : 1;

  return { total: base * multiplier, base, multiplier, parts };
}

// A partida cruzou com algum dos outros jogadores do desafio? (regra especial
// "só jogos onde não estão os dois"). Compara por puuid (estável) e cai para o
// nome Riot quando a linha em cache é antiga e ainda não tem puuid por
// participante. Para salas de 3+, "os dois" generaliza-se: basta QUALQUER
// outro jogador do desafio ter estado nessa Arena para o jogo não contar.
function sharesLobbyWith(match, opponents) {
  const parts = match.participants;
  if (!parts?.length || !opponents?.length) return false;

  const puuids = new Set(opponents.map((o) => o.puuid).filter(Boolean));
  const names = new Set(
    opponents.map((o) => (o.name || "").trim().toLowerCase()).filter(Boolean)
  );

  return parts.some((p) => {
    if (p.isSelf) return false;
    if (p.puuid && puuids.has(p.puuid)) return true;
    const name = (p.name || "").trim().toLowerCase();
    return name && names.has(name);
  });
}

// Soma a pontuação de um conjunto de partidas de um jogador. "matches" já vem
// filtrado pela janela do desafio (as N partidas a contar) — a única exclusão
// que este módulo faz é a da regra "só jogos solo", que depende das regras e
// não da janela.
export function scorePlayer(matches, { champions, rules = DEFAULT_RULES, opponents = [] }) {
  const games = [];

  for (const match of matches) {
    if (rules.onlySoloGames && sharesLobbyWith(match, opponents)) continue;
    games.push({ match, score: scoreGame(match, { champions, rules }) });
  }

  const total = games.reduce((sum, g) => sum + g.score.total, 0);
  return { total, countedGames: games.length, games };
}
