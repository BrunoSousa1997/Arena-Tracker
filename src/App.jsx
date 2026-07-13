import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  getWins,
  addWin,
  ensureUser,
  addMatch,
  getMatches,
  getImportedMatchIds,
  addMatchesBulk,
  updateTeamSizeForIds,
  updateMatchDetails,
} from "./db/api";
import { motion, AnimatePresence } from "framer-motion";
import UpdateNotifier from "./UpdateNotifier";
import Overview from "./Overview";
import MatchHistory from "./MatchHistory";
import MatchReports from "./MatchReports";
import Achievements from "./Achievements";
import AccountManager from "./AccountManager";
import StatsBar from "./StatsBar";
import Tooltip from "./Tooltip";
import { loadAugments } from "./augments";
import { normalizeChampionId } from "./champions";
import { useLanguage, LANGUAGES } from "./i18n";
import { getRoast } from "./roasts";

export default function App() {
  const { t, lang, setLang } = useLanguage();

  const TABS = [
    { key: "overview", icon: "📊", label: t("tab_overview") },
    { key: "wins", icon: "🏆", label: t("tab_wins") },
    { key: "history", icon: "📜", label: t("tab_history") },
    { key: "stats", icon: "📈", label: t("tab_stats") },
    { key: "achievements", icon: "🎖️", label: t("tab_achievements") },
  ];

  // Formato (Todos/2v2/3v3) — agora ao lado das tabs, na mesma linha (ver
  // navRow), em vez de ter linha própria só para si. Label curta no botão,
  // texto completo (com nº de equipas) só no tooltip, para caber ao lado
  // das 5 tabs sem apertar demasiado.
  const FORMAT_OPTIONS = [
    { key: "all", label: t("format_all_short"), full: t("format_all") },
    { key: 2, label: t("format_2v2_short"), full: t("format_2v2") },
    { key: 3, label: t("format_3v3_short"), full: t("format_3v3") },
  ];

  const [patch, setPatch] = useState(null);
  const [champions, setChampions] = useState([]);
  const [augmentsMap, setAugmentsMap] = useState({});
  const [summonerSpellsMap, setSummonerSpellsMap] = useState({});
  const [itemsMap, setItemsMap] = useState({});

  // Campeão a destacar/abrir automaticamente nas Estatísticas quando se
  // clica num atalho da Visão Geral (ver goToChampionStats mais abaixo).
  const [statsHighlightChampion, setStatsHighlightChampion] = useState(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // cada conta: { username, riotAccount, riotTag }
  // "username" é só a etiqueta que vês na app; "riotAccount" (+ "riotTag") é
  // o Riot ID usado para sincronizar automaticamente com o League e para
  // importar histórico via Riot API.
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);

  // Sincronização com a Riot API para a conta ativa: null = inativo,
  // { status: "loading"|"done"|"error", message }
  const [syncStatus, setSyncStatus] = useState(null);

  const [wins, setWins] = useState([]);
  const [matches, setMatches] = useState([]);
  const [switching, setSwitching] = useState(false);

  // A Arena já teve formatos diferentes (8 equipas de 2 vs 6 equipas de 3) —
  // "top 3" e os baldes de lugar não significam o mesmo nos dois formatos,
  // por isso o resumo/estatísticas podem ser filtrados para um só formato.
  // "all" = sem filtro, 2 = equipas de 2 (8 equipas), 3 = equipas de 3 (6 equipas).
  const [teamSizeFilter, setTeamSizeFilter] = useState("all");

  const [showAccountManager, setShowAccountManager] = useState(false);
  const [view, setView] = useState("overview");

  // Aviso do campeão em jogo (Live Client Data) — mostra logo no início da
  // partida se já há ou não vitória com esse campeão, sem o jogador ter de
  // ir procurar manualmente na tab Coleção. null = sem aviso ativo.
  const [liveChampionAlert, setLiveChampionAlert] = useState(null);

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

  // Tema claro/escuro — persistido e aplicado via atributo data-theme na
  // tag <html> (ver index.css), para todos os componentes lerem as mesmas
  // variáveis CSS sem precisar de prop-drilling.
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Cabeçalho (marca/conta/sync + tabs + filtro + resumo) comprimido ou não —
  // um único interruptor para o bloco todo (persistido, tal como o tema),
  // em vez de cada secção ter o seu próprio botão de colapsar. Comprimir
  // nunca esconde dados: só reduz o espaçamento e passa o resumo para a
  // versão numa única linha (ver StatsBar).
  const [headerCompact, setHeaderCompact] = useState(
    () => localStorage.getItem("header-compact") === "1"
  );

  useEffect(() => {
    localStorage.setItem("header-compact", headerCompact ? "1" : "0");
  }, [headerCompact]);

  // ================= LOAD ACCOUNTS =================
  useEffect(() => {
    const saved = localStorage.getItem("riot-accounts");
    const active = localStorage.getItem("active-account");

    if (saved) {
      const parsed = JSON.parse(saved);
      // migração: versões antigas guardavam só strings, ou objetos sem riotTag
      const normalized = parsed.map((a) =>
        typeof a === "string"
          ? { username: a, riotAccount: a, riotTag: "", region: "europe" }
          : { riotTag: "", region: "europe", ...a }
      );
      setAccounts(normalized);

      if (normalized.length === 0) setShowAccountManager(true);
    } else {
      setShowAccountManager(true);
    }

    if (active) setActiveAccount(active);
  }, []);

  // ================= PATCH =================
  useEffect(() => {
    async function loadPatch() {
      const res = await fetch(
        "https://ddragon.leagueoflegends.com/api/versions.json"
      );
      const versions = await res.json();
      setPatch(versions[0]);
    }
    loadPatch();
  }, []);

  const DRAGON = patch
    ? `https://ddragon.leagueoflegends.com/cdn/${patch}`
    : null;

  // ================= CHAMPIONS =================
  useEffect(() => {
    if (!DRAGON) return;

    fetch(`${DRAGON}/data/en_US/champion.json`)
      .then((r) => r.json())
      .then((data) => {
        const champs = Object.values(data.data).map((c) => ({
          id: c.id,
          name: c.name,
          tags: c.tags,
        }));

        setChampions(champs);
      });
  }, [DRAGON]);

  // ================= AUGMENTS (nomes/ícones via Community Dragon) =================
  useEffect(() => {
    loadAugments().then(setAugmentsMap);
  }, []);

  // ================= FEITIÇOS DE INVOCADOR (ícones, para o Histórico) =================
  // Guardamos o nome do feitiço (ex: "Flash") tanto na Live Client Data
  // watcher como na importação via Riot API (ver electron.js), por isso o
  // mapa aqui só precisa de ir de nome -> ícone, sem lidar com ids.
  useEffect(() => {
    if (!DRAGON) return;

    fetch(`${DRAGON}/data/en_US/summoner.json`)
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        Object.values(data.data || {}).forEach((spell) => {
          map[spell.name] = `${DRAGON}/img/spell/${spell.image.full}`;
        });
        setSummonerSpellsMap(map);
      });
  }, [DRAGON]);

  // ================= ITENS (nomes, para tooltip no Histórico) =================
  useEffect(() => {
    if (!DRAGON) return;

    fetch(`${DRAGON}/data/en_US/item.json`)
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        Object.entries(data.data || {}).forEach(([id, item]) => {
          map[Number(id)] = item.name;
        });
        setItemsMap(map);
      });
  }, [DRAGON]);

  // ================= WINS + MATCHES =================
  useEffect(() => {
    if (!activeAccount) return;

    getWins(activeAccount).then((data) => {
      setWins(data || []);
    });

    getMatches(activeAccount).then((data) => {
      setMatches(data || []);
    });
  }, [activeAccount]);

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
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      } else if (!activeAccount) {
        localStorage.setItem("active-account", matchedUsername);
        setActiveAccount(matchedUsername);
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

  const goToChampionInCollection = (championId) => {
    const name = champions.find((c) => c.id === championId)?.name || "";
    setView("wins");
    setSearch(name);
    setLiveChampionAlert(null);
  };

  // Atalho usado pelos destaques da Visão Geral — abre logo a tab de
  // Estatísticas com a linha do campeão já expandida (ver highlightChampion
  // em MatchReports.jsx). Guardamos sempre um objeto NOVO (nunca só a
  // string do campeão) — mesmo clicando duas vezes seguidas no mesmo
  // campeão, cada clique tem de disparar o efeito de novo em MatchReports,
  // e comparar só pela string não fazia isso na 2ª vez (o valor não mudava,
  // logo o efeito nem corria). Isto também elimina a necessidade de um
  // callback "onHighlightHandled" a repor o valor a null — essa reposição,
  // se acontecesse cedo demais, cancelava o scroll pendente antes de ele
  // disparar (era essa a causa de "às vezes não leva ao campeão certo").
  const goToChampionStats = (championId, sortKey) => {
    setView("stats");
    setStatsHighlightChampion({
      champion: normalizeChampionId(championId, champions),
      key: Date.now(),
      sortKey,
    });
  };

  // ================= VERIFICAÇÃO RÁPIDA (atalho global) =================
  // A Live Client Data API não funciona durante a seleção de campeão (só
  // depois de a partida carregar — ver conversa), por isso a forma mais
  // rápida de confirmar se já há vitória com um dos campeões à escolha é
  // este atalho: Ctrl+Shift+A traz a app para a frente já na Coleção com a
  // busca em foco, mesmo com o League em primeiro plano.
  const searchInputRef = useRef(null);
  const [focusSearchToken, setFocusSearchToken] = useState(0);

  // Sombra no fundo da área de scroll — só um sinal visual de "há mais
  // conteúdo abaixo", desaparece quando já se chegou ao fim da lista.
  const mainScrollRef = useRef(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollShadow = () => {
    const el = mainScrollRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  };

  useEffect(() => {
    // O conteúdo muda de altura ao trocar de tab/conta — reavalia a sombra
    // depois do próximo render (o layout só fica pronto nesse momento).
    const t = setTimeout(updateScrollShadow, 50);
    return () => clearTimeout(t);
  }, [view, matches, activeAccount]);

  useEffect(() => {
    if (!window.electron?.onQuickCheckOpen) return;

    const unsubscribe = window.electron.onQuickCheckOpen(() => {
      setView("wins");
      setFocusSearchToken((t) => t + 1);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (focusSearchToken && view === "wins") {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }
  }, [focusSearchToken, view]);

  // ================= SEARCH DEBOUNCE =================
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
    }, 120);

    return () => clearTimeout(t);
  }, [search]);

  // ================= GESTÃO DE CONTAS =================
  const createAccountFromManager = async (username, riotAccountRaw, riotTagRaw, regionRaw) => {
    const riotAccount = riotAccountRaw || username;
    const riotTag = riotTagRaw || "";
    const region = regionRaw || "europe";

    const exists = accounts.some((a) => a.username === username);
    const updated = exists
      ? accounts
      : [...accounts, { username, riotAccount, riotTag, region }];

    setAccounts(updated);
    setActiveAccount(username);

    localStorage.setItem("riot-accounts", JSON.stringify(updated));
    localStorage.setItem("active-account", username);

    await ensureUser(username);
  };

  const updateRiotAccountFor = (username, { riotAccount, riotTag, region }) => {
    const updated = accounts.map((a) =>
      a.username === username
        ? {
            ...a,
            riotAccount: riotAccount?.trim() || username,
            riotTag: riotTag?.trim() || "",
            region: region || a.region || "europe",
          }
        : a
    );

    setAccounts(updated);
    localStorage.setItem("riot-accounts", JSON.stringify(updated));
  };

  const updateLastSyncFor = (username, timestamp) => {
    setAccounts((prev) => {
      const updated = prev.map((a) =>
        a.username === username ? { ...a, lastSyncAt: timestamp } : a
      );
      localStorage.setItem("riot-accounts", JSON.stringify(updated));
      return updated;
    });
  };

  // Sincroniza a conta ativa com a Riot API: vai buscar partidas de Arena
  // novas e grava-as automaticamente (sem pedir confirmação). Se já houve
  // uma sincronização antes, só pede à Riot partidas a partir dessa data —
  // muito mais leve do que voltar a pedir o histórico todo de cada vez, e
  // sem nenhum limite artificial do nosso lado (só o ritmo de pedidos que a
  // própria Riot API permite). Já não existe uma opção separada de
  // "sincronizar tudo" — em vez de voltar a pedir o histórico inteiro do
  // zero para recuperar partidas em falta, esta função encadeia sempre no
  // fim uma passagem por enrichHistory(), que corrige/completa só as
  // partidas já importadas que ficaram sem team_size ou sem os dados extra
  // (dano/ouro/CS/etc.) — muito mais leve e sem repetir trabalho.
  const syncActiveAccount = async () => {
    const account = accounts.find((a) => a.username === activeAccount);
    if (!account || !window.electron?.importRiotHistory) return;

    if (!account.riotTag) {
      setSyncStatus({
        status: "error",
        message: t("no_riot_tag").replace("{name}", account.username),
      });
      return;
    }

    setSyncStatus({
      status: "loading",
      message: t("syncing"),
    });

    try {
      const res = await window.electron.importRiotHistory({
        gameName: account.riotAccount,
        tagLine: account.riotTag,
        region: account.region || "europe",
        since: account.lastSyncAt || null,
      });

      if (!res.success) {
        const msg =
          res.error === "missing-api-key"
            ? t("missing_api_key")
            : res.error || t("unknown_error");
        setSyncStatus({ status: "error", message: msg });
        return;
      }

      const existingIds = await getImportedMatchIds(account.username);
      const normalized = res.matches.map((m) => ({
        ...m,
        champion: normalizeChampionId(m.champion, champions),
      }));
      const newMatches = normalized.filter((m) => !existingIds.has(m.matchId));

      const result = await addMatchesBulk(account.username, newMatches);

      if (!result.success) {
        setSyncStatus({
          status: "error",
          message: t("save_matches_error").replace("{error}", result.error),
        });
        return;
      }

      for (const m of newMatches) {
        if (m.win) await addWin(account.username, m.champion);
      }

      // Guardamos a data do jogo mais recente que a Riot API devolveu, não a
      // hora em que a sincronização correu — os jogos por vezes demoram
      // alguns minutos a aparecer na API depois de terminarem, e se
      // marcássemos "agora" como referência, um jogo ainda não propagado
      // nesse instante ficava para sempre fora do intervalo pedido na
      // próxima sincronização. Se não vier nenhuma partida, não avançamos a
      // data — fica tudo como estava.
      const latestGameTimestamp = res.matches.length
        ? Math.max(...res.matches.map((m) => m.gameEndTimestamp || 0))
        : null;

      if (latestGameTimestamp) {
        updateLastSyncFor(account.username, latestGameTimestamp);
      }

      if (account.username === activeAccount) {
        getWins(activeAccount).then((d) => setWins(d || []));
        getMatches(activeAccount).then((d) => setMatches(d || []));
      }

      setSyncStatus({
        status: "done",
        message:
          result.inserted > 0
            ? `${result.inserted} ${t("matches_imported")}`
            : t("already_up_to_date"),
      });

      setTimeout(() => setSyncStatus((prev) => (prev?.status === "done" ? null : prev)), 4000);

      // Encadeia a correção de partidas já importadas mas incompletas — fica
      // sem efeito nenhum (nem sequer muda o status na UI) quando não há
      // nada para corrigir, ver early-return no início de enrichHistory.
      await enrichHistory();
    } catch (err) {
      setSyncStatus({ status: "error", message: err?.message || String(err) });
    }
  };

  // Corrige/enriquece partidas antigas que já têm riot_match_id — e por
  // isso são sempre tratadas como "já importadas" (ver getImportedMatchIds
  // em db/api.js). Uma sincronização normal ou "Sincronizar tudo" NUNCA as
  // volta a tocar, mesmo que lhes faltem colunas que não existiam quando
  // foram importadas da primeira vez (team_size, e depois dano/ouro/CS/
  // vision score/etc.) — é por isso que sincronizar tudo não chega para
  // essas partidas aparecerem detalhadas no Histórico/Estatísticas.
  // Duas fases: 1) heurística local sem pedidos à Riot API (lugar 7º/8º só
  // existe no formato de 8 equipas, dá para saber o team_size sem API);
  // 2) para o resto, com riot_match_id, voltamos a consultar a Riot API e
  // fazemos UPDATE na linha já existente (nunca um INSERT novo).
  const enrichHistory = async () => {
    const account = accounts.find((a) => a.username === activeAccount);

    const missingTeamSize = matches.filter((m) => !m.team_size);
    // "participants" pode existir mas vir de uma versão mais antiga desta
    // funcionalidade, sem os campos de dano/ouro/cura por jogador (só
    // campeão/KDA/build/augments) — sem verificar isto, uma partida já
    // "enriquecida" uma vez nunca mais seria revisitada, mesmo depois de
    // adicionarmos novos dados a extrair (ver extractAllParticipants em
    // electron.js), e ficava para sempre incompleta no Histórico.
    const hasIncompleteParticipants = (m) =>
      Array.isArray(m.participants) && m.participants.length > 0 && m.participants[0].damageDealt === undefined;
    const missingDetails = matches.filter(
      (m) =>
        m.riot_match_id &&
        (m.damage_dealt == null ||
          m.healing == null ||
          m.participants == null ||
          m.double_kills == null ||
          m.triple_kills == null ||
          hasIncompleteParticipants(m))
    );

    const localFix = missingTeamSize.filter((m) => m.placement === 7 || m.placement === 8);
    const localFixIds = new Set(localFix.map((m) => m.id));

    const needsApiMap = new Map();
    missingTeamSize
      .filter((m) => !localFixIds.has(m.id) && m.riot_match_id)
      .forEach((m) => needsApiMap.set(m.id, m));
    missingDetails.forEach((m) => needsApiMap.set(m.id, m));
    const needsApi = [...needsApiMap.values()];

    const allAffectedIds = new Set([...missingTeamSize.map((m) => m.id), ...missingDetails.map((m) => m.id)]);

    if (!allAffectedIds.size) return;

    setSyncStatus({ status: "loading", message: t("enriching_history") });

    try {
      if (localFix.length) {
        await updateTeamSizeForIds(localFix.map((m) => m.id), 2);
      }

      let apiFixed = 0;
      if (needsApi.length) {
        if (!account?.riotTag) {
          setSyncStatus({
            status: "error",
            message: t("define_riot_tag_enrich").replace("{name}", account?.username),
          });
          return;
        }

        if (window.electron?.backfillMatchDetails) {
          const res = await window.electron.backfillMatchDetails({
            matchIds: needsApi.map((m) => m.riot_match_id),
            region: account?.region || "europe",
            gameName: account.riotAccount,
            tagLine: account.riotTag,
          });

          if (res.success) {
            const detailsByMatchId = new Map(res.results.map((r) => [r.matchId, r]));
            let dbError = null;
            for (const m of needsApi) {
              const details = detailsByMatchId.get(m.riot_match_id);
              if (!details) continue;
              // IMPORTANTE: só conta como corrigida se o UPDATE na Supabase
              // tiver mesmo sucesso — antes isto era contado sempre, mesmo
              // quando falhava (ex: coluna "participants" em falta na
              // tabela), fazendo a app dizer "N partidas enriquecidas"
              // quando na verdade nada tinha sido gravado, e a mesma partida
              // nunca mais era assinalada como precisando de correção.
              const result = await updateMatchDetails(m.id, details);
              if (result.success) {
                apiFixed += 1;
              } else if (!dbError) {
                dbError = result.error;
              }
            }
            if (dbError && apiFixed === 0) {
              setSyncStatus({
                status: "error",
                message: t("save_matches_error").replace("{error}", dbError),
              });
              return;
            }
          } else if (res.error === "missing-api-key") {
            setSyncStatus({ status: "error", message: t("missing_api_key") });
            return;
          }
        }
      }

      const totalFixed = localFix.length + apiFixed;
      const unresolved = allAffectedIds.size - totalFixed;

      getMatches(activeAccount).then((d) => setMatches(d || []));

      setSyncStatus({
        status: "done",
        message:
          totalFixed > 0
            ? `${totalFixed} ${t("matches_enriched")}` +
              (unresolved > 0 ? ` ${unresolved} ${t("not_enough_recovered")}` : "")
            : t("not_enough_data_at_all"),
      });

      setTimeout(() => setSyncStatus((prev) => (prev?.status === "done" ? null : prev)), 6000);
    } catch (err) {
      setSyncStatus({ status: "error", message: err?.message || String(err) });
    }
  };

  const deleteAccount = (username) => {
    const updated = accounts.filter((a) => a.username !== username);
    setAccounts(updated);
    localStorage.setItem("riot-accounts", JSON.stringify(updated));

    if (activeAccount === username) {
      setActiveAccount(null);
      setWins([]);
      setMatches([]);
      localStorage.removeItem("active-account");
    }
  };

  const switchAccount = async (name) => {
    setSwitching(true);

    await ensureUser(name);
    localStorage.setItem("active-account", name);

    setTimeout(() => {
      setActiveAccount(name);
      setSwitching(false);
      setShowAccountManager(false);
    }, 180);
  };

  const owned = useMemo(() => new Set(wins), [wins]);

  // ================= REPARAR VITÓRIAS (a partir do histórico já guardado) =================
  // A lista de vitórias (tab Coleção) fica guardada à parte do histórico de
  // partidas — se ficar dessincronizada por algum motivo (ex: um clique
  // indevido numa versão antiga da app que ainda permitia remover à mão),
  // uma sincronização normal NÃO chega para a corrigir: essa só importa
  // partidas NOVAS da Riot API e nunca volta a tocar numa partida já
  // importada (ver getImportedMatchIds). Isto em vez disso relê o histórico
  // que já está na BD e volta a marcar como "vitória" qualquer campeão com
  // pelo menos uma partida ganha registada mas que não conste na lista.
  const missingWinsChampions = useMemo(() => {
    const won = new Set();
    matches.forEach((m) => {
      if (m.win) won.add(normalizeChampionId(m.champion, champions));
    });
    return [...won].filter((c) => !owned.has(c));
  }, [matches, champions, owned]);

  const repairWins = async () => {
    if (!activeAccount || !missingWinsChampions.length) return;

    setSyncStatus({ status: "loading", message: t("repairing_wins") });

    try {
      for (const championId of missingWinsChampions) {
        await addWin(activeAccount, championId);
      }

      setWins((prev) => {
        const merged = new Set(prev);
        missingWinsChampions.forEach((c) => merged.add(c));
        return [...merged];
      });

      setSyncStatus({
        status: "done",
        message: `${missingWinsChampions.length} ${t("wins_repaired")}`,
      });

      setTimeout(() => setSyncStatus((prev) => (prev?.status === "done" ? null : prev)), 4000);
    } catch (err) {
      setSyncStatus({ status: "error", message: err?.message || String(err) });
    }
  };

  // ================= KDA POR CAMPEÃO (só vitórias, para o tooltip) =================
  const champStats = useMemo(() => {
    const map = {};

    matches
      .filter((m) => m.win)
      .forEach((rawMatch) => {
        const champion = normalizeChampionId(rawMatch.champion, champions);
        if (!map[champion]) {
          map[champion] = { games: 0, kills: 0, deaths: 0, assists: 0 };
        }
        map[champion].games += 1;
        map[champion].kills += rawMatch.kills || 0;
        map[champion].deaths += rawMatch.deaths || 0;
        map[champion].assists += rawMatch.assists || 0;
      });

    return map;
  }, [matches, champions]);

  // ================= FILTER =================
  const q = debouncedSearch.toLowerCase().trim();

  // Cartão de estado claro (tens ou não vitória) para CADA campeão que a
  // busca encontrar — antes só aparecia quando a busca apontava para um
  // único campeão exato, por isso uma busca mais genérica (ex: "vi", que
  // também apanha Viktor/Viego) escondia esse estado logo para todos,
  // incluindo o próprio Vi. Agora mostra sempre um cartão por cada
  // correspondência, sem depender de ser só uma.
  const searchedChampions = useMemo(() => {
    if (!q) return [];
    return champions
      .filter((c) => c.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [q, champions]);

  const filteredWins = useMemo(() => {
    return wins
      .filter((c) => q === "" || c.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b));
  }, [wins, debouncedSearch]);

  // ================= RESUMO FILTRADO POR FORMATO =================
  const statsMatches = useMemo(() => {
    if (teamSizeFilter === "all") return matches;
    return matches.filter((m) => m.team_size === teamSizeFilter);
  }, [matches, teamSizeFilter]);

  // Partidas que ainda podem ser enriquecidas: sem team_size, ou (já
  // importadas da Riot API mas) sem as estatísticas extra ao estilo op.gg
  // que só passámos a guardar mais tarde, incluindo partidas já
  // "enriquecidas" antes mas com "participants" de uma versão mais antiga
  // (sem dano/ouro/cura por jogador). Ver enrichHistory.
  const missingEnrichmentCount = useMemo(() => {
    const ids = new Set();
    matches.forEach((m) => {
      const incompleteParticipants =
        Array.isArray(m.participants) && m.participants.length > 0 && m.participants[0].damageDealt === undefined;
      if (!m.team_size) ids.add(m.id);
      else if (
        m.riot_match_id &&
        (m.damage_dealt == null ||
          m.healing == null ||
          m.participants == null ||
          m.double_kills == null ||
          m.triple_kills == null ||
          incompleteParticipants)
      )
        ids.add(m.id);
    });
    return ids.size;
  }, [matches]);

  const account = accounts.find((a) => a.username === activeAccount);
  const lastSyncLabel = account?.lastSyncAt
    ? new Date(account.lastSyncAt).toLocaleString(lang === "en" ? "en-GB" : "pt-PT", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : t("never");

  return (
    <div style={styles.app}>
      {/* Aurora mágica de fundo — duas manchas de luz (indigo + dourado) a
          derivar lentamente atrás de tudo (z-index negativo, ver
          styles.app com position:relative para isto ficar mesmo por trás
          do conteúdo em vez de por cima). Puramente decorativo, por isso
          aria-hidden e sem pointer events. */}
      <div style={styles.auroraBlob1} aria-hidden="true" />
      <div style={styles.auroraBlob2} aria-hidden="true" />

      <UpdateNotifier />

      <AnimatePresence>
        {liveChampionAlert && (
          <motion.div
            ref={liveBannerRef}
            // Só a opacidade é animada por aqui — nada de x/y/scale, porque
            // isso faria o framer-motion tomar conta do "transform" e entrar
            // em conflito com o transform que controlamos à mão durante o
            // arrasto (ver handleLiveBannerPointerMove).
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              ...styles.liveBanner,
              // Sem vitória ainda = a partida mais "importante" de seguir —
              // borda/sombra douradas para saltar mais à vista do que o caso
              // já coberto (que só precisa de confirmar, não de ação).
              ...(!liveChampionAlert.hasWin
                ? {
                    border: "1px solid rgba(250,204,21,0.55)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(250,204,21,0.15)",
                  }
                : {}),
              ...(liveBannerPos
                ? { top: liveBannerPos.top, left: liveBannerPos.left, transform: "none" }
                : {}),
              cursor: isDraggingBanner ? "grabbing" : "grab",
            }}
            onPointerDown={handleLiveBannerPointerDown}
            onClick={() => {
              // Largar o rato no fim de um arrasto também dispara "click" —
              // se o gesto moveu a caixa, ignora-se este clique em vez de
              // navegar para a Coleção sem se querer.
              if (liveBannerJustDragged.current) {
                liveBannerJustDragged.current = false;
                return;
              }
              goToChampionInCollection(liveChampionAlert.championId, liveChampionAlert.hasWin);
            }}
          >
            {DRAGON && (
              <img
                src={`${DRAGON}/img/champion/${liveChampionAlert.championId}.png`}
                style={styles.liveBannerIcon}
              />
            )}
            <div style={styles.liveBannerTextWrap}>
              <div style={styles.liveBannerTitle}>
                {!liveChampionAlert.gameEnded && !liveChampionAlert.hasWin && "🎯 "}
                {liveChampionAlert.gameEnded ? t("match_ended_with") : t("playing_now")}{" "}
                {champions.find((c) => c.id === liveChampionAlert.championId)?.name}
              </div>
              {/* Depois do "GameEnd" (ver onMatchResult acima), o status
                  passa a refletir o resultado desta partida (Vitória = 1º
                  lugar, Derrota = não-1º) em vez de continuar a dizer "a
                  jogar" com um jogo que já acabou. A Live Client Data não dá
                  o lugar exato (2º-8º) — só depois de sincronizar. */}
              <div
                style={{
                  ...styles.liveBannerStatus,
                  color: liveChampionAlert.gameEnded
                    ? liveChampionAlert.gameWon
                      ? "var(--place-good)"
                      : "var(--place-low)"
                    : liveChampionAlert.hasWin
                    ? "var(--place-good)"
                    : "var(--accent-text)",
                }}
              >
                {liveChampionAlert.gameEnded
                  ? liveChampionAlert.gameWon
                    ? t("game_ended_win")
                    : t("game_ended_lose")
                  : liveChampionAlert.hasWin
                  ? t("already_have_win")
                  : t("no_win_yet_luck")}
              </div>
              {liveChampionAlert.gameEnded && (
                <div style={styles.liveBannerSyncReminder}>{t("game_ended_sync_reminder")}</div>
              )}

              {/* KDA + build atuais (ver sendLiveStats em electron.js) — vêm da
                  Live Client Data API, atualizados a cada poll (3 em 3s)
                  enquanto a partida decorre. NÃO há augments aqui: essa API
                  não os expõe durante o jogo, só depois de sincronizar. */}
              {liveChampionAlert.kda && (
                <div style={styles.liveBannerKda}>
                  <span style={styles.liveBannerKdaLabel}>KDA</span>{" "}
                  <b>{liveChampionAlert.kda.kills}</b>/<b>{liveChampionAlert.kda.deaths}</b>/
                  <b>{liveChampionAlert.kda.assists}</b>
                </div>
              )}

              {liveChampionAlert.items?.some((it) => it.itemID) && (
                <div style={styles.liveBannerItemsRow}>
                  {liveChampionAlert.items
                    .filter((it) => it.itemID)
                    .map((it, idx) => (
                      <Tooltip key={idx} label={itemsMap?.[it.itemID] || `#${it.itemID}`}>
                        <img
                          src={`${DRAGON}/img/item/${it.itemID}.png`}
                          style={styles.liveBannerItemIcon}
                        />
                      </Tooltip>
                    ))}
                </div>
              )}

              {liveChampionAlert.roast && (
                <div style={styles.liveBannerRoast}>“{liveChampionAlert.roast}”</div>
              )}
            </div>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setLiveChampionAlert(null);
              }}
              style={styles.liveBannerClose}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          width: "100%",
          maxWidth: 1800,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {/* ================= HEADER (marca/conta/sync + tabs + filtro + resumo) =================
            As 4 peças que antes viviam em caixas soltas (cada uma com a sua
            própria margem/borda/sombra) passaram a viver dentro de um único
            "cartão" (headerShell) — visual mais moderno e organizado, e sem
            repetir a mesma borda/sombra 3-4 vezes seguidas. O botão de
            comprimir (no cluster de ícones) controla o bloco todo: reduz
            espaçamentos e passa o resumo para a versão numa só linha, mas
            nunca esconde tabs, filtro ou qualquer um dos números do resumo. */}
        <div
          style={{
            ...styles.headerShell,
            gap: headerCompact ? 4 : 8,
            padding: headerCompact ? "6px 14px 8px" : "10px 14px 12px",
          }}
        >
        <div style={styles.headerRow}>
          <div style={styles.topBarLeft}>
            <div style={styles.brandBox}>
              <img src="./logo.ico" style={styles.brandLogo} />
              <span style={styles.brandName}>Arena Tracker</span>
              <Tooltip label={t("riot_disclaimer")}>
                <span style={styles.infoIcon}>ⓘ</span>
              </Tooltip>
            </div>

            <div style={styles.topBarDivider} />

            <div style={styles.accountPill}>
              <span
                style={{
                  ...styles.accountDot,
                  background: activeAccount ? "var(--place-good)" : "var(--text-muted)",
                }}
              />
              <span style={styles.accountName}>{activeAccount || t("no_account")}</span>
            </div>
          </div>

          <div style={styles.topBarRight}>
            {activeAccount && (
              <div style={styles.syncBox}>
                <div style={styles.syncTopRow}>
                  {/* Legenda (último sync / status) agora à ESQUERDA do
                      botão em vez de numa linha própria por baixo — mesma
                      linha, só que o botão continua encostado ao cluster de
                      ícones à direita. Em modo comprimido esconde-se só esta
                      legenda quando não há nada a reportar — os dados gerais
                      (resumo/tabs/filtro) nunca são afetados por isto.
                      Erros/progresso continuam sempre visíveis. */}
                  {(!headerCompact || syncStatus?.status) && (
                    <div
                      style={{
                        ...styles.syncCaption,
                        color: syncStatus?.status === "error" ? "var(--place-low)" : "var(--text-muted)",
                      }}
                    >
                      {syncStatus?.status ? syncStatus.message : `${t("last_sync")}: ${lastSyncLabel}`}
                    </div>
                  )}
                  <div style={styles.syncBtnRow}>
                    <Tooltip label={t("sync_btn_tooltip")}>
                      <button
                        onClick={() => syncActiveAccount()}
                        style={styles.syncBtn}
                        disabled={syncStatus?.status === "loading"}
                      >
                        {syncStatus?.status === "loading" ? t("sync_btn_loading") : `⟲ ${t("sync_btn")}`}
                      </button>
                    </Tooltip>
                    {missingEnrichmentCount > 0 && (
                      <Tooltip
                        label={t("enrich_history_tooltip").replace("{count}", missingEnrichmentCount)}
                      >
                        <button
                          onClick={enrichHistory}
                          style={styles.syncAllBtn}
                          disabled={syncStatus?.status === "loading"}
                        >
                          {t("enrich_btn")} ({missingEnrichmentCount})
                        </button>
                      </Tooltip>
                    )}
                    {missingWinsChampions.length > 0 && (
                      <Tooltip
                        label={t("repair_wins_tooltip").replace("{count}", missingWinsChampions.length)}
                      >
                        <button
                          onClick={repairWins}
                          style={styles.syncAllBtn}
                          disabled={syncStatus?.status === "loading"}
                        >
                          {t("repair_wins_btn")} ({missingWinsChampions.length})
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
                {syncStatus?.status === "loading" && (
                  <div style={styles.syncProgressTrack}>
                    <div style={styles.syncProgressFill} />
                  </div>
                )}
              </div>
            )}

            {/* Cluster de ícones agrupados — visual mais moderno do que 3
                botões soltos, e reforça que são ações relacionadas
                (preferências) e não ações principais como o sync. */}
            <div style={styles.iconCluster}>
              <Tooltip label={t("language_label")}>
                <button
                  onClick={() => setLang((l) => (l === "pt" ? "en" : "pt"))}
                  style={styles.iconClusterBtn}
                >
                  {lang === "pt" ? "PT" : "EN"}
                </button>
              </Tooltip>
              <div style={styles.iconClusterDivider} />
              <Tooltip label={theme === "dark" ? t("theme_to_light") : t("theme_to_dark")}>
                <button
                  onClick={() => setTheme((th) => (th === "dark" ? "light" : "dark"))}
                  style={styles.iconClusterBtn}
                >
                  {theme === "dark" ? "☀" : "🌙"}
                </button>
              </Tooltip>
              <div style={styles.iconClusterDivider} />
              <Tooltip label={t("manage_accounts")}>
                <button onClick={() => setShowAccountManager(true)} style={styles.iconClusterBtn}>
                  ⚙
                </button>
              </Tooltip>
              <div style={styles.iconClusterDivider} />
              <Tooltip label={headerCompact ? t("stats_expand") : t("stats_collapse")}>
                <button
                  onClick={() => setHeaderCompact((c) => !c)}
                  style={styles.iconClusterBtn}
                >
                  {headerCompact ? "⌄" : "⌃"}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Tabs + filtro de formato na mesma "pill" — antes eram duas caixas
            lado a lado com um espaço vazio entre elas (parecia dois
            controlos soltos e desalinhados); agora é um único fundo/borda a
            toda a largura, com um divisor fino a separar os dois grupos, tal
            como o divisor marca/conta na topBar. Cada botão é relativo, e a
            opção ativa ganha um fundo próprio que "desliza" via layoutId
            partilhado do framer-motion, em vez de só trocar de cor
            instantaneamente. */}
        {activeAccount && (
          <div style={{ ...styles.navRow, padding: headerCompact ? 2 : 3 }}>
            <div style={styles.tabBar}>
              {TABS.map((tab) => {
                const isActive = view === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setView(tab.key)}
                    style={{
                      ...styles.tabBtn,
                      padding: headerCompact ? "4px 16px" : "6px 16px",
                      color: isActive ? "#ffffff" : "var(--text-secondary)",
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="tabIndicator"
                        style={styles.tabIndicator}
                        transition={{ type: "spring", stiffness: 480, damping: 34 }}
                      />
                    )}
                    <span style={styles.tabBtnLabel}>
                      <span style={styles.tabBtnIcon}>{tab.icon}</span>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={styles.navDivider} />

            <div style={styles.formatBar}>
              {FORMAT_OPTIONS.map((opt, i) => {
                const isActive = teamSizeFilter === opt.key;
                return (
                  <React.Fragment key={opt.key}>
                    {/* Divisória fina entre os 3 botões — antes só havia o
                        pequeno "gap", sem nada a separar visualmente cada
                        opção. */}
                    {i > 0 && <div style={styles.formatBtnDivider} />}
                    <Tooltip label={opt.full} style={styles.formatBtnWrap}>
                      <button
                        className="formatSegBtn"
                        onClick={() => setTeamSizeFilter(opt.key)}
                        style={{
                          ...styles.formatBtn,
                          padding: headerCompact ? "4px 10px" : "6px 10px",
                          color: isActive ? "#ffffff" : "var(--text-secondary)",
                        }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="formatIndicator"
                            style={styles.formatIndicator}
                            transition={{ type: "spring", stiffness: 480, damping: 34 }}
                          />
                        )}
                        <span style={styles.formatBtnLabel}>{opt.label}</span>
                      </button>
                    </Tooltip>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= RESUMO (sempre visível, todas as tabs) ================= */}
        {activeAccount && (
          <StatsBar
            matches={statsMatches}
            teamSizeFilter={teamSizeFilter}
            wins={wins}
            champions={champions}
            compact={headerCompact}
          />
        )}
        </div>

        {/* ================= MAIN ================= */}
        {/* Única zona da app com scroll vertical — evita que qualquer lista
            (histórico, estatísticas, etc.) fique cortada pelo overflow:hidden
            do ecrã principal. */}
        {activeAccount ? (
          <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
          <div
            ref={mainScrollRef}
            onScroll={updateScrollShadow}
            className="mainScroll"
            style={{
              opacity: switching ? 0 : 1,
              transform: switching
                ? "translateY(10px) scale(0.98)"
                : "translateY(0) scale(1)",
              transition: "all 0.18s ease",
              height: "100%",
              overflowY: "auto",
              overflowX: "hidden",
              paddingRight: 4,
              paddingBottom: 28,
            }}
          >
            {/* Transição entre tabs — a troca de conteúdo (Visão Geral,
                Coleção, etc.) já não é instantânea: "mode=wait" garante que
                a tab antiga desaparece antes da nova entrar, para não haver
                sobreposição nem saltos de altura a meio da animação. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
            {view === "overview" && (
              <Overview
                matches={statsMatches}
                wins={wins}
                champions={champions}
                DRAGON={DRAGON}
                onOpenChampionStats={goToChampionStats}
              />
            )}

            {view === "history" && (
              <MatchHistory
                matches={matches}
                champions={champions}
                DRAGON={DRAGON}
                augmentsMap={augmentsMap}
                summonerSpellsMap={summonerSpellsMap}
                itemsMap={itemsMap}
                theme={theme}
                riotAccountName={
                  accounts.find((a) => a.username === activeAccount)?.riotAccount ||
                  activeAccount
                }
              />
            )}

            {view === "stats" && (
              <MatchReports
                matches={statsMatches}
                champions={champions}
                DRAGON={DRAGON}
                augmentsMap={augmentsMap}
                itemsMap={itemsMap}
                highlightChampion={statsHighlightChampion}
              />
            )}

            {view === "achievements" && (
              <Achievements
                matches={matches}
                champions={champions}
                wins={wins}
                DRAGON={DRAGON}
              />
            )}

            {view === "wins" && (
              <>
                <div style={styles.globalSearch}>
                  <span>🔎</span>
                  <input
                    ref={searchInputRef}
                    placeholder={t("search_placeholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={styles.globalSearchInput}
                  />
                  <Tooltip label={t("shortcut_tooltip")}>
                    <span style={styles.shortcutHint}>
                      Ctrl+Shift+A
                    </span>
                  </Tooltip>
                </div>

                {searchedChampions.length > 0 && (
                  <div style={styles.quickCheckList}>
                    {searchedChampions.map((champ) => (
                      <div key={champ.id} style={styles.quickCheck}>
                        {DRAGON && (
                          <img
                            src={`${DRAGON}/img/champion/${champ.id}.png`}
                            style={styles.quickCheckIcon}
                          />
                        )}
                        <div style={styles.quickCheckInfo}>
                          <div style={styles.quickCheckName}>{champ.name}</div>
                          {owned.has(champ.id) ? (
                            <div style={{ ...styles.quickCheckStatus, color: "var(--place-good)" }}>
                              {t("already_have_win")}
                            </div>
                          ) : (
                            <div style={{ ...styles.quickCheckStatus, color: "var(--accent-text)" }}>
                              {t("no_win_yet")}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={styles.cardScroll}>
                  <h2 style={styles.sectionTitle}>{t("your_victories")}</h2>
                  <div style={styles.grid} className="scrollArea">
                    <AnimatePresence>
                      {filteredWins.map((champ) => {
                        const stat = champStats[champ];
                        const tooltip = stat
                          ? `${stat.games} ${t("wins_count_kda")} ${(stat.kills / stat.games).toFixed(1)}/${(stat.deaths / stat.games).toFixed(1)}/${(stat.assists / stat.games).toFixed(1)}`
                          : t("no_kda_data_yet");

                        return (
                          <Tooltip key={champ} label={tooltip}>
                            <motion.div
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.7 }}
                              transition={{ duration: 0.08 }}
                              style={styles.winCard}
                            >
                              <img src={`${DRAGON}/img/champion/${champ}.png`} style={styles.icon} />
                            </motion.div>
                          </Tooltip>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </>
            )}
              </motion.div>
            </AnimatePresence>
          </div>
          <div
            style={{
              ...styles.scrollShadow,
              opacity: canScrollDown ? 1 : 0,
            }}
          />
          </div>
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyStateTitle}>{t("no_active_account")}</div>
            <div style={styles.emptyStateText}>
              {t("no_active_account_text")}
            </div>
            <button onClick={() => setShowAccountManager(true)} style={styles.primaryBtn}>
              {t("manage_accounts")}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAccountManager && (
          <AccountManager
            accounts={accounts}
            activeAccount={activeAccount}
            onClose={() => setShowAccountManager(false)}
            onSwitch={switchAccount}
            onCreate={createAccountFromManager}
            onUpdateRiotAccount={updateRiotAccountFor}
            onDelete={deleteAccount}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  // Sinal visual de "há mais conteúdo abaixo" — só aparece quando a lista
  // ainda não chegou ao fim (ver canScrollDown/updateScrollShadow).
  scrollShadow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 4,
    height: 36,
    background: "linear-gradient(to bottom, transparent, var(--bg-deep))",
    pointerEvents: "none",
    transition: "opacity 0.15s ease",
  },

  app: {
    position: "relative",
    height: "100vh",
    width: "100vw",
    overflowX: "hidden",
    overflowY: "hidden",
    color: "var(--text-body)",
    paddingTop: "32px",
    fontFamily: "Cinzel, serif",
    display: "flex",
    justifyContent: "center",
    boxSizing: "border-box",
    backgroundImage:
      "repeating-linear-gradient(135deg, rgba(var(--accent-rgb),0.035) 0px, rgba(var(--accent-rgb),0.035) 1px, transparent 1px, transparent 26px), " +
      "linear-gradient(180deg, var(--bg-deep), var(--bg-mid) 55%, var(--bg-deep))",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    overflow: "hidden",
  },

  // Duas manchas de luz animadas (ver keyframes auroraBlob1/auroraBlob2 em
  // index.css) — substituem os dois brilhos estáticos que existiam antes
  // dentro do backgroundImage acima, agora com movimento visível e cores
  // mais vivas (indigo + dourado, a mesma dupla de cores já usada no resto
  // da app: accent e destaque "build vencedora"). z-index:-1 + "app" com
  // position:relative garante que isto fica sempre por trás de todo o
  // conteúdo real, nunca por cima.
  auroraBlob1: {
    position: "absolute",
    zIndex: -1,
    top: "-15%",
    left: "-10%",
    width: "60vw",
    height: "60vw",
    maxWidth: 620,
    maxHeight: 620,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.5), transparent 70%)",
    pointerEvents: "none",
    animation: "auroraBlob1 16s ease-in-out infinite",
  },

  auroraBlob2: {
    position: "absolute",
    zIndex: -1,
    top: "20%",
    right: "-15%",
    width: "50vw",
    height: "50vw",
    maxWidth: 560,
    maxHeight: 560,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(250,204,21,0.38), transparent 70%)",
    pointerEvents: "none",
    animation: "auroraBlob2 20s ease-in-out infinite",
  },

  liveBanner: {
    position: "fixed",
    top: 38,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 99996,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 14px",
    borderRadius: 12,
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.98), rgba(var(--panel-deep-rgb),0.99))",
    border: "1px solid rgba(var(--accent-rgb),0.4)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    cursor: "pointer",
    fontFamily: "Cinzel, serif",
  },

  liveBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    pointerEvents: "none",
  },

  liveBannerTitle: {
    fontSize: 12,
    color: "var(--text-body)",
    fontWeight: 600,
  },

  liveBannerStatus: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 1,
  },

  // Aviso discreto (ver game_ended_sync_reminder) — só aparece depois do
  // "GameEnd", a lembrar que o lugar exato/dano/ouro/augments só chegam
  // depois de uma sincronização, não logo que a partida termina.
  liveBannerSyncReminder: {
    fontSize: 10.5,
    color: "var(--text-muted)",
    marginTop: 3,
    lineHeight: 1.3,
  },

  liveBannerTextWrap: {
    maxWidth: 300,
  },

  liveBannerKda: {
    fontSize: 12,
    color: "var(--text-body)",
    marginTop: 4,
  },

  liveBannerKdaLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--text-muted)",
    letterSpacing: 0.3,
  },

  liveBannerItemsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 3,
    marginTop: 4,
  },

  liveBannerItemIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    border: "1px solid rgba(var(--border-rgb),0.4)",
    pointerEvents: "none",
  },

  // Frase de "roast" (ver roasts.js) — é a parte divertida do banner, por
  // isso ganha destaque próprio (chip com fundo/contorno, negrito) em vez de
  // ser só um itálico discreto por baixo do status.
  liveBannerRoast: {
    display: "inline-block",
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: 700,
    color: "var(--text-body)",
    marginTop: 5,
    lineHeight: 1.35,
    padding: "3px 8px",
    borderRadius: 7,
    background: "rgba(var(--accent-rgb),0.16)",
    border: "1px solid rgba(var(--accent-rgb),0.32)",
  },

  liveBannerClose: {
    marginLeft: 6,
    width: 22,
    height: 22,
    borderRadius: 6,
    border: "none",
    background: "rgba(var(--soft-rgb),0.08)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 11,
  },

  // Antes a marca vivia num bloco próprio, centrado e acima da topBar (logo
  // grande + aviso legal sempre visível) — ocupava bastante altura logo no
  // topo, antes de qualquer conteúdo real. Passou a viver dentro da própria
  // topBar (logo pequeno + nome), com o aviso legal escondido atrás de um
  // ícone "ⓘ" (tooltip), sem perder a informação mas sem consumir espaço.
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  brandBox: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },

  brandLogo: {
    height: 28,
    width: 28,
    borderRadius: 6,
  },

  brandName: {
    color: "var(--accent-text)",
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: "nowrap",
  },

  infoIcon: {
    fontSize: 13,
    color: "var(--text-muted)",
    cursor: "help",
  },

  // Pill única que junta as tabs e o filtro de formato — antes eram duas
  // caixas soltas lado a lado (cada uma com o seu fundo/borda), o que dava
  // um ar desconexo e desequilibrado. Agora só esta linha tem fundo/borda;
  // tabBar e formatBar são apenas grupos de botões lá dentro, separados por
  // um divisor fino (ver navDivider) — a mesma "pill" contínua de ponta a
  // ponta, tal como a barra de tabs tinha antes.
  navRow: {
    display: "flex",
    alignItems: "stretch",
    width: "100%",
    borderRadius: 13,
    background: "rgba(var(--panel-deep-rgb),0.5)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  tabBar: {
    display: "flex",
    flex: 1,
    gap: 4,
  },

  navDivider: {
    width: 1,
    alignSelf: "stretch",
    margin: "2px 6px",
    background: "rgba(var(--border-rgb),0.5)",
  },

  // Mesmo "segmented control" da barra de tabs, só que mais estreito (3
  // opções curtas — Todos/2v2/3v3 — em vez de 5 tabs com texto). Largura
  // fixa para não competir por espaço com as tabs à medida que a janela
  // muda de tamanho.
  formatBar: {
    display: "flex",
    flexShrink: 0,
    width: 176,
    gap: 4,
  },

  // O Tooltip embrulha cada botão num <span display:inline-flex> — sem isto,
  // esse wrapper fica só do tamanho do conteúdo (flex:0 1 auto por omissão)
  // e o "flex:1" do próprio botão não tem efeito nenhum, porque quem é
  // esticado pelo formatBar é o wrapper, não o botão lá dentro. Resultado:
  // os 3 botões ficavam encolhidos à esquerda, com espaço vazio à direita.
  formatBtnWrap: {
    flex: 1,
    display: "flex",
  },

  // Divisória fina entre os 3 botões (Todos/2v2/3v3) — antes só havia o
  // "gap" do formatBar, sem nada a separar visualmente cada opção.
  formatBtnDivider: {
    width: 1,
    alignSelf: "stretch",
    background: "rgba(var(--border-rgb),0.35)",
  },

  // ".formatSegBtn:hover" (ver index.css) dá um fundo visível ao passar o
  // rato — o filtro global "button:hover { filter: brightness(1.16) }" quase
  // não se nota aqui porque o fundo destes botões é transparente.
  formatBtn: {
    position: "relative",
    flex: 1,
    display: "flex",
    justifyContent: "center",
    padding: "6px 10px",
    borderRadius: 9,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 700,
    transition: "color 0.15s ease, background-color 0.15s ease",
  },

  formatIndicator: {
    position: "absolute",
    inset: 0,
    borderRadius: 8,
    background: "linear-gradient(135deg, #a855f7, #7c3aed)",
    boxShadow: "0 3px 12px rgba(79,70,229,0.45)",
    zIndex: 0,
  },

  formatBtnLabel: {
    position: "relative",
    zIndex: 1,
    whiteSpace: "nowrap",
  },

  // Cada botão é "position: relative" para o indicador (absolute, atrás do
  // texto) poder deslizar de uma tab para a outra sem afetar o layout —
  // ver tabIndicator, animado via layoutId partilhado no framer-motion.
  // "flex: 1" espalha as tabs pela largura toda do contentor, em vez de
  // ficarem encostadas à esquerda com espaço vazio à direita.
  tabBtn: {
    position: "relative",
    flex: 1,
    display: "flex",
    justifyContent: "center",
    padding: "6px 16px",
    borderRadius: 9,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 700,
    transition: "color 0.15s ease",
  },

  tabIndicator: {
    position: "absolute",
    inset: 0,
    borderRadius: 10,
    background: "linear-gradient(135deg, #a855f7, #7c3aed)",
    boxShadow: "0 3px 12px rgba(79,70,229,0.45)",
    zIndex: 0,
  },

  tabBtnLabel: {
    position: "relative",
    zIndex: 1,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  },

  tabBtnIcon: {
    fontSize: 13,
    lineHeight: 1,
  },

  title: { color: "var(--accent-text)", fontSize: 34 },

  // Cartão único do cabeçalho — marca/conta/sync, tabs, filtro e resumo
  // vivem todos aqui dentro (ver App.jsx), em vez de 3-4 caixas soltas cada
  // uma com a sua própria margem/borda/sombra repetida. "gap" faz o ritmo
  // vertical entre secções; cada secção interior (headerRow/tabBar/StatsBar)
  // já não precisa da sua própria margem de topo.
  headerShell: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 8,
    padding: "10px 14px 12px",
    borderRadius: 16,
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.95), rgba(var(--panel-deep-rgb),0.97))",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 6px 18px rgba(0,0,0,0.18)",
  },

  // Linha de topo (marca/conta à esquerda, sync/preferências à direita) —
  // já sem fundo/borda própria, porque agora vive dentro do headerShell.
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  topBarDivider: {
    width: 1,
    alignSelf: "stretch",
    background: "rgba(var(--border-rgb),0.5)",
  },

  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  accountPill: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "5px 12px 5px 9px",
    borderRadius: 20,
    background: "rgba(var(--soft-rgb),0.06)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  accountDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    flexShrink: 0,
  },

  accountName: { color: "var(--accent-text)", fontWeight: 600, fontSize: 13 },

  // Sem "marginTop" — já não fica numa linha própria por baixo do botão,
  // vive ao lado dele agora (ver syncTopRow). "whiteSpace: nowrap" evita que
  // quebre a meio e desalinhe a linha com o botão.
  syncCaption: { fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" },

  // Cluster único (3 botões visualmente unidos, com divisores finos) em vez
  // de 3 cartões soltos com espaço entre eles — sinaliza que são um grupo
  // de preferências, não ações independentes.
  iconCluster: {
    display: "flex",
    alignItems: "stretch",
    borderRadius: 10,
    border: "1px solid rgba(var(--accent-rgb),0.25)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    overflow: "hidden",
  },

  iconClusterBtn: {
    padding: "6px 11px",
    border: "none",
    background: "transparent",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 12,
    transition: "background 0.15s ease",
  },

  iconClusterDivider: {
    width: 1,
    background: "rgba(var(--border-rgb),0.4)",
  },

  syncBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
  },

  // Legenda (último sync/status) + botões na mesma linha — antes a legenda
  // vivia numa linha própria por baixo do botão (ver syncCaption).
  syncTopRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  syncBtnRow: { display: "flex", gap: 6 },

  syncBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(var(--accent-rgb),0.25)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    transition: "all 0.15s ease",
  },

  syncAllBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(var(--soft-rgb),0.15)",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 11,
    transition: "all 0.15s ease",
  },

  syncProgressTrack: {
    width: 140,
    height: 4,
    borderRadius: 4,
    overflow: "hidden",
    background: "rgba(var(--accent-rgb),0.15)",
    marginTop: 2,
  },

  syncProgressFill: {
    height: "100%",
    width: "30%",
    borderRadius: 4,
    background: "#7c3aed",
    animation: "growSyncBar 1.2s ease-in-out infinite",
  },

  cardScroll: {
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.92), rgba(var(--panel-deep-rgb),0.96))",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    display: "flex",
    flexDirection: "column",
  },

  sectionTitle: { marginBottom: 12, color: "var(--accent-text)" },

  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#7c3aed",
    color: "#ffffff",
    cursor: "pointer",
  },

  globalSearch: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--accent-rgb),0.25)",
    marginTop: 12,
    marginBottom: 16,
  },

  globalSearchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--text-body)",
  },

  shortcutHint: {
    fontSize: 10,
    color: "var(--text-muted)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    borderRadius: 6,
    padding: "2px 6px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  // Envolve um cartão de estado por cada campeão que a busca encontrar —
  // antes só existia um cartão (só aparecia com uma correspondência exata),
  // agora é uma lista para buscas mais genéricas (ex: "vi") continuarem a
  // mostrar o estado de cada campeão apanhado, incluindo o que se procurava.
  quickCheckList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 16,
  },

  quickCheck: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    borderRadius: 12,
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.92), rgba(var(--panel-deep-rgb),0.96))",
    border: "1px solid rgba(var(--accent-rgb),0.4)",
  },

  quickCheckIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    pointerEvents: "none",
  },

  quickCheckInfo: {
    flex: 1,
  },

  quickCheckName: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text-body)",
  },

  quickCheckStatus: {
    fontSize: 12,
    fontWeight: 600,
    marginTop: 1,
  },

  grid: {
    padding: "3px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(54px, 1fr))",
    gap: 10,
    marginTop: 12,
    maxHeight: "26vh",
  },

  winCard: {
    borderRadius: 12,
    padding: 3,
    border: "1px solid rgba(var(--accent-rgb),0.4)",
    background: "rgba(var(--accent-rgb),0.12)",
  },

  icon: { width: 48, height: 48, borderRadius: 10, pointerEvents: "none" },

  emptyState: {
    marginTop: 40,
    padding: 30,
    borderRadius: 16,
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.92), rgba(var(--panel-deep-rgb),0.96))",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },

  emptyStateTitle: { fontSize: 18, color: "var(--accent-text)", fontWeight: 700 },

  emptyStateText: { fontSize: 13, color: "var(--text-secondary)", maxWidth: 420 },
};
