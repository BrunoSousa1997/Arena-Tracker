// A Riot API às vezes devolve o nome interno do campeão com capitalização
// diferente da id usada pela Data Dragon (ex.: "FiddleSticks" vs
// "Fiddlesticks"). Partidas antigas gravadas antes desta normalização
// existir podem ter ficado com a variante "errada" guardada na base de
// dados — e como qualquer agregação por campeão (Visão Geral, Estatísticas)
// agrupa exatamente pelo valor de "champion" de cada partida, uma dessas
// variantes soltas faz esse campeão aparecer duas vezes (cada uma com só
// parte das vitórias/jogos reais), o que dá números errados. Esta função
// (partilhada por App.jsx, Overview.jsx e MatchReports.jsx) normaliza para
// a id canónica antes de agrupar, para essas variantes voltarem a contar
// como um único campeão.
export function normalizeChampionId(raw, champions) {
  if (!raw || !champions?.length) return raw;
  const exact = champions.find((c) => c.id === raw);
  if (exact) return exact.id;
  const loose = champions.find((c) => c.id.toLowerCase() === raw.toLowerCase());
  return loose ? loose.id : raw;
}
