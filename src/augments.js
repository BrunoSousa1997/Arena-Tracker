// A Riot não expõe nomes de augments da Arena em nenhum Data Dragon oficial
// (item0-6 tem champion.json/item.json, mas playerAugment1-4 não tem
// equivalente). O Community Dragon (projeto não-oficial que espelha os
// dados internos do cliente) publica esta lista com id, nome e ícone:
// https://raw.communitydragon.org/latest/cdragon/arena/en_us.json
const AUGMENTS_URL = "https://raw.communitydragon.org/latest/cdragon/arena/en_us.json";

// Os caminhos de ícone vêm relativos (ex: "assets/ux/cherry/augments/icons/
// warmuproutine_large.png") e resolvem-se contra a árvore de assets do jogo.
const ASSET_BASE = "https://raw.communitydragon.org/latest/game/";

function iconUrl(path) {
  if (!path) return null;
  return `${ASSET_BASE}${path.toLowerCase()}`;
}

// A Riot codifica a raridade do augment como 0/1/2 — mesma ordem usada no
// jogo (Prata é o mais comum, Prisma o mais raro). Valores fora disto (ex:
// augments especiais de "crafting") não têm etiqueta de nível de raridade.
export const AUGMENT_TIER_LABELS = { 0: "Prata", 1: "Ouro", 2: "Prisma" };

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
  return null;
}

// Cor "sólida" (sem transparência) da raridade — usada em contextos que
// precisam só de uma cor de destaque (ex: texto, contorno de ícone), em vez
// do gradiente completo do cartão.
export function augmentRarityColor(rarity) {
  if (rarity === 0) return "#c9ced6";
  if (rarity === 1) return "#ffc754";
  if (rarity === 2) return "#b165ff";
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
      const map = {};
      (data?.augments || []).forEach((a) => {
        map[a.id] = {
          id: a.id,
          name: a.name || `Augment #${a.id}`,
          icon: iconUrl(a.iconSmall || a.iconLarge),
          rarity: a.rarity ?? null,
          tierLabel: AUGMENT_TIER_LABELS[a.rarity] || null,
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
