import { useEffect, useState, useMemo, useRef } from "react";
import { addWin, respondToInvite, joinRoom } from "./db/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  LayoutGrid,
  History,
  ChartColumn,
  Award,
  Info,
  Settings as SettingsIcon,
  X,
  RotateCw,
  Scale,
  Swords,
  Sparkles,
  Crosshair,
} from "lucide-react";
import UpdateNotifier from "./components/UpdateNotifier";
import Loading from "./components/Loading";
import Facets from "./components/Facets";
import Overview from "./views/Overview";
import MatchHistory from "./views/MatchHistory";
import MatchReports from "./views/MatchReports";
import Augments from "./views/Augments";
import InGame from "./views/InGame";
import Welcome from "./components/Welcome";
import TabTour from "./components/TabTour";
import HowItWorks from "./components/HowItWorks";
import Achievements from "./views/Achievements";
import Compare from "./views/Compare";
import Challenges from "./views/Challenges";
import Settings from "./views/Settings";
import StatsBar from "./components/StatsBar";
import Tooltip from "./components/Tooltip";
import ConfirmDialog from "./components/ConfirmDialog";
import NotificationBell from "./components/NotificationBell";
import QuickCheck from "./components/QuickCheck";
import AchievementToasts from "./components/AchievementToasts";
import { COVERAGE_TIERS } from "./lib/achievementStats";
import { championMatchesTerm, normalizeChampionId, parseSearchTerms } from "./lib/champions";
import { useLanguage } from "./lib/i18n";
import { useStaticData } from "./hooks/useStaticData";
import { useTheme } from "./hooks/useTheme";
import { useAccounts } from "./hooks/useAccounts";
import { useLiveGame } from "./hooks/useLiveGame";
import { useRiotSync } from "./hooks/useRiotSync";
import { useNotifications } from "./hooks/useNotifications";
import { useIconPrefetch } from "./hooks/useIconPrefetch";
import { canShowIcons, championIcon, itemIcon } from "./lib/icons";

// Marcas de "isto já foi mostrado uma vez" (ver PRIMEIRA UTILIZAÇÃO). Ficam
// em localStorage e não na Supabase de propósito: descrevem o que ESTE
// computador já mostrou a quem está sentado à frente dele, não um dado da
// conta — quem instala a app noutro sítio merece a apresentação de novo.
const WELCOME_SEEN_KEY = "onboarding-welcome-seen";
const TOUR_SEEN_KEY = "onboarding-tour-seen";

// Há quanto tempo, curto. O azulejo é pequeno e o tooltip estreito; uma data
// completa por campeão roubava a linha toda ao que interessa.
function haQuantoTempo(ms, lang) {
  const dias = Math.floor((Date.now() - ms) / 86400000);
  if (dias <= 0) return lang === "en" ? "today" : "hoje";
  if (dias === 1) return lang === "en" ? "yesterday" : "ontem";
  if (dias < 30) return lang === "en" ? `${dias}d ago` : `há ${dias}d`;
  const meses = Math.floor(dias / 30);
  return lang === "en" ? `${meses}mo ago` : `há ${meses}m`;
}

// A cor do distintivo de melhor colocação na grelha "sem vitória". É a régua
// que torna a fila legível de longe: antes de se ler o número já se vê se
// aquele azulejo é um quase-troféu ou um "ainda vai longe".
//
//   2º        verde   — faltou um lugar
//   3º        lima    — pódio, ainda assim
//   4º e 5º   laranja — meio da tabela, o mesmo laranja do resto da app
//   6º ou pior cinza  — jogado, longe
//
// Os tokens são os --place-* que a app já usa para colocações em todo o lado
// (ver index.css), por isso isto não inventa cores novas: diz a mesma coisa
// que o resto da app diz com as mesmas cores.
function corDoLugar(lugar) {
  if (lugar <= 2) return "var(--place-good)";
  if (lugar === 3) return "color-mix(in srgb, var(--place-good) 55%, var(--place-mid))";
  if (lugar <= 5) return "var(--place-mid)";
  return "var(--place-unknown)";
}

// O conteúdo do tooltip de cada campeão da Coleção. Era uma linha de texto
// ("nome — 3 partidas 7.2/4.1/9.0"); passa a um bloco com o estado em
// destaque e os números em pares, porque o azulejo não mostra nada e este é
// o único sítio onde a app diz o que se fez com aquele campeão.
//
// Muda com o ESTADO, em vez de mostrar sempre os mesmos campos vazios: quem
// nunca jogou não tem números para ver, e quem jogou sem ganhar quer saber
// quantas vezes tentou e quão perto chegou — não um KDA de vitórias que não
// existem.
function ChampionTooltip({ name, stats, hasWin, tried, lang, t }) {
  const estado = hasWin
    ? { texto: t("collection_tt_in"), cor: "var(--place-good)" }
    : tried
    ? { texto: t("collection_tt_no_win"), cor: "var(--place-mid)" }
    : { texto: t("collection_tt_untouched"), cor: "var(--text-muted)" };

  const linhas = [];
  if (stats) {
    const pct = (n) => Math.round((n / stats.games) * 100);
    linhas.push([t("collection_tt_games"), String(stats.games)]);
    linhas.push([t("collection_tt_first"), `${stats.wins} (${pct(stats.wins)}%)`]);
    linhas.push([t("collection_tt_top3"), `${stats.top3} (${pct(stats.top3)}%)`]);
    if (stats.placementCount > 0) {
      linhas.push([
        t("collection_tt_avg"),
        `${(stats.placementSum / stats.placementCount).toFixed(1)}º`,
      ]);
      linhas.push([t("collection_tt_best"), `${stats.best}º`]);
    }
    linhas.push([
      t("collection_tt_kda"),
      `${(stats.kills / stats.games).toFixed(1)} / ${(stats.deaths / stats.games).toFixed(1)} / ${(stats.assists / stats.games).toFixed(1)}`,
    ]);
    if (stats.last) linhas.push([t("collection_tt_last"), haQuantoTempo(stats.last, lang)]);
  }

  return (
    <span style={ttStyles.wrap}>
      <span style={ttStyles.head}>
        <span style={ttStyles.name}>{name}</span>
        <span style={{ ...ttStyles.estado, color: estado.cor }}>{estado.texto}</span>
      </span>

      {linhas.length > 0 ? (
        <span style={ttStyles.grid}>
          {linhas.map(([rotulo, valor]) => (
            <span key={rotulo} style={ttStyles.linha}>
              <span style={ttStyles.rotulo}>{rotulo}</span>
              <span style={ttStyles.valor}>{valor}</span>
            </span>
          ))}
        </span>
      ) : (
        <span style={ttStyles.vazio}>{t("collection_tt_never")}</span>
      )}

      {/* O estado da coleção vem da tabela de vitórias, que pode ficar atrás
          do histórico — a app tem um "Reparar vitórias" nas Definições
          justamente para isso. Quando as duas discordam, mais vale dizê-lo:
          "sem vitória" ao lado de "1º lugar: 3" sozinho lê-se como erro. */}
      {!hasWin && stats?.wins > 0 && (
        <span style={ttStyles.aviso}>{t("collection_tt_drift")}</span>
      )}
    </span>
  );
}

// Estilos do tooltip à parte do objeto "styles" do App: este componente vive
// fora dele e puxar por lá obrigava a passá-lo como argumento.
const ttStyles = {
  wrap: { display: "flex", flexDirection: "column", gap: 6, minWidth: 170 },

  head: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },

  name: { fontSize: 12.5, fontWeight: 800, color: "var(--text-body)" },

  estado: {
    fontSize: 9.5,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    whiteSpace: "nowrap",
  },

  grid: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    paddingTop: 5,
    borderTop: "1px solid rgba(var(--border-rgb),0.4)",
  },

  linha: { display: "flex", justifyContent: "space-between", gap: 14 },

  rotulo: { color: "var(--text-muted)", fontWeight: 600 },

  valor: { color: "var(--text-body)", fontWeight: 700, whiteSpace: "nowrap" },

  vazio: { color: "var(--text-muted)", fontWeight: 600 },

  aviso: {
    paddingTop: 5,
    borderTop: "1px solid rgba(var(--border-rgb),0.4)",
    color: "var(--place-mid)",
    fontWeight: 600,
  },
};

export default function App() {
  const { t, lang, setLang } = useLanguage();

  // Ícones escolhidos para cada tab dizer o que é sem depender da etiqueta, e
  // para nenhum par se confundir entre si:
  //  - as espadas passaram de Comparar para Desafios, que é onde um duelo
  //    entre pessoas faz sentido; Comparar fica com a balança, que é o
  //    símbolo universal de pôr duas coisas lado a lado;
  //  - a Coleção tinha um troféu e as Conquistas um louro — dois prémios
  //    quase iguais a dois botões de distância. A Coleção é uma grelha de
  //    campeões a preencher, por isso fica com a grelha, e o prémio passa a
  //    ser só das Conquistas;
  //  - o Histórico troca o pergaminho pelo relógio (é uma lista cronológica,
  //    não um texto) e as Estatísticas trocam a seta de tendência pelas
  //    barras (é uma tabela de números, não uma métrica a subir).
  // "Em Jogo" NÃO está aqui de propósito: é a única vista que só faz sentido
  // com uma partida a decorrer, e uma tab permanente para ela ficava morta a
  // maior parte do tempo. Vive como botão ao lado do Sincronizar e só aparece
  // enquanto se está mesmo em jogo (ver liveSessionActive na topBar).
  const TABS = [
    { key: "overview", icon: LayoutDashboard, label: t("tab_overview") },
    { key: "wins", icon: LayoutGrid, label: t("tab_wins") },
    { key: "history", icon: History, label: t("tab_history") },
    { key: "stats", icon: ChartColumn, label: t("tab_stats") },
    { key: "augments", icon: Sparkles, label: t("tab_augments") },
    { key: "achievements", icon: Award, label: t("tab_achievements") },
    { key: "compare", icon: Scale, label: t("tab_compare") },
    { key: "challenges", icon: Swords, label: t("tab_challenges") },
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

  const {
    patch,
    patchFailed,
    champions,
    augmentsMap,
    summonerSpellsMap,
    summonerSpellFiles,
    itemsMap,
    itemTiersMap,
    DRAGON,
  } = useStaticData();

  // Campeão a destacar/abrir automaticamente nas Estatísticas quando se
  // clica num atalho da Visão Geral (ver goToChampionStats mais abaixo).
  const [statsHighlightChampion, setStatsHighlightChampion] = useState(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Filtro da tab Coleção: "won" (só os que já tens vitória, comportamento
  // de sempre), "unowned" (só os que faltam) ou "all" (todos, com um marker
  // nos que já tens).
  // Arranca em "Todos" e não em "com vitória": com os sem-vitória a preto e
  // branco, "todos" é a única vista onde a aba se lê como uma coleção — a cor
  // a ganhar terreno ao cinzento. Filtrada só pelos ganhos, era uma grelha
  // inteira a cores onde não há nada para ler.
  const [collectionFilter, setCollectionFilter] = useState("all");
  // Como a Coleção se organiza: por classe (prateleiras) ou tudo em fila por
  // ordem alfabética, como era antes. Não é persistido, de propósito — fica
  // igual ao filtro aqui ao lado, que também volta ao normal a cada arranque;
  // persistir um dos dois e o outro não é que seria estranho.
  const [collectionSort, setCollectionSort] = useState("class");

  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");
  const openSettings = (tab = "general") => {
    setSettingsTab(tab);
    setShowSettings(true);
  };

  const {
    accounts,
    setAccounts,
    activeAccount,
    setActiveAccount,
    switching,
    wins,
    setWins,
    matches,
    setMatches,
    challengeWins,
    refreshChallengeWins,
    dataLoading,
    createAccountFromManager,
    updateRiotAccountFor,
    deleteAccount,
    switchAccount: switchAccountRaw,
  } = useAccounts({
    // Sem conta nenhuma: da primeira vez mostra-se o ecrã de boas-vindas; se
    // já foi visto (e a pessoa continua sem conta), vai-se direto ao
    // formulário, que é o comportamento de sempre.
    onNeedsAccountSetup: () =>
      localStorage.getItem(WELCOME_SEEN_KEY) ? openSettings("accounts") : setShowWelcome(true),
  });

  // ================= PRIMEIRA UTILIZAÇÃO =================
  // Duas peças, cada uma mostrada uma única vez (marcadas em localStorage):
  //  1. Welcome — sem nenhuma conta ligada. Antes a app abria de imediato o
  //     modal de Definições na aba Contas: o formulário certo, mas sem uma
  //     palavra sobre o que era aquilo. Agora explica-se primeiro, e é o
  //     botão do próprio ecrã que leva ao formulário.
  //  2. TabTour — quando a primeira conta passa a existir. Vai abrindo cada
  //     tab enquanto a descreve, com os dados reais já lá dentro.
  const [showWelcome, setShowWelcome] = useState(false);
  const [tourStep, setTourStep] = useState(null); // null = visita não está a correr
  const [showGuide, setShowGuide] = useState(false);

  const finishTour = () => {
    setTourStep(null);
    localStorage.setItem(TOUR_SEEN_KEY, "1");
  };

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem(WELCOME_SEEN_KEY, "1");
  };

  // A visita arranca quando a primeira conta aparece — não no arranque da
  // app. Antes de haver conta não há tab nenhuma com conteúdo para mostrar, e
  // uma visita guiada a ecrãs vazios não ensina nada.
  const hadAccountRef = useRef(false);
  useEffect(() => {
    if (!accounts.length) return;
    const first = !hadAccountRef.current;
    hadAccountRef.current = true;
    if (first && !localStorage.getItem(TOUR_SEEN_KEY) && localStorage.getItem(WELCOME_SEEN_KEY)) {
      setTourStep(0);
    }
  }, [accounts.length]);

  // Fecha as Definições no mesmo instante em que a troca de conta se torna
  // visível — ver comentário em switchAccount, useAccounts.js.
  const switchAccount = (name) => switchAccountRaw(name, () => setShowSettings(false));

  const {
    syncStatus,
    setSyncStatus,
    syncReport,
    showRepairAllConfirm,
    setShowRepairAllConfirm,
    latestMatchTimestamp,
    syncActiveAccount,
    enrichHistory,
    repairAllData,
  } = useRiotSync({ accounts, setAccounts, activeAccount, matches, setMatches, setWins, champions, patch, t });

  // Enche a cache de ícones em disco em segundo plano, antes de o utilizador
  // chegar ao Histórico — ver hooks/useIconPrefetch.js.
  useIconPrefetch({ matches, champions, summonerSpellFiles, augmentsMap });

  // A Arena já teve formatos diferentes (8 equipas de 2 vs 6 equipas de 3) —
  // "top 3" e os baldes de lugar não significam o mesmo nos dois formatos,
  // por isso o resumo/estatísticas podem ser filtrados para um só formato.
  // "all" = sem filtro, 2 = equipas de 2 (8 equipas), 3 = equipas de 3 (6 equipas).
  // Persistidos, tal como o tema e o idioma: reabrir a app e encontrá-la
  // exatamente como se deixou é o comportamento que se espera de qualquer
  // preferência. O filtro guarda-se como texto ("all"/"2"/"3") e volta a
  // número quando é um formato, porque é assim que se compara com team_size.
  const [teamSizeFilter, setTeamSizeFilter] = useState(() => {
    const saved = localStorage.getItem("team-size-filter");
    if (saved === "2" || saved === "3") return Number(saved);
    return "all";
  });

  useEffect(() => {
    localStorage.setItem("team-size-filter", String(teamSizeFilter));
  }, [teamSizeFilter]);

  // Validado contra as tabs que existem AGORA: uma versão futura pode remover
  // ou renomear uma tab, e restaurar uma chave que já não existe deixaria a
  // app aberta num ecrã vazio, sem nada a indicar porquê.
  const [view, setView] = useState(() => {
    const saved = localStorage.getItem("last-view");
    return TABS.some((tb) => tb.key === saved) ? saved : "overview";
  });

  // "ingame" nunca é guardada: não é uma tab da barra e só existe enquanto há
  // partida, por isso restaurá-la no arranque seguinte abria a app numa vista
  // sem partida nenhuma e sem botão que a explicasse. (O restauro acima já a
  // filtrava por não estar em TABS — não a escrever poupa o ida e volta.)
  useEffect(() => {
    if (view !== "ingame") localStorage.setItem("last-view", view);
  }, [view]);

  // Ao trocar de tab, os dados (matches/wins/champions) já estão todos em
  // memória — não há nada "a carregar" de verdade. Mesmo assim, mostrar o
  // Loading por um instante em vez de ir direto para o conteúdo dá uma
  // transição mais deliberada/percetível (o utilizador pediu isto
  // explicitamente) do que só a animação de fade da AnimatePresence. Não
  // dispara no primeiro render (só interessa em trocas de tab a sério, ver
  // "isFirstRender").
  const [viewLoading, setViewLoading] = useState(false);
  const isFirstViewRender = useRef(true);
  useEffect(() => {
    if (isFirstViewRender.current) {
      isFirstViewRender.current = false;
      return;
    }
    setViewLoading(true);
    const t = setTimeout(() => setViewLoading(false), 260);
    return () => clearTimeout(t);
  }, [view]);

  const {
    liveChampionAlert,
    liveBannerHidden,
    setLiveBannerHidden,
    liveSessionActive,
    liveBannerPos,
    liveBannerRef,
    liveBannerJustDragged,
    isDraggingBanner,
    handleLiveBannerPointerDown,
    reconcilePendingAutoSyncs,
  } = useLiveGame({
    accounts,
    setAccounts,
    activeAccount,
    setActiveAccount,
    champions,
    matches,
    setMatches,
    setWins,
    lang,
    DRAGON,
    onAutoSync: syncActiveAccount,
  });

  const { theme, setTheme, headerCompact, setHeaderCompact } = useTheme();

  // Vigia as conquistas da conta ativa e avisa quando alguma sobe — corre
  // aqui (e não na tab Conquistas) para o aviso chegar logo a seguir a
  // sincronizar, esteja-se na tab que se estiver.
  const { notifications, unreadCount, markAllRead, clearAll, toasts, dismissToast } =
    useNotifications({
      activeAccount,
      matches,
      champions,
      wins,
      challengeWins,
      dataLoading,
      t,
    });

  // ================= RESPONDER A UM CONVITE DIRETO DO TOAST =================
  // Aceitar um desafio implicava ir de propósito à tab Desafios e procurar o
  // convite na lista — mas o aviso já está no ecrã no momento em que chega, e
  // é aí que faz sentido decidir. Aceitar entra mesmo na sala e leva-nos para
  // lá; a tab Desafios lê o estado do zero ao montar (ver loadState em
  // Challenges.jsx), por isso encontra a sala já com esta conta lá dentro sem
  // precisar de nenhuma comunicação entre os dois.
  const handleInviteResponse = async (toast, accepted) => {
    const action = toast?.action;
    if (!action?.inviteId) return;

    await respondToInvite(action.inviteId, accepted ? "accepted" : "declined");
    if (!accepted) return;

    const account = accounts.find((a) => a.username === activeAccount);
    const res = await joinRoom(action.roomId, activeAccount, {
      riotGameName: account?.riotAccount,
      riotTagLine: account?.riotTag,
    });

    // Entrar pode falhar por motivos legítimos (a sala encheu ou já arrancou
    // entretanto) — nesse caso vamos à mesma para a tab, que mostra o estado
    // real e a mensagem correspondente, em vez de ficar tudo em silêncio.
    if (!res.success) console.warn("[invite] falhou entrar na sala:", res.error);
    setView("challenges");
  };

  // De onde se veio ao abrir o Em Jogo, para lá voltar quando a partida
  // acabar (ver o efeito abaixo). Sem isto, o fim do jogo deixava a app numa
  // vista que já não tem botão nenhum a apontar para ela — nem na barra de
  // tabs, porque o Em Jogo não é uma delas.
  const viewBeforeInGame = useRef("overview");

  // Clicar no banner da partida a decorrer abre o Em Jogo, que é o
  // desenvolvimento do próprio banner: tem o que ele mostra e mais o que não
  // cabe num cartão flutuante (augments, core da build, pontos do desafio).
  // Antes levava à Coleção com o campeão pesquisado — resposta a "já ganhei
  // com este?", que continua a estar no banner e agora também no cabeçalho
  // da vista, e que era pouco para um clique feito a meio de uma partida.
  const goToInGameTab = () => {
    // Sem partida a decorrer não se vai a lado nenhum. O banner continua
    // clicável depois de o jogo acabar (fica a mostrar o resultado), e sem
    // esta guarda esse clique abria a vista para o efeito abaixo a fechar no
    // render seguinte — um piscar sem explicação nenhuma para quem clicou.
    if (!liveSessionActive) return;

    if (view !== "ingame") viewBeforeInGame.current = view;
    setView("ingame");
    // Esconde (não destrói): a partida continua a decorrer, por isso o botão
    // no cabeçalho tem de conseguir trazer o banner de volta.
    setLiveBannerHidden(true);
  };

  // Acabou a partida: o Em Jogo deixa de ter dados ao vivo e o botão que lá
  // levava desaparece, por isso quem lá estiver volta a onde estava. O
  // resultado final não se perde — continua no banner, com o lembrete para
  // sincronizar (ver liveChampionAlert.gameEnded).
  useEffect(() => {
    if (!liveSessionActive && view === "ingame") {
      setView(viewBeforeInGame.current || "overview");
    }
  }, [liveSessionActive, view]);

  // Atalho usado pelos destaques da Visão Geral — abre a tab de Estatísticas
  // já ordenada pela métrica do cartão em que se clicou (ver highlightChampion
  // em MatchReports.jsx). Já não abre/expande a linha do campeão nem
  // desloca o scroll até ela — em vez disso, repõe sempre o scroll da tab no
  // topo, para nunca aterrar a meio da lista caso já estivesse scrollada de
  // uma visita anterior à mesma tab. Guardamos sempre um objeto NOVO (nunca
  // só a string do campeão) — mesmo clicando duas vezes seguidas no mesmo
  // campeão, cada clique tem de disparar o efeito de novo em MatchReports,
  // e comparar só pela string não fazia isso na 2ª vez (o valor não mudava,
  // logo o efeito nem corria).
  // "search" é o que faz o salto terminar no campeão e não apenas na aba: a
  // lista das Estatísticas mostra vinte de cada vez, ordenadas por partidas,
  // por isso um campeão pouco jogado — precisamente o caso de quem vem da
  // Coleção perguntar "o que correu mal aqui?" — nem sequer estava desenhado
  // ao chegar lá. Quem passa o nome fica com a lista já filtrada por ele.
  // Os atalhos da Visão Geral não passam nada e continuam como estavam: lá o
  // que interessa é a métrica do cartão (sortKey), não um campeão só.
  const goToChampionStats = (championId, sortKey, search) => {
    setView("stats");
    setStatsHighlightChampion({
      champion: normalizeChampionId(championId, champions),
      key: Date.now(),
      sortKey,
      search,
    });
    mainScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
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

  const owned = useMemo(() => new Set(wins), [wins]);

  // Nome de exibição por id de campeão — a Riot usa ids internos que às
  // vezes não batem certo com o nome (ex: Wukong tem id "MonkeyKing"), por
  // isso a pesquisa/ordenação/tooltip da Coleção usam sempre este mapa em
  // vez do id, senão escrever "wukong" não encontrava o próprio Wukong.
  const championsById = useMemo(() => {
    const map = {};
    champions.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [champions]);

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

  // ================= TUDO POR CAMPEÃO (para o tooltip da Coleção) ============
  // Conta TODAS as partidas, ganhas e perdidas. Substituiu um "champStats"
  // que só somava as GANHAS: esse era o único consumidor do tooltip antigo e
  // não conseguia dizer nada sobre um campeão já jogado mas nunca ganho —
  // para esse, simplesmente não existia entrada nenhuma, que é precisamente
  // o caso em que uma pessoa quer saber quantas vezes tentou.
  const champCollectionStats = useMemo(() => {
    const map = {};

    matches.forEach((m) => {
      const champion = normalizeChampionId(m.champion, champions);
      if (!map[champion]) {
        map[champion] = {
          games: 0,
          wins: 0,
          top3: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          placementSum: 0,
          placementCount: 0,
          best: null,
          last: null,
        };
      }
      const e = map[champion];
      e.games += 1;
      if (m.win) e.wins += 1;
      e.kills += m.kills || 0;
      e.deaths += m.deaths || 0;
      e.assists += m.assists || 0;
      if (m.placement != null) {
        e.placementSum += m.placement;
        e.placementCount += 1;
        if (m.placement <= 3) e.top3 += 1;
        if (e.best == null || m.placement < e.best) e.best = m.placement;
      }
      const quando = m.created_at ? new Date(m.created_at).getTime() : null;
      if (quando && (e.last == null || quando > e.last)) e.last = quando;
    });

    return map;
  }, [matches, champions]);

  // Campeões em que já se pegou, com ou sem vitória. Não dá para usar o
  // "champStats" para isto: esse só soma partidas GANHAS (ver o filtro
  // m.win lá em cima), por isso para um campeão jogado dez vezes sem nunca
  // ganhar está vazio — que é precisamente o caso que aqui interessa marcar.
  const playedChampions = useMemo(() => {
    const set = new Set();
    matches.forEach((m) => set.add(normalizeChampionId(m.champion, champions)));
    return set;
  }, [matches, champions]);

  // ================= FILTER =================
  // Os vários campeões que a caixa de pesquisa pode conter de uma vez
  // ("ann, zed, lux" → três termos, três cartões de estado) — ver
  // parseSearchTerms, que é onde está a regra de como se separam.
  const searchTerms = useMemo(() => parseSearchTerms(debouncedSearch), [debouncedSearch]);

  // "won"/"unowned" partem sempre da lista completa de campeões (não só de
  // "wins") para o filtro "sem vitória" conseguir mostrar algo — "wins" só
  // tem os IDs já conquistados, nunca os que faltam.
  //
  // A pesquisa compara pelo NOME de exibição (championsById), não pelo id
  // interno da Riot — para a maioria dos campeões os dois coincidem, mas
  // não sempre: o Wukong tem id "MonkeyKing" (nome legado, nunca mudou),
  // por isso comparar só pelo id obrigava a escrever "monkeyking" para o
  // encontrar, mesmo o campeão se chamando "Wukong" em todo o lado na app.
  const filteredCollection = useMemo(() => {
    const bySearch = (id) => {
      if (!searchTerms.length) return true;
      const champ = { id, name: championsById[id] || id };
      return searchTerms.some((term) => championMatchesTerm(champ, term));
    };
    // Também por nome (não id) — senão o Wukong ordenava-se sob "M" (de
    // "MonkeyKing") em vez de "W", o que seria estranho numa grelha alfabética.
    const byName = (a, b) =>
      (championsById[a] || a).localeCompare(championsById[b] || b);

    // "Sem vitória" é UMA lista, não duas: tudo o que falta, do mais perto do
    // próximo troféu ao que ainda não se tocou. Houve aqui um filtro "Quase
    // lá" à parte durante pouco tempo e era um tópico a mais — dois botões
    // para a mesma pergunta ("o que me falta?"), e quem queria a fila tinha
    // de saber que ela vivia noutro sítio. Agora é a ordem que a conta:
    //
    //   1. quem já pontuou, pela MELHOR colocação (um 2º lugar está mais
    //      perto de uma vitória do que dez 6ºs — perto é colocação, não
    //      tentativas). Empate desfaz-se pelos top 3, depois pelas partidas,
    //      e pelo nome no fim para a ordem ser estável;
    //   2. quem jogou mas nunca pontuou (sem sinal de proximidade, só de que
    //      se tentou);
    //   3. quem nunca foi jogado, por nome — aí não há nada para ordenar
    //      senão o alfabeto.
    //
    // A cor do distintivo de cada azulejo diz a que degrau se chegou, por
    // isso a fila lê-se sem se saber esta regra de ordem.
    if (collectionFilter === "unowned") {
      const lista = champions
        .map((c) => c.id)
        .filter((id) => !owned.has(id) && bySearch(id));

      // Com A-Z escolhido, manda a ordem alfabética: quem a escolheu quer ir
      // direto a um campeão, não ver a fila por proximidade.
      if (collectionSort === "name") return lista.sort(byName);

      const perto = (id) => {
        const st = champCollectionStats[id];
        return {
          // 98 para quem jogou sem nunca pontuar, 99 para quem nunca jogou:
          // ambos vão para o fim, mas pela ordem certa entre si.
          best: st?.best ?? (playedChampions.has(id) ? 98 : 99),
          top3: st?.top3 ?? 0,
          games: st?.games ?? 0,
        };
      };

      return lista.sort((a, b) => {
        const pa = perto(a);
        const pb = perto(b);
        if (pa.best !== pb.best) return pa.best - pb.best;
        if (pa.top3 !== pb.top3) return pb.top3 - pa.top3;
        if (pa.games !== pb.games) return pb.games - pa.games;
        return byName(a, b);
      });
    }

    if (collectionFilter === "all") {
      return champions
        .map((c) => c.id)
        .filter(bySearch)
        .sort(byName);
    }

    return wins.filter(bySearch).sort(byName);
  }, [
    wins,
    champions,
    championsById,
    owned,
    collectionFilter,
    collectionSort,
    searchTerms,
    playedChampions,
    champCollectionStats,
  ]);

  // A Coleção agrupada por classe. Era uma grelha única e alfabética: com o
  // filtro em "sem vitória" são 162 ícones iguais em fila, onde não se
  // encontra nada nem se percebe o que falta. Por classe passam a ser seis
  // prateleiras curtas, cada uma a dizer quanto falta nela — e "falta-me
  // meio roster de suportes" é uma informação que a lista alfabética não
  // dava de todo.
  //
  // A classe é a PRIMEIRA tag do Data Dragon (ver useStaticData.js). Muitos
  // campeões têm duas (ex: Fighter+Tank) e usar todas punha o mesmo campeão
  // em duas prateleiras, o que estragava as contagens e fazia a grelha
  // parecer ter mais campeões do que o jogo tem.
  const collectionGroups = useMemo(() => {
    // Em alfabético é uma prateleira só, sem cabeçalho — a grelha corrida de
    // antes. "filteredCollection" já vem ordenado por nome.
    if (collectionSort === "name") {
      return [{ classe: "todos", titulo: null, campeoes: filteredCollection }];
    }

    const ordem = [
      ["Assassin", "collection_class_assassin"],
      ["Fighter", "collection_class_fighter"],
      ["Mage", "collection_class_mage"],
      ["Marksman", "collection_class_marksman"],
      ["Support", "collection_class_support"],
      ["Tank", "collection_class_tank"],
      ["", "collection_class_other"],
    ];

    const classeDe = new Map(champions.map((c) => [c.id, c.tags?.[0] || ""]));
    const visiveis = new Set(filteredCollection);

    return ordem
      .map(([classe, chave]) => {
        // Os totais contam o roster inteiro dessa classe, não só o que o
        // filtro deixa ver: "3 / 24" só quer dizer alguma coisa contra o
        // total real da classe.
        const doRoster = champions.filter((c) => (c.tags?.[0] || "") === classe);
        return {
          classe,
          titulo: t(chave),
          campeoes: filteredCollection.filter((id) => classeDe.get(id) === classe && visiveis.has(id)),
          ganhos: doRoster.filter((c) => owned.has(c.id)).length,
          total: doRoster.length,
        };
      })
      .filter((g) => g.campeoes.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCollection, champions, owned, lang, collectionSort]);

  // A meta seguinte da barra de progresso. Uma percentagem sozinha é um
  // estado; com a meta ao lado passa a haver um próximo passo — e numa aba
  // cujo propósito é completar uma coleção, é o próximo passo que faz
  // voltar. Os degraus são os das conquistas (ver COVERAGE_TIERS), por isso
  // isto não inventa metas: diz, da barra, o que falta para o distintivo
  // seguinte.
  const proximaMeta = useMemo(() => {
    if (!champions.length) return null;
    const pct = (owned.size / champions.length) * 100;
    const meta = COVERAGE_TIERS.find((degrau) => pct < degrau);
    if (meta == null) return null;
    return {
      meta,
      // Mínimo de 1: com arredondamentos, a conta pode dar 0 para quem está
      // mesmo em cima do degrau sem lhe ter chegado — e "faltam 0" seria
      // dizer que já lá está.
      faltam: Math.max(1, Math.ceil((meta / 100) * champions.length) - owned.size),
    };
  }, [owned, champions]);

  // ================= RESUMO FILTRADO POR FORMATO =================
  const statsMatches = useMemo(() => {
    if (teamSizeFilter === "all") return matches;
    return matches.filter((m) => m.team_size === teamSizeFilter);
  }, [matches, teamSizeFilter]);

  // Partidas que ainda podem ser enriquecidas: sem team_size, ou (já
  // importadas da Riot API mas) sem as estatísticas extra ao estilo op.gg
  // que só passámos a guardar mais tarde, incluindo partidas já
  // "enriquecidas" antes mas com "participants" de uma versão mais antiga
  // (sem dano/ouro/cura por jogador, ou sem double/triple kills — campo
  // adicionado mais tarde a extractAllParticipants). Ver enrichHistory.
  const missingEnrichmentCount = useMemo(() => {
    const ids = new Set();
    matches.forEach((m) => {
      const incompleteParticipants =
        Array.isArray(m.participants) &&
        m.participants.length > 0 &&
        (m.participants[0].damageDealt === undefined ||
          m.participants[0].doubleKills === undefined);
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

  // Enquanto o patch da Data Dragon não chega, DRAGON fica null e todas as
  // imagens de campeão/item da app simplesmente não aparecem — sem isto o
  // arranque a frio parecia "partido" por um instante em vez de "a carregar".
  if (!patch && !patchFailed) {
    return (
      <div style={styles.app}>
        <Facets />
        <Loading label={t("cold_loading")} size="lg" />
      </div>
    );
  }

  const lastSyncLabel = latestMatchTimestamp
    ? new Date(latestMatchTimestamp).toLocaleString(lang === "en" ? "en-GB" : "pt-PT", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : t("never");

  return (
    <div style={styles.app}>
      <Facets />

      <UpdateNotifier />

      {/* Avisos momentâneos de conquistas novas (e convites de desafio, esses
          com botões para responder logo ali) — renderizam-se num portal (ver
          AchievementToasts), por isso o sítio na árvore é indiferente. */}
      <AchievementToasts
        toasts={toasts}
        onDismiss={dismissToast}
        onInviteResponse={handleInviteResponse}
      />

      {showWelcome && (
        <Welcome
          onAddAccount={() => {
            dismissWelcome();
            openSettings("accounts");
          }}
          onOpenGuide={() => setShowGuide(true)}
          onDismiss={dismissWelcome}
        />
      )}

      {showGuide && <HowItWorks onClose={() => setShowGuide(false)} />}

      {tourStep !== null && (
        <TabTour
          stepIndex={tourStep}
          onStepChange={setTourStep}
          onSelectTab={setView}
          onFinish={finishTour}
        />
      )}

      <AnimatePresence>
        {liveChampionAlert && !liveBannerHidden && (
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
              // navegar para a tab sem se querer.
              if (liveBannerJustDragged.current) {
                liveBannerJustDragged.current = false;
                return;
              }
              goToInGameTab();
            }}
          >
            {canShowIcons(DRAGON) && (
              <img
                src={championIcon(liveChampionAlert.championId, DRAGON)}
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
                          src={itemIcon(it.itemID, DRAGON)}
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
                // Esconder, não destruir — ver liveBannerHidden em
                // useLiveGame.js. O botão no cabeçalho traz isto de volta.
                setLiveBannerHidden(true);
              }}
              style={styles.liveBannerClose}
            >
              <X size={12} strokeWidth={2.25} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          width: "100%",
          // Fluido em vez de um teto fixo: em monitores grandes o conteúdo
          // aproveita mais espaço em vez de deixar margens mortas dos lados;
          // nunca desce abaixo dos 900px (mínimo da janela, ver electron.js)
          // nem cresce sem limite em monitores muito largos (4K/ultrawide).
          maxWidth: "clamp(900px, 94vw, 2200px)",
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
              <span className="at-brand-name" style={styles.brandName}>
                Arena Tracker
              </span>
              <Tooltip label={t("riot_disclaimer")}>
                <span style={styles.infoIcon}>
                  <Info size={13} strokeWidth={2.25} />
                </span>
              </Tooltip>
            </div>

            <div style={styles.topBarDivider} />

            <Tooltip label={t("switch_account_tooltip")}>
              <button style={styles.accountPill} onClick={() => openSettings("accounts")}>
                <span
                  style={{
                    ...styles.accountDot,
                    background: activeAccount ? "var(--place-good)" : "var(--text-muted)",
                  }}
                />
                <span style={styles.accountName}>{activeAccount || t("no_account")}</span>
              </button>
            </Tooltip>
          </div>

          <div style={styles.topBarRight}>
            {/* O "Em Jogo" vive aqui, ao lado do Sincronizar, e não na barra
                de tabs: é a única vista que depende de haver uma partida a
                decorrer, e uma tab permanente para ela ficava desligada a
                maior parte do tempo. Aparece e desaparece com a partida — o
                ponto a pulsar é o mesmo sinal que o botão de reabrir o banner
                usa, para as duas coisas se lerem como o mesmo estado. */}
            {activeAccount && liveSessionActive && (
              <Tooltip label={t("ingame_btn_tooltip")}>
                <button
                  onClick={goToInGameTab}
                  style={{
                    ...styles.inGameBtn,
                    ...(view === "ingame" ? styles.inGameBtnActive : null),
                  }}
                >
                  <span style={styles.inGameBtnDot} />
                  <Crosshair size={13} strokeWidth={2.25} />
                  {t("tab_ingame")}
                </button>
              </Tooltip>
            )}

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
                      // Sem classe quando há estado a reportar: a regra que a
                      // esconde em janelas estreitas não pode engolir uma
                      // mensagem de erro ou o progresso de uma sincronização.
                      className={syncStatus?.status ? undefined : "at-sync-caption"}
                      style={{
                        ...styles.syncCaption,
                        color: syncStatus?.status === "error" ? "var(--place-low)" : "var(--text-muted)",
                      }}
                    >
                      {/* Duas forças em vez de uma cinzenta só: a etiqueta
                          pode ser fraca (lê-se uma vez e sabe-se sempre o que
                          é), a hora é o que se vem cá ver. Tudo com o mesmo
                          tom, era preciso parar para a encontrar. */}
                      {syncStatus?.status ? (
                        syncStatus.message
                      ) : (
                        <>
                          {t("last_sync")}{" "}
                          <span style={styles.syncCaptionValue}>{lastSyncLabel}</span>
                        </>
                      )}
                    </div>
                  )}
                  <div style={styles.syncBtnRow}>
                    <Tooltip label={t("sync_btn_tooltip")}>
                      <button
                        onClick={async () => {
                          await syncActiveAccount();
                          reconcilePendingAutoSyncs();
                        }}
                        style={styles.syncBtn}
                        disabled={syncStatus?.status === "loading"}
                      >
                        {syncStatus?.status === "loading" ? (
                          t("sync_btn_loading")
                        ) : (
                          <>
                            <RotateCw size={13} strokeWidth={2.25} style={styles.syncBtnIcon} />
                            {t("sync_btn")}
                          </>
                        )}
                      </button>
                    </Tooltip>
                    {/* As ferramentas de manutenção (completar dados, reparar
                        vitórias, reparar dados) estavam aqui, em fila com o
                        Sincronizar e com o mesmo peso visual — e era isso que
                        fazia o Sincronizar, que é a única ação do dia a dia,
                        desaparecer no meio delas. Passaram para Definições →
                        Sincronização, junto ao relatório que diz quando é que
                        fazem falta. */}
                  </div>
                </div>
                {syncStatus?.status === "loading" && (
                  <div style={styles.syncProgressTrack}>
                    <div style={styles.syncProgressFill} />
                  </div>
                )}
              </div>
            )}

            {/* Idioma/tema/compactação/contas viviam antes como 4 botões
                soltos neste cluster — agora vivem todos dentro do modal de
                Definições, e este ⚙ é a única entrada para lá. */}
            <div style={styles.iconCluster}>
              {/* Só aparece com uma partida MESMO a decorrer e o banner
                  escondido — é a única forma de o trazer de volta depois de o
                  fechar (o aviso do campeão só é enviado uma vez por
                  partida). Ver liveSessionActive: acabado o jogo, o alerta
                  fica (a mostrar o resultado) mas isto desaparece, senão o
                  ponto verde ficava a pulsar "ao vivo" fora de jogo. */}
              {liveChampionAlert && liveBannerHidden && liveSessionActive && (
                <>
                  <Tooltip label={t("live_banner_reopen")}>
                    <button
                      onClick={() => setLiveBannerHidden(false)}
                      className="at-icon-btn"
                      style={styles.liveReopenBtn}
                    >
                      {/* Sem o Data Dragon (arranque sem internet, ver
                          patchFailed) não há ícone de campeão nenhum na app —
                          aqui cai para um símbolo genérico em vez de deixar o
                          botão praticamente vazio. */}
                      {DRAGON ? (
                        <img
                          src={championIcon(liveChampionAlert.championId, DRAGON)}
                          style={styles.liveReopenIcon}
                          alt=""
                        />
                      ) : (
                        <Swords size={14} strokeWidth={2.25} color="var(--accent-text)" />
                      )}
                      <span style={styles.liveReopenDot} />
                    </button>
                  </Tooltip>
                  <div style={styles.iconClusterDivider} />
                </>
              )}

              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                markAllRead={markAllRead}
                clearAll={clearAll}
              />
              <div style={styles.iconClusterDivider} />
              <Tooltip label={t("open_settings")}>
                <button
                  onClick={() => openSettings("general")}
                  className="at-icon-btn"
                  style={styles.iconClusterBtn}
                >
                  <SettingsIcon size={14} strokeWidth={2.25} />
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
            <div className="at-tab-bar" style={styles.tabBar}>
              {TABS.map((tab) => {
                const isActive = view === tab.key;
                return (
                  <button
                    key={tab.key}
                    className="at-tab"
                    onClick={() => setView(tab.key)}
                    style={{
                      ...styles.tabBtn,
                      padding: headerCompact ? "5px 12px" : "7px 12px",
                      color: isActive ? "var(--accent-solid-text)" : "var(--text-secondary)",
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="tabIndicator"
                        style={styles.tabIndicator}
                        transition={{ type: "spring", stiffness: 480, damping: 34 }}
                      />
                    )}
                    {/* O título nativo é o que salva o botão quando a janela
                        é estreita e o texto desaparece (ver .at-tab-label em
                        index.css): sem ele ficavam 8 ícones sem nome. */}
                    <span style={styles.tabBtnLabel} title={tab.label}>
                      <span style={styles.tabBtnIcon}>
                        <tab.icon size={15} strokeWidth={2.25} />
                      </span>
                      <span className="at-tab-label">{tab.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={styles.navDivider} />

            <div style={styles.formatBar}>
              {FORMAT_OPTIONS.map((opt) => {
                const isActive = teamSizeFilter === opt.key;
                return (
                  // As divisórias entre os três botões saíram: agora o grupo
                  // tem fundo próprio (ver formatBar) e o marcador da opção
                  // ativa desliza por cima dele — com as duas coisas, os
                  // traços passaram a ser ruído.
                  <Tooltip key={opt.key} label={opt.full} style={styles.formatBtnWrap}>
                    <button
                      className="formatSegBtn"
                      onClick={() => setTeamSizeFilter(opt.key)}
                      style={{
                        ...styles.formatBtn,
                        padding: headerCompact ? "4px 10px" : "6px 10px",
                        // Areia em texto (e não tinta sobre bloco cheio):
                        // o marcador do formato ativo passou a contorno,
                        // ver formatIndicator.
                        color: isActive ? "var(--accent-text)" : "var(--text-secondary)",
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
                sobreposição nem saltos de altura a meio da animação. Isto
                tem um custo: com "wait", há sempre um instante em que NENHUM
                conteúdo está montado (a tab antiga já saiu, a nova ainda não
                entrou) — não é falta de dados nenhuma (matches/wins já estão
                em memória), é só o próprio gap da animação. Antes a saída e
                a entrada tinham a mesma duração (0.16s cada, ~0.32s de gap
                total); a saída agora é bem mais rápida (0.08s) do que a
                entrada (0.14s) — reduz o gap sem eliminar por completo a
                proteção do "wait" contra sobreposição. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.14, ease: "easeOut" } }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.08, ease: "easeIn" } }}
              >
            {/* Enquanto wins/matches da conta ativa ainda não chegaram (troca
                de conta, arranque inicial), mostra o Loading em vez de deixar
                cada página renderizar por instantes com dados vazios (o que
                parecia "sem partidas" quando na realidade só faltava a
                resposta da Supabase chegar, ver dataLoading em
                useAccounts.js). "viewLoading" cobre a troca de TAB (ver
                comentário junto à sua declaração acima) — situação diferente,
                sem pedido nenhum de dados, só uma transição mais deliberada. */}
            {dataLoading || viewLoading ? (
              <Loading label={t("loading_generic")} />
            ) : (
              <>
            {view === "overview" && (
              <Overview
                matches={statsMatches}
                wins={wins}
                champions={champions}
                DRAGON={DRAGON}
                onOpenChampionStats={goToChampionStats}
                // A Visão Geral mostra o resumo da progressão das conquistas
                // (ver o bloco de distintivos lá) — precisa dos mesmos dados
                // que a tab das Conquistas, e de saber abri-la.
                challengeWins={challengeWins}
                onOpenAchievements={() => setView("achievements")}
              />
            )}

            {view === "history" && (
              <MatchHistory
                matches={statsMatches}
                champions={champions}
                DRAGON={DRAGON}
                augmentsMap={augmentsMap}
                summonerSpellsMap={summonerSpellsMap}
                itemsMap={itemsMap}
                theme={theme}
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

            {view === "augments" && (
              <Augments matches={statsMatches} augmentsMap={augmentsMap} />
            )}

            {/* "matches" e não "statsMatches": o filtro de formato (2v2/3v3)
                da barra de cima não se aplica aqui. A partida a decorrer tem
                o formato que tem, e filtrar por outro dava recomendações de
                um formato diferente daquele em que se está a jogar. */}
            {view === "ingame" && (
              <InGame
                matches={matches}
                champions={champions}
                augmentsMap={augmentsMap}
                itemsMap={itemsMap}
                itemTiersMap={itemTiersMap}
                DRAGON={DRAGON}
                liveChampionAlert={liveChampionAlert}
              />
            )}

            {view === "achievements" && (
              <Achievements
                matches={matches}
                champions={champions}
                wins={wins}
                DRAGON={DRAGON}
                challengeWins={challengeWins}
              />
            )}

            {view === "compare" && (
              <Compare
                matches={matches}
                champions={champions}
                wins={wins}
                DRAGON={DRAGON}
                ownLabel={activeAccount}
                teamSizeFilter={teamSizeFilter}
              />
            )}

            {view === "challenges" && (
              <Challenges
                activeAccount={activeAccount}
                accounts={accounts}
                champions={champions}
                DRAGON={DRAGON}
                onChallengeWon={refreshChallengeWins}
                onSyncAccount={async () => {
                  await syncActiveAccount();
                  reconcilePendingAutoSyncs();
                }}
              />
            )}

            {view === "wins" && (
              <>
                <QuickCheck
                  search={search}
                  setSearch={setSearch}
                  champions={champions}
                  owned={owned}
                  dragon={DRAGON}
                  inputRef={searchInputRef}
                />

                <div className="at-panel" style={styles.cardScroll}>
                  {/* Sem título "Coleção" aqui em cima — a própria tab já
                      tem esse nome na barra lateral, repeti-lo só empurrava
                      o filtro/grelha para baixo sem acrescentar nada. Filtro
                      e contagem ficam agora na mesma linha. */}
                  {/* O aviso de coleção atrasada existia só dentro do tooltip
                      de cada campeão — ou seja, só o via quem já estivesse a
                      apontar justamente para um dos campeões errados. Se há
                      cinco assim, é a aba inteira que está errada, e isso tem
                      de se ver à entrada. O botão faz aqui o mesmo que o das
                      Definições (ver repairWins): relê o histórico guardado e
                      volta a marcar as vitórias em falta. */}
                  {missingWinsChampions.length > 0 && (
                    <div style={styles.collectionDrift}>
                      <span style={styles.collectionDriftText}>
                        <strong>{missingWinsChampions.length}</strong>{" "}
                        {t("collection_drift_banner")}
                      </span>
                      <button
                        onClick={repairWins}
                        disabled={syncStatus?.status === "loading"}
                        style={styles.collectionDriftBtn}
                      >
                        {t("repair_wins_btn")}
                      </button>
                    </div>
                  )}

                  <div style={styles.collectionHeader}>
                    <div style={styles.segGroup}>
                      {[
                        { key: "all", label: t("collection_filter_all") },
                        { key: "won", label: t("collection_filter_won") },
                        { key: "unowned", label: t("collection_filter_unowned") },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => setCollectionFilter(opt.key)}
                          style={{
                            ...styles.segBtn,
                            ...(collectionFilter === opt.key ? styles.segBtnActive : null),
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {/* Ordenação à direita do filtro: por classe serve para
                        ver o que falta e onde, alfabética serve para ir
                        direto a um campeão. Nenhuma das duas faz as duas
                        coisas bem, por isso escolhe-se. */}
                    <div style={styles.segGroup}>
                      {[
                        { key: "class", label: t("collection_sort_class") },
                        { key: "name", label: t("collection_sort_name") },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => setCollectionSort(opt.key)}
                          style={{
                            ...styles.segBtn,
                            ...(collectionSort === opt.key ? styles.segBtnActive : null),
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {/* "96 / 173" dizia coisas diferentes consoante o filtro
                        e nenhuma delas se percebia sem o saber: em "sem
                        vitória" lia-se como progresso quando é exatamente o
                        contrário. O progresso é da barra aqui por baixo; esta
                        contagem diz só quantos azulejos estão à vista e o que
                        eles são. */}
                    <span style={styles.collectionCount}>
                      {filteredCollection.length}{" "}
                      <span style={styles.collectionCountLabel}>
                        {t(
                          collectionFilter === "won"
                            ? "collection_count_won"
                            : collectionFilter === "unowned"
                            ? "collection_count_unowned"
                            : "collection_count_all"
                        )}
                      </span>
                    </span>
                  </div>

                  {/* Barra de conclusão. A contagem ali ao lado muda com o
                      filtro e por isso não serve de progresso — "162 / 173"
                      em "sem vitória" é quanto FALTA, não quanto se tem. A
                      barra mede sempre a mesma coisa: campeões com vitória
                      sobre o roster inteiro. Numa aba cujo propósito é
                      completar uma coleção, isso tem de estar à vista. */}
                  {champions.length > 0 && (
                    <div style={styles.collectionProgress}>
                      <div style={styles.collectionProgressHead}>
                        <span style={styles.collectionProgressLabel}>
                          {t("collection_progress")}
                        </span>
                        <span style={styles.collectionProgressValue}>
                          {Math.round((owned.size / champions.length) * 100)}%
                          <span style={styles.collectionProgressSub}>
                            {" "}
                            · {owned.size} / {champions.length}
                          </span>
                        </span>
                      </div>
                      <div style={styles.collectionProgressTrack}>
                        <motion.div
                          style={styles.collectionProgressFill}
                          initial={{ width: 0 }}
                          animate={{ width: `${(owned.size / champions.length) * 100}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                        {/* O risco na barra é a meta seguinte: assim vê-se o
                            quão longe está, e não só se lê. */}
                        {proximaMeta && (
                          <div
                            style={{ ...styles.collectionProgressMark, left: `${proximaMeta.meta}%` }}
                          />
                        )}
                      </div>
                      {proximaMeta && (
                        <span style={styles.collectionProgressNext}>
                          {t("collection_next_milestone")
                            .replace("{n}", proximaMeta.faltam)
                            .replace("{pct}", proximaMeta.meta)}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Sem esta linha, a aba ficava simplesmente em branco por
                      baixo da barra — e o fim de uma coleção merece melhor do
                      que um espaço vazio. */}
                  {collectionFilter === "unowned" &&
                    filteredCollection.length === 0 &&
                    searchTerms.length === 0 && (
                      <div style={styles.collectionEmpty}>{t("collection_unowned_empty")}</div>
                    )}

                  {/* Sem scroll/altura próprios de propósito — antes a grelha
                      tinha um maxHeight fixo de 26vh e ficava minúscula em
                      monitores grandes, com uma barra de scroll aninhada
                      dentro da área principal (que já é a única zona com
                      scroll da app). Agora cresce livremente e usa o espaço
                      todo disponível. */}
                  {collectionGroups.map((grupo) => (
                    <div key={grupo.classe || "outros"} style={styles.collectionGroup}>
                      {/* Em alfabético não há cabeçalho: é uma prateleira só
                          e um título por cima dela não diria nada. */}
                      {grupo.titulo && (
                        <>
                          <div style={styles.collectionGroupHead}>
                            <span style={styles.collectionGroupTitle}>{grupo.titulo}</span>
                            <span style={styles.collectionGroupCount}>
                              {grupo.ganhos} / {grupo.total}
                            </span>
                          </div>
                          {/* "12 / 18" ao lado de "15 / 50" obrigava a fazer
                              seis divisões de cabeça para saber em que classe
                              se está pior. A barra responde a isso de
                              relance, e é a mesma linguagem da barra do topo
                              — só mais fina, que aqui é um subtotal. */}
                          <div style={styles.collectionGroupTrack}>
                            <motion.div
                              style={styles.collectionGroupFill}
                              initial={{ width: 0 }}
                              animate={{
                                width: `${grupo.total ? (grupo.ganhos / grupo.total) * 100 : 0}%`,
                              }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                          </div>
                        </>
                      )}

                      <div style={styles.grid}>
                        <AnimatePresence>
                          {grupo.campeoes.map((champ) => {
                            const hasWin = owned.has(champ);
                            // Três estados e não dois. O meio — já jogado,
                            // ainda sem vitória — é o mais útil de todos:
                            // são os campeões a um bom jogo de entrarem na
                            // coleção, e antes liam-se exatamente como os
                            // que nunca se tocaram.
                            const tried = !hasWin && playedChampions.has(champ);
                            // Na grelha do que falta, o azulejo diz onde se
                            // chegou: sem o número, a ordem por proximidade
                            // era uma ordem secreta — via-se a fila, não o
                            // porquê daquela fila. Fora deste filtro não
                            // aparece, que aí a grelha é sobre ter ou não
                            // ter, e um número em 173 azulejos é ruído.
                            const melhor =
                              collectionFilter === "unowned"
                                ? champCollectionStats[champ]?.best ?? null
                                : null;
                            const name = championsById[champ] || champ;
                            // O que um leitor de ecrã diz do azulejo. Sem
                            // isto era "botão" e mais nada: o nome do campeão
                            // está na imagem e o estado está na cor, e nem um
                            // nem outro chegam a quem não vê a grelha.
                            // Clicável sempre que há partidas, não só quando
                            // há vitória. A regra antiga ("só com vitória
                            // existem dados nas Estatísticas") deixou de ser
                            // verdade quando as Estatísticas passaram a
                            // construir-se a partir das PARTIDAS (ver
                            // MatchReports.jsx): um campeão jogado seis vezes
                            // sem ganhar tem lá ficha completa — e é
                            // justamente dele que se quer saber o que correu
                            // mal. Ficavam inertes os azulejos sobre os quais
                            // há mais que perguntar. Inerte agora só quem
                            // nunca foi jogado, que aí não há mesmo nada para
                            // abrir.
                            const temFicha = hasWin || tried;
                            const rotulo = `${name} — ${t(
                              hasWin
                                ? "collection_tt_in"
                                : tried
                                ? "collection_tt_no_win"
                                : "collection_tt_untouched"
                            )}${melhor != null ? ` (${t("collection_tt_best")}: ${melhor}º)` : ""}`;
                            // Sem legenda visível no azulejo (só o ícone, para
                            // caber mais por linha) — tudo o que há para dizer
                            // sobre o campeão vive no tooltip.
                            const tooltip = (
                              <ChampionTooltip
                                name={name}
                                stats={champCollectionStats[champ]}
                                hasWin={hasWin}
                                tried={tried}
                                lang={lang}
                                t={t}
                              />
                            );

                            return (
                              <Tooltip key={champ} label={tooltip}>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.7 }}
                                  // O esbatimento dos que faltam vem daqui e
                                  // não do "style": o framer-motion controla
                                  // a opacidade via "animate" e sobrepunha-se
                                  // a qualquer opacity posta no estilo.
                                  // Quem nunca foi jogado desce um pouco — e
                                  // quem não tem vitória perde a cor, ver
                                  // .at-champ-nowin. Não
                                  // desce mais do que isto de propósito: com
                                  // a dessaturação a marcar o bloqueado, uma
                                  // opacidade baixa só servia para os apagar
                                  // contra o painel branco do tema claro.
                                  animate={{ opacity: hasWin ? 1 : tried ? 0.92 : 0.65, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.7 }}
                                  transition={{ duration: 0.08 }}
                                  // Salta para as Estatísticas com esse campeão
                                  // em foco, em vez de o teres de procurar
                                  // manualmente na lista.
                                  onClick={
                                    temFicha
                                      ? () => goToChampionStats(champ, undefined, name)
                                      : undefined
                                  }
                                  // Focável SEMPRE, clicável com ficha.
                                  // O tooltip já abre com o foco (ver
                                  // Tooltip.jsx) — faltava só o azulejo ser
                                  // alcançável por teclado para esses números
                                  // existirem para quem não usa rato. E um alvo
                                  // de clique que o teclado não alcança é um
                                  // buraco de acesso, não um extra.
                                  tabIndex={0}
                                  role={temFicha ? "button" : "img"}
                                  aria-label={rotulo}
                                  onKeyDown={
                                    temFicha
                                      ? (e) => {
                                          if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            goToChampionStats(champ, undefined, name);
                                          }
                                        }
                                      : undefined
                                  }
                                  className={`at-champ${temFicha ? " clickableCard" : ""}${
                                    !hasWin ? " at-champ-nowin" : ""
                                  }`}
                                  style={{
                                    ...(hasWin
                                      ? styles.winCard
                                      : tried
                                      ? styles.winCardTried
                                      : styles.winCardEmpty),
                                    cursor: temFicha ? "pointer" : "default",
                                  }}
                                >
                                  <div style={styles.winIconWrap}>
                                    <img src={championIcon(champ, DRAGON)} style={styles.winIcon} />
                                    {hasWin && <div style={styles.winBadge}>✓</div>}
                                    {melhor != null && (
                                      <div
                                        style={{
                                          ...styles.winBadgeNear,
                                          background: corDoLugar(melhor),
                                        }}
                                      >
                                        {melhor}º
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              </Tooltip>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
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
            <button onClick={() => openSettings("accounts")} style={styles.primaryBtn}>
              {t("manage_accounts")}
            </button>
          </div>
        )}
      </div>

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          initialTab={settingsTab}
          lang={lang}
          setLang={setLang}
          theme={theme}
          setTheme={setTheme}
          headerCompact={headerCompact}
          setHeaderCompact={setHeaderCompact}
          accounts={accounts}
          activeAccount={activeAccount}
          onSwitch={switchAccount}
          onCreate={createAccountFromManager}
          onUpdateRiotAccount={updateRiotAccountFor}
          onDelete={deleteAccount}
          syncReport={syncReport}
          syncStatus={syncStatus}
          missingEnrichmentCount={missingEnrichmentCount}
          onEnrich={() => enrichHistory()}
          missingWinsCount={missingWinsChampions.length}
          onRepairWins={repairWins}
          canRepairAll={matches.some((m) => m.riot_match_id)}
          onRepairAll={() => setShowRepairAllConfirm(true)}
          matches={matches}
          wins={wins}
          onStartTour={() => {
            setShowSettings(false);
            setTourStep(0);
          }}
        />
      )}

      {showRepairAllConfirm && (
        <ConfirmDialog
          title={t("repair_all_confirm_title")}
          message={t("repair_all_confirm_message")}
          confirmLabel={t("repair_all_btn")}
          onConfirm={async () => {
            setShowRepairAllConfirm(false);
            await repairAllData();
            reconcilePendingAutoSyncs();
          }}
          onCancel={() => setShowRepairAllConfirm(false)}
        />
      )}
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
    // Sem isto o mosaico fica invisível: "position: relative" sozinho não
    // cria um stacking context, por isso o SVG de z-index negativo ia
    // pintar no contexto da raiz — ou seja, POR BAIXO do backgroundImage
    // opaco que este mesmo elemento tem, em vez de por cima dele. "isolate"
    // força o contexto aqui, e a ordem passa a ser: fundo do app -> mosaico
    // -> conteúdo.
    isolation: "isolate",
    height: "100vh",
    width: "100vw",
    overflowX: "hidden",
    overflowY: "hidden",
    color: "var(--text-body)",
    paddingTop: "32px",
    // "Cinzel" (decorativa) fica só na marca/título e no banner ao vivo (ver
    // brandName/liveBanner abaixo) — herdar isto aqui cascatava para toda a
    // app, incluindo tabelas densas de Histórico/Estatísticas, onde uma
    // serif decorativa lê pior do que a sans-serif de "--sans" (index.css).
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
    background: "var(--surface-float)",
    border: "1px solid rgba(var(--accent-rgb),0.4)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    cursor: "pointer",
    fontFamily: "Cinzel, serif",
  },

  liveBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: "var(--radius-md)",
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "rgba(var(--soft-rgb),0.08)",
    color: "var(--text-secondary)",
    cursor: "pointer",
  },

  // Antes a marca vivia num bloco próprio, centrado e acima da topBar (logo
  // grande + aviso legal sempre visível) — ocupava bastante altura logo no
  // topo, antes de qualquer conteúdo real. Passou a viver dentro da própria
  // topBar (logo pequeno + nome), com o aviso legal escondido atrás de um
  // ícone "ⓘ" (tooltip), sem perder a informação mas sem consumir espaço.
  // minWidth 0 para o nome da conta poder encolher em vez de forçar a linha
  // a crescer: sem isto, um item flex nunca fica mais pequeno do que o seu
  // conteúdo e um Riot ID longo empurrava o Sincronizar para fora.
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    minWidth: 0,
  },

  brandBox: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },

  brandLogo: {
    height: 28,
    width: 28,
    borderRadius: "var(--radius-sm)",
  },

  brandName: {
    color: "var(--accent-text)",
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: "nowrap",
    fontFamily: "Cinzel, serif",
  },

  infoIcon: {
    display: "inline-flex",
    color: "var(--text-muted)",
    cursor: "help",
  },

  // Pill única que junta as tabs e o filtro de formato — antes eram duas
  // caixas soltas lado a lado (cada uma com o seu fundo/borda), o que dava
  // um ar desconexo e desequilibrado. Agora só esta linha tem fundo/borda;
  // tabBar e formatBar são apenas grupos de botões lá dentro, separados por
  // um divisor fino (ver navDivider) — a mesma "pill" contínua de ponta a
  // ponta, tal como a barra de tabs tinha antes.
  // O fundo usa --soft-rgb (branco no tema escuro, preto no claro) e não
  // --panel-deep-rgb: este último é a cor do painel, e no tema claro é
  // 240,246,245 — a 50% por cima de um cartão branco dava um fundo
  // praticamente branco, ou seja a calha desaparecia e as tabs ficavam a
  // flutuar sem nada que as agrupasse. O --soft-rgb inverte com o tema, por
  // isso a calha lê-se nos dois: um lavado claro no escuro, uma sombra leve
  // no claro.
  navRow: {
    display: "flex",
    alignItems: "stretch",
    width: "100%",
    borderRadius: 13,
    background: "rgba(var(--soft-rgb),0.05)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  tabBar: {
    display: "flex",
    flex: 1,
    gap: 4,
  },

  // Encurtado em altura (margem vertical de 6px em vez de 2) para ser um
  // traço discreto entre os dois grupos e não uma barra de ponta a ponta.
  // A margem HORIZONTAL fica nos 6px originais de propósito: subi-la para 8
  // roubava 4px à linha e, em inglês — onde os rótulos são mais longos que
  // em português —, era quanto bastava para a linha transbordar na largura
  // imediatamente acima do ponto em que os rótulos desaparecem (1181px).
  navDivider: {
    width: 1,
    alignSelf: "stretch",
    margin: "6px 6px",
    background: "rgba(var(--border-rgb),0.45)",
  },

  // Mesmo "segmented control" da barra de tabs, só que mais estreito (3
  // opções curtas — Todos/2v2/3v3 — em vez de 5 tabs com texto). Largura
  // fixa para não competir por espaço com as tabs à medida que a janela
  // muda de tamanho.
  // Teve fundo próprio durante algum tempo, para separar "navegar" de
  // "filtrar". Saiu: dentro de uma calha que agora também tem fundo, era uma
  // caixa dentro de outra caixa quase da mesma cor — mais ruído do que
  // separação. Quem faz esse trabalho agora é a diferença de ESTADO ATIVO
  // (ver formatIndicator): a tab ativa é um bloco cheio na cor de destaque, a
  // opção de formato ativa é só um contorno. Dois controlos com aspetos
  // diferentes separam-se melhor do que dois fundos iguais encostados.
  formatBar: {
    display: "flex",
    flexShrink: 0,
    width: 168,
    gap: 2,
    padding: 2,
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
    // O fundo (transparente em repouso, ténue no hover) vive no CSS, em
    // ".formatSegBtn" — declarado aqui inline, ganhava à regra e matava o hover.
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    transition: "color 0.15s ease, background-color 0.15s ease",
  },

  // Contorno, não bloco cheio — e é esta a mudança que mais arruma a linha.
  // Antes o formato ativo usava o mesmo gradiente de areia com halo que a tab
  // ativa, por isso a linha tinha DOIS "estás aqui" com exatamente o mesmo
  // peso: um a dizer em que vista se está, outro a dizer que filtro está
  // posto. São coisas de níveis diferentes — a vista é destino, o formato é
  // só um ajuste ao que se vê — e com o mesmo aspeto o olho não sabia qual
  // ler primeiro. O filtro passa a marcar-se com fundo ténue + contorno,
  // suficiente para se ver qual está escolhido sem disputar com a navegação.
  formatIndicator: {
    position: "absolute",
    inset: 0,
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--accent-rgb),0.16)",
    border: "1px solid rgba(var(--accent-rgb),0.55)",
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
    padding: "7px 12px",
    borderRadius: 9,
    border: "none",
    // O fundo (transparente em repouso, ténue no hover) vive no CSS, em
    // ".at-tab" — declarado aqui inline, ganhava à regra e matava o hover.
    cursor: "pointer",
    // 13px (--fs-sm) em vez de 12.5, e o espaço para isso veio do padding
    // horizontal (16 -> 12), não de encurtar a linha: são 8px recuperados
    // por tab, 64 no total, muito mais do que os poucos que o tamanho maior
    // custa. Em inglês a linha estava a passar-se no limite logo acima do
    // ponto em que os rótulos desaparecem, por isso qualquer aumento tinha
    // mesmo de se pagar a si próprio.
    fontSize: 13,
    // 600 e não 700: a este tamanho, oito rótulos a bold lêem-se como um
    // bloco escuro contínuo em vez de oito palavras. O estado ativo já se
    // marca com fundo e cor — não precisa também de peso, e mudar o peso
    // conforme o estado faria a largura de cada tab saltar a cada clique.
    fontWeight: 600,
    transition: "color 0.15s ease, background-color 0.15s ease",
  },

  tabIndicator: {
    position: "absolute",
    inset: 0,
    borderRadius: "var(--radius-lg)",
    background: "var(--accent-gradient)",
    boxShadow: "0 3px 12px var(--accent-glow)",
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
    display: "inline-flex",
    alignItems: "center",
  },

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
    borderRadius: "var(--radius-2xl)",
    background: "var(--panel-bg)",
    backdropFilter: "var(--panel-blur)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 6px 18px rgba(0,0,0,0.18)",
  },

  // Linha de topo (marca/conta à esquerda, sync/preferências à direita) —
  // já sem fundo/borda própria, porque agora vive dentro do headerShell.
  // "wrap" como rede de segurança, não como layout: com as regras de
  // index.css o conteúdo cabe numa linha em qualquer largura permitida pela
  // janela (mínimo 900px). Mas basta um nome de conta muito longo, ou um
  // idioma com palavras maiores, para estourar a conta — e passar para a
  // linha de baixo é sempre melhor do que transbordar para fora do cartão.
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
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
    cursor: "pointer",
  },

  accountDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    flexShrink: 0,
  },

  // Um Riot ID pode ser bem mais longo do que cabe no cabeçalho. Corta-se
  // com reticências em vez de se deixar crescer — o nome completo continua
  // a uma passagem de rato de distância, no tooltip do próprio botão.
  accountName: {
    color: "var(--accent-text)",
    fontWeight: 600,
    fontSize: 13,
    maxWidth: 180,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  // Sem "marginTop" — já não fica numa linha própria por baixo do botão,
  // vive ao lado dele agora (ver syncTopRow). "whiteSpace: nowrap" evita que
  // quebre a meio e desalinhe a linha com o botão.
  syncCaption: { fontSize: 10.5, color: "var(--text-muted)", whiteSpace: "nowrap" },

  syncCaptionValue: { color: "var(--text-secondary)", fontWeight: 600 },

  // Cluster único (3 botões visualmente unidos, com divisores finos) em vez
  // de 3 cartões soltos com espaço entre eles — sinaliza que são um grupo
  // de preferências, não ações independentes.
  // Contorno neutro e não de destaque: este cluster fica encostado ao
  // Sincronizar, que é o único bloco cheio na cor de destaque do cabeçalho.
  // Com a moldura também puxada a areia, ficavam duas coisas douradas lado a
  // lado e o botão principal deixava de ser o que salta à vista. Mesma razão
  // do fundo: --soft-rgb lê-se nos dois temas, ao contrário de
  // --panel-deep-rgb, que no claro é quase branco.
  iconCluster: {
    display: "flex",
    alignItems: "stretch",
    borderRadius: "var(--radius-lg)",
    border: "1px solid rgba(var(--border-rgb),0.45)",
    background: "rgba(var(--soft-rgb),0.05)",
    overflow: "hidden",
  },

  // Botão para reabrir o banner da partida ao vivo — mostra o ícone do
  // próprio campeão (mais direto do que um símbolo genérico) com um ponto
  // verde a piscar, para se perceber que há mesmo jogo a decorrer.
  // Contorno e não preenchido: fica encostado ao Sincronizar, que é o botão
  // cheio na cor de destaque. Dois botões cheios lado a lado disputavam a
  // atenção um com o outro e o Sincronizar deixava de se ler como a ação
  // principal do cabeçalho.
  inGameBtn: {
    padding: "8px 14px",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--accent-rgb),0.5)",
    background: "rgba(var(--accent-rgb),0.1)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
    transition: "all 0.15s ease",
  },

  // Com a vista aberta o botão passa a preenchido — é o substituto do
  // indicador que a barra de tabs dá às outras vistas e que esta, por não
  // estar lá, não tem.
  inGameBtnActive: {
    background: "var(--accent-solid)",
    color: "var(--accent-solid-text)",
    borderColor: "transparent",
  },

  inGameBtnDot: {
    width: 7,
    height: 7,
    flexShrink: 0,
    borderRadius: "50%",
    background: "var(--place-good)",
    animation: "livePulse 1.6s ease-in-out infinite",
  },

  liveReopenBtn: {
    position: "relative",
    padding: "6px 10px",
    display: "flex",
    alignItems: "center",
    border: "none",
    // Fundo e hover vêm do CSS (".at-icon-btn") — ver nota em iconClusterBtn.
    cursor: "pointer",
  },

  liveReopenIcon: {
    width: 18,
    height: 18,
    borderRadius: "var(--radius-sm)",
    display: "block",
  },

  liveReopenDot: {
    position: "absolute",
    top: 4,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--place-good)",
    border: "1.5px solid rgba(var(--panel-deep-rgb),0.95)",
    animation: "livePulse 1.6s ease-in-out infinite",
  },

  // Separa a campainha do ⚙ dentro do mesmo cluster — sem isto os dois
  // ícones colavam-se e liam-se como um só botão largo.
  iconClusterDivider: {
    width: 1,
    alignSelf: "stretch",
    background: "rgba(var(--border-rgb),0.4)",
  },

  // Cinzento em repouso, areia ao passar o rato (ver .at-icon-btn em
  // index.css). Em areia permanente, dois ícones decorativos competiam em cor
  // com a única ação que interessa mesmo encontrar aqui — o Sincronizar.
  iconClusterBtn: {
    padding: "6px 11px",
    display: "flex",
    alignItems: "center",
    border: "none",
    // O fundo (transparente em repouso, ténue no hover) vive no CSS, em
    // ".at-icon-btn" — declarado aqui inline, ganhava à regra e matava o hover.
    color: "var(--text-secondary)",
    cursor: "pointer",
    transition: "background 0.15s ease, color 0.15s ease",
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

  // Botão cheio, na cor de destaque, em vez do contorno discreto de antes.
  // É a única ação que uma pessoa precisa mesmo de encontrar no cabeçalho —
  // tudo o resto que ali estava passou para as Definições — por isso tem de
  // se ler como o botão principal da app e não como mais um de uma fila.
  syncBtn: {
    padding: "8px 16px",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    borderRadius: "var(--radius-md)",
    border: "1px solid transparent",
    background: "var(--accent-solid)",
    color: "var(--accent-solid-text)",
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: 0.2,
    boxShadow: "0 4px 14px rgba(var(--accent-rgb),0.35)",
    transition: "all 0.15s ease",
  },

  syncBtnIcon: {
    flexShrink: 0,
  },

  syncProgressTrack: {
    width: 140,
    height: 4,
    borderRadius: "var(--radius-xs)",
    overflow: "hidden",
    background: "rgba(var(--accent-rgb),0.15)",
    marginTop: 2,
  },

  syncProgressFill: {
    height: "100%",
    width: "30%",
    borderRadius: "var(--radius-xs)",
    background: "var(--accent-solid)",
    animation: "growSyncBar 1.2s ease-in-out infinite",
  },

  cardScroll: {
    background: "var(--panel-bg)",
    backdropFilter: "var(--panel-blur)",
    padding: 18,
    marginTop: 16,
    display: "flex",
    flexDirection: "column",
  },

  // Filtro + contagem na mesma linha — sem título "Coleção" em cima (a tab
  // já se chama assim), o cabeçalho fica só com o essencial.
  collectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  collectionCount: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-muted)",
    flexShrink: 0,
  },

  segGroup: {
    display: "flex",
    gap: 2,
    padding: 2,
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  // "flex:1" em todos os botões — antes cada um só tinha a largura do seu
  // próprio texto ("Com vitória" bem mais largo que "Todos"), o que fazia o
  // grupo parecer desproporcional. Agora os três dividem sempre o mesmo
  // espaço por igual, seja qual for o comprimento do rótulo.
  segBtn: {
    flex: 1,
    minWidth: 84,
    textAlign: "center",
    whiteSpace: "nowrap",
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },

  segBtnActive: {
    background: "var(--accent-solid)",
    color: "var(--accent-solid-text)",
  },

  primaryBtn: {
    padding: "10px 14px",
    borderRadius: "var(--radius-lg)",
    border: "none",
    background: "var(--accent-solid)",
    color: "var(--accent-solid-text)",
    cursor: "pointer",
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


  // Cartões compactos, com nome visível (antes eram só ícones de 48px, sem
  // legenda, presos a uma grelha com maxHeight de 26vh fixo — minúscula e
  // desperdiçava todo o espaço extra em monitores grandes). Sem altura
  // própria: cresce livremente, a única scroll é a da área principal.
  // Tamanho pensado para caber o máximo de campeões por linha (menos scroll
  // a percorrer), não para os cartões serem grandes.
  // Azulejos encostados: o espaço entre eles desceu de 8 para 1 e a coluna
  // mínima de 60 para 50. São mais campeões por fila e, com 173 deles, menos
  // filas é menos scroll — que é o que mais pesa nesta aba. A moldura de cada
  // azulejo continua a separá-los, e 1px basta para que duas molduras vizinhas
  // não se leiam como uma só; o espaço a mais só os fazia flutuar. Cada
  // azulejo põe ainda 1px de margem a toda a volta (ver winCard): o gap
  // sozinho deixava as molduras a ler-se como uma barra contínua — de lado
  // numa fila cheia, e em cima/baixo na grelha A-Z, que são dezenas de filas
  // seguidas sem cabeçalho nenhum pelo meio a separá-las.
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(50px, 1fr))",
    gap: 1,
    marginTop: 4,
  },

  // Só o ícone (o nome do campeão vive no tooltip, não no cartão — cabe
  // mais por linha assim, menos scroll a percorrer para ver a coleção
  // toda).
  winCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-md)",
    padding: 4,
    margin: 1,
    border: "1px solid rgba(var(--accent-rgb),0.4)",
    background: "rgba(var(--accent-rgb),0.12)",
  },

  // Usado só no filtro "Todos" — campeões sem vitória ficam visivelmente
  // apagados ao lado dos que já a têm, em vez de todos terem o mesmo peso
  // visual (mesma linguagem das conquistas por desbloquear).
  winCardEmpty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-md)",
    padding: 4,
    margin: 1,
    border: "1px solid rgba(var(--border-rgb),0.3)",
    background: "rgba(var(--soft-rgb),0.04)",
  },

  // Já jogado, ainda sem vitória: moldura em laranja de "meio da tabela" (a
  // mesma cor que o resto da app usa para o que está a caminho). Fica entre
  // os dois extremos de propósito — o retrato está a preto e branco como o
  // dos intocados (só a vitória lhe devolve a cor), mas a moldura acesa
  // separa-o de quem nunca foi jogado, sem lhe dar a moldura de areia de
  // quem já lá chegou.
  winCardTried: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-md)",
    padding: 4,
    margin: 1,
    border: "1px solid color-mix(in srgb, var(--place-mid) 45%, transparent)",
    background: "color-mix(in srgb, var(--place-mid) 10%, transparent)",
  },

  // Prateleira por classe.
  collectionGroup: {
    marginTop: 14,
  },

  collectionGroupHead: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },

  collectionGroupTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "var(--text-secondary)",
  },

  collectionGroupCount: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
  },

  collectionProgress: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    marginTop: 10,
  },

  collectionProgressHead: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },

  collectionProgressLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "var(--text-muted)",
  },

  collectionProgressValue: {
    fontSize: 13,
    fontWeight: 800,
    color: "var(--accent-text)",
  },

  collectionProgressSub: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
  },

  collectionProgressTrack: {
    position: "relative",
    height: 6,
    borderRadius: "var(--radius-pill)",
    background: "rgba(var(--soft-rgb),0.1)",
    overflow: "hidden",
  },

  // O risco da meta seguinte, por cima do preenchimento.
  collectionProgressMark: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    background: "rgba(var(--soft-rgb),0.55)",
  },

  collectionProgressNext: {
    alignSelf: "flex-end",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
  },

  // Subtotal de cada prateleira: metade da altura da barra do topo, para se
  // ler como um detalhe dela e não como outra barra a competir.
  collectionGroupTrack: {
    height: 3,
    marginBottom: 6,
    borderRadius: "var(--radius-pill)",
    background: "rgba(var(--soft-rgb),0.1)",
    overflow: "hidden",
  },

  collectionGroupFill: {
    height: "100%",
    borderRadius: "var(--radius-pill)",
    background: "var(--accent-gradient)",
  },

  collectionProgressFill: {
    height: "100%",
    borderRadius: "var(--radius-pill)",
    background: "var(--accent-gradient)",
  },

  winIconWrap: {
    position: "relative",
  },

  winIcon: {
    width: "clamp(36px, 2.6vw, 46px)",
    height: "clamp(36px, 2.6vw, 46px)",
    borderRadius: "var(--radius-md)",
    pointerEvents: "none",
  },

  // Irmão do winBadge, para a melhor colocação na fila do "Quase lá". Mesma
  // forma e mesmo canto — o que muda é a cor (o laranja de "meio da tabela",
  // o mesmo da moldura destes azulejos) e caber lá um "2º" em vez de um ✓.
  winBadgeNear: {
    position: "absolute",
    bottom: -2,
    right: -2,
    minWidth: 14,
    height: 14,
    padding: "0 3px",
    borderRadius: "var(--radius-pill)",
    background: "var(--place-mid)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 8.5,
    fontWeight: 800,
    border: "1.5px solid var(--bg-mid)",
    lineHeight: 1,
  },

  // O "campeões"/"por ganhar" ao lado do número: mais pequeno e apagado que
  // a contagem, porque o número é que é a informação.
  // A faixa de "coleção atrasada". Usa o laranja de aviso da app, não o
  // vermelho: não há nada partido, só dados por acertar — e o botão ao lado
  // resolve-o num clique.
  collectionDrift: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 10,
    padding: "9px 12px",
    borderRadius: "var(--radius-md)",
    border: "1px solid color-mix(in srgb, var(--place-mid) 45%, transparent)",
    background: "color-mix(in srgb, var(--place-mid) 10%, transparent)",
  },

  collectionDriftText: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-body)",
    lineHeight: 1.4,
  },

  collectionDriftBtn: {
    flexShrink: 0,
    padding: "6px 12px",
    borderRadius: "var(--radius-pill)",
    border: "1px solid color-mix(in srgb, var(--place-mid) 60%, transparent)",
    background: "color-mix(in srgb, var(--place-mid) 18%, transparent)",
    color: "var(--text-body)",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },

  collectionCountLabel: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "var(--text-muted)",
  },

  collectionEmpty: {
    marginTop: 14,
    padding: "14px 16px",
    borderRadius: "var(--radius-md)",
    border: "1px dashed rgba(var(--border-rgb),0.45)",
    color: "var(--text-muted)",
    fontSize: 12,
    fontWeight: 600,
    textAlign: "center",
    lineHeight: 1.5,
  },

  winBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "var(--place-good)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9,
    fontWeight: 800,
    border: "1.5px solid var(--bg-mid)",
    lineHeight: 1,
  },

  emptyState: {
    marginTop: 40,
    padding: 30,
    borderRadius: "var(--radius-2xl)",
    background: "var(--panel-bg)",
    backdropFilter: "var(--panel-blur)",
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
