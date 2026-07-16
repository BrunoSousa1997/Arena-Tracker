// Notificações da app — guardadas localmente (por conta), tal como a lista
// de contas em useAccounts.js. Não vivem na Supabase de propósito: são
// pessoais e só fazem sentido no dispositivo onde apareceram; sincronizá-las
// obrigaria a uma tabela nova só para dizer "já li isto", sem ninguém do
// outro lado a ler.
//
// A chave inclui a conta porque as conquistas são por conta — trocar de
// conta tem de trocar de caixa de notificações, não misturar as duas.
const LIST_PREFIX = "notifications:";
const SNAPSHOT_PREFIX = "achv-snapshot:";

// Teto de itens guardados: uma caixa infinita só engorda o localStorage sem
// ninguém alguma vez descer até ao fundo.
const MAX_ITEMS = 50;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function loadNotifications(account) {
  if (!account) return [];
  const list = readJson(LIST_PREFIX + account, []);
  return Array.isArray(list) ? list : [];
}

export function saveNotifications(account, list) {
  if (!account) return;
  localStorage.setItem(LIST_PREFIX + account, JSON.stringify(list.slice(0, MAX_ITEMS)));
}

// null (e não {}) quando nunca houve fotografia — é o que distingue "conta
// nova, ainda não sei nada dela" de "conta sem nenhuma conquista". Sem essa
// distinção, a primeira sincronização de uma conta com anos de histórico
// despejava dezenas de notificações de coisas conquistadas há meses.
export function loadAchievementSnapshot(account) {
  if (!account) return null;
  return readJson(SNAPSHOT_PREFIX + account, null);
}

export function saveAchievementSnapshot(account, snapshot) {
  if (!account) return;
  localStorage.setItem(SNAPSHOT_PREFIX + account, JSON.stringify(snapshot));
}

export function makeNotification(event) {
  return {
    // A "key" identifica o feito em si (ver diffAchievements); o timestamp
    // torna o id único mesmo que o mesmo feito volte a acontecer.
    id: `${event.key}@${Date.now()}`,
    type: event.type,
    iconId: event.iconId,
    color: event.color,
    title: event.title,
    body: event.body,
    at: Date.now(),
    read: false,
  };
}
