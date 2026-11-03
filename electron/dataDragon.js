const { net } = require("electron");

// ================= DE ONDE VEM TUDO =================
// As duas origens dos dados estáticos, num sítio só — são lidas aqui, pela
// cache de ícones (iconCache) e pela cache de dados (staticData).
//
// Podem ser trocadas pelo ambiente por uma razão concreta: nada no Electron
// consegue cortar a rede ao net.fetch do processo principal. O setProxy do
// session, o --proxy-server e o --host-resolver-rules foram todos testados e
// os pedidos saem na mesma, por isso "funciona sem internet" não era
// verificável sem isto — os scripts de verificação apontam estas origens para
// um endereço morto e a falha passa a ser real, no cliente HTTP a sério. Serve
// também para apontar a app a um espelho, se um dia for preciso.
const DDRAGON_ORIGIN = process.env.AT_DDRAGON_ORIGIN || "https://ddragon.leagueoflegends.com";
const CDRAGON_ORIGIN = process.env.AT_CDRAGON_ORIGIN || "https://raw.communitydragon.org";

// ================= DATA DRAGON (só para mapear id -> nome de spell) =================
// A Riot API (match-v5) devolve os feitiços de invocador como ids numéricos
// (summoner1Id/summoner2Id); a Live Client Data API já devolve o nome
// ("Flash", "Heal"...) diretamente em me.summonerSpells. Para guardar sempre
// o mesmo formato (nome) nas duas fontes, resolvemos o id->nome uma única
// vez aqui e ficamos com o resultado em cache — não vale a pena pedir isto
// à Data Dragon em cada partida importada.
let summonerSpellNameCache = null;
// O patch atual é pedido por dois sítios do processo principal (o mapa de
// feitiços aqui em baixo e a cache de ícones em electron/iconCache.js) e não
// muda enquanto a app está aberta — fica em memória à primeira.
let patchPromise = null;

// O net do Electron e não o https do Node: é o cliente do Chromium, por isso
// segue as definições de proxy do sistema — quem está atrás do proxy de uma
// empresa não ficava a ver ids em vez de nomes sem ninguém saber porquê. É
// também o mesmo cliente que as duas caches em disco usam (iconCache,
// staticData), portanto o processo principal fala com a rede de uma só
// maneira. Só pode ser chamado depois do "ready" do app.
function httpsGetJson(url) {
  return net
    .fetch(url, { signal: AbortSignal.timeout(8000) })
    .then((res) => {
      if (!res.ok) throw new Error(`GET ${url} -> status ${res.status}`);
      return res.json();
    });
}

// Devolve null (em vez de rejeitar) quando não há rede: quem chama decide o
// que fazer sem ficar obrigado a um try/catch só para isso.
function getCurrentPatch() {
  if (!patchPromise) {
    patchPromise = httpsGetJson(`${DDRAGON_ORIGIN}/api/versions.json`)
      .then((versions) => versions[0] || null)
      .catch((err) => {
        console.warn("[ddragon] falhou a lista de versões", err?.message || err);
        // Não guardamos a falha: a próxima chamada volta a tentar, porque o
        // mais provável é a rede ter voltado nesse meio tempo.
        patchPromise = null;
        return null;
      });
  }
  return patchPromise;
}

async function getSummonerSpellNameMap() {
  if (summonerSpellNameCache) return summonerSpellNameCache;

  try {
    const patch = await getCurrentPatch();
    if (!patch) return {};
    const data = await httpsGetJson(
      `${DDRAGON_ORIGIN}/cdn/${patch}/data/en_US/summoner.json`
    );

    const map = {};
    Object.values(data.data || {}).forEach((spell) => {
      map[Number(spell.key)] = spell.name;
    });

    summonerSpellNameCache = map;
    return map;
  } catch (err) {
    console.warn("[ddragon] falhou mapa de feitiços de invocador", err?.message || err);
    return {};
  }
}

// A árvore de assets do Community Dragon, que a cache de ícones e a cache de
// dados resolvem as duas contra a mesma raiz.
const CDRAGON_BASE = `${CDRAGON_ORIGIN}/latest/plugins/rcp-be-lol-game-data/global/default`;

module.exports = {
  getSummonerSpellNameMap,
  getCurrentPatch,
  DDRAGON_ORIGIN,
  CDRAGON_ORIGIN,
  CDRAGON_BASE,
};
