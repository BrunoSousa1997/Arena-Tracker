// Lista de jogadores já comparados na tab Comparar, guardada localmente
// (por dispositivo, tal como "riot-accounts" em useAccounts.js) — só serve
// para preencher o formulário mais depressa da próxima vez (autocompletar
// nome/tag/servidor), não tem nada a ver com a identidade Riot partilhada na
// Supabase (ver findUsernameByRiotId em db/wins.js), que é o que decide se
// já há dados para mostrar.
const STORAGE_KEY = "compare-friends";
const MAX_FRIENDS = 20;

export function loadCompareFriends() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function friendKey(gameName, tagLine) {
  return `${gameName.trim().toLowerCase()}#${tagLine.trim().toLowerCase()}`;
}

// Acrescenta/atualiza um jogador (mais recente primeiro) e grava logo em
// localStorage — devolve a lista já atualizada para o componente guardar em
// estado sem precisar de um segundo round-trip a localStorage.
export function rememberCompareFriend(list, { gameName, tagLine, region }) {
  if (!gameName?.trim() || !tagLine?.trim()) return list;

  const key = friendKey(gameName, tagLine);
  const withoutThis = list.filter((f) => friendKey(f.gameName, f.tagLine) !== key);
  const updated = [
    { gameName: gameName.trim(), tagLine: tagLine.trim(), region: region || "europe", lastUsed: Date.now() },
    ...withoutThis,
  ].slice(0, MAX_FRIENDS);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function forgetCompareFriend(list, { gameName, tagLine }) {
  const key = friendKey(gameName, tagLine);
  const updated = list.filter((f) => friendKey(f.gameName, f.tagLine) !== key);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
