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
// ================= PESQUISA DE CAMPEÕES =================
// Parte o que está escrito na caixa de pesquisa nos vários campeões que ela
// pode conter: "ann, zed, lux" → ["ann", "zed", "lux"]. Existe para a
// consulta rápida (Ctrl+Shift+A) poder responder a um punhado de campeões de
// uma vez, que é como o champion select os apresenta — um nome de cada vez
// não chegava a tempo.
//
// Só a vírgula, o ponto-e-vírgula e a mudança de linha separam termos. O
// ESPAÇO não, de propósito: senão "miss fortune" partia-se em "miss" +
// "fortune" e nenhum dos dois encontra campeão nenhum.
// O que separa um campeão do seguinte. Exportado porque a consulta rápida
// também precisa de saber onde acaba o termo que está a ser escrito agora
// (ver QuickCheck.jsx).
export const SEARCH_SEPARATORS = /[,;\n]/;

export function parseSearchTerms(query) {
  const terms = [];
  const seen = new Set();
  for (const part of (query || "").split(SEARCH_SEPARATORS)) {
    // Guarda-se o termo COMO FOI ESCRITO — só a comparação é que ignora
    // maiúsculas. A consulta rápida reescreve a pesquisa a partir desta
    // lista sempre que se tira ou se junta um campeão, e devolver tudo em
    // minúsculas fazia o campo reescrever "Annie" como "annie" nas costas de
    // quem está a escrever.
    const term = part.trim();
    const key = term.toLowerCase();
    // Sem repetidos — o mesmo campeão duas vezes não deve dar duas fichas
    // iguais nem contar duas vezes no resumo.
    if (!term || seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }
  return terms;
}

// Um termo bate com um campeão pelo nome de exibição OU pelo id interno da
// Riot — os dois porque nem sempre coincidem (o Wukong tem id "MonkeyKing",
// ver a nota de normalizeChampionId abaixo), e escrever "wukong" tem de o
// encontrar.
export function championMatchesTerm(champ, term) {
  const needle = (term || "").trim().toLowerCase();
  if (!needle) return false;
  return champ.name.toLowerCase().includes(needle) || champ.id.toLowerCase().includes(needle);
}

export function normalizeChampionId(raw, champions) {
  if (!raw || !champions?.length) return raw;
  const exact = champions.find((c) => c.id === raw);
  if (exact) return exact.id;
  const loose = champions.find((c) => c.id.toLowerCase() === raw.toLowerCase());
  return loose ? loose.id : raw;
}
