import { useEffect, useMemo, useState } from "react";
import { buildAugmentMap } from "../lib/augments";
import { spellIcon } from "../lib/icons";
import { buildItemTierMap } from "../lib/itemTiers";
import { dragonBase, loadStaticData } from "../lib/staticData";

// Dados estáticos (Data Dragon + Community Dragon) que a app inteira lê mas
// nunca escreve — patch atual, campeões, augments, feitiços, itens. Extraído
// de App.jsx porque não depende nem é dependido por nenhum outro estado
// (contas, sync, partidas): só carrega uma vez no arranque.
//
// Quem os vai buscar é o lib/staticData.js — dentro do Electron, pela cache em
// disco do processo principal; fora dele, pela rede. Aqui ficou só a forma que
// a app consome: um pedido, e os mapas derivados dele.
export function useStaticData() {
  const [raw, setRaw] = useState(null);
  // Se não houver nada — nem rede nem cache — deixamos de bloquear a app.
  // Sem isto, sem internet no arranque prendia o utilizador atrás de um ecrã
  // de loading para sempre (as imagens de campeão/item já lidavam bem com
  // DRAGON=null antes; só o loading inicial é que faltava).
  const [patchFailed, setPatchFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadStaticData()
      .then((data) => {
        if (cancelled) return;
        setRaw(data);
        // Chegou resposta, mas sem patch: não há rede nem cópia em disco de
        // onde o tirar. A app abre com o que tiver (nada, à primeira vez).
        if (!data?.patch) setPatchFailed(true);
      })
      .catch(() => {
        if (!cancelled) setPatchFailed(true);
      });

    // Rede lenta/pendurada sem lançar erro nenhum — ao fim de 6s desistimos
    // de bloquear a app na mesma, mesmo sem resposta.
    const timeout = setTimeout(() => setPatchFailed(true), 6000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const patch = raw?.patch || null;
  // Já não serve para os ícones (esses vão pela cache, ver lib/icons.js) — só
  // para quem continua a precisar de um URL da Data Dragon à mão.
  const DRAGON = dragonBase(patch);

  const champions = useMemo(() => {
    const data = raw?.champion?.data;
    if (!data) return [];
    return Object.values(data).map((c) => ({ id: c.id, name: c.name, tags: c.tags }));
  }, [raw]);

  const augmentsMap = useMemo(
    () => (raw?.augments ? buildAugmentMap(raw.augments) : {}),
    [raw]
  );

  // ================= FEITIÇOS DE INVOCADOR (ícones, para o Histórico) =======
  // Guardamos o nome do feitiço (ex: "Flash") tanto na Live Client Data
  // watcher como na importação via Riot API (ver electron.js), por isso o
  // mapa aqui só precisa de ir de nome -> ícone, sem lidar com ids.
  //
  // Os nomes de ficheiro saem à parte, para o pré-aquecimento da cache os
  // poder pedir (ver useIconPrefetch) — o mapa já guarda os URLs montados, e
  // desmontá-los outra vez era pior.
  const { summonerSpellsMap, summonerSpellFiles } = useMemo(() => {
    const map = {};
    const files = [];
    Object.values(raw?.summoner?.data || {}).forEach((spell) => {
      map[spell.name] = spellIcon(spell.image?.full, DRAGON);
      if (spell.image?.full) files.push(spell.image.full);
    });
    return { summonerSpellsMap: map, summonerSpellFiles: files };
  }, [raw, DRAGON]);

  // ================= ITENS (nomes + tier da Arena) =================
  // Dois mapas em vez de um enriquecido: seis sítios na app fazem itemsMap[id]
  // à espera de uma STRING com o nome (tooltips do Histórico, das
  // Estatísticas, do banner). Trocar o valor por um objeto partia-os todos de
  // uma vez, e por um ganho nenhum — quem precisa do tier procura-o no outro.
  // Ver lib/itemTiers.js para o que é um tier e como é decidido.
  const { itemsMap, itemTiersMap } = useMemo(() => {
    const data = raw?.item?.data;
    if (!data) return { itemsMap: {}, itemTiersMap: {} };

    const map = {};
    Object.entries(data).forEach(([id, item]) => {
      map[Number(id)] = item.name;
    });
    return { itemsMap: map, itemTiersMap: buildItemTierMap(data) };
  }, [raw]);

  return {
    patch,
    patchFailed,
    champions,
    augmentsMap,
    summonerSpellsMap,
    summonerSpellFiles,
    itemsMap,
    itemTiersMap,
    DRAGON,
  };
}
