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
