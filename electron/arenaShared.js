// Pequenas constantes/helpers partilhados entre liveGame.js (deteção ao
// vivo) e riotApi.js (importação/sincronização) — nada aqui fala com a rede,
// só decide "o que é a Arena" a partir de dados já recebidos.

// API local e oficial da Riot (https://127.0.0.1:2999/liveclientdata/...),
// só ativa durante uma partida, só leitura. Não interage com o processo do
// jogo nem com a memória, por isso não tem qualquer risco de ban.
const ARENA_GAME_MODE = "CHERRY";

// A Arena já teve formatos diferentes: 8 equipas de 2 (16 jogadores) e 6
// equipas de 3 (18 jogadores). Isso muda o significado de "lugar" (não há
// 7º/8º lugar possível no formato de 3), por isso guardamos sempre quantos
// jogadores por equipa teve cada partida, a partir do nº total de jogadores.
function teamSizeFromPlayerCount(n) {
  if (n === 16) return 2;
  if (n === 18) return 3;
  return null;
}

module.exports = { ARENA_GAME_MODE, teamSizeFromPlayerCount };
