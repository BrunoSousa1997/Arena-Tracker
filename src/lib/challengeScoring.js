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
  // Streak: dentro de uma sequência sem morrer, cada abate/assistência acima
  // de "streakThreshold" vale +1 ponto EXTRA, e esse extra sobe outro nível a
  // cada "streakStep" seguintes. Ver streakBonus para a conta exata.
  streakThreshold: 3,
  streakStep: 2,
};

// ================= HANDICAP POR ARQUÉTIPO =================
// Substitui a versão anterior baseada nas tags do Data Dragon. Motivo,
// verificado com ~1000 partidas reais da BD (2026-07): as tags não
// distinguem os arquétipos onde o desvio realmente está — Juggernaut e
// Skirmisher são ambos "Fighter", Engage e Enchanter dispersam-se por
// Tank/Support — por isso NENHUM conjunto de valores por tag conseguia
// equilibrar (o melhor ajuste possível ainda deixava 22% de desvio entre
// arquétipos, e o conjunto antigo chegava a AUMENTAR o desvio em vez de o
// reduzir). Com um mapa próprio campeão->arquétipo, os multiplicadores
// abaixo igualam a pontuação média de 30 jogos dos 8 arquétipos a ~1% de
// desvio, e qualquer um vence um desafio 8-16% das vezes (Monte Carlo,
// 3000 simulações com partidas reais).
//
// Nota honesta: os valores foram ajustados às partidas DESTE grupo de
// jogadores — equalizam resultados, o que em parte também anula diferenças
// de skill de quem joga cada arquétipo, não só vantagem estrutural da
// classe. Para desafios entre amigos é esse o objetivo (toda a gente com
// hipótese real); se o grupo mudar de estilo, reafinam-se aqui, num só sítio.
export const ARCHETYPE_MULTIPLIER = {
  Tank: 0.82,
  Engage: 1.1,
  Juggernaut: 1.08,
  Skirmisher: 0.99,
  Assassin: 1.05,
  Marksman: 1.09,
  Caster: 0.9,
  Enchanter: 1.07,
};

// Campeão -> arquétipo. Ids do Data Dragon (os mesmos gravados em
// "matches.champion"). Um campeão fora deste mapa fica neutro (x1, ver
// archetypeMultiplier) — preferível a adivinhar pela tag e errar.
export const CHAMPION_ARCHETYPE = {
  // Tanques de frente (absorvem, vivem de dano recebido/sobrevivência)
  Malphite: "Tank", Shen: "Tank", Ornn: "Tank", Sion: "Tank", Zac: "Tank",
  Amumu: "Tank", Rammus: "Tank", TahmKench: "Tank", Poppy: "Tank",
  Maokai: "Tank", Galio: "Tank", Sejuani: "Tank", Chogath: "Tank",
  Singed: "Tank", Skarner: "Tank", DrMundo: "Tank", Gragas: "Tank",
  KSante: "Tank",
  // Engage/utilidade (iniciam, protegem, poucos abates por natureza)
  Leona: "Engage", Nautilus: "Engage", Alistar: "Engage", Braum: "Engage",
  Blitzcrank: "Engage", Thresh: "Engage", Rakan: "Engage", Rell: "Engage",
  Nunu: "Engage",
  // Juggernauts (dano + resistência, sem mobilidade)
  Darius: "Juggernaut", Garen: "Juggernaut", Sett: "Juggernaut",
  Illaoi: "Juggernaut", Mordekaiser: "Juggernaut", Volibear: "Juggernaut",
  Trundle: "Juggernaut", Nasus: "Juggernaut", Renekton: "Juggernaut",
  Urgot: "Juggernaut", Yorick: "Juggernaut", Aatrox: "Juggernaut",
  Olaf: "Juggernaut", Warwick: "Juggernaut", Shyvana: "Juggernaut",
  Udyr: "Juggernaut",
  // Skirmishers/duelistas (mobilidade + dano sustentado)
  Jax: "Skirmisher", Riven: "Skirmisher", Irelia: "Skirmisher",
  Yasuo: "Skirmisher", Yone: "Skirmisher", Fiora: "Skirmisher",
  Camille: "Skirmisher", LeeSin: "Skirmisher", Hecarim: "Skirmisher",
  XinZhao: "Skirmisher", MonkeyKing: "Skirmisher", Tryndamere: "Skirmisher",
  MasterYi: "Skirmisher", JarvanIV: "Skirmisher", Kayn: "Skirmisher",
  Gwen: "Skirmisher", Viego: "Skirmisher", Belveth: "Skirmisher",
  Briar: "Skirmisher", Pantheon: "Skirmisher", RekSai: "Skirmisher",
  Vi: "Skirmisher", Kled: "Skirmisher", Gangplank: "Skirmisher",
  // Assassinos (burst, entram e saem)
  Zed: "Assassin", Talon: "Assassin", Katarina: "Assassin", Fizz: "Assassin",
  Akali: "Assassin", Qiyana: "Assassin", Rengar: "Assassin",
  Khazix: "Assassin", Nocturne: "Assassin", Shaco: "Assassin",
  Evelynn: "Assassin", Kassadin: "Assassin", Ekko: "Assassin",
  Diana: "Assassin", Naafiri: "Assassin", Pyke: "Assassin",
  Leblanc: "Assassin", Zoe: "Assassin",
  // Atiradores (dano contínuo à distância com básicos)
  Jinx: "Marksman", Caitlyn: "Marksman", Ashe: "Marksman",
  Lucian: "Marksman", Vayne: "Marksman", Tristana: "Marksman",
  Jhin: "Marksman", Ezreal: "Marksman", MissFortune: "Marksman",
  Kaisa: "Marksman", Draven: "Marksman", Sivir: "Marksman",
  Xayah: "Marksman", Twitch: "Marksman", Samira: "Marksman",
  Aphelios: "Marksman", Zeri: "Marksman", KogMaw: "Marksman",
  Varus: "Marksman", Kalista: "Marksman", Nilah: "Marksman",
  Corki: "Marksman", Graves: "Marksman", Quinn: "Marksman",
  Akshan: "Marksman", Smolder: "Marksman", Kindred: "Marksman",
  // Casters (dano mágico à distância com habilidades)
  Lux: "Caster", Veigar: "Caster", Syndra: "Caster", Brand: "Caster",
  Ziggs: "Caster", Annie: "Caster", Xerath: "Caster", Vex: "Caster",
  Ahri: "Caster", Orianna: "Caster", Viktor: "Caster",
  Cassiopeia: "Caster", Malzahar: "Caster", Lissandra: "Caster",
  Anivia: "Caster", Karthus: "Caster", TwistedFate: "Caster",
  Neeko: "Caster", Swain: "Caster", Ryze: "Caster", Azir: "Caster",
  Hwei: "Caster", Velkoz: "Caster", Morgana: "Caster", Zilean: "Caster",
  Heimerdinger: "Caster", Taliyah: "Caster", Aurora: "Caster",
  Elise: "Caster", Fiddlesticks: "Caster", Nidalee: "Caster",
  Rumble: "Caster", Teemo: "Caster", Kennen: "Caster",
  Vladimir: "Caster", Gnar: "Caster", Jayce: "Caster", Kayle: "Caster",
  Zyra: "Caster", Bard: "Caster", Ivern: "Caster", Sylas: "Caster",
  AurelionSol: "Caster", Mel: "Caster", Ambessa: "Caster",
  Yunara: "Caster", Senna: "Caster",
  // Enchanters (curam/protegem, output próprio baixo)
  Soraka: "Enchanter", Sona: "Enchanter", Yuumi: "Enchanter",
  Nami: "Enchanter", Janna: "Enchanter", Lulu: "Enchanter",
  Milio: "Enchanter", Renata: "Enchanter", Karma: "Enchanter",
  Seraphine: "Enchanter", Taric: "Enchanter",
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

// Multiplicador do campeão via CHAMPION_ARCHETYPE (um arquétipo só por
// campeão, ao contrário das tags). 1 (neutro) para campeões fora do mapa —
// preferível a adivinhar pela tag e aplicar o valor errado.
function classMultiplier(championId, champions) {
  const id = normalizeChampionId(championId, champions);
  const archetype = CHAMPION_ARCHETYPE[id];
  return (archetype && ARCHETYPE_MULTIPLIER[archetype]) || 1;
}

// Pontos EXTRA de uma sequência de "value" abates (ou assistências) sem
// morrer — só o extra, o valor normal de cada abate já é contado à parte
// (ver parts.kills em scoreGame).
//
// A escalada é POR ABATE dentro da sequência, não um bónus fixo no fim: até
// ao 3º abate (streakThreshold) cada um vale o normal; a partir daí cada
// abate vale +1, e esse extra sobe outro nível a cada 2 (streakStep)
// seguintes. Com 5 abates seguidos, a conta completa é 2+2+2+3+3 = 12, ou
// seja 5 abates "normais" (10) + 2 de bónus — que é o que esta função
// devolve.
//
//   abate:  1  2  3  4  5  6  7  8  9
//   extra:  0  0  0 +1 +1 +2 +2 +3 +3
//
// (Uma versão anterior dava um único +1 por cada 2 acima do limiar, o que
// subcontava muito as sequências longas: 9 abates rendiam +3 em vez de +12.)
function streakBonus(value) {
  let bonus = 0;
  for (let i = 1; i <= value; i++) {
    const level = Math.floor((i - SCORE_POINTS.streakThreshold + 1) / SCORE_POINTS.streakStep);
    bonus += Math.max(0, level);
  }
  return bonus;
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
  // Negar 0 dá "-0", que sobrevive ao JSON.stringify (fica "-0" na fotografia
  // gravada em challenge_rooms.results) e falha comparações com Object.is.
  // Só se nega quando há mesmo penalização.
  const deathStreakPenalty = sumStreakBonus(deathRuns);
  const deathStreak = deathStreakPenalty === 0 ? 0 : -deathStreakPenalty;

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
