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

// A comparação é feita sem ligar a maiúsculas: as tags da Riot não distinguem
// caixa ("euw" e "EUW" são a mesma conta), e quem escreve a sua à mão
// escreve-a como lhe apetece. Antes disto um "na1" em minúsculas não era
// reconhecido e a conta ficava no servidor por omissão (Europa) — errado, e
// sem nada no ecrã a dizer porquê.
export function regionForTag(tag) {
  const wanted = (tag ?? "").trim().toLowerCase();
  if (!wanted) return null;
  return TAG_OPTIONS.find((o) => o.value.toLowerCase() === wanted)?.region || null;
}

// Lê um Riot ID escrito num campo único ("Nome#EUW") e devolve tudo o que se
// percebe dele — incluindo o que FALTA. É com isto que o formulário de contas
// mostra, enquanto se escreve, o que é que entendeu.
//
// O formulário de contas passou a ter um campo em vez de três (nome + menu de
// tag + servidor): a pessoa copia o ID inteiro do cliente do jogo, cola, e não
// tem de o desmontar à mão. Para isso o formulário precisa de saber, a cada
// letra, se já há tag e se essa tag chega para decidir o servidor.
//
// O "#" é o separador do Riot ID e nunca faz parte de nenhum dos dois lados,
// mas é com ele que todos vemos e copiamos o nosso ID — por isso é escrito, e
// por isso é aqui que desaparece. Antes de haver esta limpeza, um "#EUW"
// guardado tal e qual saía no pedido à Riot como ".../Nome/%23EUW" e falhava
// sem explicação: parecia que a conta não existia.
export function parseRiotId(raw) {
  // Espaços repetidos viram um só (acontece ao colar de sítios que formatam o
  // ID), mas o espaço no meio do nome fica: "Sr Sousa#EUW" é um ID válido.
  const value = (raw ?? "").replace(/\s+/g, " ").trim();
  const hashIndex = value.indexOf("#");

  const gameName = (hashIndex === -1 ? value : value.slice(0, hashIndex)).trim();
  const rawTag = hashIndex === -1 ? "" : value.slice(hashIndex + 1).replace(/#/g, "").trim();

  // Tag conhecida volta na caixa oficial da lista ("euw" → "EUW"), para o
  // cartão da conta não ficar a mostrar a versão torta do que foi escrito.
  const known = TAG_OPTIONS.find((o) => o.value.toLowerCase() === rawTag.toLowerCase());
  const tagLine = known ? known.value : rawTag;

  return {
    gameName,
    tagLine,
    // null quando não há tag, ou quando ela não está na lista: aí o servidor
    // tem de ser perguntado, não adivinhado.
    region: known ? known.region : null,
    knownTag: Boolean(known),
  };
}
