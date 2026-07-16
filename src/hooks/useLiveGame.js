import { useEffect, useRef, useState } from "react";
import { ensureUser, addWin, addMatch, hasSyncedMatch } from "../db/api";
import { normalizeChampionId } from "../lib/champions";
import { getRoast } from "../lib/roasts";

// Agenda do auto-sync após o fim de uma partida (ver scheduleAutoSync). A
// Live Client Data só dá Win/Lose, nunca o lugar exato — mas só 1º e 2º
// lugar são decididos na própria ronda final, quando a partida termina de
// vez para todos; quem é eliminado antes (3º-8º) vê o "GameEnd" no seu
// cliente bem mais cedo do que a partida real acaba para quem sobra. Em vez
// de tentar adivinhar o lugar, tentamos depressa primeiro — se for 1º/2º a
// Riot já deve ter os dados prontos e uma destas tentativas rápidas
// encontra logo a partida; se não encontrar em nenhuma, cai sozinho para o
// intervalo lento (só quem ficou 3º-8º chega aqui, porque a partida real
// ainda não tinha acabado nas tentativas rápidas).
const RETRY_DELAYS_MS = [10_000, 30_000, 60_000];
const RETRY_SYNC_INTERVAL_MS = 5 * 60 * 1000;
// Rede de segurança para nunca ficar a tentar para sempre (ex: conta
// apagada a meio, jogo que por alguma falha do lado da Riot nunca aparece).
// 3 tentativas rápidas + ~24 lentas (5 em 5 min) = pouco mais de 2h, bem
// acima do tempo que uma Arena demora a terminar de vez.
const RETRY_SYNC_MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 24;

// Deteção automática de partidas de Arena via Live Client Data (ver
// electron.js) — cria/atualiza contas e partidas em tempo real, e mostra o
// banner "a jogar X" / "resultado da partida". Depende de accounts/matches/
// champions (não só os seus próprios estados), por isso recebe-os como
// parâmetros em vez de os duplicar.
export function useLiveGame({
  accounts,
  setAccounts,
  activeAccount,
  setActiveAccount,
  champions,
  matches,
  setMatches,
  setWins,
  lang,
  // Chamado sozinho depois do fim de uma partida, para não obrigar a
  // clicar manualmente em "Sincronizar" — ver o setTimeout mais abaixo.
  onAutoSync,
}) {
  // Timers do auto-sync agendado (ver onMatchResult) — guardados para serem
  // limpos se o componente desmontar antes de dispararem (troca de conta,
  // fecho da app, etc.), nunca para os cancelar noutra circunstância.
  const autoSyncTimers = useRef([]);
  useEffect(() => {
    return () => autoSyncTimers.current.forEach(clearTimeout);
  }, []);

  // Ciclos de auto-sync ainda "em aberto" (partida ainda não confirmada
  // sincronizada) — { id, username, signature, timerId }. Existe para o
  // botão "Sincronizar"/"Reparar dados" (ver reconcilePendingAutoSyncs)
  // poder cancelar de imediato um ciclo cuja partida já apareceu por uma
  // sincronização manual, em vez de o deixar sozinho até à tentativa
  // seguinte (que podia demorar até 5 min).
  const pendingAutoSyncs = useRef([]);

  const removePendingAutoSync = (id) => {
    pendingAutoSyncs.current = pendingAutoSyncs.current.filter((p) => p.id !== id);
  };

  // Agenda uma tentativa de auto-sync e, se a partida ainda não aparecer
  // sincronizada (ver hasSyncedMatch), agenda a seguinte — rápida enquanto
  // ainda estivermos dentro de RETRY_DELAYS_MS, depois de 5 em 5 min. Único
  // agendador para qualquer resultado (Win ou Lose): não há como saber pela
  // Live Client Data se um "Lose" foi 2º ou 8º lugar, por isso deixamos as
  // tentativas rápidas decidirem sozinhas — 1º e 2º lugar encontram a
  // partida logo numa delas, 3º-8º só mesmo nas tentativas lentas de
  // depois (ver comentário em RETRY_DELAYS_MS).
  const scheduleAutoSync = (username, signature, attempt = 0, jobId = null) => {
    const id = jobId ?? `${username}:${signature.champion}:${signature.after}`;
    const delay = attempt < RETRY_DELAYS_MS.length ? RETRY_DELAYS_MS[attempt] : RETRY_SYNC_INTERVAL_MS;

    const timer = setTimeout(async () => {
      await onAutoSync?.();
      const synced = await hasSyncedMatch(username, signature);
      if (synced || attempt + 1 >= RETRY_SYNC_MAX_ATTEMPTS) {
        removePendingAutoSync(id);
        return;
      }
      scheduleAutoSync(username, signature, attempt + 1, id);
    }, delay);
    autoSyncTimers.current.push(timer);

    const existing = pendingAutoSyncs.current.find((p) => p.id === id);
    if (existing) existing.timerId = timer;
    else pendingAutoSyncs.current.push({ id, username, signature, timerId: timer });
  };

  // Chamar depois de QUALQUER sincronização manual (botão "Sincronizar" ou
  // "Reparar dados") — se essa sincronização já trouxe a partida que um
  // ciclo de auto-sync ainda estava à espera, cancela-o logo em vez de o
  // deixar continuar até à próxima tentativa agendada.
  const reconcilePendingAutoSyncs = async () => {
    for (const job of [...pendingAutoSyncs.current]) {
      const synced = await hasSyncedMatch(job.username, job.signature);
      if (synced) {
        clearTimeout(job.timerId);
        removePendingAutoSync(job.id);
      }
    }
  };
  // Aviso do campeão em jogo (Live Client Data) — mostra logo no início da
  // partida se já há ou não vitória com esse campeão, sem o jogador ter de
  // ir procurar manualmente na tab Coleção. null = sem aviso ativo.
  const [liveChampionAlert, setLiveChampionAlert] = useState(null);

  // Fechar o banner no "X" apenas o ESCONDE — os dados continuam aqui e a
  // atualizar-se, e o cabeçalho passa a mostrar um botão para o trazer de
  // volta (ver liveBannerHidden em App.jsx). Antes o "X" fazia
  // setLiveChampionAlert(null) e não havia forma nenhuma de o reabrir: o
  // aviso do campeão só é enviado uma vez por partida (ver
  // liveChampionAnnounced em electron/liveGame.js), por isso fechá-lo sem
  // querer significava ficar sem banner o resto do jogo.
  const [liveBannerHidden, setLiveBannerHidden] = useState(false);

  // Há mesmo uma partida a decorrer agora? É diferente de "há alerta": no fim
  // do jogo o alerta FICA (a mostrar o resultado e o lembrete para
  // sincronizar), mas a sessão já morreu. Sem esta distinção, o botão de
  // reabrir no cabeçalho continuava a pulsar "ao vivo" muito depois do jogo
  // ter acabado, até à partida seguinte.
  const [liveSessionActive, setLiveSessionActive] = useState(false);

  // Posição da caixa de aviso, só depois de o utilizador a arrastar pelo
  // menos uma vez — persistida, para não voltar sempre ao centro depois de
  // reiniciar a app. null = ainda na posição por omissão (centrada no topo).
  const [liveBannerPos, setLiveBannerPos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("live-banner-pos")) || null;
    } catch {
      return null;
    }
  });
  const liveBannerRef = useRef(null);
  const liveBannerDrag = useRef(null);
  // Marca que o último gesto foi um arrasto (não um clique) — o onClick do
  // banner lê isto para não navegar para a Coleção logo a seguir a mover a
  // caixa (largar o rato no fim de um arrasto também dispara "click").
  const liveBannerJustDragged = useRef(false);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);

  const handleLiveBannerPointerMove = (e) => {
    const d = liveBannerDrag.current;
    const el = liveBannerRef.current;
    if (!d || !el) return;

    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;

    // Mantém a caixa sempre dentro do ecrã, mesmo arrastando até à borda.
    const margin = 4;
    const maxLeft = Math.max(window.innerWidth - el.offsetWidth - margin, margin);
    const maxTop = Math.max(window.innerHeight - el.offsetHeight - margin, margin);
    const left = Math.min(Math.max(d.originLeft + dx, margin), maxLeft);
    const top = Math.min(Math.max(d.originTop + dy, margin), maxTop);

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.transform = "none";
  };

  const handleLiveBannerPointerUp = () => {
    const d = liveBannerDrag.current;
    window.removeEventListener("pointermove", handleLiveBannerPointerMove);
    window.removeEventListener("pointerup", handleLiveBannerPointerUp);
    setIsDraggingBanner(false);

    if (!d || !liveBannerRef.current) {
      liveBannerDrag.current = null;
      return;
    }

    liveBannerJustDragged.current = d.moved;

    if (d.moved) {
      const rect = liveBannerRef.current.getBoundingClientRect();
      const pos = { top: rect.top, left: rect.left };
      setLiveBannerPos(pos);
      localStorage.setItem("live-banner-pos", JSON.stringify(pos));
    }

    liveBannerDrag.current = null;
  };

  const handleLiveBannerPointerDown = (e) => {
    // Só o botão principal do rato inicia o arrasto (evita interferir com
    // clique direito ou outros botões).
    if (e.button !== 0 || !liveBannerRef.current) return;

    const rect = liveBannerRef.current.getBoundingClientRect();
    liveBannerDrag.current = {
      startX: e.clientX,
      startY: e.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      moved: false,
    };
    setIsDraggingBanner(true);

    window.addEventListener("pointermove", handleLiveBannerPointerMove);
    window.addEventListener("pointerup", handleLiveBannerPointerUp);
  };

  // Rede de segurança: se o componente desmontar a meio de um arrasto (ex:
  // fechar a app), garante que os listeners globais não ficam pendurados.
  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handleLiveBannerPointerMove);
      window.removeEventListener("pointerup", handleLiveBannerPointerUp);
    };
  }, []);

  // ================= LIVE CLIENT DATA (deteção automática de partidas) =================
  useEffect(() => {
    if (!window.electron?.onMatchResult) return;

    const unsubscribe = window.electron.onMatchResult(async (result) => {
      const {
        riotId,
        champion: liveChampionName,
        kills,
        deaths,
        assists,
        items,
        win: didWin,
        teamSize,
        cs,
        visionScore,
        champLevel,
        gameDuration,
        damageDealt,
        damageTaken,
        goldEarned,
        multikill,
        summoner1,
        summoner2,
        maxHp,
        killStreaks,
        assistStreaks,
      } = result || {};

      if (!liveChampionName) return;

      // a Live Client Data API devolve o nome de exibição do campeão (ex: "Miss Fortune"),
      // por isso convertemos para o id do Data Dragon usado no resto da app (ex: "MissFortune")
      const championId = champions.find(
        (c) => c.name.toLowerCase() === liveChampionName.toLowerCase()
      )?.id;

      if (!championId) {
        console.warn("Campeão não reconhecido na live client data:", liveChampionName);
        return;
      }

      const [baseName, detectedTag] = (riotId || "").split("#");
      let matchedUsername =
        accounts.find((a) => a.riotAccount?.toLowerCase() === baseName?.toLowerCase())
          ?.username || null;

      if (!matchedUsername && baseName) {
        matchedUsername = baseName;
        setAccounts((prev) => {
          if (prev.some((a) => a.username === matchedUsername)) return prev;
          const updated = [
            ...prev,
            { username: matchedUsername, riotAccount: baseName, riotTag: detectedTag || "", region: "europe" },
          ];
          localStorage.setItem("riot-accounts", JSON.stringify(updated));
          return updated;
        });
      }

      if (!matchedUsername) return;

      const extra = {
        cs,
        visionScore,
        champLevel,
        gameDuration,
        damageDealt,
        damageTaken,
        goldEarned,
        multikill,
        summoner1,
        summoner2,
        maxHp,
        killStreaks,
        assistStreaks,
      };

      await ensureUser(matchedUsername);
      if (didWin) await addWin(matchedUsername, championId);
      await addMatch(matchedUsername, championId, kills, deaths, assists, didWin, items, teamSize, extra);

      if (matchedUsername === activeAccount) {
        if (didWin) {
          setWins((prev) => (prev.includes(championId) ? prev : [...prev, championId]));
        }
        setMatches((prev) => [
          {
            champion: championId,
            kills,
            deaths,
            assists,
            win: !!didWin,
            items: items || [],
            placement: null,
            augments: null,
            team_size: teamSize ?? null,
            cs: cs ?? null,
            vision_score: visionScore ?? null,
            champ_level: champLevel ?? null,
            game_duration: gameDuration ?? null,
            damage_dealt: damageDealt ?? null,
            damage_taken: damageTaken ?? null,
            gold_earned: goldEarned ?? null,
            multikill: multikill ?? null,
            summoner1: summoner1 ?? null,
            summoner2: summoner2 ?? null,
            max_hp: maxHp ?? null,
            kill_streaks: killStreaks ?? null,
            assist_streaks: assistStreaks ?? null,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      } else if (!activeAccount) {
        localStorage.setItem("active-account", matchedUsername);
        setActiveAccount(matchedUsername);
      }

      // Sincronização automática — só agendamos para a conta ativa (é a
      // única que "syncActiveAccount" sabe sincronizar). Ver
      // scheduleAutoSync para o porquê de não distinguir Win/Lose aqui.
      if (matchedUsername === activeAccount && onAutoSync) {
        scheduleAutoSync(matchedUsername, {
          champion: championId,
          kills,
          deaths,
          assists,
          after: new Date().toISOString(),
        });
      }

      // A partida acabou — se o banner ainda estiver aberto para este
      // campeão, atualiza-o em vez de o deixar parado a dizer "a jogar"
      // depois do jogo já ter terminado. A Live Client Data só dá Vitória/
      // Derrota (1º lugar ou não); o lugar exato (2º-8º), dano, ouro e
      // augments só ficam disponíveis depois de sincronizar com a Riot API,
      // daí o aviso "sincroniza dentro de uns minutos" em baixo no banner.
      setLiveChampionAlert((prev) =>
        prev && prev.championId === championId
          ? { ...prev, gameEnded: true, gameWon: !!didWin }
          : prev
      );
    });

    return unsubscribe;
  }, [accounts, activeAccount, champions]);

  // ================= AVISO: CAMPEÃO EM JOGO (Live Client Data) =================
  // Dispara logo no início da partida (não espera pelo fim) para dizer de
  // imediato se já há vitória com o campeão detetado — ver
  // sendActiveChampion em electron.js. Também escolhe logo aqui uma frase de
  // "roast" (ver roasts.js) consoante o nº de vitórias já registadas com
  // esse campeão nesta conta — o nº de vitórias vem do histórico de
  // partidas (mais fiável do que a lista "wins", que só marca se há alguma
  // vitória, não quantas).
  useEffect(() => {
    if (!window.electron?.onActiveChampion) return;

    const unsubscribe = window.electron.onActiveChampion(({ champion: liveChampionName } = {}) => {
      if (!liveChampionName) return;

      const championId = champions.find(
        (c) => c.name.toLowerCase() === liveChampionName.toLowerCase()
      )?.id;

      if (!championId) return;

      const winCount = matches.filter(
        (m) => m.win && normalizeChampionId(m.champion, champions) === championId
      ).length;

      // Partida nova: o banner volta a aparecer mesmo que tenha sido
      // escondido na partida anterior.
      setLiveBannerHidden(false);
      setLiveSessionActive(true);
      setLiveChampionAlert({
        championId,
        hasWin: winCount > 0,
        roast: getRoast(championId, winCount, lang),
        kda: { kills: 0, deaths: 0, assists: 0 },
        items: [],
      });
    });

    return unsubscribe;
  }, [champions, matches, lang]);

  // ================= FIM DA SESSÃO (saiu do jogo / partida desapareceu) =================
  // Ver endLiveSession em electron/liveGame.js: chega quando a Live Client
  // Data deixa de responder. Sem isto o banner ficava eternamente a dizer
  // "a jogar" depois de sair do jogo.
  useEffect(() => {
    if (!window.electron?.onSessionEnded) return;

    const unsubscribe = window.electron.onSessionEnded(({ hadResult } = {}) => {
      // Aconteça o que acontecer ao banner, a sessão morreu — é isto que
      // apaga o "ao vivo" no botão do cabeçalho.
      setLiveSessionActive(false);

      // Com resultado (evento GameEnd): não se toca no banner — quem trata
      // disso é o onMatchResult, que o passa a "partida terminada" com o
      // resultado e o lembrete para sincronizar. Fechá-lo aqui roubava ao
      // jogador exatamente a informação que ele quer ver no fim.
      if (hadResult) return;

      // Sem resultado: saiu-se a meio, o jogo estoirou, ou nunca chegou a
      // haver partida a sério. Não há nada para mostrar — fora com ele.
      setLiveChampionAlert(null);
      setLiveBannerHidden(false);
    });

    return unsubscribe;
  }, []);

  // KDA + build atuais — chegam à parte (ver sendLiveStats em electron.js),
  // repetidos a cada poll (3 em 3s) enquanto a partida decorre, por isso só
  // atualizamos os campos que mudam em vez de recriar o alerta inteiro (o
  // que reiniciaria a animação de entrada do banner a cada poll). Não há
  // augments aqui: a Live Client Data API da Riot não os expõe durante a
  // partida — só ficam visíveis no Histórico/Estatísticas depois de a
  // partida terminar e sincronizar.
  useEffect(() => {
    if (!window.electron?.onLiveStats) return;

    const unsubscribe = window.electron.onLiveStats(({ kills, deaths, assists, items } = {}) => {
      setLiveChampionAlert((prev) =>
        prev
          ? {
              ...prev,
              kda: { kills: kills ?? 0, deaths: deaths ?? 0, assists: assists ?? 0 },
              items: items || [],
            }
          : prev
      );
    });

    return unsubscribe;
  }, []);

  return {
    liveChampionAlert,
    setLiveChampionAlert,
    liveBannerHidden,
    setLiveBannerHidden,
    liveSessionActive,
    liveBannerPos,
    liveBannerRef,
    liveBannerJustDragged,
    isDraggingBanner,
    handleLiveBannerPointerDown,
    reconcilePendingAutoSyncs,
  };
}
