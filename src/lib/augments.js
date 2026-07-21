// A Riot não expõe nomes de augments da Arena em nenhum Data Dragon oficial
// (item0-6 tem champion.json/item.json, mas playerAugment1-4 não tem
// equivalente). Quem os publica é o Community Dragon, projeto não-oficial que
// espelha os dados internos do cliente.
//
// Isto já apontou para "cdragon/arena/en_us.json", uma lista derivada que só
// tem 226 augments, todos com id entre 1 e 405 — e por isso deixava sem nome
// tudo o que ficasse de fora, aparecendo como "#2003" na interface. A lista
// canónica (a mesma que o cliente do jogo carrega) tem 624 e é um
// superconjunto estrito da outra: verificado, não se perde um único id dos
// que a antiga trazia.
const CDRAGON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default";
const AUGMENTS_URL = `${CDRAGON_BASE}/v1/cherry-augments.json`;

// Os caminhos vêm como "/lol-game-data/assets/ASSETS/UX/..." e resolvem-se
// contra a mesma árvore, sem esse prefixo e em minúsculas.
function iconUrl(path) {
  if (!path) return null;
  return CDRAGON_BASE + path.toLowerCase().replace("/lol-game-data/assets", "");
}

// A lista canónica dá a raridade por nome ("kGold"), não pelo 0/1/2 que o
// resto da app já usava. Mantemos os três valores originais com o mesmo
// significado (nada do que os consome precisa de mudar) e acrescentamos os
// dois que a lista antiga nunca chegou a mostrar: Bronze e os augments de
// evento.
// A lista canónica não é só da Arena: traz também os "upgrades" do Swarm
// (o modo PvE), cujos ícones são armas e bênçãos e por isso pareciam ícones
// de feitiços quando apareciam misturados na pesquisa. Reconhecem-se pela
// árvore de assets — o Swarm é "strawberry", a Arena é "cherry", e "kiwi" são
// os augments partilhados com o ARAM que a Arena também usa (Critical Rhythm,
// Bounce of the Poro King, ...), esses ficam.
//
// O id -1 é o marcador que a Riot usa para as entradas do Swarm sem id real —
// dezenas de augments diferentes partilham-no, por isso nunca poderia servir
// para identificar nada.
//
// Verificado contra dados reais: isto remove 105 das 638 entradas e não perde
// um único id dos que aparecem em partidas de Arena a sério.
function isArenaAugment(a) {
  if (a?.id == null || a.id < 0) return false;
  return !(a.augmentSmallIconPath || "").toLowerCase().includes("strawberry");
}

const RARITY_BY_NAME = {
  kSilver: 0,
  kGold: 1,
  kPrismatic: 2,
  kBronze: 3,
  kEventChoice: 4,
};

export const AUGMENT_TIER_LABELS = {
  0: "Prata",
  1: "Ouro",
  2: "Prisma",
  3: "Bronze",
  4: "Evento",
};

// As mesmas raridades, mas traduzíveis — os rótulos acima são só em português
// e já estão espalhados por sítios onde isso não incomodou. Onde a raridade
// titula uma secção inteira (ver as prateleiras de augments em views/InGame),
// tem de acompanhar o idioma.
export const AUGMENT_RARITY_LABEL_KEYS = {
  0: "rarity_silver",
  1: "rarity_gold",
  2: "rarity_prismatic",
  3: "rarity_bronze",
  4: "rarity_event",
};

// Do mais forte para o mais fraco, que é a ordem por que as prateleiras se
// mostram: a escolha prismática é a que mais decide a partida, por isso é a
// primeira a ler. Bronze e Evento vão para o fim por serem residuais.
export const AUGMENT_RARITY_ORDER = [2, 1, 0, 3, 4];

// Estilo do cartão consoante a raridade — prateado, dourado ou com o
// gradiente "diamante" usado para os Prismáticos no próprio jogo. Devolve
// null para raridades sem cor própria (ex: augments de crafting), caindo no
// estilo neutro por defeito.
export function augmentRarityStyle(rarity) {
  if (rarity === 0) {
    return {
      background: "linear-gradient(135deg, rgba(201,206,214,0.32), rgba(201,206,214,0.08))",
      border: "1px solid rgba(201,206,214,0.6)",
    };
  }
  if (rarity === 1) {
    return {
      background: "linear-gradient(135deg, rgba(255,199,84,0.32), rgba(255,199,84,0.08))",
      border: "1px solid rgba(255,199,84,0.6)",
    };
  }
  if (rarity === 2) {
    return {
      background: "linear-gradient(135deg, rgba(177,101,255,0.38), rgba(177,101,255,0.1))",
      border: "1px solid rgba(177,101,255,0.7)",
    };
  }
  if (rarity === 3) {
    return {
      background: "linear-gradient(135deg, rgba(199,133,84,0.32), rgba(199,133,84,0.08))",
      border: "1px solid rgba(199,133,84,0.6)",
    };
  }
  if (rarity === 4) {
    return {
      background: "linear-gradient(135deg, rgba(94,214,197,0.3), rgba(94,214,197,0.08))",
      border: "1px solid rgba(94,214,197,0.6)",
    };
  }
  return null;
}

// Cor "sólida" (sem transparência) da raridade — usada em contextos que
// precisam só de uma cor de destaque (ex: texto, contorno de ícone), em vez
// do gradiente completo do cartão.
export function augmentRarityColor(rarity) {
  if (rarity === 0) return "#c9ced6";
  if (rarity === 1) return "#ffc754";
  if (rarity === 2) return "#b165ff";
  if (rarity === 3) return "#c78554";
  if (rarity === 4) return "#5ed6c5";
  return null;
}

let cache = null;
let inflight = null;

// Devolve (e cacheia em memória) um mapa
// { [augmentId]: { id, name, icon, rarity, tierLabel } }.
export function loadAugments() {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = fetch(AUGMENTS_URL)
    .then((r) => r.json())
    .then((data) => {
      // A lista canónica é um array à cabeça; a antiga vinha embrulhada em
      // { augments: [...] }. Aceitar as duas formas evita que uma mudança de
      // formato do lado do Community Dragon deixe a app sem nome nenhum.
      const list = Array.isArray(data) ? data : data?.augments || [];

      const map = {};
      list.forEach((a) => {
        if (!isArenaAugment(a)) return;
        const rarity = RARITY_BY_NAME[a.rarity] ?? (typeof a.rarity === "number" ? a.rarity : null);
        map[a.id] = {
          id: a.id,
          // "nameTRA" na lista canónica, "name" na antiga.
          name: a.nameTRA || a.name || `Augment #${a.id}`,
          icon: iconUrl(a.augmentSmallIconPath || a.iconSmall || a.iconLarge),
          rarity,
          tierLabel: AUGMENT_TIER_LABELS[rarity] || null,
        };
      });
      cache = map;
      return map;
    })
    .catch((err) => {
      console.warn(
        "[augments] não foi possível carregar os nomes da Community Dragon:",
        err?.message || err
      );
      cache = {};
      return cache;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
