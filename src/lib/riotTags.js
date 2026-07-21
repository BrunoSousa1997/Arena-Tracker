// Tags mais comuns da Riot (o servidor de origem já vem embutido nelas) —
// escolher a tag certa já define sozinho o servidor certo para a Riot API,
// sem precisar de um select de servidor à parte (que só duplicava a mesma
// informação e podia ficar dessincronizado da tag escolhida). Partilhado
// entre o gestor de contas (AccountManager.jsx) e a tab Comparar
// (Compare.jsx), para as duas usarem sempre a mesma lista.
export const TAG_OPTIONS = [
  { value: "EUW", region: "europe" },
  { value: "EUNE", region: "europe" },
  { value: "TR1", region: "europe" },
  { value: "RU", region: "europe" },
  { value: "NA1", region: "americas" },
  { value: "BR1", region: "americas" },
  { value: "LAN", region: "americas" },
  { value: "LAS", region: "americas" },
  { value: "OCE", region: "americas" },
  { value: "KR", region: "asia" },
  { value: "JP1", region: "asia" },
  { value: "PH2", region: "sea" },
  { value: "SG2", region: "sea" },
  { value: "TH2", region: "sea" },
  { value: "TW2", region: "sea" },
  { value: "VN2", region: "sea" },
];

export const CUSTOM_TAG = "__custom__";

// Só usado quando a tag é "Outra" (personalizada) — nesse caso já não dá
// para adivinhar o servidor a partir da tag, por isso volta a perguntar.
export const FALLBACK_REGIONS = [
  { value: "europe", labelKey: "region_europe" },
  { value: "americas", labelKey: "region_americas" },
  { value: "asia", labelKey: "region_asia" },
  { value: "sea", labelKey: "region_sea" },
];

export function regionForTag(tag) {
  return TAG_OPTIONS.find((o) => o.value === tag)?.region || null;
}

// Limpa o que o utilizador escreveu nos campos de nome e tag antes de virar
// uma conta. O "#" é o separador do Riot ID e NUNCA faz parte de nenhum dos
// dois lados — mas é assim que toda a gente vê e copia o seu ID ("Nome#EUW"),
// por isso é natural escrevê-lo.
//
// Antes disto não havia limpeza nenhuma: escrever "#EUW" na tag guardava
// literalmente "#EUW", o pedido à Riot saía como ".../Nome/%23EUW" e falhava
// sem explicação nenhuma — parecia que a conta não existia. Colar o ID
// completo no campo do nome dava o mesmo resultado.
//
// Duas correções:
//   - a tag perde qualquer "#" e espaços;
//   - se o NOME trouxer um "#", parte-se ali: o que vem antes é o nome, o que
//     vem depois é a tag (e essa ganha à tag escrita à parte, porque colar o
//     ID completo é um gesto mais deliberado do que deixar o menu no valor
//     por omissão).
export function normalizeRiotId(rawName, rawTag) {
  const name = (rawName ?? "").trim();
  const tag = (rawTag ?? "").trim().replace(/#/g, "").trim();

  const hashIndex = name.indexOf("#");
  if (hashIndex === -1) return { gameName: name, tagLine: tag };

  const fromName = name.slice(hashIndex + 1).replace(/#/g, "").trim();
  return {
    gameName: name.slice(0, hashIndex).trim(),
    tagLine: fromName || tag,
  };
}
