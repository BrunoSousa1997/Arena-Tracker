import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { placementColor, placementText, lastPlacementFor } from "../lib/placement";
import { useLanguage } from "../lib/i18n";
import Tooltip from "../components/Tooltip";
import { computeCareerSummary, computeSpotlightGroups } from "../lib/overviewSpotlights";
import { splitSessions } from "../lib/sessionCurve";
import { useCountUpInt, useCountUpNode } from "../lib/useCountUp";
import {
  computeAchievementStats,
  buildAchievementCategories,
  buildBooleanAchievements,
  summarizeBadges,
  rankForTierIndex,
  formatAchievementValue,
} from "../lib/achievementStats";

// Fundo translúcido por trás dos números com resultado no resumo de topo —
// mesma ideia do StatsBar (ver chipStyle lá), para o "0%"/streaks também
// terem presença própria em vez de só texto colorido sobre fundo neutro.
function heroChipStyle(color) {
  return {
    padding: "4px 10px",
    borderRadius: 9,
    background: `color-mix(in srgb, ${color} 14%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
  };
}

const HEATMAP_WEEKS = 18;

// Quantas categorias "quase lá" mostrar no cartão de destaque. Três é o que
// cabe numa linha sem apertar e, mais importante, é pouco: a graça de um
// objetivo à vista é haver poucos. Uma lista de doze volta a ser a tab das
// Conquistas, que é exatamente o que isto NÃO deve ser.
const NEXT_UP_COUNT = 3;

// As categorias mais perto de desbloquear o próximo nível, a partir do mesmo
// modelo que a tab das Conquistas usa — não de uma escada paralela inventada
// só para aqui. Era fácil fazer uma "barra de XP" com regras próprias, mas
// ficavam dois sistemas de progressão a discordar um do outro, e o que
// aparecesse aqui não teria nada a ver com os distintivos a sério.
//
// "Quase lá" é mesmo progresso relativo (valor/próximo nível) e não distância
// absoluta: faltarem 2 vitórias para 10 é estar quase; faltarem 2 para 500
// também, mas em 500 jogos isso não é notícia nenhuma.
function buildNextUp(categories) {
  return categories
    .map((cat) => {
      const nextTierIdx = cat.tiers.findIndex((tier) => cat.value < tier);
      if (nextTierIdx === -1) return null; // escada completa, já não há o que perseguir
      const nextTier = cat.tiers[nextTierIdx];
      return {
        id: cat.id,
        title: cat.title,
        value: cat.value,
        unit: cat.unit,
        nextTier,
        progress: cat.value / nextTier,
        rank: rankForTierIndex(nextTierIdx, cat.tiers.length),
      };
    })
    .filter((cat) => cat && cat.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, NEXT_UP_COUNT);
}

function dayKey(date) {
  // Chave local (não UTC) para não desalinhar o dia por causa do fuso —
  // toISOString() converte para UTC primeiro, o que podia empurrar uma
  // partida jogada à noite para o dia seguinte/anterior no grid.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Agrupa partidas (já ordenadas da mais recente para a mais antiga, ver
// db/api.js) em sessões — a regra do intervalo vive em lib/sessionCurve.js,
// que é o outro consumidor dela (ver a curva da sentada mais abaixo).
function buildSessions(matches) {
  return splitSessions(matches).map((ms) => {
    const newest = new Date(ms[0].created_at);
    const oldest = new Date(ms[ms.length - 1].created_at);

    // O que interessa aqui é o LUGAR em que se ficou, não só vitória/derrota
    // — só cai de volta para vitória/derrota nas partidas antigas (só Live
    // Client Data) que não têm lugar exato nenhum.
    const withPlacement = ms.filter((m) => m.placement != null);
    const avgPlacement = withPlacement.length
      ? withPlacement.reduce((sum, m) => sum + m.placement, 0) / withPlacement.length
      : null;
    const bestPlacement = withPlacement.length
      ? Math.min(...withPlacement.map((m) => m.placement))
      : null;
    const top3Count = withPlacement.filter((m) => m.placement <= 3).length;
    const wins = ms.filter((m) => m.win).length;

    let bestTop3Streak = 0;
    let run = 0;
    ms.forEach((m) => {
      const isTop3 = m.placement != null ? m.placement <= 3 : m.win;
      if (isTop3) {
        run += 1;
        bestTop3Streak = Math.max(bestTop3Streak, run);
      } else {
        run = 0;
      }
    });

    return {
      // A sentada guarda as próprias partidas: a fileira abre no sítio para
      // as mostrar uma a uma (ver openSession na Visão Geral). Antes isto
      // devolvia só os agregados, e quem quisesse saber QUE partidas fizeram
      // uma média de 5.3º tinha de ir ao Histórico procurar pela hora.
      matches: ms,
      games: ms.length,
      withPlacementCount: withPlacement.length,
      avgPlacement,
      bestPlacement,
      top3Count,
      wins,
      bestTop3Streak,
      start: oldest,
      end: newest,
      durationMin: Math.max(1, Math.round((newest - oldest) / 60000)),
    };
  });
}

// Cartão de destaque. É componente próprio e não JSX inline na grelha porque
// cada um precisa do seu próprio contador — e um hook não se chama dentro de
// um .map().
//
// Só conta valores que sejam mesmo um número. A grelha mistura inteiros ("4"),
// decimais ("6.7"), lugares ("2.0º"), tempos ("15:12") e texto ("Triple
// Kill"): tentar animar tudo dava um contador a subir por cima de um relógio,
// que se lê como erro. O resto aparece feito, como sempre.
function SpotlightCard({ sp, index, DRAGON, champName, onOpen, lang }) {
  const raw = String(sp.value);
  const plain = /^-?\d+(\.\d+)?$/.test(raw.trim());

  // Inteiros com separador de milhares ("17 369") também contam. Parecem
  // texto a um teste ingénuo, e são precisamente os números em que ver a
  // subida sabe melhor. A regra para aceitar um é estrita de propósito: só
  // vale se a app conseguir REPRODUZIR a string original a partir do número
  // (mesma chamada, toLocaleString sem argumentos, que é como o valor foi
  // feito — ver overviewSpotlights.js). Se não bater certo ao caráter, não se
  // anima, e assim nunca se corre o risco de a contagem mudar o formato do
  // que está escrito.
  const digits = raw.replace(/[^\d-]/g, "");
  const asInt = digits === "" ? NaN : Number(digits);
  const grouped = !plain && Number.isFinite(asInt) && asInt.toLocaleString() === raw;

  const numeric = plain || grouped;
  const decimals = plain && raw.includes(".") ? raw.split(".")[1].length : 0;

  // Conta escrevendo direto no nó (ver useCountUpNode): são 28 cartões, e por
  // estado do React isso eram 28 re-renders por frame.
  const valueRef = useCountUpNode(plain ? parseFloat(raw) : asInt, {
    decimals,
    enabled: numeric,
    format: grouped ? (v) => Math.round(v).toLocaleString() : undefined,
  });

  const open = () => onOpen(sp.champion, sp.sortKey);

  return (
    <div
      className="at-highlight riseIn"
      // A cor do destaque entra como variável CSS em vez de estilo direto: o
      // realce do hover vive no index.css (um estilo inline nunca ganharia a
      // um :hover de folha de estilo) e lá dentro lê esta variável. É assim
      // que cada cartão acende na SUA cor sem precisar de 25 regras.
      style={{
        ...styles.spotlightCard,
        "--hl-color": sp.color,
        // Escalonamento: cada cartão entra 30ms depois do anterior, o que lê
        // como a grelha a preencher-se em vez de aparecer toda de um golpe.
        // O teto nos 8 é para a cauda não crescer sem fim.
        animationDelay: `${Math.min(index, 8) * 30}ms`,
      }}
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        open();
      }}
    >
      {/* O ícone do campeão, ampliado e desfocado, como textura de fundo.
          Não custa pedido nenhum extra — é a mesma imagem que o rodapé já
          carrega — e dá a cada cartão um fundo próprio em vez de vinte e
          cinco retângulos iguais. */}
      {DRAGON && sp.champion && (
        <img
          className="at-highlight-bg"
          src={`${DRAGON}/img/champion/${sp.champion}.png`}
          alt=""
          aria-hidden="true"
        />
      )}

      <span className="at-highlight-edge" />

      <div style={styles.spotlightLabel}>
        {sp.label}
        {sp.sampleCount != null && (
          <span style={styles.spotlightSampleCount}>
            {" "}
            · {sp.sampleCount}
            {lang === "en" ? "g" : "j"}
          </span>
        )}
      </div>

      {/* O valor ocupa a largura toda do cartão em vez de disputar a linha
          com o nome do campeão — era isso que cortava valores longos
          ("Triple Kill", números grandes de dano/ouro) em cartões estreitos. */}
      <div ref={valueRef} style={{ ...styles.spotlightValue, color: sp.color }} title={raw}>
        {raw}
      </div>

      <div style={styles.spotlightFoot}>
        {sp.champion ? (
          <Tooltip label={champName(sp.champion)}>
            <div style={styles.spotlightChampWrap}>
              {DRAGON && (
                <img
                  src={`${DRAGON}/img/champion/${sp.champion}.png`}
                  style={styles.spotlightIcon}
                  alt=""
                />
              )}
              <span style={styles.spotlightChampName}>{champName(sp.champion)}</span>
            </div>
          </Tooltip>
        ) : (
          // Alguns destaques são recordes globais sem campeão associado (ex:
          // partida mais longa) — a linha vazia mantém a altura do cartão
          // igual à dos vizinhos, para a grelha não ficar aos degraus.
          <div style={styles.spotlightChampWrap} />
        )}
        {/* Só aparece com o rato em cima: diz para onde o cartão leva sem
            estar escrito vinte e cinco vezes na página ao mesmo tempo. */}
        <span className="at-highlight-go" aria-hidden="true">
          <ChevronRight size={14} strokeWidth={2.75} />
        </span>
      </div>
    </div>
  );
}

// Sessões de uma partida só passaram a aparecer na lista (ver "sessions"),
// e com elas o "1 jogos"/"1 games" que antes nunca chegava a ser visível.
function gamesWord(count, lang) {
  if (lang === "en") return count === 1 ? "game" : "games";
  return count === 1 ? "jogo" : "jogos";
}

function fmtTime(date, lang) {
  return date.toLocaleTimeString(lang === "en" ? "en-US" : "pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function heatColor(games) {
  if (!games) return "rgba(var(--soft-rgb),0.08)";
  if (games === 1) return "rgba(var(--accent-rgb),0.35)";
  if (games <= 3) return "rgba(var(--accent-rgb),0.6)";
  return "rgba(var(--accent-rgb),0.9)";
}

// Grid ao estilo GitHub contributions: semanas como colunas (domingo a
// sábado em cada coluna), terminando sempre no sábado da semana atual para o
// grid ficar sempre alinhado, mesmo quando a última partida foi há dias.
function buildHeatmapWeeks(dayMap, weeksCount) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const totalDays = weeksCount * 7;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - totalDays + 1);

  const weeks = [];
  const cursor = new Date(startDate);
  for (let w = 0; w < weeksCount; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const key = dayKey(cursor);
      const entry = dayMap[key];
      days.push({
        date: new Date(cursor),
        key,
        games: entry?.games || 0,
        wins: entry?.wins || 0,
        future: cursor > today,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);
  }
  return weeks;
}

export default function Overview({
  matches,
  wins,
  champions,
  DRAGON,
  onOpenChampionStats,
  challengeWins = 0,
  onOpenAchievements,
}) {
  const { t, lang } = useLanguage();
  const champName = (id) => champions.find((c) => c.id === id)?.name || id;

  const recentForm = useMemo(() => matches.slice(0, 8), [matches]);

  // Progressão das conquistas, resumida: quantos distintivos de quantos, e as
  // três categorias mais perto do próximo nível. Vem do mesmo cálculo que a
  // tab das Conquistas faz — aqui é só o resumo e o que vem a seguir, para o
  // ecrã de entrada ter um objetivo à vista sem ser uma segunda lista de
  // conquistas.
  const progression = useMemo(() => {
    const stats = computeAchievementStats(matches, champions, wins, challengeWins);
    const categories = buildAchievementCategories(stats, t);
    const booleans = buildBooleanAchievements(stats, t);
    return {
      ...summarizeBadges(categories, booleans),
      nextUp: buildNextUp(categories),
    };
    // "t" muda com o idioma e só serve para os títulos; depender dele mantém
    // os rótulos certos ao trocar de língua.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, champions, wins, challengeWins, lang]);

  // matches vem sempre ordenado do mais recente para o mais antigo (ver
  // db/api.js: .order("created_at", { ascending: false })), por isso o
  // streak atual é só percorrer a partir do início até a sequência quebrar.
  // O melhor streak (de vitórias) é o maior conjunto de vitórias seguidas em
  // toda a história — a direção da varrida não importa para isso, só a
  // sequência entre partidas adjacentes.
  // Resumo rápido de carreira (progresso do roster, jogos, taxas de Top1/
  // Top3, sequências) — ver lib/overviewSpotlights.js, partilhado com a tab
  // Comparar para os dois lados usarem sempre os mesmos números.
  const career = useMemo(() => computeCareerSummary(matches, wins, champions), [matches, wins, champions]);

  // Jogadores premade — para cada colega de equipa com quem já se jogou
  // (a Arena já teve formato de 2v2, e agora é 3v3, por isso um lugar final
  // pode ter mais do que um colega), quantas partidas, vitórias e top3
  // saíram juntos. "participants" já traz todos os jogadores da partida (ver
  // extractAllParticipants em electron.js); os colegas de equipa são quem
  // partilha o mesmo lugar final e não é o próprio jogador. Nota: não há
  // forma de distinguir com certeza um parceiro premade de alguém
  // emparelhado por matchmaking — isto assume premade sempre que se repete
  // o mesmo colega em várias partidas.
  const duoSynergy = useMemo(() => {
    const map = {};
    matches.forEach((m) => {
      if (!m.participants?.length || m.placement == null) return;
      const teammates = m.participants.filter((p) => !p.isSelf && p.placement === m.placement);
      if (!teammates.length) return;

      teammates.forEach((teammate) => {
        const key = teammate.name || (lang === "en" ? "Unknown partner" : "Parceiro desconhecido");
        if (!map[key]) map[key] = { name: key, games: 0, wins: 0, top3: 0 };
        map[key].games += 1;
        if (m.win) map[key].wins += 1;
        if (m.placement <= 3) map[key].top3 += 1;
      });
    });

    return Object.values(map)
      .filter((d) => d.games >= 2)
      .map((d) => ({
        ...d,
        // Métrica principal por Top 3 (chegar ao pódio já conta como bom
        // resultado na Arena); o 1º lugar (vitória "a sério") fica à parte.
        top3Rate: Math.round((d.top3 / d.games) * 100),
        top1Rate: Math.round((d.wins / d.games) * 100),
      }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 6);
  }, [matches, lang]);

  // Todas as sessões, mesmo as de uma partida só — apenas as mais recentes,
  // para não sobrecarregar o ecrã com histórico antigo.
  //
  // Havia aqui um filtro "games >= 2", com a ideia de que uma partida sozinha
  // não é bem uma "sessão". Na prática o que isso fazia era esconder dias
  // inteiros: quem entra, joga uma partida e sai — que é metade das idas ao
  // jogo — simplesmente não aparecia em lado nenhum, e o painel dava a
  // impressão de estar parado num dia antigo enquanto o heatmap logo ao lado
  // (que nunca filtrou nada) mostrava esses dias pintados. Entre "a lista tem
  // entradas curtas" e "a lista mente sobre quando jogaste", a primeira é bem
  // menos má.
  const sessions = useMemo(() => buildSessions(matches).slice(0, 6), [matches]);

  // A curva da sentada (ver lib/sessionCurve.js): a mesma divisão em sessões
  // lida ao contrário — não sessão a sessão, mas a 1ª partida de todas contra
  // a 2ª de todas, e assim por diante.
  // Quantas vezes em cada lugar, e o lugar médio.
  //
  // Conta o lugar EM BRUTO e não o normalizado (ver normalizedPlacement em
  // lib/sessionCurve.js): a pergunta é "quantas vezes fiquei em 3º", e a
  // resposta a isso tem de ser um número inteiro de partidas em que se ficou
  // mesmo em 3º. O valor normalizado é fracionário — serve para médias, não
  // para contagens.
  //
  // Quantos lugares mostrar sai do próprio formato das partidas: 6 equipas de
  // 3 vão até ao 6º, 8 equipas de 2 vão até ao 8º. Com os dois no mesmo
  // conjunto usa-se o maior e avisa-se (ver mixedFormats) — inventar oito
  // lugares para quem só joga 3v3 dava duas linhas sempre a zero.
  const placementSpread = useMemo(() => {
    const withPlacement = matches.filter((m) => m.placement != null);
    if (!withPlacement.length) {
      return { total: 0, rows: [], average: 0, max: 0, mixedFormats: false };
    }

    const lasts = new Set(withPlacement.map((m) => lastPlacementFor(m.team_size)));
    const maxPlace = Math.max(...lasts);

    const counts = new Map();
    withPlacement.forEach((m) => counts.set(m.placement, (counts.get(m.placement) || 0) + 1));

    const rows = Array.from({ length: maxPlace }, (_, i) => ({
      place: i + 1,
      count: counts.get(i + 1) || 0,
    }));

    const sum = withPlacement.reduce((acc, m) => acc + m.placement, 0);

    return {
      total: withPlacement.length,
      rows,
      average: sum / withPlacement.length,
      max: Math.max(...rows.map((r) => r.count)),
      mixedFormats: lasts.size > 1,
    };
  }, [matches]);

  const heatmapWeeks = useMemo(() => {
    const dayMap = {};
    matches.forEach((m) => {
      if (!m.created_at) return;
      const key = dayKey(new Date(m.created_at));
      if (!dayMap[key]) dayMap[key] = { games: 0, wins: 0 };
      dayMap[key].games += 1;
      if (m.win) dayMap[key].wins += 1;
    });
    return buildHeatmapWeeks(dayMap, HEATMAP_WEEKS);
  }, [matches]);

  // Um mês só ganha legenda na primeira semana em que aparece, para não
  // repetir o nome em todas as colunas desse mês (igual ao GitHub).
  const monthLabels = useMemo(() => {
    let lastMonth = null;
    return heatmapWeeks.map((week) => {
      const firstDay = week[0].date;
      const monthKey = `${firstDay.getFullYear()}-${firstDay.getMonth()}`;
      if (monthKey === lastMonth) return null;
      lastMonth = monthKey;
      return firstDay.toLocaleDateString(lang === "en" ? "en-US" : "pt-PT", { month: "short" });
    });
  }, [heatmapWeeks, lang]);

  // ================= LARGURA RESPONSIVA DO HEATMAP =================
  // Antes as células tinham um tamanho fixo (16px) e, quando o cartão não
  // tinha os ~373px necessários para as 18 semanas lado a lado, aparecia um
  // scroll horizontal — exatamente o que não queremos numa app "sem scroll
  // do Windows". Em vez disso, medimos a largura real disponível (ver
  // heatmapContainerRef) e encolhemos as células o suficiente para as 18
  // semanas caberem sempre inteiras, sem nunca precisar de scroll.
  const heatmapContainerRef = useRef(null);
  // Qual sentada está aberta (índice), ou null. Uma de cada vez: abrir
  // várias enchia a coluna e perdia-se a comparação entre noites, que é
  // para o que a lista serve.
  const [openSession, setOpenSession] = useState(null);

  const [heatmapWidth, setHeatmapWidth] = useState(0);

  useEffect(() => {
    const el = heatmapContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setHeatmapWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const HEATMAP_CELL_GAP = 4;
  const HEATMAP_MIN_CELL = 7;
  const HEATMAP_MAX_CELL = 16;
  const heatmapCellSize = heatmapWidth
    ? Math.min(
        HEATMAP_MAX_CELL,
        Math.max(
          HEATMAP_MIN_CELL,
          Math.floor((heatmapWidth - (HEATMAP_WEEKS - 1) * HEATMAP_CELL_GAP) / HEATMAP_WEEKS)
        )
      )
    : HEATMAP_MAX_CELL;

  // Destaques por campeão, agrupados por tema — ver lib/overviewSpotlights.js
  // (partilhado com a tab Comparar). Cada item aí vem sempre presente (só
  // "value"/"champion" podem ser null quando não há dados suficientes); aqui
  // filtra-se por item (não por grupo inteiro) para só mostrar os já
  // preenchidos, e o grupo todo desaparece se nenhum dos seus itens tiver
  // dados.
  const spotlightGroups = useMemo(() => {
    return computeSpotlightGroups(matches, champions, t)
      .map((g) => ({ ...g, items: g.items.filter((sp) => sp.value != null) }))
      .filter((g) => g.items.length > 0);
  }, [matches, champions, t]);

  // Os dois números grandes do cartão sobem até ao valor em vez de aparecerem
  // feitos (ver lib/useCountUp.js) — com movimento reduzido ligado aparecem
  // logo certos, sem contagem.
  const coverageCount = useCountUpInt(career.coverage);
  const badgesCount = useCountUpInt(progression.unlockedBadges);

  return (
    <div style={styles.wrap}>
      {/* HERO — progresso do roster + estatísticas rápidas de carreira,
          tudo num único cartão de destaque em vez de uma barra isolada. */}
      <div style={styles.hero}>
        <div style={styles.heroTop}>
          <div>
            <div style={styles.heroKicker}>{t("overview_roster_progress")}</div>
            <div style={styles.heroBig}>{coverageCount}%</div>
            <div style={styles.progressText}>
              {wins.length} / {champions.length}
            </div>
          </div>

          {/* Só as sequências. Os três números que aqui estavam — total de
              partidas, taxa de top 3 e taxa de 1º lugar — são EXATAMENTE os
              que a StatsBar mostra a poucos pixéis daqui, no cabeçalho, e
              que ela mostra em todas as tabs. Eram os mesmos valores duas
              vezes, em duas linguagens visuais diferentes, e era isso que
              fazia o topo da página parecer cheio sem dizer mais nada. O que
              fica é o que a StatsBar NÃO dá: a cobertura do roster (o número
              grande ao lado) e as sequências. */}
          <div style={styles.heroStatsRow}>
            {/* Sem divisórias entre as duas: são no máximo dois valores e o
                "gap" da fileira já os separa. As divisórias faziam sentido
                quando aqui viviam cinco. */}
            {career.streakCurrent > 1 && (
              <div
                style={{
                  ...styles.heroStat,
                  ...heroChipStyle(
                    career.streakCurrentType === "win" ? "var(--place-good)" : "var(--place-low)"
                  ),
                }}
              >
                <div
                  style={{
                    ...styles.heroStatValue,
                    color: career.streakCurrentType === "win" ? "var(--place-good)" : "var(--place-low)",
                  }}
                >
                  {career.streakCurrentType === "win" ? "🔥" : "❄️"} {career.streakCurrent}
                </div>
                <div style={styles.heroStatLabel}>
                  {career.streakCurrentType === "win" ? t("streak_wins_suffix") : t("streak_losses_suffix")}
                </div>
              </div>
            )}
            {career.streakBestWin > 1 && (
              <Tooltip label={t("streak_best_tooltip")}>
                <div style={styles.heroStat}>
                  <div style={styles.heroStatValue}>🏆 {career.streakBestWin}</div>
                  <div style={styles.heroStatLabel}>{t("streak_best_label")}</div>
                </div>
              </Tooltip>
            )}
          </div>
        </div>

        <div style={styles.progressTrack}>
          <motion.div
            style={styles.progressFill}
            initial={{ width: 0 }}
            animate={{ width: `${career.coverage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* PROGRESSÃO — distintivos ganhos e o que está mais perto de cair.
            O ecrã de entrada dizia só onde se está; isto diz para onde se
            vai, que é o que faz voltar cá. Não repete a tab das Conquistas:
            lá estão as 23 categorias com as escadas todas, aqui está o
            total e as três que faltam menos. É o mesmo cálculo, por isso os
            números nunca discordam (ver buildNextUp). */}
        {progression.totalBadges > 0 && (
          <div
            className="at-progress"
            style={styles.heroProgress}
            onClick={onOpenAchievements}
            role={onOpenAchievements ? "button" : undefined}
            tabIndex={onOpenAchievements ? 0 : undefined}
            onKeyDown={(e) => {
              if (!onOpenAchievements || (e.key !== "Enter" && e.key !== " ")) return;
              e.preventDefault();
              onOpenAchievements();
            }}
          >
            <div style={styles.heroProgressHead}>
              <span style={styles.heroFormLabel}>{t("overview_badges")}</span>
              <span style={styles.heroBadgeCount}>
                {badgesCount}
                <span style={styles.heroBadgeTotal}> / {progression.totalBadges}</span>
              </span>
            </div>

            {progression.nextUp.length > 0 && (
              <div style={styles.nextUpRow}>
                {progression.nextUp.map((cat) => (
                  <Tooltip
                    key={cat.id}
                    label={`${cat.title} — ${formatAchievementValue(cat.value, cat.unit)} / ${formatAchievementValue(cat.nextTier, cat.unit)} · ${t(cat.rank.labelKey)}`}
                    style={styles.nextUpWrap}
                  >
                    <div style={styles.nextUpCard}>
                      <div style={styles.nextUpTop}>
                        <span style={styles.nextUpTitle}>{cat.title}</span>
                        {/* Os dois números, e não só o alvo: sozinho, "50" ao
                            lado de "Partidas com lutadores" lia-se como
                            "tenho 50" em vez de "faltam para 50" — ou seja,
                            exatamente ao contrário.
                            Sem a cor do nível no texto, de propósito: as
                            cores dos ranks são fixas (não mudam com o tema) e
                            as claras — esmeralda, platina, diamante — sobre o
                            painel branco do tema claro ficam em cerca de 2:1,
                            ilegíveis num número de 11px. Quem carrega a cor é
                            a barra aqui por baixo, onde é forma e não texto.
                            Para saber QUE nível é, o tooltip diz o nome. */}
                        <span style={styles.nextUpRank}>
                          {formatAchievementValue(cat.value, cat.unit)}
                          <span style={styles.nextUpTarget}>
                            {" / "}
                            {formatAchievementValue(cat.nextTier, cat.unit)}
                          </span>
                        </span>
                      </div>
                      <div style={styles.nextUpTrack}>
                        <motion.div
                          style={{ ...styles.nextUpFill, background: cat.rank.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.round(cat.progress * 100))}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FORMA RECENTE — veio para dentro do cartão de destaque. Tinha uma
            secção inteira só para si: título, moldura, sombra e padding à
            volta de UMA fila de oito quadrados de 28px. Custava uma faixa
            inteira de altura para a informação que menos espaço precisa, e
            em cima pertence mesmo aqui: as últimas oito partidas são a
            leitura curta das sequências que estão logo ao lado. */}
        {recentForm.length > 0 && (
          <div style={styles.heroForm}>
            <span style={styles.heroFormLabel}>{t("overview_recent_form")}</span>
            <div style={styles.formRow}>
            {recentForm.map((m, i) => {
              // Se já houver o lugar exato (via Riot API) mostramos esse
              // número; partidas antigas (só Live Client Data) mostram V/D
              // como reserva, já que não têm o dado de lugar.
              const hasPlacement = !!m.placement;
              // Partidas antigas (só Live Client Data) não têm lugar exato —
              // caem no mesmo par bom/mau usado para o resto do pódio, em
              // vez de uma cor à parte.
              const color = hasPlacement
                ? placementColor(m.placement)
                : m.win
                ? "var(--place-good)"
                : "var(--place-low)";
              const label = hasPlacement ? placementText(m.placement) : m.win ? (lang === "en" ? "W" : "V") : (lang === "en" ? "L" : "D");
              const title = hasPlacement
                ? `${champName(m.champion)} — ${placementText(m.placement)} ${lang === "en" ? "place" : "lugar"}`
                : `${champName(m.champion)} (${lang === "en" ? "no placement data" : "sem dado de lugar"})`;

              return (
                <Tooltip key={i} label={title}>
                  <div
                    className="at-pill"
                    style={{
                      ...styles.formPill,
                      background: `color-mix(in srgb, ${color} 15%, transparent)`,
                      color,
                      border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
                    }}
                  >
                    {label}
                  </div>
                </Tooltip>
              );
            })}
            </div>
          </div>
        )}
      </div>

      {/* ATIVIDADE + SESSÕES + PREMADE em "bento grid" — Sessões é sempre o
          conteúdo mais denso (várias linhas, cada uma com data/hora + 4-5
          estatísticas), por isso fica na coluna larga; Atividade (heatmap
          compacto) e Premade empilham na coluna estreita ao lado, cada um
          só com a altura que o seu próprio conteúdo precisa — já não são
          forçados à mesma altura um do outro (era isso que deixava um vazio
          estranho por baixo da Atividade, ver histórico desta secção).
          Se faltar a Sessões (sem sessões de 2+ jogos ainda), Atividade+
          Premade passam a ocupar a largura toda, lado a lado em vez de
          empilhados, para não desperdiçar espaço horizontal. */}
      {(matches.length > 0 || sessions.length > 0 || duoSynergy.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* SESSÕES — partidas seguidas na mesma sentada, agrupadas por um
              gap máximo entre elas (ver SESSION_GAP_MINUTES); a Arena não dá
              a hora de início de cada partida, só a de fim, por isso isto é
              sempre uma aproximação. */}
          {sessions.length > 0 && (
            <div
              className={`riseIn ${
                matches.length > 0 || duoSynergy.length > 0 ? "lg:col-span-7" : "lg:col-span-12"
              }`}
              style={styles.section}
            >
              <h2 style={styles.sectionTitle}>⏱️ {t("overview_sessions")}</h2>
              <div style={styles.sessionList}>
                {sessions.map((s, i) => {
                  const isOpen = openSession === i;
                  return (
                  <div
                    key={i}
                    className="at-session"
                    style={styles.sessionRow}
                    onClick={() => setOpenSession(isOpen ? null : i)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      setOpenSession(isOpen ? null : i);
                    }}
                  >
                    <div style={styles.sessionHeader}>
                      {/* A seta roda em vez de trocar de ícone: é o mesmo
                          objeto a abrir, e a rotação diz isso melhor do que
                          dois símbolos diferentes a piscar um no outro. */}
                      <span
                        style={{
                          ...styles.sessionChevron,
                          transform: isOpen ? "rotate(90deg)" : "none",
                        }}
                      >
                        <ChevronRight size={13} strokeWidth={2.5} />
                      </span>
                      <span style={styles.sessionDate}>
                        {s.start.toLocaleDateString(lang === "en" ? "en-US" : "pt-PT")}
                      </span>
                      {/* Numa sessão de uma partida só o início e o fim são o
                          mesmo instante — mostrar "17:21 – 17:21" parecia um
                          erro, por isso nesse caso fica só a hora. */}
                      <span style={styles.sessionTime}>
                        {s.games > 1
                          ? `${fmtTime(s.start, lang)}–${fmtTime(s.end, lang)}`
                          : fmtTime(s.start, lang)}
                      </span>
                    </div>
                    <div style={styles.sessionStats}>
                      <span style={styles.sessionStat}>
                        {s.games} {gamesWord(s.games, lang)}
                      </span>
                      {s.withPlacementCount > 0 ? (
                        <>
                          <span
                            style={{
                              ...styles.sessionWinrate,
                              color: placementColor(Math.round(s.avgPlacement)),
                            }}
                          >
                            {t("session_avg_placement")}: {s.avgPlacement.toFixed(1)}º
                          </span>
                          <span style={styles.sessionStat}>
                            {t("session_best")}: {placementText(s.bestPlacement)}
                          </span>
                          <span style={styles.sessionStat}>
                            {s.top3Count}/{s.withPlacementCount} Top3
                          </span>
                          <span style={styles.sessionStat}>
                            {s.wins}{lang === "en" ? "W" : "V"} ({lang === "en" ? "1st" : "1º"})
                          </span>
                        </>
                      ) : (
                        <span
                          style={{
                            ...styles.sessionWinrate,
                            color: s.wins >= s.games / 2 ? "var(--place-good)" : "var(--place-low)",
                          }}
                        >
                          {s.wins}{lang === "en" ? "W" : "V"}/{s.games}
                        </span>
                      )}
                      {s.bestTop3Streak > 1 && (
                        <span style={styles.sessionStreak}>🔥 {s.bestTop3Streak}</span>
                      )}
                    </div>

                    {/* As partidas da sentada, por ordem de jogo (as mais
                        antigas primeiro): assim lê-se como a noite correu,
                        que é a pergunta que a média e a melhor posição não
                        respondem. */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          style={styles.sessionGames}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                        >
                          <div style={styles.sessionGamesInner}>
                            {[...s.matches].reverse().map((m, mi) => {
                              const color = m.placement
                                ? placementColor(m.placement)
                                : m.win
                                ? "var(--place-good)"
                                : "var(--place-low)";
                              return (
                                <div key={mi} style={styles.sessionGame}>
                                  <span style={{ ...styles.sessionGamePlace, color }}>
                                    {m.placement
                                      ? placementText(m.placement)
                                      : m.win
                                      ? lang === "en" ? "W" : "V"
                                      : lang === "en" ? "L" : "D"}
                                  </span>
                                  {DRAGON && (
                                    <img
                                      src={`${DRAGON}/img/champion/${m.champion}.png`}
                                      style={styles.sessionGameIcon}
                                      alt=""
                                    />
                                  )}
                                  <span style={styles.sessionGameName}>{champName(m.champion)}</span>
                                  <span style={styles.sessionGameKda}>
                                    {m.kills}/{m.deaths}/{m.assists}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Coluna estreita (Atividade + Premade) — vira uma fileira de 2
              colunas em vez de empilhar quando a Sessões não existe, para
              usar a largura toda. */}
          <div
            className={
              sessions.length > 0
                ? "lg:col-span-5 flex flex-col gap-4"
                : "lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-4"
            }
          >
          {/* ATIVIDADE — grid de contribuições ao estilo GitHub, uma célula
              por dia das últimas ~18 semanas, cor mais forte quanto mais
              partidas jogadas nesse dia. */}
          {matches.length > 0 && (
            <div className="riseIn" style={styles.section}>
              <h2 style={styles.sectionTitle}>📅 {t("overview_activity")}</h2>
              {/* O gráfico ocupa muito menos altura que as listas de Sessões/
                  Premade ao lado — em vez de deixar um vazio estranho por
                  baixo quando o cartão estica para acompanhar essas duas,
                  centra-se verticalmente no espaço disponível. */}
              <div style={styles.heatmapBody}>
                <div ref={heatmapContainerRef} style={styles.heatmapScroll}>
                  <div style={{ ...styles.heatmapGrid, gap: HEATMAP_CELL_GAP }}>
                    {heatmapWeeks.map((week, wi) => (
                      <div key={wi} style={{ ...styles.heatmapCol, gap: HEATMAP_CELL_GAP }}>
                        <div style={styles.heatmapMonthLabel}>{monthLabels[wi] || ""}</div>
                        {week.map((day) => (
                          <Tooltip
                            key={day.key}
                            label={
                              day.future
                                ? day.date.toLocaleDateString(lang === "en" ? "en-US" : "pt-PT")
                                : `${day.date.toLocaleDateString(lang === "en" ? "en-US" : "pt-PT")} · ${
                                    day.games
                                      ? `${day.games} ${lang === "en" ? "games" : "jogos"} (${day.wins}${
                                          lang === "en" ? "W" : "V"
                                        })`
                                      : lang === "en"
                                      ? "no games"
                                      : "sem jogos"
                                  }`
                            }
                          >
                            <div
                              className="at-day"
                              style={{
                                width: heatmapCellSize,
                                height: heatmapCellSize,
                                borderRadius: "var(--radius-xs)",
                                background: day.future ? "transparent" : heatColor(day.games),
                                border: day.future ? "1px dashed rgba(var(--border-rgb),0.25)" : "none",
                              }}
                            />
                          </Tooltip>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={styles.heatmapLegend}>
                  <span>{t("heatmap_less")}</span>
                  {[0, 1, 2, 4].map((g) => (
                    <div key={g} style={{ ...styles.heatmapCell, background: heatColor(g) }} />
                  ))}
                  <span>{t("heatmap_more")}</span>
                </div>
              </div>
            </div>
          )}

          {/* PREMADE — conta qualquer colega de equipa repetido, seja em
              2v2 ou 3v3. */}
          {duoSynergy.length > 0 && (
            <div className="riseIn" style={styles.section}>
              <h2 style={styles.sectionTitle}>🤝 {t("overview_duo_synergy")}</h2>
              <div style={styles.duoList}>
                {duoSynergy.map((d) => (
                  <div key={d.name} style={styles.duoRow}>
                    <span style={styles.duoName}>{d.name}</span>
                    <span style={styles.duoGames}>
                      {d.games} {lang === "en" ? "games" : "jogos"}
                    </span>
                    <span style={styles.duoStat}>
                      {d.wins}{lang === "en" ? "W" : "V"} ({d.top1Rate}%)
                    </span>
                    <span
                      style={{
                        ...styles.duoWinrate,
                        color: d.top3Rate >= 50 ? "var(--place-good)" : "var(--place-low)",
                      }}
                    >
                      {t("stat_top3_short")} {d.top3Rate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* DISTRIBUIÇÃO DE LUGARES — quantas vezes em cada lugar, e o lugar
          médio. Substituiu a "curva da sentada" (lugar médio conforme a
          posição da partida dentro da sentada), que respondia a "a partir de
          quando começo a jogar pior" — uma pergunta interessante mas que
          ninguém faz ao abrir a app. Isto responde à que se faz: onde é que
          costumo acabar. */}
      {placementSpread.total > 0 && (
        <div className="riseIn" style={styles.section}>
          <h2 style={styles.sectionTitle}>🎯 {t("overview_placement_spread")}</h2>

          <div style={styles.spreadTop}>
            <div style={styles.spreadAvgBox}>
              <div style={{ ...styles.spreadAvgValue, color: placementColor(Math.round(placementSpread.average)) }}>
                {placementSpread.average.toFixed(1)}º
              </div>
              <div style={styles.spreadAvgLabel}>{t("overview_avg_placement")}</div>
            </div>
            <div style={styles.spreadAvgBox}>
              <div style={styles.spreadAvgValue}>{placementSpread.total}</div>
              <div style={styles.spreadAvgLabel}>{t("overview_placement_counted")}</div>
            </div>
          </div>

          <div style={styles.spreadList}>
            {placementSpread.rows.map((row) => {
              const color = placementColor(row.place);
              // A barra mede a FREQUÊNCIA, por isso é a contagem contra o
              // lugar mais repetido — não contra o total. Contra o total, com
              // oito lugares, nenhuma barra passava de um terço e o gráfico
              // ficava todo achatado contra a esquerda.
              const pct = placementSpread.max ? (row.count / placementSpread.max) * 100 : 0;
              return (
                <div key={row.place} style={styles.spreadRow}>
                  <span style={{ ...styles.spreadPlace, color }}>{placementText(row.place)}</span>

                  <div style={styles.spreadTrack}>
                    <motion.div
                      style={{
                        ...styles.spreadBar,
                        background: `color-mix(in srgb, ${color} 65%, transparent)`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>

                  <span style={styles.spreadCount}>
                    {row.count} {gamesWord(row.count, lang)}
                  </span>
                  <span style={styles.spreadPct}>
                    {Math.round((row.count / placementSpread.total) * 100)}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* A Arena já teve 8 equipas de 2 e tem 6 equipas de 3: um 4º lugar
              está a meio da tabela num formato e na metade de baixo no outro.
              Com os dois misturados a contagem por lugar junta duas escalas,
              e o aviso é o mínimo honesto — o filtro de formato lá em cima
              separa-os. Só aparece quando há mesmo os dois. */}
          {placementSpread.mixedFormats && (
            <div style={styles.rowHint}>{t("overview_placement_mixed")}</div>
          )}
        </div>
      )}

      {/* SPOTLIGHTS — cada cartão é um atalho: clicar abre logo o campeão
          nas Estatísticas, já expandido, em vez de obrigar a ir procurá-lo.
          Agrupados em 3 blocos (melhores médias / pontos a melhorar /
          recordes de uma partida), cada um com o seu subtítulo, em vez de
          uma única grelha longa e indiferenciada — assim dá para perceber
          logo o que é cada cartão só pelo grupo em que está. */}
      {spotlightGroups.length > 0 && (
        <div>
          <h2 style={styles.spotlightSectionTitle}>🏆 {t("overview_highlights")}</h2>
          {/* O "ver nas estatísticas" era repetido DENTRO de cada cartão, e
              são mais de vinte na grelha — a mesma frase vinte vezes é
              ruído, não ajuda, e roubava uma linha de altura a cada cartão.
              Dito uma vez aqui chega; que o cartão é clicável já se percebe
              pelo hover (.clickableCard levanta-o e acende-lhe a moldura). */}
          <div style={styles.rowHint}>{t("overview_highlights_hint")}</div>

          {spotlightGroups.map((group, gi) => (
            <div
              key={group.key}
              style={{ ...styles.spotlightGroup, marginTop: gi === 0 ? 12 : 16 }}
            >
              <h3 style={styles.spotlightGroupTitle}>
                {group.icon} {group.title}
              </h3>
              {/* Grelha que se enche sozinha ("auto-fill") em vez de um
                  número de colunas fixo por breakpoint. Com colunas fixas,
                  um grupo de 5 cartões numa grelha de 4 deixava sempre um
                  cartão sozinho na segunda linha, e a largura da janela não
                  mudava nada disso. Assim as colunas acompanham o espaço
                  real e o cartão órfão aparece em bem menos larguras. */}
              <div style={styles.spotlightGrid}>
                {group.items.map((sp, i) => (
                  <SpotlightCard
                    key={sp.label}
                    sp={sp}
                    index={i}
                    DRAGON={DRAGON}
                    champName={champName}
                    onOpen={onOpenChampionStats}
                    lang={lang}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!matches.length && (
        <div style={styles.empty}>{t("overview_empty")}</div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    marginTop: 12,
  },

  empty: {
    padding: 20,
    textAlign: "center",
    color: "var(--text-secondary)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-xl)",
  },


  section: {
    background: "var(--panel-bg)",
    backdropFilter: "var(--panel-blur)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-2xl)",
    padding: 16,
    boxShadow: "0 6px 20px rgba(0,0,0,0.16)",
  },

  // 18px (--fs-lg) e não os 22 que o <h2> traz do index.css: estes são
  // rótulos de secção dentro de cartões, não títulos de página. Aos 22 a
  // palavra "Sessões recentes" pesava mais do que as linhas de números que
  // anuncia, e numa página com seis secções isso é muita tinta gasta em
  // cabeçalhos.
  sectionTitle: {
    marginBottom: 10,
    fontSize: "var(--fs-lg)",
    color: "var(--accent-text)",
  },

  // Cartão de destaque no topo — junta o progresso do roster e as
  // estatísticas rápidas de carreira (jogos, winrate, sequências) num único
  // relance, em vez de uma barra de progresso isolada sem mais contexto.
  hero: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    background: "linear-gradient(135deg, rgba(var(--accent-rgb),0.14), rgba(var(--panel-deep-rgb),0.97))",
    border: "1px solid rgba(var(--accent-rgb),0.3)",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
  },

  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 18,
  },

  heroKicker: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "var(--text-muted)",
    marginBottom: 2,
  },

  heroBig: {
    fontSize: 38,
    fontWeight: 900,
    color: "var(--accent-text)",
    lineHeight: 1.05,
  },

  heroStatsRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },

  heroStat: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  heroStatValue: {
    fontSize: 18,
    fontWeight: 800,
    color: "var(--text-body)",
    whiteSpace: "nowrap",
  },

  heroStatLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    whiteSpace: "nowrap",
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },

  progressText: {
    fontSize: 12,
    color: "var(--text-secondary)",
  },

  progressTrack: {
    height: 10,
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-deep)",
    overflow: "hidden",
    marginTop: 4,
  },

  // O gradiente começava num cinzento escrito à mão (#9aa0a6), sobra da
  // paleta antiga: com a cobertura baixa só se via o cinzento, ou seja, a
  // barra do roster quase nunca aparecia na cor da app. Passa a usar o token
  // do acento, que é o que as outras barras de progresso já usam.
  progressFill: {
    height: "100%",
    background: "var(--accent-gradient)",
    borderRadius: "var(--radius-sm)",
  },

  // Bloco de progressão (distintivos + o que falta menos). Clicável: leva à
  // tab das Conquistas, que é onde está a escada toda. O realce no hover vem
  // de ".at-progress" no index.css — aqui o fundo é declarado inline, e um
  // fundo inline mata qualquer regra de hover em CSS (foi o que aconteceu aos
  // botões do cabeçalho), por isso lá usa-se "outline", que não é.
  heroProgress: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid rgba(var(--border-rgb),0.3)",
    cursor: "pointer",
    outline: "1px solid transparent",
    outlineOffset: 3,
    borderRadius: "var(--radius-md)",
    transition: "outline-color 0.15s ease",
  },

  heroProgressHead: {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
  },

  heroBadgeCount: {
    fontSize: 15,
    fontWeight: 800,
    color: "var(--accent-text)",
  },

  heroBadgeTotal: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-muted)",
  },

  // Três cartões lado a lado, cada um a encolher por igual. "flexWrap" para
  // em janela estreita passarem para baixo em vez de espremerem os títulos,
  // que em inglês e em português têm comprimentos bem diferentes.
  nextUpRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  nextUpWrap: {
    flex: "1 1 160px",
    minWidth: 0,
    display: "flex",
  },

  nextUpCard: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 5,
    padding: "7px 10px",
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--soft-rgb),0.05)",
    border: "1px solid rgba(var(--border-rgb),0.3)",
  },

  nextUpTop: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },

  nextUpTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },

  nextUpRank: {
    fontSize: 11,
    fontWeight: 800,
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  nextUpTarget: {
    color: "var(--text-muted)",
  },

  nextUpTrack: {
    height: 4,
    borderRadius: "var(--radius-pill)",
    background: "rgba(var(--soft-rgb),0.1)",
    overflow: "hidden",
  },

  nextUpFill: {
    height: "100%",
    borderRadius: "var(--radius-pill)",
  },

  // Fileira das últimas partidas, agora dentro do cartão de destaque. A
  // linha fina por cima separa-a da barra de progresso sem precisar de outro
  // cartão à volta.
  heroForm: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 12,
    borderTop: "1px solid rgba(var(--border-rgb),0.3)",
  },

  heroFormLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
  },

  formRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  formPill: {
    width: 28,
    height: 28,
    borderRadius: "var(--radius-md)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
  },

  sessionList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  // Duas camadas em vez de uma única linha "flex-wrap" com tudo misturado —
  // cabeçalho (data+hora) e estatísticas envolvem (wrap) cada um por si,
  // independentemente. Numa única linha só, quando "sessionDate" (o único
  // item com texto que pode precisar de 2 linhas, ver sessionTime) não
  // cabia, o resto das estatísticas ficava a sobrepor-se ao texto da data
  // em vez de descer — ver screenshot reportado em ecrãs/janelas estreitas.
  // O fundo era rgba(var(--panel-deep-rgb),0.7), que no tema claro é
  // 240,246,245 por cima de um cartão branco — as fileiras quase não se
  // separavam umas das outras. Mesma troca para --soft-rgb que a calha da
  // navegação levou: inverte com o tema e lê-se nos dois.
  // Clicável (abre as partidas da sentada): o realce do hover vem de
  // ".at-session" no index.css, por "outline", porque o fundo e a borda são
  // declarados aqui inline e inline ganha à folha de estilo.
  sessionRow: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "8px 10px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--soft-rgb),0.05)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    cursor: "pointer",
    outline: "1px solid transparent",
    outlineOffset: -1,
    transition: "outline-color 0.15s ease",
  },

  // "alignSelf" porque a fileira alinha pela linha de base do texto, e um
  // ícone não tem linha de base que sirva — sem isto a seta ficava descaída.
  sessionChevron: {
    display: "inline-flex",
    alignSelf: "center",
    color: "var(--text-muted)",
    transition: "transform 0.18s ease",
  },

  // "overflow: hidden" é o que permite ao framer-motion animar a altura de 0
  // até "auto" sem o conteúdo transbordar durante a transição.
  sessionGames: {
    overflow: "hidden",
  },

  sessionGamesInner: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1px solid rgba(var(--border-rgb),0.3)",
  },

  sessionGame: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "3px 2px",
  },

  // Largura fixa para os lugares ficarem todos alinhados na coluna, mesmo
  // com "1º" e "8º" a terem larguras de glifo diferentes.
  sessionGamePlace: {
    width: 26,
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 800,
  },

  sessionGameIcon: {
    width: 18,
    height: 18,
    borderRadius: "var(--radius-xs)",
    flexShrink: 0,
  },

  sessionGameName: {
    flex: 1,
    minWidth: 0,
    fontSize: 11.5,
    color: "var(--text-body)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  sessionGameKda: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  sessionHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: "0 6px",
  },

  sessionStats: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },

  sessionDate: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--text-body)",
  },

  sessionTime: {
    fontSize: 11,
    fontWeight: 500,
    color: "var(--text-secondary)",
  },

  sessionStat: {
    fontSize: 11,
    color: "var(--text-secondary)",
  },

  sessionWinrate: {
    fontSize: 12.5,
    fontWeight: 800,
  },

  sessionStreak: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--accent-text)",
  },

  duoList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  duoRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    padding: "8px 10px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  duoName: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--text-body)",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  duoGames: {
    fontSize: 11,
    color: "var(--text-secondary)",
  },

  duoStat: {
    fontSize: 11,
    color: "var(--text-secondary)",
  },

  duoWinrate: {
    fontSize: 12.5,
    fontWeight: 800,
    minWidth: 52,
    textAlign: "right",
  },

  // ================= CURVA DA SENTADA =================
  rowHint: {
    fontSize: 11,
    color: "var(--text-secondary)",
    lineHeight: 1.45,
    marginBottom: 10,
  },

  spreadTop: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },

  // Os dois números de contexto (lugar médio e quantas partidas contaram)
  // vivem em caixas próprias por cima da lista: são a leitura de um relance,
  // a lista é o detalhe.
  spreadAvgBox: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "8px 14px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--soft-rgb),0.05)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  spreadAvgValue: {
    fontSize: 20,
    fontWeight: 800,
    color: "var(--text-body)",
    lineHeight: 1.1,
  },

  spreadAvgLabel: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
  },

  spreadList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  spreadRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "5px 10px",
    borderRadius: "var(--radius-md)",
  },

  // Largura fixa para as barras arrancarem todas alinhadas, mesmo com
  // glifos de larguras diferentes entre "1º" e "8º".
  spreadPlace: {
    fontSize: 12.5,
    fontWeight: 800,
    minWidth: 26,
    flexShrink: 0,
  },

  // A barra vive dentro de um carril com fundo próprio: sem ele, zero
  // partidas num lugar era indistinguível de "não há dados".
  spreadTrack: {
    flex: 1,
    minWidth: 0,
    height: 10,
    borderRadius: "var(--radius-pill)",
    background: "rgba(var(--border-rgb),0.3)",
    overflow: "hidden",
  },

  spreadBar: {
    height: "100%",
    borderRadius: "var(--radius-pill)",
  },

  spreadCount: {
    fontSize: 11.5,
    fontWeight: 600,
    color: "var(--text-secondary)",
    minWidth: 76,
    textAlign: "right",
    whiteSpace: "nowrap",
  },

  spreadPct: {
    fontSize: 11,
    color: "var(--text-muted)",
    minWidth: 38,
    textAlign: "right",
  },



  // Já não tem overflowX/scroll — o tamanho das células (ver heatmapCellSize
  // em Overview.jsx) encolhe para as 18 semanas caberem sempre inteiras
  // nesta largura, medida via ResizeObserver neste próprio elemento.
  heatmapScroll: {
    width: "100%",
    paddingBottom: 4,
  },

  heatmapGrid: {
    display: "flex",
    width: "100%",
    justifyContent: "center",
  },

  heatmapCol: {
    display: "flex",
    flexDirection: "column",
  },

  heatmapMonthLabel: {
    fontSize: 10,
    color: "var(--text-muted)",
    height: 14,
    lineHeight: "14px",
    marginBottom: 2,
    whiteSpace: "nowrap",
  },

  heatmapCell: {
    width: 16,
    height: 16,
    borderRadius: "var(--radius-xs)",
  },

  heatmapLegend: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    fontSize: 11,
    color: "var(--text-muted)",
  },

  // Mesmo degrau dos outros títulos de secção (ver sectionTitle) — "Destaques"
  // não vive dentro de um cartão, mas continua a ser uma secção entre pares.
  spotlightSectionTitle: {
    marginBottom: 6,
    fontSize: "var(--fs-lg)",
    color: "var(--accent-text)",
  },

  spotlightGroup: {
    display: "flex",
    flexDirection: "column",
  },

  // Subtítulo de cada grupo (Melhores por campeão / Pontos a melhorar /
  // Recordes de uma partida) — mais discreto que o título principal
  // ("🏆 Destaques" acima), só para separar visualmente os 3 blocos sem
  // competir com ele.
  spotlightGroupTitle: {
    marginBottom: 8,
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // Grelha que se enche sozinha: as colunas nascem do espaço disponível em
  // vez de um número fixo por breakpoint. 190px é a largura mínima em que um
  // valor longo ("Triple Kill", números de ouro) ainda cabe sem reticências.
  spotlightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
    gap: 10,
  },

  // Translúcido como os outros painéis, mas sem "--panel-blur" de propósito:
  // ao contrário das secções (que são meia dúzia), estes cartões vêm numa
  // grelha larga e chegam facilmente a 18 em simultâneo — e um backdrop-filter
  // por cartão a essa contagem custa GPU no scroll. A aurora por baixo já é um
  // gradiente suave, por isso o blur aqui quase não se notava; a translucidez,
  // essa, mantém-se e é o que deixa a cor passar.
  // O painel de jogo: cantos cortados em vez de arredondados, e a moldura
  // feita com uma sombra INTERIOR em vez de "border".
  //
  // É o clip-path que obriga a isso, e vale a pena saber porquê: o recorte
  // corta tudo o que o elemento pinta, borda e sombra exterior incluídas.
  // Uma "border" normal ficava com as pontas decepadas nos cantos cortados,
  // e um brilho exterior no hover simplesmente não apareceria. Uma sombra
  // interior é desenhada por dentro, por isso acompanha o recorte e fecha a
  // moldura nos seis lados.
  //
  // O resto (textura de campeão, aresta de cor, brilho e varrimento de luz
  // no hover) vive no index.css, em ".at-highlight" — são pseudo-elementos e
  // estados :hover, que não existem em estilo inline.
  spotlightCard: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "11px 13px",
    background: "var(--panel-bg)",
    // A moldura (sombra interior) NÃO vive aqui: declarada inline, ganhava à
    // regra de :hover do index.css e o brilho na cor do destaque nunca
    // chegava a aparecer — confirmado a medir o estilo computado, porque a
    // olho a diferença entre a moldura normal e a acesa passa despercebida.
    // É a mesma armadilha do fundo dos botões do cabeçalho.
    clipPath:
      "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
    cursor: "pointer",
    overflow: "hidden",
  },

  // Rodapé: campeão à esquerda, seta de "abre nas Estatísticas" à direita.
  spotlightFoot: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    minWidth: 0,
  },

  // Legenda discreta, sem faixa de fundo. Duas linhas no máximo: os rótulos
  // mudam de comprimento entre português e inglês, e um corte a meio da
  // primeira linha deixava cartões sem se perceber do que falavam.
  spotlightLabel: {
    fontSize: 10.5,
    lineHeight: 1.3,
    fontWeight: 600,
    color: "var(--text-secondary)",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    minHeight: 27,
  },

  spotlightSampleCount: {
    color: "var(--text-muted)",
    fontWeight: 500,
  },

  // O número é o que o cartão tem para dizer, por isso é o maior e vem antes
  // do campeão. "minWidth: 0" é o que permite às reticências funcionarem
  // dentro de um container flex — sem isso o texto transbordava e ficava
  // cortado a direito pelo overflow do cartão.
  spotlightValue: {
    fontSize: 21,
    fontWeight: 800,
    lineHeight: 1.15,
    width: "100%",
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  // Ícone + nome do campeão, em rodapé. Altura mínima para os cartões sem
  // campeão (recordes globais, como a partida mais longa) não encolherem e
  // deixarem a grelha aos degraus.
  spotlightChampWrap: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    minHeight: 20,
  },

  spotlightIcon: {
    width: 20,
    height: 20,
    borderRadius: "var(--radius-sm)",
    pointerEvents: "none",
    flexShrink: 0,
  },

  spotlightChampName: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },
};
