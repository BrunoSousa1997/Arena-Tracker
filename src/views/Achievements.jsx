import { useMemo } from "react";
import { useLanguage } from "../lib/i18n";
import Tooltip from "../components/Tooltip";
import AchievementIcon from "../components/AchievementIcon";
import {
  computeAchievementStats,
  buildAchievementCategories,
  buildBooleanAchievements,
  summarizeBadges,
  formatAchievementValue as formatValue,
  rankForTierIndex,
  glowFor,
  ACHIEVEMENT_RANKS,
} from "../lib/achievementStats";

// As conquistas especiais (sim/não) não têm escada de níveis — quando
// desbloqueadas valem sempre o escalão mais alto, já que não há progressão
// nenhuma a distinguir entre elas.
const SPECIAL_RANK = ACHIEVEMENT_RANKS[ACHIEVEMENT_RANKS.length - 1];

// Esta tab usa sempre o histórico completo (não o filtrado por formato na
// barra do topo) — conquistas são marcos de carreira, não devem mudar
// consoante se está a ver "só 2v2" ou "só 3v3" no resto da app.
// A lógica de cálculo (categorias/tiers/stats) vive em lib/achievementStats.js
// — partilhada com a tab Comparar, para as duas nunca divergirem.

// Escalão mais alto já conquistado numa categoria (null se ainda nenhum) —
// usado para colorir o ícone e o valor no cabeçalho de cada cartão.
function currentRankOf(cat) {
  const unlockedCount = cat.tiers.filter((tier) => cat.value >= tier).length;
  if (!unlockedCount) return null;
  return rankForTierIndex(unlockedCount - 1, cat.tiers.length);
}

export default function Achievements({ matches, champions, wins, DRAGON, challengeWins = 0 }) {
  const { t } = useLanguage();

  const stats = useMemo(
    () => computeAchievementStats(matches, champions, wins, challengeWins),
    [matches, champions, wins, challengeWins]
  );

  // Cada categoria tem uma escada de níveis (tiers) e sabe ir buscar o valor
  // atual a "stats" — cada nível vira um badge próprio (desbloqueado ou
  // ainda por desbloquear), em vez de só uma barra de progresso genérica.
  const categories = useMemo(() => buildAchievementCategories(stats, t), [stats, t]);

  // Conquistas booleanas (sim/não), à parte da lógica de escada.
  const booleanAchievements = useMemo(() => buildBooleanAchievements(stats, t), [stats, t]);

  const { totalBadges, unlockedBadges } = useMemo(
    () => summarizeBadges(categories, booleanAchievements),
    [categories, booleanAchievements]
  );

  // As conquistas mais perto de subir de nível — só as de escada (não as
  // booleanas, que são sim/não e não têm "progresso" a mostrar) e só as que
  // ainda têm um próximo nível por desbloquear (exclui as já no máximo).
  const closestToUnlock = useMemo(() => {
    return categories
      .map((cat) => {
        const nextTierIdx = cat.tiers.findIndex((tr) => cat.value < tr);
        if (nextTierIdx === -1) return null;
        const nextTier = cat.tiers[nextTierIdx];
        return {
          ...cat,
          nextTier,
          // Escalão do nível que está mesmo a ser perseguido (não o da
          // categoria em geral) — é isso que se vai desbloquear a seguir.
          nextRank: rankForTierIndex(nextTierIdx, cat.tiers.length),
          progressPct: Math.min(100, Math.round((cat.value / nextTier) * 100)),
        };
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
          badges sem nenhuma indicação de onde focar; isto dá aos 3 níveis
          mais próximos um destaque logo no topo. */}
      {closestToUnlock.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>
              <AchievementIcon iconId="target" color="var(--accent-text)" size={17} />
            </span>
            <h3 style={styles.sectionTitle}>{t("achv_closest_title")}</h3>
          </div>
          <div style={styles.closestRow}>
            {closestToUnlock.map((cat) => (
              <div key={cat.id} style={styles.closestCard}>
                <span style={styles.badgeIcon}>
                  <AchievementIcon iconId={cat.iconId} color={cat.nextRank.color} size={22} />
                </span>
                <div style={styles.closestInfo}>
                  <div style={styles.closestTitle}>{cat.title}</div>
                  <div style={styles.closestMeta}>
                    <span style={{ color: cat.nextRank.color, fontWeight: 800 }}>
                      {t(cat.nextRank.labelKey)}
                    </span>
                    <span style={styles.closestProgress}>
                      {formatValue(cat.value, cat.unit)} / {formatValue(cat.nextTier, cat.unit)}
                    </span>
                  </div>
                  <div style={styles.badgeTrack}>
                    <div
                      style={{
                        ...styles.badgeFill,
                        width: `${cat.progressPct}%`,
                        background: cat.nextRank.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grelha em vez de um cartão por linha: cada categoria só precisa de
          uma fila curta de badges, por isso ocupar a largura toda deixava
          metade do cartão vazia (sobretudo em monitores largos). */}
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const rank = currentRankOf(cat);

          return (
            <div key={cat.id} style={styles.section}>
              <div style={styles.catHeader}>
                <span style={styles.catIconWrap}>
                  <AchievementIcon
                    iconId={cat.iconId}
                    color={rank ? rank.color : "var(--text-muted)"}
                    size={22}
                  />
                </span>

                <div style={styles.catHeadText}>
                  <h3 style={styles.sectionTitle}>{cat.title}</h3>
                  {/* Explica o que a categoria conta — sem isto várias delas
                      eram adivinhação a partir do título. */}
                  <div style={styles.catDesc}>{cat.desc}</div>
                </div>

                {/* Valor atual em destaque: é o número que importa e antes
                    era só texto pequeno e cinzento perdido no canto. */}
                <div style={styles.catValueWrap}>
                  <div style={{ ...styles.catValue, color: rank ? rank.color : "var(--text-body)" }}>
                    {formatValue(cat.value, cat.unit)}
                  </div>
                  <div style={styles.catValueLabel}>
                    {rank ? t(rank.labelKey) : t("achv_locked")}
                  </div>
                </div>
              </div>

              <div style={styles.badgeRow}>
                {cat.tiers.map((tier, tierIdx) => {
                  const unlocked = cat.value >= tier;
                  const isNext = !unlocked && cat.tiers.find((tr) => cat.value < tr) === tier;
                  const progressPct = isNext ? Math.min(100, Math.round((cat.value / tier) * 100)) : 0;
                  const tierRank = rankForTierIndex(tierIdx, cat.tiers.length);

                  return (
                    <Tooltip
                      key={tier}
                      label={
                        unlocked
                          ? `${t(tierRank.labelKey)} · ${formatValue(tier, cat.unit)} (${t("achv_unlocked")})`
                          : `${t(tierRank.labelKey)} · ${formatValue(cat.value, cat.unit)}/${formatValue(tier, cat.unit)}`
                      }
                    >
                      <div
                        style={{
                          ...styles.badge,
                          opacity: unlocked ? 1 : isNext ? 0.85 : 0.4,
                          borderColor: unlocked
                            ? `color-mix(in srgb, ${tierRank.color} 65%, transparent)`
                            : "rgba(var(--border-rgb),0.5)",
                          background: unlocked
                            ? `linear-gradient(180deg, color-mix(in srgb, ${tierRank.color} 22%, transparent), color-mix(in srgb, ${tierRank.color} 6%, transparent))`
                            : "rgba(var(--panel-deep-rgb),0.6)",
                          // Halo a crescer com o escalão (ver glowFor) — um
                          // Ferro e um Desafiante já não se leem igual.
                          boxShadow: unlocked ? glowFor(tierRank) : "none",
                        }}
                      >
                        <span style={styles.badgeIcon}>
                          <AchievementIcon
                            iconId={cat.iconId}
                            locked={!unlocked}
                            color={tierRank.color}
                            size={18}
                          />
                        </span>
                        <span
                          style={{ ...styles.badgeTier, color: unlocked ? tierRank.color : "var(--text-body)" }}
                        >
                          {formatValue(tier, cat.unit)}
                        </span>
                        {isNext && (
                          <div style={styles.badgeTrack}>
                            <div
                              style={{
                                ...styles.badgeFill,
                                width: `${progressPct}%`,
                                background: tierRank.color,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionIcon}>
            <AchievementIcon iconId="crest" color="var(--accent-text)" size={17} />
          </span>
          <h3 style={styles.sectionTitle}>{t("achv_cat_special")}</h3>
        </div>
        <div style={styles.catDesc}>{t("achv_special_hint")}</div>

        <div style={{ ...styles.badgeRow, marginTop: 12 }}>
          {booleanAchievements.map((b) => (
            <Tooltip key={b.id} label={b.desc}>
              <div
                style={{
                  ...styles.specialBadge,
                  opacity: b.unlocked ? 1 : 0.4,
                  borderColor: b.unlocked
                    ? `color-mix(in srgb, ${SPECIAL_RANK.color} 65%, transparent)`
                    : "rgba(var(--border-rgb),0.5)",
                  background: b.unlocked
                    ? `linear-gradient(180deg, color-mix(in srgb, ${SPECIAL_RANK.color} 22%, transparent), color-mix(in srgb, ${SPECIAL_RANK.color} 6%, transparent))`
                    : "rgba(var(--panel-deep-rgb),0.6)",
                  boxShadow: b.unlocked ? glowFor(SPECIAL_RANK) : "none",
                }}
              >
                <span style={styles.badgeIcon}>
                  <AchievementIcon
                    iconId={b.iconId}
                    locked={!b.unlocked}
                    color={SPECIAL_RANK.color}
                    size={22}
                  />
                </span>
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
    display: "inline-flex",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--accent-text)",
    margin: 0,
  },

  // ================= CABEÇALHO DE CADA CATEGORIA =================
  // Ícone | título+descrição | valor. O valor vive à direita, grande e na cor
  // do escalão atual — antes era texto pequeno e cinzento, e nem se via.
  catHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },

  catIconWrap: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-deep-rgb),0.75)",
    border: "1px solid rgba(var(--border-rgb),0.45)",
  },

  catHeadText: {
    flex: 1,
    minWidth: 0,
  },

  catDesc: {
    fontSize: 10.5,
    lineHeight: 1.35,
    color: "var(--text-muted)",
    marginTop: 2,
  },

  catValueWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    flexShrink: 0,
  },

  catValue: {
    fontSize: 20,
    fontWeight: 900,
    lineHeight: 1.1,
  },

  catValueLabel: {
    fontSize: 8.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "var(--text-muted)",
  },

  badgeRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  badge: {
    width: 62,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    padding: "8px 6px",
    borderRadius: "var(--radius-lg)",
    border: "1px solid",
    transition: "opacity 0.15s ease",
  },

  // Os ícones são SVG (ver AchievementIcon.jsx), não emojis — o tamanho vem
  // do próprio componente ("size"), aqui fica só o alinhamento.
  badgeIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  badgeTier: {
    fontSize: 11,
    fontWeight: 800,
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
    borderRadius: 2,
  },

  // ================= "QUASE LÁ" =================
  // Cartões largos (ícone + texto + barra) em vez dos badges quadrados —
  // aqui há espaço para dizer QUAL é a meta e a que distância se está dela.
  closestRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 8,
  },

  closestCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.6)",
    border: "1px solid rgba(var(--border-rgb),0.45)",
  },

  closestInfo: {
    flex: 1,
    minWidth: 0,
  },

  closestTitle: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "var(--text-body)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  closestMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 10,
    marginTop: 1,
    marginBottom: 4,
  },

  closestProgress: {
    color: "var(--text-secondary)",
    fontWeight: 700,
  },

  specialBadge: {
    width: 118,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 5,
    padding: "12px 8px",
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
