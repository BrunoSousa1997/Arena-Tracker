import { lastPlacementFor } from "./placement";

// ================= A CURVA DA SESSÃO =================
// "A partir da quantésima partida seguida é que começo a jogar pior?"
//
// A Visão Geral já agrupa partidas em sessões (sentadas a jogar) e mostra o
// resumo de cada uma. O que falta é a leitura ATRAVÉS das sessões: juntar a
// primeira partida de todas as sentadas, a segunda de todas, a terceira, e
// ver o que acontece ao lugar médio à medida que a sentada avança.
//
// É a única estatística aqui que não responde "com que campeão" nem "com que
// augment", mas sim "quando é que devia ter parado" — e sai de dados que já
// estão todos guardados.

// Gap máximo entre o fim de uma partida e o início da seguinte para as contar
// como a mesma sentada. A Arena não dá o horário de início, só o de fim, por
// isso isto é sempre uma aproximação a partir dos "created_at" de partidas
// seguidas.
export const SESSION_GAP_MINUTES = 90;

// Índice a partir do qual as partidas se juntam todas no último balde ("6+").
// Sentadas muito longas são raras: sem um balde-cauda, os índices altos
// ficavam com duas ou três partidas cada e o gráfico passava a ser ruído com
// aspeto de tendência.
const DEFAULT_MAX_BUCKET = 6;

// Abaixo disto o lugar médio de um balde não se mostra como se fosse um facto
// — a interface marca-o como amostra fraca. Não se esconde: ver poucos jogos
// num balde é em si informação (ainda não jogaste sentadas tão longas).
export const MIN_GAMES_PER_BUCKET = 8;

// A Arena já teve dois formatos: 8 equipas de 2 (último lugar = 8º) e 6
// equipas de 3 (último lugar = 6º). Um 4º lugar não quer dizer o mesmo nos
// dois — em 8 equipas está a meio da tabela, em 6 já está na metade de baixo.
// Somar os dois em bruto (como um "lugar médio" ingénuo faria) mistura duas
// escalas diferentes e dá um número que não significa nada.
//
// Converte-se tudo para a escala de HOJE (6 equipas): o 1º continua 1º, o
// último continua último, e o que está pelo meio é reposicionado
// proporcionalmente. Assim as partidas antigas continuam a contar, em vez de
// serem deitadas fora, mas sem puxar a média para cima artificialmente.
export function normalizedPlacement(match) {
  if (!match?.placement) return null;

  const last = lastPlacementFor(match.team_size);
  const currentLast = lastPlacementFor(3);
  if (last <= 1) return match.placement;

  return 1 + ((match.placement - 1) / (last - 1)) * (currentLast - 1);
}

// Parte uma lista de partidas (ordenada da mais recente para a mais antiga,
// como vem de db/api.js) em sentadas. Cada sentada devolvida mantém a ordem
// de entrada — da mais recente para a mais antiga.
//
// Vive aqui e não na Visão Geral porque passou a ter dois consumidores (a
// lista de sessões e esta curva) e duas cópias da regra do intervalo
// divergiriam à primeira vez que uma delas fosse afinada.
export function splitSessions(matches, gapMinutes = SESSION_GAP_MINUTES) {
  const withDate = (matches || []).filter((m) => m?.created_at);
  if (!withDate.length) return [];

  const sessions = [];
  let current = null;

  withDate.forEach((m) => {
    const time = new Date(m.created_at).getTime();
    if (current) {
      const lastTime = new Date(current[current.length - 1].created_at).getTime();
      if (lastTime - time > gapMinutes * 60000) {
        sessions.push(current);
        current = null;
      }
    }
    if (!current) current = [];
    current.push(m);
  });
  if (current) sessions.push(current);

  return sessions;
}

// Diferença mínima (em lugares, na escala de 6) para se dizer que houve
// mesmo uma subida ou uma descida. Abaixo disto é oscilação normal e o
// veredicto é "estável" — dizer "jogas pior ao fim de 5 partidas" com base
// em 0,2 de diferença seria inventar um padrão a partir de ruído.
const MEANINGFUL_DELTA = 0.4;

// A curva propriamente dita.
//
// Devolve um balde por posição-na-sentada (1ª, 2ª, ... e um "6+" no fim), com
// o lugar médio normalizado e quantas partidas o sustentam, mais um veredicto
// que compara o fim da sentada com o início.
//
// AVISO DE INTERPRETAÇÃO, que a interface também dá: o balde-cauda só contém
// partidas de sentadas longas, e as sentadas ficam longas por alguma razão
// (estar a correr bem, ou estar a tentar recuperar). Isto mede uma
// correlação, não prova que jogar mais faz jogar pior.
export function sessionCurve(matches, { maxBucket = DEFAULT_MAX_BUCKET, gapMinutes } = {}) {
  const sessions = splitSessions(matches, gapMinutes);

  const buckets = Array.from({ length: maxBucket }, (_, i) => ({
    index: i + 1,
    isTail: i + 1 === maxBucket,
    games: 0,
    top3: 0,
    placementSum: 0,
    placementGames: 0,
  }));

  sessions.forEach((session) => {
    // A sentada chega da mais recente para a mais antiga; a posição DENTRO
    // dela conta ao contrário, da primeira partida jogada para a frente.
    const chronological = [...session].reverse();

    chronological.forEach((m, i) => {
      const bucket = buckets[Math.min(i, maxBucket - 1)];
      bucket.games += 1;

      const place = normalizedPlacement(m);
      if (place == null) return;

      bucket.placementSum += place;
      bucket.placementGames += 1;
      if (m.placement <= 3) bucket.top3 += 1;
    });
  });

  const result = buckets.map((b) => ({
    index: b.index,
    isTail: b.isTail,
    games: b.games,
    avgPlacement: b.placementGames ? b.placementSum / b.placementGames : null,
    top3Rate: b.placementGames ? Math.round((b.top3 / b.placementGames) * 100) : null,
    // Quem lê o gráfico tem de saber quando NÃO acreditar nele.
    thin: b.placementGames > 0 && b.placementGames < MIN_GAMES_PER_BUCKET,
  }));

  return { buckets: result, sessions: sessions.length, verdict: buildVerdict(result) };
}

// Compara o último balde com dados suficientes contra o primeiro. Só emite um
// veredicto quando os dois lados têm amostra que chegue — caso contrário diz
// exatamente isso, em vez de arriscar uma conclusão.
function buildVerdict(buckets) {
  const first = buckets[0];
  const solid = buckets.filter(
    (b) => b.avgPlacement != null && b.games >= MIN_GAMES_PER_BUCKET
  );
  const last = solid[solid.length - 1];

  if (!first?.avgPlacement || !last || last.index === first.index) {
    return { type: "insufficient" };
  }

  // Lugar mais ALTO é pior (1º é o melhor), por isso um delta positivo
  // significa que a coisa piorou ao longo da sentada.
  const delta = last.avgPlacement - first.avgPlacement;

  if (Math.abs(delta) < MEANINGFUL_DELTA) {
    return { type: "flat", delta, fromIndex: first.index, toIndex: last.index };
  }

  return {
    type: delta > 0 ? "declines" : "improves",
    delta,
    fromIndex: first.index,
    toIndex: last.index,
    toIsTail: last.isTail,
  };
}
