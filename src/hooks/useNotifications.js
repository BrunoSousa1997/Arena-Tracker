import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeAchievementStats,
  buildAchievementCategories,
  buildBooleanAchievements,
  buildAchievementSnapshot,
  diffAchievements,
} from "../lib/achievementStats";
import {
  loadNotifications,
  saveNotifications,
  loadAchievementSnapshot,
  saveAchievementSnapshot,
  makeNotification,
} from "../lib/notifications";

// Caixa de notificações da conta ativa + o vigia que deteta conquistas novas.
//
// Vive num hook (e não dentro da tab Conquistas) porque tem de correr SEMPRE:
// o interesse é ser avisado de uma conquista logo a seguir a sincronizar,
// esteja-se em que tab se estiver — se só corresse na tab Conquistas, só
// saberias ao lá ir, que é precisamente quando já não precisas do aviso.
// Toasts visíveis ao mesmo tempo. Uma sincronização grande pode desbloquear
// muita coisa de uma vez — despejar 15 toasts tapava a app inteira. Mostram-se
// os mais recentes e o resto fica na campainha, que tem tudo.
const MAX_TOASTS = 3;

export function useNotifications({ activeAccount, matches, champions, wins, dataLoading, t }) {
  const [items, setItems] = useState([]);
  // Fila do que acabou de chegar — à parte de "items" (o histórico da
  // campainha), porque um toast é efémero: desaparece sozinho ao fim de
  // alguns segundos sem que isso apague a notificação da lista.
  const [toasts, setToasts] = useState([]);

  // "t" é recriado a cada render pelo LanguageProvider, por isso não pode
  // entrar nas dependências do efeito abaixo (dava um ciclo infinito). Uma
  // ref dá acesso à versão atual sem o efeito reagir a ela.
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    setItems(activeAccount ? loadNotifications(activeAccount) : []);
    // Trocar de conta não deve deixar em cima do ecrã toasts da conta
    // anterior — as conquistas são de quem as fez.
    setToasts([]);
  }, [activeAccount]);

  // ================= VIGIA DAS CONQUISTAS =================
  useEffect(() => {
    // Sem dados ainda (arranque, troca de conta) não se compara nada — senão
    // a fotografia seria tirada com o histórico vazio e, mal os dados
    // chegassem, tudo parecia "acabado de conquistar".
    if (!activeAccount || dataLoading || !champions.length || !matches.length) return;

    const translate = tRef.current;
    const stats = computeAchievementStats(matches, champions, wins);
    const categories = buildAchievementCategories(stats, translate);
    const booleans = buildBooleanAchievements(stats, translate);
    const snapshot = buildAchievementSnapshot(categories, booleans);

    const previous = loadAchievementSnapshot(activeAccount);

    // Primeira vez que se vê esta conta: guarda em silêncio. Notificar aqui
    // significaria despejar dezenas de avisos de conquistas que a pessoa já
    // tinha há meses — ver comentário em loadAchievementSnapshot.
    if (!previous) {
      saveAchievementSnapshot(activeAccount, snapshot);
      return;
    }

    const events = diffAchievements(previous, categories, booleans, translate);
    saveAchievementSnapshot(activeAccount, snapshot);
    if (!events.length) return;

    // As mesmas notificações vão para os dois sítios: a campainha (histórico,
    // persistido) e os toasts (efémeros). Criam-se aqui uma única vez para os
    // ids baterem certo entre ambos.
    const fresh = events.map(makeNotification);

    setItems((prev) => {
      const merged = [...fresh, ...prev];
      saveNotifications(activeAccount, merged);
      return merged;
    });
    setToasts((prev) => [...prev, ...fresh].slice(-MAX_TOASTS));
  }, [activeAccount, matches, champions, wins, dataLoading]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      if (!prev.some((n) => !n.read)) return prev;
      const next = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(activeAccount, next);
      return next;
    });
  }, [activeAccount]);

  const clearAll = useCallback(() => {
    setItems([]);
    saveNotifications(activeAccount, []);
  }, [activeAccount]);

  // Estável (useCallback sem dependências): cada toast agenda o seu próprio
  // desaparecimento com esta função — se ela mudasse de identidade a cada
  // render, o temporizador reiniciava e o toast nunca chegava a sair.
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return { notifications: items, unreadCount, markAllRead, clearAll, toasts, dismissToast };
}
