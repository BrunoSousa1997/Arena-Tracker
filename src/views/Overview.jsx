import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { placementColor, placementText } from "../lib/placement";
import { useLanguage } from "../lib/i18n";
import Tooltip from "../components/Tooltip";
import { computeCareerSummary, computeSpotlightGroups } from "../lib/overviewSpotlights";

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

// Duração em segundos -> "m:ss", para os destaques de vitória mais rápida e
// partida mais longa (mesma lógica usada no Histórico, ver MatchHistory.jsx).
function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const HEATMAP_WEEKS = 18;

function dayKey(date) {
  // Chave local (não UTC) para não desalinhar o dia por causa do fuso —
  // toISOString() converte para UTC primeiro, o que podia empurrar uma
  // partida jogada à noite para o dia seguinte/anterior no grid.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Gap máximo entre o fim de uma partida e o início da seguinte para as
// contar como a mesma "sessão" (sentada a jogar) — a Arena não dá o horário
// de início, só o de fim, por isso isto é sempre uma aproximação baseada
// nos "created_at" de partidas seguidas.
const SESSION_GAP_MINUTES = 90;

// Agrupa partidas (já ordenadas da mais recente para a mais antiga, ver
// db/api.js) em sessões: sempre que o intervalo até à partida anterior no
// grupo ultrapassa SESSION_GAP_MINUTES, começa uma sessão nova.
function buildSessions(matches) {
  const withDate = matches.filter((m) => m.created_at);
  if (!withDate.length) return [];

  const sessions = [];
  let current = null;

  withDate.forEach((m) => {
    const time = new Date(m.created_at).getTime();
    if (current) {
      const lastTime = new Date(current.matches[current.matches.length - 1].created_at).getTime();
      const gapMs = lastTime - time;
      if (gapMs > SESSION_GAP_MINUTES * 60000) {
        sessions.push(current);
        current = null;
      }
    }
    if (!current) current = { matches: [] };
    current.matches.push(m);
  });
  if (current) sessions.push(current);

  return sessions.map((s) => {
    const ms = s.matches;
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

export default function Overview({ matches, wins, champions, DRAGON, onOpenChampionStats }) {
  const { t, lang } = useLanguage();
  const champName = (id) => champions.find((c) => c.id === id)?.name || id;

  const recentForm = useMemo(() => matches.slice(0, 8), [matches]);

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

  // Só sessões com pelo menos 2 partidas (uma partida sozinha não é bem uma
  // "sessão") e só as mais recentes, para não sobrecarregar o ecrã com
  // histórico antigo.
  const sessions = useMemo(
    () => buildSessions(matches).filter((s) => s.games >= 2).slice(0, 6),
    [matches]
  );

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

  return (
    <div style={styles.wrap}>
      {/* HERO — progresso do roster + estatísticas rápidas de carreira,
          tudo num único cartão de destaque em vez de uma barra isolada. */}
      <div style={styles.hero}>
        <div style={styles.heroTop}>
          <div>
            <div style={styles.heroKicker}>{t("overview_roster_progress")}</div>
            <div style={styles.heroBig}>{career.coverage}%</div>
            <div style={styles.progressText}>
              {wins.length} / {champions.length}
            </div>
          </div>

          <div style={styles.heroStatsRow}>
            <div style={styles.heroStat}>
              <div style={styles.heroStatValue}>{career.totalGames}</div>
              <div style={styles.heroStatLabel}>{t("overview_total_games")}</div>
            </div>
            <div style={styles.heroStatDivider} />
            <div style={{ ...styles.heroStat, ...heroChipStyle(placementColor(3)) }}>
              <div style={{ ...styles.heroStatValue, color: placementColor(3) }}>
                {career.top3RatePct}%
              </div>
              <div style={styles.heroStatLabel}>{t("overview_top3_rate")}</div>
            </div>
            <div style={styles.heroStatDivider} />
            <div style={{ ...styles.heroStat, ...heroChipStyle("var(--place-good)") }}>
              <div style={{ ...styles.heroStatValue, color: "var(--place-good)" }}>
                {career.top1RatePct}%
              </div>
              <div style={styles.heroStatLabel}>{t("overview_top1_rate")}</div>
            </div>
            {career.streakCurrent > 1 && (
              <>
                <div style={styles.heroStatDivider} />
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
              </>
            )}
            {career.streakBestWin > 1 && (
              <>
                <div style={styles.heroStatDivider} />
                <Tooltip label={t("streak_best_tooltip")}>
                  <div style={styles.heroStat}>
                    <div style={styles.heroStatValue}>🏆 {career.streakBestWin}</div>
                    <div style={styles.heroStatLabel}>{t("streak_best_label")}</div>
                  </div>
                </Tooltip>
              </>
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
      </div>

      {/* FORMA RECENTE — a sequência atual/melhor já aparece no cartão de
          destaque no topo, aqui fica só a fileira visual das últimas partidas. */}
      {recentForm.length > 0 && (
        <div className="riseIn" style={styles.section}>
          <h2 style={styles.sectionTitle}>📈 {t("overview_recent_form")}</h2>
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
                {sessions.map((s, i) => (
                  <div key={i} style={styles.sessionRow}>
                    <div style={styles.sessionHeader}>
                      <span style={styles.sessionDate}>
                        {s.start.toLocaleDateString(lang === "en" ? "en-US" : "pt-PT")}
                      </span>
                      <span style={styles.sessionTime}>
                        {s.start.toLocaleTimeString(lang === "en" ? "en-US" : "pt-PT", { hour: "2-digit", minute: "2-digit" })}
                        –
                        {s.end.toLocaleTimeString(lang === "en" ? "en-US" : "pt-PT", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div style={styles.sessionStats}>
                      <span style={styles.sessionStat}>
                        {s.games} {lang === "en" ? "games" : "jogos"}
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
                  </div>
                ))}
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

      {/* SPOTLIGHTS — cada cartão é um atalho: clicar abre logo o campeão
          nas Estatísticas, já expandido, em vez de obrigar a ir procurá-lo.
          Agrupados em 3 blocos (melhores médias / pontos a melhorar /
          recordes de uma partida), cada um com o seu subtítulo, em vez de
          uma única grelha longa e indiferenciada — assim dá para perceber
          logo o que é cada cartão só pelo grupo em que está. */}
      {spotlightGroups.length > 0 && (
        <div>
          <h2 style={styles.spotlightSectionTitle}>🏆 {t("overview_highlights")}</h2>

          {spotlightGroups.map((group, gi) => (
            <div
              key={group.key}
              style={{ ...styles.spotlightGroup, marginTop: gi === 0 ? 0 : 18 }}
            >
              <h3 style={styles.spotlightGroupTitle}>
                {group.icon} {group.title}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-2.5">
                {group.items.map((sp, i) => (
                  <div
                    key={sp.label}
                    className="clickableCard riseIn"
                    // Escalonamento: cada cartão entra 30ms depois do anterior,
                    // o que lê como a grelha a preencher-se em vez de aparecer
                    // toda de um golpe. O teto nos 8 é para a cauda não crescer
                    // sem fim — a partir daí o atraso já não se distingue e só
                    // fazia o último cartão demorar meio segundo a chegar.
                    style={{ ...styles.spotlightCard, animationDelay: `${Math.min(i, 8) * 30}ms` }}
                    onClick={() => openStats(sp.champion, sp.sortKey)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      openStats(sp.champion, sp.sortKey);
                    }}
                  >
                    <div style={styles.spotlightHeader}>
                      {sp.label}
                      {sp.sampleCount != null && (
                        <span style={styles.spotlightSampleCount}>
                          {" "}
                          · {sp.sampleCount}
                          {lang === "en" ? "g" : "j"}
                        </span>
                      )}
                    </div>
                    <div style={styles.spotlightBody}>
                      {sp.champion ? (
                        <Tooltip label={champName(sp.champion)}>
                          <div style={styles.spotlightChampWrap}>
                            {DRAGON && (
                              <img
                                src={`${DRAGON}/img/champion/${sp.champion}.png`}
                                style={styles.spotlightIcon}
                              />
                            )}
                            <span style={styles.spotlightChampName}>{champName(sp.champion)}</span>
                          </div>
                        </Tooltip>
                      ) : (
                        // Alguns destaques são recordes globais sem campeão associado
                        // (ex: partida mais longa) — mantém a mesma altura de linha
                        // do cartão em vez de encolher só por faltar o ícone.
                        <div style={styles.spotlightChampWrap} />
                      )}
                      {/* O valor fica sempre na própria linha, a toda a largura do
                          cartão, em vez de disputar espaço horizontal com o nome do
                          campeão (era isso que cortava valores longos, ex: "Triple
                          Kill" ou números grandes de dano/ouro em cartões estreitos). */}
                      <div style={{ ...styles.spotlightValue, color: sp.color }} title={String(sp.value)}>
                        {sp.value}
                      </div>
                    </div>
                    <div style={styles.spotlightHint}>{t("overview_see_more")}</div>
                  </div>
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

  sectionTitle: { marginBottom: 10, color: "var(--accent-text)" },

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

  heroStatDivider: {
    width: 1,
    alignSelf: "stretch",
    background: "rgba(var(--border-rgb),0.35)",
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
    background: "rgba(0,0,0,0.35)",
    overflow: "hidden",
    marginTop: 4,
  },

  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #9aa0a6, var(--accent-solid-light))",
    borderRadius: "var(--radius-sm)",
  },

  formRow: {
    display: "flex",
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
  sessionRow: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "8px 10px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
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

  // Envolve o gráfico + legenda, centrados horizontalmente no cartão.
  heatmapBody: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "12px 0",
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

  spotlightSectionTitle: {
    marginBottom: 10,
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

  // Translúcido como os outros painéis, mas sem "--panel-blur" de propósito:
  // ao contrário das secções (que são meia dúzia), estes cartões vêm numa
  // grelha de até 6 colunas e chegam facilmente a 18 em simultâneo — e um
  // backdrop-filter por cartão a essa contagem custa GPU no scroll. A aurora
  // por baixo já é um gradiente suave, por isso o blur aqui quase não se
  // notava; a translucidez, essa, mantém-se e é o que deixa a cor passar.
  spotlightCard: {
    background: "var(--panel-bg)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-xl)",
    overflow: "hidden",
    cursor: "pointer",
    transition: "border-color 0.15s ease",
    display: "flex",
    flexDirection: "column",
  },

  // Faixa de cabeçalho com fundo próprio, distinto do corpo do cartão.
  spotlightHeader: {
    padding: "7px 10px",
    fontSize: 10.5,
    lineHeight: 1.25,
    color: "var(--text-secondary)",
    background: "rgba(var(--accent-rgb),0.14)",
    borderBottom: "1px solid rgba(var(--border-rgb),0.4)",
    minHeight: 30,
    display: "flex",
    alignItems: "center",
  },

  spotlightSampleCount: {
    color: "var(--text-muted)",
    fontWeight: 500,
  },

  // Antes o nome do campeão e o valor competiam pela mesma linha horizontal
  // (space-between) — em cartões estreitos ou com valores compridos (ex:
  // "Triple Kill", números grandes de dano/ouro) o valor acabava cortado.
  // Agora o valor fica sempre na sua própria linha, a toda a largura do
  // cartão, por baixo do campeão.
  spotlightBody: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "10px 10px",
  },

  // Ícone + nome do campeão lado a lado (à esquerda) — antes só o ícone
  // aparecia, obrigando a passar o rato por cima para saber de quem se trata.
  spotlightChampWrap: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
    minHeight: 24,
  },

  spotlightIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    pointerEvents: "none",
    flexShrink: 0,
  },

  spotlightChampName: {
    fontSize: 11.5,
    fontWeight: 600,
    color: "var(--text-body)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },

  // "minWidth: 0" é o que permite o ellipsis funcionar dentro de um
  // container flex (sem isto o texto simplesmente transbordava e ficava
  // cortado pelo "overflow: hidden" do cartão, em vez de mostrar "...").
  spotlightValue: {
    fontSize: 18,
    fontWeight: 800,
    width: "100%",
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  spotlightHint: {
    padding: "0 10px 8px",
    fontSize: 10,
    color: "var(--accent-text)",
    fontWeight: 600,
  },
};
