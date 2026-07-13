// Cores e agrupamentos usados para representar o lugar (1º-8º) obtido numa
// partida de Arena, partilhados entre a Visão Geral, o Histórico e as
// Estatísticas. Verde para o pódio (top 3), laranja para o meio da tabela,
// vermelho para os últimos lugares. As cores vêm de variáveis CSS
// (--place-good/mid/low/unknown, ver index.css) com um tom próprio por tema
// para manter contraste acessível tanto no modo escuro como no claro — por
// isso já não há 3 tons de verde por posição dentro do pódio, só um "bom
// lugar" consistente (a posição exata já aparece no número/texto).
export function placementColor(placement) {
  if (!placement) return "var(--place-unknown)";
  if (placement <= 3) return "var(--place-good)";
  if (placement <= 6) return "var(--place-mid)";
  return "var(--place-low)";
}

// placementColor() devolve uma referência var(--x) (para poder mudar de tom
// por tema) em vez de um hex direto, por isso já não se pode concatenar um
// sufixo de alpha em hex (ex: `${cor}26`) como antes. Estes dois helpers
// fazem o mesmo com color-mix(), que funciona com qualquer var() na origem.
export function placementBg(placement) {
  return `color-mix(in srgb, ${placementColor(placement)} 22%, transparent)`;
}

export function placementBorder(placement) {
  return `color-mix(in srgb, ${placementColor(placement)} 55%, transparent)`;
}

export function placementText(placement) {
  return placement ? `${placement}º` : "—";
}

export function isTop3(placement) {
  return !!placement && placement <= 3;
}

// Último lugar possível, que depende do formato: 6 equipas de 3 (última
// posição = 6º) ou 8 equipas de 2 (última posição = 8º). Sem team_size
// conhecido assumimos o formato mais comum (8 equipas de 2).
export function lastPlacementFor(teamSize) {
  return teamSize === 3 ? 6 : 8;
}

export function isLastPlace(m) {
  if (!m?.placement) return false;
  return m.placement === lastPlacementFor(m.team_size);
}

// Agrupa um conjunto de partidas em baldes de lugar para os resumos.
export function bucketPlacements(matches) {
  const buckets = { p1: 0, p2: 0, p3: 0, p4_6: 0, p7_8: 0, unknown: 0 };

  matches.forEach((m) => {
    const p = m.placement;
    if (!p) buckets.unknown += 1;
    else if (p === 1) buckets.p1 += 1;
    else if (p === 2) buckets.p2 += 1;
    else if (p === 3) buckets.p3 += 1;
    else if (p <= 6) buckets.p4_6 += 1;
    else buckets.p7_8 += 1;
  });

  return buckets;
}

// % de partidas em que o lugar foi 1º-3º (ignora partidas sem dado de lugar).
export function top3Rate(matches) {
  const withPlacement = matches.filter((m) => !!m.placement);
  if (!withPlacement.length) return 0;
  const top3 = withPlacement.filter((m) => m.placement <= 3).length;
  return Math.round((top3 / withPlacement.length) * 100);
}
