import { useMemo } from "react";
import { normalizeChampionId } from "../lib/champions";
import { useLanguage } from "../lib/i18n";
import Tooltip from "../components/Tooltip";

// Esta tab usa sempre o histórico completo (não o filtrado por formato na
// barra do topo) — conquistas são marcos de carreira, não devem mudar
// consoante se está a ver "só 2v2" ou "só 3v3" no resto da app.

// Cada categoria é uma escada de níveis (bronze -> ... -> platina, na prática
// só números) em vez de um simples sim/não, para haver sempre uma próxima
// meta visível. "unit" controla só a formatação do valor mostrado no badge.
function formatValue(value, unit) {
  if (unit === "%") return `${value}%`;
  if (unit === "k") return value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`;
  return `${value}`;
}

// Agrupa partidas (mais recente primeiro) em "sessões" só para saber qual
// foi a maior maratona seguida — mesma heurística de gap usada na Visão
// Geral (ver Overview.jsx/SESSION_GAP_MINUTES), duplicada aqui em versão
// mínima para não criar uma dependência cruzada entre as duas tabs.
const SESSION_GAP_MINUTES = 90;
function longestSessionGames(matches) {
  const withDate = matches.filter((m) => m.created_at).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (!withDate.length) return 0;

  let longest = 1;
  let count = 1;
  for (let i = 1; i < withDate.length; i++) {
    const prevTime = new Date(withDate[i - 1].created_at).getTime();
    const time = new Date(withDate[i].created_at).getTime();
    if (prevTime - time <= SESSION_GAP_MINUTES * 60000) {
      count += 1;
    } else {
      count = 1;
    }
    longest = Math.max(longest, count);
  }
  return longest;
}

export default function Achievements({ matches, champions, wins, DRAGON }) {
  const { t, lang } = useLanguage();

  const stats = useMemo(() => {
    const totalGames = matches.length;
    const totalWins = matches.filter((m) => m.win).length;
    const coveragePct = champions.length ? Math.round((wins.length / champions.length) * 100) : 0;

    // Melhor sequência de vitórias / de Top 3 — percorre tudo (a direção não
    // importa para o comprimento máximo de uma sequência contígua).
    let bestWinStreak = 0;
    let bestTop3Streak = 0;
    let runWin = 0;
    let runTop3 = 0;
    matches.forEach((m) => {
      if (m.win) {
        runWin += 1;
        bestWinStreak = Math.max(bestWinStreak, runWin);
      } else {
        runWin = 0;
      }
      const isTop3 = m.placement != null ? m.placement <= 3 : m.win;
      if (isTop3) {
        runTop3 += 1;
        bestTop3Streak = Math.max(bestTop3Streak, runTop3);
      } else {
        runTop3 = 0;
      }
    });

    const tripleKillCount = matches.filter((m) => m.multikill >= 3).length;

    const bestDamage = matches.reduce((max, m) => (m.damage_dealt != null && m.damage_dealt > max ? m.damage_dealt : max), 0);
    const bestHealing = matches.reduce((max, m) => (m.healing != null && m.healing > max ? m.healing : max), 0);

    // Campeão favorito (mais jogado) e diversidade (quantos campeões
    // diferentes já foram jogados, ganhando ou não).
    const champGames = {};
    matches.forEach((m) => {
      const champ = normalizeChampionId(m.champion, champions);
      champGames[champ] = (champGames[champ] || 0) + 1;
    });
    const favoriteChampGames = Object.values(champGames).reduce((max, n) => Math.max(max, n), 0);
    const diversityCount = Object.keys(champGames).length;

    const marathonGames = longestSessionGames(matches);

    // Parceiro premade com mais partidas juntos (2v2 ou 3v3, a Arena já foi
    // as duas coisas) — mesma lógica da lista de premades na Visão Geral, só
    // que aqui só interessa o máximo.
    const duoCounts = {};
    matches.forEach((m) => {
      if (!m.participants?.length || m.placement == null) return;
      const teammates = m.participants.filter((p) => !p.isSelf && p.placement === m.placement);
      teammates.forEach((teammate) => {
        const key = teammate.name || "?";
        duoCounts[key] = (duoCounts[key] || 0) + 1;
      });
    });
    const duoMaxGames = Object.values(duoCounts).reduce((max, n) => Math.max(max, n), 0);

    const wins2v2 = matches.filter((m) => m.win && m.team_size === 2).length;
    const wins3v3 = matches.filter((m) => m.win && m.team_size === 3).length;

    const hasPerfectVictory = matches.some((m) => m.placement === 1 && m.deaths === 0);
    const hasEarlyBird = matches.some((m) => {
      if (!m.created_at) return false;
      const hour = new Date(m.created_at).getHours();
      return hour >= 0 && hour <= 5;
    });

    return {
      totalGames,
      totalWins,
      coveragePct,
      bestWinStreak,
      bestTop3Streak,
      tripleKillCount,
      bestDamage,
      bestHealing,
      favoriteChampGames,
      diversityCount,
      marathonGames,
      duoMaxGames,
      wins2v2,
      wins3v3,
      hasPerfectVictory,
      hasEarlyBird,
    };
  }, [matches, champions, wins]);

  // Cada categoria tem uma escada de níveis (tiers) e sabe ir buscar o valor
  // atual a "stats" — cada nível vira um badge próprio (desbloqueado ou
  // ainda por desbloquear), em vez de só uma barra de progresso genérica.
  const categories = useMemo(
    () => [
      { id: "wins", icon: "🏅", title: t("achv_cat_wins"), value: stats.totalWins, unit: "", tiers: [1, 10, 25, 50, 100, 250, 500] },
      { id: "games", icon: "🎮", title: t("achv_cat_games"), value: stats.totalGames, unit: "", tiers: [10, 50, 100, 250, 500, 1000] },
      { id: "coverage", icon: "🗺️", title: t("achv_cat_coverage"), value: stats.coveragePct, unit: "%", tiers: [10, 25, 50, 75, 100] },
      { id: "winstreak", icon: "🔥", title: t("achv_cat_winstreak"), value: stats.bestWinStreak, unit: "", tiers: [3, 5, 10, 15, 20] },
      { id: "top3streak", icon: "🥉", title: t("achv_cat_top3streak"), value: stats.bestTop3Streak, unit: "", tiers: [3, 5, 10, 15] },
      { id: "triplekill", icon: "⚔️", title: t("achv_cat_triplekill"), value: stats.tripleKillCount, unit: "", tiers: [1, 5, 10, 25] },
      { id: "damage", icon: "💥", title: t("achv_cat_damage"), value: stats.bestDamage, unit: "k", tiers: [20000, 50000, 100000, 150000] },
      { id: "healing", icon: "✚", title: t("achv_cat_healing"), value: stats.bestHealing, unit: "k", tiers: [10000, 25000, 50000, 100000] },
      { id: "favorite", icon: "⭐", title: t("achv_cat_favorite"), value: stats.favoriteChampGames, unit: "", tiers: [10, 25, 50, 100] },
      { id: "diversity", icon: "🎭", title: t("achv_cat_diversity"), value: stats.diversityCount, unit: "", tiers: [10, 25, 50, 100] },
      { id: "marathon", icon: "⏱️", title: t("achv_cat_marathon"), value: stats.marathonGames, unit: "", tiers: [3, 5, 10, 15] },
      { id: "duo", icon: "🤝", title: t("achv_cat_duo"), value: stats.duoMaxGames, unit: "", tiers: [5, 10, 25, 50] },
      { id: "wins2v2", icon: "👥", title: t("achv_cat_wins2v2"), value: stats.wins2v2, unit: "", tiers: [5, 25, 50, 100] },
      { id: "wins3v3", icon: "👨‍👩‍👦", title: t("achv_cat_wins3v3"), value: stats.wins3v3, unit: "", tiers: [5, 25, 50, 100] },
    ],
    [stats, t]
  );

  // Duas conquistas booleanas (sim/não), à parte da lógica de escada.
  const booleanAchievements = useMemo(
    () => [
      { id: "perfect", icon: "👑", title: t("achv_perfect_title"), desc: t("achv_perfect_desc"), unlocked: stats.hasPerfectVictory },
      { id: "earlybird", icon: "🌙", title: t("achv_earlybird_title"), desc: t("achv_earlybird_desc"), unlocked: stats.hasEarlyBird },
    ],
    [stats, t]
  );

  const { totalBadges, unlockedBadges } = useMemo(() => {
    let total = 0;
    let unlocked = 0;
    categories.forEach((c) => {
      total += c.tiers.length;
      unlocked += c.tiers.filter((tier) => c.value >= tier).length;
    });
    total += booleanAchievements.length;
    unlocked += booleanAchievements.filter((b) => b.unlocked).length;
    return { totalBadges: total, unlockedBadges: unlocked };
  }, [categories, booleanAchievements]);

  // As conquistas mais perto de subir de nível — só as de escada (não as
  // booleanas, que são sim/não e não têm "progresso" a mostrar) e só as que
  // ainda têm um próximo nível por desbloquear (exclui as já no máximo).
  const closestToUnlock = useMemo(() => {
    return categories
      .map((cat) => {
        const nextTier = cat.tiers.find((tr) => cat.value < tr);
        if (nextTier == null) return null;
        return { ...cat, nextTier, progressPct: Math.min(100, Math.round((cat.value / nextTier) * 100)) };
      })
      .filter(Boolean)
      .sort((a, b) => b.progressPct - a.progressPct)
      .slice(0, 3);
  }, [categories]);

  if (!matches.length) {
    return <div style={styles.empty}>{t("achv_empty")}</div>;
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>{t("achv_page_title")}</h2>
        <div style={styles.headerProgress}>
          <span style={styles.headerCount}>
            {unlockedBadges} / {totalBadges}
          </span>
          <div style={styles.headerTrack}>
            <div
              style={{
                ...styles.headerFill,
                width: `${totalBadges ? Math.round((unlockedBadges / totalBadges) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Perto de desbloquear — antes a página era só uma parede plana de
          ~70 badges sem nenhuma indicação de onde focar; isto dá aos 3
          níveis mais próximos um destaque logo no topo. */}
      {closestToUnlock.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>🎯</span>
            <h3 style={styles.sectionTitle}>{t("achv_closest_title")}</h3>
          </div>
          <div style={styles.badgeRow}>
            {closestToUnlock.map((cat) => (
              <Tooltip
                key={cat.id}
                label={`${cat.title} · ${formatValue(cat.value, cat.unit)}/${formatValue(cat.nextTier, cat.unit)}`}
              >
                <div
                  style={{
                    ...styles.badge,
                    opacity: 0.9,
                    borderColor: "rgba(250,204,21,0.55)",
                    background: "rgba(var(--panel-deep-rgb),0.6)",
                  }}
                >
                  <span style={styles.badgeIcon}>{cat.icon}</span>
                  <span style={styles.badgeTier}>{formatValue(cat.nextTier, cat.unit)}</span>
                  <div style={styles.badgeTrack}>
                    <div style={{ ...styles.badgeFill, width: `${cat.progressPct}%` }} />
                  </div>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {categories.map((cat) => (
        <div key={cat.id} style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>{cat.icon}</span>
            <h3 style={styles.sectionTitle}>{cat.title}</h3>
            <span style={styles.sectionValue}>
              {formatValue(cat.value, cat.unit)}
            </span>
          </div>
          <div style={styles.badgeRow}>
            {cat.tiers.map((tier) => {
              const unlocked = cat.value >= tier;
              const isNext = !unlocked && cat.tiers.find((tr) => cat.value < tr) === tier;
              const progressPct = isNext ? Math.min(100, Math.round((cat.value / tier) * 100)) : unlocked ? 100 : 0;

              return (
                <Tooltip
                  key={tier}
                  label={
                    unlocked
                      ? `${cat.title} · ${formatValue(tier, cat.unit)} (${t("achv_unlocked")})`
                      : `${cat.title} · ${formatValue(cat.value, cat.unit)}/${formatValue(tier, cat.unit)}`
                  }
                >
                  <div
                    style={{
                      ...styles.badge,
                      opacity: unlocked ? 1 : isNext ? 0.85 : 0.4,
                      borderColor: unlocked ? "rgba(250,204,21,0.55)" : "rgba(var(--border-rgb),0.5)",
                      background: unlocked
                        ? "linear-gradient(180deg, rgba(250,204,21,0.16), rgba(250,204,21,0.05))"
                        : "rgba(var(--panel-deep-rgb),0.6)",
                    }}
                  >
                    <span style={styles.badgeIcon}>{unlocked ? cat.icon : "🔒"}</span>
                    <span style={styles.badgeTier}>{formatValue(tier, cat.unit)}</span>
                    {isNext && (
                      <div style={styles.badgeTrack}>
                        <div style={{ ...styles.badgeFill, width: `${progressPct}%` }} />
                      </div>
                    )}
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      ))}

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionIcon}>🏆</span>
          <h3 style={styles.sectionTitle}>{t("achv_cat_special")}</h3>
        </div>
        <div style={styles.badgeRow}>
          {booleanAchievements.map((b) => (
            <Tooltip key={b.id} label={b.desc}>
              <div
                style={{
                  ...styles.specialBadge,
                  opacity: b.unlocked ? 1 : 0.4,
                  borderColor: b.unlocked ? "rgba(250,204,21,0.55)" : "rgba(var(--border-rgb),0.5)",
                  background: b.unlocked
                    ? "linear-gradient(180deg, rgba(250,204,21,0.16), rgba(250,204,21,0.05))"
                    : "rgba(var(--panel-deep-rgb),0.6)",
                }}
              >
                <span style={styles.badgeIcon}>{b.unlocked ? b.icon : "🔒"}</span>
                <span style={styles.specialBadgeTitle}>{b.title}</span>
              </div>
            </Tooltip>
          ))}
        </div>
      </div>
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

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.92), rgba(var(--panel-deep-rgb),0.96))",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-2xl)",
    padding: 16,
  },

  headerTitle: {
    color: "var(--accent-text)",
    margin: 0,
  },

  headerProgress: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 200,
  },

  headerCount: {
    fontSize: 13,
    fontWeight: 800,
    color: "var(--text-body)",
    whiteSpace: "nowrap",
  },

  headerTrack: {
    flex: 1,
    height: 8,
    borderRadius: 5,
    background: "rgba(0,0,0,0.35)",
    overflow: "hidden",
  },

  headerFill: {
    height: "100%",
    background: "linear-gradient(90deg, #9aa0a6, #facc15)",
    borderRadius: 5,
  },

  section: {
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.92), rgba(var(--panel-deep-rgb),0.96))",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-2xl)",
    padding: 16,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  sectionIcon: {
    fontSize: 16,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--accent-text)",
    margin: 0,
    flex: 1,
  },

  sectionValue: {
    fontSize: 12,
    color: "var(--text-secondary)",
    fontWeight: 600,
  },

  badgeRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  badge: {
    width: 74,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    padding: "8px 6px",
    borderRadius: "var(--radius-lg)",
    border: "1px solid",
    transition: "opacity 0.15s ease",
  },

  badgeIcon: {
    fontSize: 18,
    lineHeight: 1,
  },

  badgeTier: {
    fontSize: 11,
    fontWeight: 800,
    color: "var(--text-body)",
  },

  badgeTrack: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    background: "rgba(0,0,0,0.35)",
    overflow: "hidden",
    marginTop: 2,
  },

  badgeFill: {
    height: "100%",
    background: "linear-gradient(90deg, #9aa0a6, #facc15)",
    borderRadius: 2,
  },

  specialBadge: {
    width: 120,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "10px 8px",
    borderRadius: "var(--radius-lg)",
    border: "1px solid",
    transition: "opacity 0.15s ease",
  },

  specialBadgeTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-body)",
    textAlign: "center",
  },
};
