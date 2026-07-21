// ================= FORMATO DA BUILD (coluna "items") =================
// A build do próprio jogador circula na app como uma lista de objetos
// { itemID, count } — é isso que a Live Client Data captura (com "count"
// real, ex: 2 poções) e o que a importação da Riot API constrói (ver
// buildArenaMatchRecord em electron/riotApi.js).
//
// MAS dentro de "participants" os items de cada jogador são só os ids em
// bruto (ver extractAllParticipants) — a lista dos colegas/adversários não
// precisa de "count". Sempre que reconstruímos a NOSSA linha a partir de
// "participants" (cache partilhada, reparação de linhas trocadas), os dois
// formatos encontram-se — e sem converter ficava um array de números numa
// coluna que o resto da app lê como objetos: "it.itemID" dava undefined e o
// histórico pedia ".../img/item/undefined.png", partindo os ícones da build.
//
// Aceita os dois formatos e devolve sempre o de objetos. Idempotente — pode
// correr sobre dados já normalizados sem os alterar.
// Item de trinket obrigatório em qualquer partida (toda a gente o leva) — não
// diz nada sobre o estilo de jogo do campeão, por isso sai de qualquer lista
// de "itens mais usados" ou de recomendação para não ocupar espaço com
// informação óbvia. Vive aqui (e não na view que primeiro precisou dele) por
// ser consumido pelo MatchReports e pelo itemStats — duas cópias divergiam
// assim que a lista crescesse.
export const ALWAYS_EXCLUDED_ITEM_NAMES = new Set(["Oracle Lens"]);

export function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((it) => {
      if (typeof it === "number") return { itemID: it, count: 1 };
      if (it && typeof it.itemID === "number") {
        return { itemID: it.itemID, count: it.count ?? 1 };
      }
      return null;
    })
    .filter((it) => it && it.itemID);
}
