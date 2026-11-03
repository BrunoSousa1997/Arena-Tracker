import { useEffect, useRef } from "react";

// ================= PRÉ-AQUECIMENTO DOS ÍCONES =================
// A cache em disco (electron/iconCache.js) resolve o custo de ir ao CDN uma
// vez por ícone, mas essa primeira vez continuava a acontecer à frente do
// utilizador — e, no Histórico, acontecia toda de uma vez: a linha expandida
// mostra a build de todos os jogadores da partida.
//
// Então antecipamos-lhe o trabalho. Assim que as partidas chegam, mandamos ao
// processo principal a lista de tudo o que as views vão querer desenhar e ele
// enche o disco em segundo plano, enquanto o utilizador ainda está na Visão
// Geral. Quando ele abre o Histórico não há pedido nenhum para fazer.
//
// Corre uma vez por conjunto de ids: a assinatura lá em baixo evita repetir o
// pedido a cada render (o "matches" é recriado em cada sync) e deixa-o correr
// outra vez quando o sync traz itens ou campeões que ainda não tínhamos.
export function useIconPrefetch({ matches, champions, summonerSpellFiles, augmentsMap }) {
  const lastSignature = useRef(null);

  useEffect(() => {
    if (typeof window.electron?.prefetchIcons !== "function") return;

    const items = new Set();
    const champs = new Set();
    const augmentIds = new Set();

    (matches || []).forEach((m) => {
      // A nossa build vem como { itemID, count }; a dos outros jogadores, em
      // "participants", vem como ids em bruto — ver src/lib/items.js.
      (m.items || []).forEach((it) => {
        const id = typeof it === "number" ? it : it?.itemID;
        if (id) items.add(id);
      });
      if (m.champion) champs.add(m.champion);
      (m.augments || []).forEach((id) => id && augmentIds.add(id));
      (m.participants || []).forEach((p) => {
        (p.items || []).forEach((id) => id && items.add(id));
        (p.augments || []).forEach((id) => id && augmentIds.add(id));
        if (p.champion) champs.add(p.champion);
      });
    });

    // A lista completa de campeões entra toda: é ela que alimenta os seletores
    // de campeão (pesquisa do Histórico, Comparar, Consulta rápida), onde
    // aparecem dezenas de ícones de uma vez sem ter havido partida nenhuma.
    (champions || []).forEach((c) => c?.id && champs.add(c.id));

    const payload = {
      // Itens primeiro: é a lista que o processo principal percorre por ordem
      // e é a que o utilizador está à espera de ver no Histórico.
      item: [...items],
      champion: [...champs],
      spell: (summonerSpellFiles || []).map((file) => file.replace(/\.png$/i, "")),
      // Ao contrário dos outros, os augments não vão todos: são 594 na lista, e
      // as prateleiras do InGame que os mostram todos enchem-se à primeira vez
      // que lá se vai. Aqui só interessam os que o Histórico vai desenhar — os
      // das partidas, que são os que apanham a linha expandida com os augments
      // de toda a gente.
      augment: [...augmentIds].map((id) => augmentsMap?.[id]?.iconPath).filter(Boolean),
    };

    const signature = [payload.item, payload.champion, payload.spell, payload.augment]
      .map((list) => [...list].sort().join(","))
      .join("|");
    if (signature === lastSignature.current) return;
    if (!payload.item.length && !payload.champion.length && !payload.augment.length) return;
    lastSignature.current = signature;

    // Deliberadamente sem await e sem estado: isto não tem de bloquear nem de
    // reportar nada: se falhar, o protocolo busca o ícone que falta quando a
    // view o pedir, como fazia antes.
    window.electron.prefetchIcons(payload).catch(() => {});
  }, [matches, champions, summonerSpellFiles, augmentsMap]);
}
