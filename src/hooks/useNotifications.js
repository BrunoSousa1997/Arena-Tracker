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
import { subscribeToInvites, getRoom } from "../db/api";

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

export function useNotifications({ activeAccount, matches, champions, wins, challengeWins = 0, dataLoading, t }) {
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

  // Toast + campainha, num único sítio — usado pelas conquistas (acima) e
  // pelos convites de desafio (abaixo). "event" é {type, key, iconId, color,
  // title, body}, o mesmo formato que diffAchievements já produzia.
  const pushNotification = useCallback(
    (event) => {
      if (!activeAccount) return;
      const notif = makeNotification(event);
      setItems((prev) => {
        const merged = [notif, ...prev];
        saveNotifications(activeAccount, merged);
        return merged;
      });
      setToasts((prev) => [...prev, notif].slice(-MAX_TOASTS));
    },
    [activeAccount]
  );

  // ================= VIGIA DAS CONQUISTAS =================
  useEffect(() => {
    // Sem dados ainda (arranque, troca de conta) não se compara nada — senão
    // a fotografia seria tirada com o histórico vazio e, mal os dados
    // chegassem, tudo parecia "acabado de conquistar".
    if (!activeAccount || dataLoading || !champions.length || !matches.length) return;

    const translate = tRef.current;
    const stats = computeAchievementStats(matches, champions, wins, challengeWins);
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
  }, [activeAccount, matches, champions, wins, challengeWins, dataLoading]);

  // ================= CONVITES DE DESAFIO (recebido) =================
  // Corre sempre (não só na tab Desafios, ver Challenges.jsx) — sem isto só
  // se sabia de um convite ao abrir essa tab por acaso, o que podia ser
  // muito depois de o convite ter chegado (ou nunca, se ninguém lá fosse).
  useEffect(() => {
    if (!activeAccount) return;

    const unsubscribe = subscribeToInvites(activeAccount, async (payload) => {
      // Não filtra por "INSERT": um reconvite depois de recusado é um UPDATE
      // (ver upsert em inviteToRoom, db/rooms.js) que repõe status="pending"
      // na mesma linha — também merece aviso, é um convite novo para quem o
      // recebe. DELETE não passa por aqui: nesses eventos "payload.new" vem
      // vazio, por isso falha logo o "invite.status !== 'pending'".
      const invite = payload.new;
      if (!invite || invite.status !== "pending") return;

      const translate = tRef.current;
      const room = await getRoom(invite.room_id);

      pushNotification({
        type: "invite",
        key: `invite:${invite.id}`,
        iconId: "bond",
        color: "#5b8cff",
        title: translate("chal_notif_invite_title"),
        body: room
          ? `${invite.from_username} ${translate("chal_invite_from")} — ${room.name}`
          : `${invite.from_username} ${translate("chal_invite_from")}`,
        // Torna o toast acionável: aceitar/recusar sem ter de ir à tab
        // Desafios de propósito (ver AchievementToasts.jsx e
        // handleInviteResponse em App.jsx). Sem "roomId" não há para onde
        // entrar, por isso nesse caso o toast fica só informativo.
        action: room
          ? { kind: "invite", inviteId: invite.id, roomId: room.id, roomName: room.name }
          : undefined,
      });
    });

    return unsubscribe;
  }, [activeAccount, pushNotification]);

  // Não há aqui nenhum aviso de "convite enviado": quem convida acabou de o
  // fazer e já vê o convite na lista da sala — dizer-lho outra vez numa
  // notificação (e num toast) é ruído sobre uma ação que a pessoa fez de
  // propósito há um segundo. O canal Realtime que existia só para isso foi
  // removido com ele (ver subscribeToSentInvites, entretanto apagado de
  // db/rooms.js). Os convites RECEBIDOS continuam a avisar, esses sim.

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
