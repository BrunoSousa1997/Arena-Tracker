import { useEffect, useState } from "react";
import { loadAugments } from "../lib/augments";
import { buildItemTierMap } from "../lib/itemTiers";

// Dados estáticos (Data Dragon + Community Dragon) que a app inteira lê mas
// nunca escreve — patch atual, campeões, augments, feitiços, itens. Extraído
// de App.jsx porque não depende nem é dependido por nenhum outro estado
// (contas, sync, partidas): só carrega uma vez no arranque.
export function useStaticData() {
  const [patch, setPatch] = useState(null);
  // Se o pedido do patch falhar ou demorar demasiado, deixamos de bloquear a
  // app — sem isto, sem internet no arranque prendia o utilizador atrás de
  // um ecrã de loading para sempre (as imagens de campeão/item já lidavam
  // bem com DRAGON=null antes; só o loading inicial é que faltava).
  const [patchFailed, setPatchFailed] = useState(false);
  const [champions, setChampions] = useState([]);
  const [augmentsMap, setAugmentsMap] = useState({});
  const [summonerSpellsMap, setSummonerSpellsMap] = useState({});
  const [itemsMap, setItemsMap] = useState({});
  // Mapa à parte em vez de enriquecer o itemsMap: seis sítios na app fazem
  // itemsMap[id] à espera de uma STRING com o nome (tooltips do Histórico,
  // das Estatísticas, do banner). Trocar o valor por um objeto partia-os
  // todos de uma vez, e por um ganho nenhum — quem precisa do tier procura-o
  // aqui. Ver lib/itemTiers.js para o que é um tier e como é decidido.
  const [itemTiersMap, setItemTiersMap] = useState({});

  // ================= PATCH =================
  useEffect(() => {
    let cancelled = false;

    async function loadPatch() {
      try {
        const res = await fetch(
          "https://ddragon.leagueoflegends.com/api/versions.json"
        );
        const versions = await res.json();
        if (!cancelled) setPatch(versions[0]);
      } catch {
        if (!cancelled) setPatchFailed(true);
      }
    }
    loadPatch();

    // Rede lenta/pendurada sem lançar erro nenhum — ao fim de 6s desistimos
    // de bloquear a app na mesma, mesmo sem resposta.
    const timeout = setTimeout(() => setPatchFailed(true), 6000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const DRAGON = patch
    ? `https://ddragon.leagueoflegends.com/cdn/${patch}`
    : null;

  // ================= CHAMPIONS =================
  useEffect(() => {
    if (!DRAGON) return;

    fetch(`${DRAGON}/data/en_US/champion.json`)
      .then((r) => r.json())
      .then((data) => {
        const champs = Object.values(data.data).map((c) => ({
          id: c.id,
          name: c.name,
          tags: c.tags,
        }));

        setChampions(champs);
      });
  }, [DRAGON]);

  // ================= AUGMENTS (nomes/ícones via Community Dragon) =================
  useEffect(() => {
    loadAugments().then(setAugmentsMap);
  }, []);

  // ================= FEITIÇOS DE INVOCADOR (ícones, para o Histórico) =================
  // Guardamos o nome do feitiço (ex: "Flash") tanto na Live Client Data
  // watcher como na importação via Riot API (ver electron.js), por isso o
  // mapa aqui só precisa de ir de nome -> ícone, sem lidar com ids.
  useEffect(() => {
    if (!DRAGON) return;

    fetch(`${DRAGON}/data/en_US/summoner.json`)
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        Object.values(data.data || {}).forEach((spell) => {
          map[spell.name] = `${DRAGON}/img/spell/${spell.image.full}`;
        });
        setSummonerSpellsMap(map);
      });
  }, [DRAGON]);

  // ================= ITENS (nomes + tier da Arena) =================
  useEffect(() => {
    if (!DRAGON) return;

    fetch(`${DRAGON}/data/en_US/item.json`)
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        Object.entries(data.data || {}).forEach(([id, item]) => {
          map[Number(id)] = item.name;
        });
        setItemsMap(map);
        setItemTiersMap(buildItemTierMap(data.data));
      });
  }, [DRAGON]);

  return {
    patch,
    patchFailed,
    champions,
    augmentsMap,
    summonerSpellsMap,
    itemsMap,
    itemTiersMap,
    DRAGON,
  };
}
