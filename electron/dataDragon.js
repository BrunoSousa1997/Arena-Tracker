const https = require("https");

// ================= DATA DRAGON (só para mapear id -> nome de spell) =================
// A Riot API (match-v5) devolve os feitiços de invocador como ids numéricos
// (summoner1Id/summoner2Id); a Live Client Data API já devolve o nome
// ("Flash", "Heal"...) diretamente em me.summonerSpells. Para guardar sempre
// o mesmo formato (nome) nas duas fontes, resolvemos o id->nome uma única
// vez aqui e ficamos com o resultado em cache — não vale a pena pedir isto
// à Data Dragon em cada partida importada.
let summonerSpellNameCache = null;

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 8000 }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(new Error(`GET ${url} -> status ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

async function getSummonerSpellNameMap() {
  if (summonerSpellNameCache) return summonerSpellNameCache;

  try {
    const versions = await httpsGetJson("https://ddragon.leagueoflegends.com/api/versions.json");
    const patch = versions[0];
    const data = await httpsGetJson(
      `https://ddragon.leagueoflegends.com/cdn/${patch}/data/en_US/summoner.json`
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

module.exports = { getSummonerSpellNameMap };
