import { lastPlacementFor } from "./placement";

// ================= SENTADAS E ESCALA DE LUGARES =================
// Duas coisas que a Visão Geral e o Em Jogo precisam das partidas em bruto:
// parti-las em sentadas (partidas seguidas na mesma noite) e pôr os lugares
// todos na mesma escala, já que a Arena mudou de formato pelo caminho.
//
// O ficheiro chamou-se assim por causa da "curva da sentada" — o lugar médio
// conforme a posição da partida dentro da sentada — que viveu aqui e saiu da
// Visão Geral: respondia a "quando é que devia ter parado", uma pergunta
// interessante mas que ninguém faz ao abrir a app. O nome ficou; o que o
// ficheiro faz hoje é o que está acima.

// Gap máximo entre o fim de uma partida e o início da seguinte para as contar
// como a mesma sentada. A Arena não dá o horário de início, só o de fim, por
// isso isto é sempre uma aproximação a partir dos "created_at" de partidas
// seguidas.
export const SESSION_GAP_MINUTES = 90;

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
