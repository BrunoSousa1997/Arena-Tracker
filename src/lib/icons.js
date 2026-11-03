// ================= ÍCONES (Data Dragon) =================
// Dentro do Electron os ícones não vêm do CDN: vêm do protocolo at-img://,
// que os serve de uma cache em disco e só vai à rede na primeira vez que vê
// cada id (ver electron/iconCache.js para o porquê e para os números). O que
// isto muda para as views é que o URL de um ícone deixa de depender do patch
// — e, por isso, deixa de ter de esperar por ele.
//
// O "dragon" continua a ser aceite como segundo argumento para o caso de a
// app estar aberta direto no browser contra o servidor do Vite (depurar sem o
// Electron por cima), onde não há protocolo nenhum registado. Aí voltamos ao
// CDN, com o comportamento antigo. Em último caso devolvemos undefined, que o
// React traduz em <img> sem src — nada de pedidos a ".../undefined.png".
const HAS_ICON_CACHE =
  typeof window !== "undefined" && typeof window.electron?.prefetchIcons === "function";

function iconUrl(kind, name, dragon, cdnPath) {
  if (name === null || name === undefined || name === "") return undefined;
  if (HAS_ICON_CACHE) return `at-img://${kind}/${encodeURIComponent(name)}.png`;
  return dragon ? `${dragon}/${cdnPath}/${name}.png` : undefined;
}

export function itemIcon(itemId, dragon) {
  return iconUrl("item", itemId, dragon, "img/item");
}

export function championIcon(championId, dragon) {
  return iconUrl("champion", championId, dragon, "img/champion");
}

// Os feitiços de invocador são os únicos que chegam cá já como nome de
// ficheiro ("SummonerFlash.png"), porque é isso que o summoner.json dá — o
// ".png" sai antes de entrar no formato comum dos outros dois.
export function spellIcon(imageFull, dragon) {
  if (!imageFull) return undefined;
  return iconUrl("spell", imageFull.replace(/\.png$/i, ""), dragon, "img/spell");
}

// Meia dúzia de views usavam "DRAGON &&" como "já posso mostrar ícones?" —
// com o patch ainda a chegar, ou sem rede nenhuma para o ir buscar, não
// desenhavam ícone nenhum. Com a cache em disco a pergunta mudou: os ícones
// que já lá estão aparecem sem patch e sem rede, por isso o DRAGON passa a
// ser só o plano B de quem corre fora do Electron.
export function canShowIcons(dragon) {
  return HAS_ICON_CACHE || !!dragon;
}
