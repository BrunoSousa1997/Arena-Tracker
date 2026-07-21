// ================= BASELINE POR GRUPO =================
// O computeAugmentStats e o computeItemStats dão UMA baseline para toda a
// população, e o "delta" de cada linha é medido contra ela. Isso é o certo
// enquanto a lista é uma só. Deixa de ser assim que a lista se parte por
// raridade (augments) ou por prateleira (itens).
//
// A razão é a mesma que já obrigou a baseline a ser por campeão: um augment
// prismático é mais forte do que um de prata por construção, não por ser bem
// escolhido. Medidos contra a média de TODOS os augments, os prismáticos
// aparecem todos com desvio positivo e os de prata todos com desvio negativo
// — a coluna passa a dizer "os prismáticos são melhores", que toda a gente já
// sabe, em vez de dizer qual escolher dentro do que te vai ser oferecido. E é
// sempre dentro de uma raridade que a escolha real acontece: a Arena oferece
// três augments da MESMA raridade de cada vez.
//
// Este módulo recebe as linhas já calculadas e reescreve o delta de cada uma
// contra a média do seu próprio grupo. Não volta a passar pelas partidas: as
// linhas trazem "games" e "top3", que é tudo o que a média precisa.

// "keyOf" devolve a chave do grupo de uma linha (ou null para a deixar de
// fora). "order" fixa a ordem de saída — sem ela a ordem vinha da de entrada,
// que é por nº de jogos e portanto muda de conta para conta e de campeão para
// campeão, fazendo as secções saltarem de sítio.
//
// Devolve [{ key, baseline, rows }], já sem grupos vazios.
export function groupWithBaseline(rows, keyOf, { order = [], sort = null } = {}) {
  const groups = new Map();

  for (const row of rows || []) {
    const key = keyOf(row);
    if (key == null) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const keys = [
    ...order.filter((k) => groups.has(k)),
    // Uma chave que apareça nos dados mas não na ordem esperada continua a
    // ser mostrada, no fim. Perder linhas em silêncio porque a Riot
    // introduziu uma raridade nova era pior do que as mostrar fora de sítio.
    ...[...groups.keys()].filter((k) => !order.includes(k)),
  ];

  return keys.map((key) => {
    const groupRows = groups.get(key);

    const games = groupRows.reduce((n, r) => n + r.games, 0);
    const top3 = groupRows.reduce((n, r) => n + r.top3, 0);
    const wins = groupRows.reduce((n, r) => n + r.wins, 0);

    const top3Rate = games ? (top3 / games) * 100 : 0;

    const rebased = groupRows.map((r) => ({ ...r, delta: r.top3Rate - top3Rate }));

    return {
      key,
      baseline: {
        picks: games,
        top3Rate,
        winRate: games ? (wins / games) * 100 : 0,
      },
      rows: sort ? [...rebased].sort(sort) : rebased,
    };
  });
}
