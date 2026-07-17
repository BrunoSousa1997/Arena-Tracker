// Lógica de conquistas partilhada entre a tab Conquistas e a tab Comparar —
// extraída de Achievements.jsx para as duas usarem exatamente as mesmas
// categorias/tiers/regras, em vez de arriscar as duas divergirem ao longo do
// tempo (ver comentário original em Achievements.jsx antes desta extração).
import { normalizeChampionId } from "./champions";

export function formatAchievementValue(value, unit) {
  if (unit === "%") return `${value}%`;
  if (unit === "k") return value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`;
  return `${value}`;
}

// Agrupa partidas (mais recente primeiro) em "sessões" só para saber qual
// foi a maior maratona seguida — mesma heurística de gap usada na Visão
// Geral (ver Overview.jsx/SESSION_GAP_MINUTES).
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

export function computeAchievementStats(matches, champions, wins, challengeWins = 0) {
  const totalGames = matches.length;
  const totalWins = matches.filter((m) => m.win).length;
  const coveragePct = champions.length ? Math.round((wins.length / champions.length) * 100) : 0;

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

  const champGames = {};
  matches.forEach((m) => {
    const champ = normalizeChampionId(m.champion, champions);
    champGames[champ] = (champGames[champ] || 0) + 1;
  });
  const favoriteChampGames = Object.values(champGames).reduce((max, n) => Math.max(max, n), 0);
  const diversityCount = Object.keys(champGames).length;

  const marathonGames = longestSessionGames(matches);

  // ================= PARTIDAS POR CLASSE DE CAMPEÃO =================
  // As classes vêm das "tags" do Data Dragon (ver useStaticData.js). Um
  // campeão pode ter mais do que uma (ex: Sett é Fighter E Tank), e nesse
  // caso a partida conta para todas — é de propósito: são categorias de
  // "quanto jogaste deste estilo", não uma arrumação exclusiva.
  const tagsByChampion = new Map(champions.map((c) => [c.id, c.tags || []]));
  const classGames = { Assassin: 0, Fighter: 0, Mage: 0, Marksman: 0, Support: 0, Tank: 0 };
  matches.forEach((m) => {
    const champ = normalizeChampionId(m.champion, champions);
    (tagsByChampion.get(champ) || []).forEach((tag) => {
      if (tag in classGames) classGames[tag] += 1;
    });
  });

  // ================= MARCOS DE CARREIRA =================
  const top3Total = matches.filter((m) => (m.placement != null ? m.placement <= 3 : m.win)).length;
  const totalKills = matches.reduce((sum, m) => sum + (m.kills || 0), 0);

  // Augments são a mecânica-assinatura da Arena — quantos DIFERENTES já se
  // experimentou diz mais sobre exploração do modo do que o total de vezes
  // que se levou sempre os mesmos.
  const augmentSet = new Set();
  matches.forEach((m) => (m.augments || []).forEach((a) => augmentSet.add(a)));
  const distinctAugments = augmentSet.size;

  // Dias distintos com pelo menos uma partida — chave local (não UTC) para
  // uma partida jogada à noite não saltar para o dia seguinte.
  const daySet = new Set();
  matches.forEach((m) => {
    if (!m.created_at) return;
    const d = new Date(m.created_at);
    daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });
  const daysPlayed = daySet.size;

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

  const hasPerfectVictory = matches.some((m) => m.placement === 1 && m.deaths === 0);
  const hasEarlyBird = matches.some((m) => {
    if (!m.created_at) return false;
    const hour = new Date(m.created_at).getHours();
    return hour >= 0 && hour <= 5;
  });

  // ================= FEITOS "MELHOR DA PARTIDA" =================
  // A Match-V5 guarda TODOS os jogadores de cada partida (ver
  // extractAllParticipants em electron/riotApi.js), por isso dá para saber
  // não só o que fizemos, mas como isso se compara com os outros 15-17 da
  // partida — é daí que saem estas conquistas. Só as partidas já
  // enriquecidas (com "participants") contam; as antigas simplesmente não
  // entram, em vez de contarem como falhadas.
  const supportChampIds = new Set(
    champions.filter((c) => c.tags?.includes("Support")).map((c) => c.id)
  );

  const hasTopHealerAsSupport = matches.some(
    (m) =>
      supportChampIds.has(normalizeChampionId(m.champion, champions)) &&
      isBestOfMatch(m, "healing")
  );
  const hasTopDamageWin = matches.some((m) => m.win && isBestOfMatch(m, "damageDealt"));
  const hasTopTankTop3 = matches.some(
    (m) => m.placement != null && m.placement <= 3 && isBestOfMatch(m, "damageTaken")
  );
  const hasTopGold = matches.some((m) => isBestOfMatch(m, "goldEarned"));
  // Abates: NÃO se usa multikill aqui. Na Arena cada ronda é 2v2 (8 equipas
  // de 2) ou 3v3 (6 equipas de 3), por isso nunca há mais de 2-3 inimigos
  // vivos ao mesmo tempo — um quadra/penta é impossível por construção, e
  // uma conquista assim nunca desbloquearia. O feito equivalente que a
  // Arena permite mesmo é ser o melhor matador da partida toda.
  const hasTopKills = matches.some((m) => isBestOfMatch(m, "kills"));

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
    classGames,
    top3Total,
    totalKills,
    distinctAugments,
    daysPlayed,
    hasPerfectVictory,
    hasEarlyBird,
    hasTopHealerAsSupport,
    hasTopDamageWin,
    hasTopTankTop3,
    hasTopGold,
    hasTopKills,
    challengeWins,
  };
}

// Fomos NÓS o melhor de toda a partida nesta métrica? Empates contam (basta
// ninguém ter feito melhor) e exige-se um valor acima de zero — senão uma
// partida em que ninguém curou nada dava "melhor curador" a toda a gente.
function isBestOfMatch(match, key) {
  const participants = match.participants;
  if (!participants?.length) return false;

  const me = participants.find((p) => p.isSelf);
  const mine = me?.[key];
  if (mine == null || mine <= 0) return false;

  return participants.every((p) => (p[key] ?? 0) <= mine);
}

// ================= ESCALÕES (rank de cada nível) =================
// Antes todos os níveis desbloqueados de uma categoria eram iguais — mesmo
// emoji, mesmo dourado, quer fosse o 1º nível ou o último. Agora cada nível
// tem um escalão próprio (bronze -> ... -> diamante), com cor e nome
// próprios: o último nível de uma escada é sempre "diamante", o primeiro é
// sempre "bronze", e os do meio distribuem-se pela escada consoante a
// posição relativa (por isso uma categoria de 4 níveis e outra de 7 dão as
// duas um diamante só no fim, em vez de a de 7 gastar o topo a meio).
// A escada segue os escalões do próprio League (Ferro -> Desafiante), por ser
// a linguagem que qualquer jogador já lê de imediato. "index" é a posição na
// escada e serve para escalar o brilho do badge: quanto mais alto o escalão,
// maior o halo (ver glowFor abaixo).
export const ACHIEVEMENT_RANKS = [
  { id: "iron", index: 0, labelKey: "achv_rank_iron", color: "#7b7b7b", glow: "rgba(123,123,123,0.45)" },
  { id: "bronze", index: 1, labelKey: "achv_rank_bronze", color: "#c07c46", glow: "rgba(192,124,70,0.5)" },
  { id: "silver", index: 2, labelKey: "achv_rank_silver", color: "#a8b3bd", glow: "rgba(168,179,189,0.5)" },
  { id: "gold", index: 3, labelKey: "achv_rank_gold", color: "#e8b923", glow: "rgba(232,185,35,0.5)" },
  { id: "platinum", index: 4, labelKey: "achv_rank_platinum", color: "#4fd1c5", glow: "rgba(79,209,197,0.5)" },
  { id: "emerald", index: 5, labelKey: "achv_rank_emerald", color: "#2ecc71", glow: "rgba(46,204,113,0.5)" },
  { id: "diamond", index: 6, labelKey: "achv_rank_diamond", color: "#7c9cff", glow: "rgba(124,156,255,0.55)" },
  { id: "master", index: 7, labelKey: "achv_rank_master", color: "#b25ddb", glow: "rgba(178,93,219,0.55)" },
  { id: "grandmaster", index: 8, labelKey: "achv_rank_grandmaster", color: "#e2555f", glow: "rgba(226,85,95,0.6)" },
  { id: "challenger", index: 9, labelKey: "achv_rank_challenger", color: "#58d5ff", glow: "rgba(88,213,255,0.65)" },
];

// Sombra/halo de um badge conquistado — cresce com o escalão, para os níveis
// altos saltarem mesmo à vista numa parede de badges (era esse o problema de
// um brilho fixo: um Ferro e um Desafiante liam-se exatamente igual).
export function glowFor(rank) {
  const i = rank.index ?? 0;
  return `0 ${2 + i * 0.6}px ${8 + i * 3.5}px ${rank.glow}`;
}

// Escalão de um nível pela sua posição na escada da categoria: o último é
// sempre o topo (diamante), o primeiro sempre bronze, o resto distribuído
// proporcionalmente.
//
// "floor" e não "round": com arredondamento, uma escada de 4 níveis (o caso
// mais comum aqui) saltava o ouro por completo (bronze->prata->platina->
// diamante), o que dava uma progressão estranha logo na maioria das
// categorias. Com floor, o ouro nunca desaparece e as repetições inevitáveis
// (escadas com mais níveis do que escalões) caem sempre nos escalões baixos,
// que é onde menos se notam.
export function rankForTierIndex(index, tierCount) {
  if (tierCount <= 1) return ACHIEVEMENT_RANKS[ACHIEVEMENT_RANKS.length - 1];
  const ratio = index / (tierCount - 1);
  const rankIndex = Math.floor(ratio * (ACHIEVEMENT_RANKS.length - 1));
  return ACHIEVEMENT_RANKS[rankIndex];
}

// Cada categoria é uma escada de níveis, com UM ícone só (sempre o mesmo em
// todos os níveis) — o que distingue um nível do outro é a cor do escalão
// (ver ACHIEVEMENT_RANKS/rankForTierIndex), não o símbolo. "iconId" é a
// chave de um ícone desenhado (SVG lucide, ver components/AchievementIcon.jsx):
// este ficheiro é lógica pura, sem JSX, por isso guarda só o identificador e
// deixa o desenho para quem renderiza. "unit" controla só a formatação do
// valor mostrado no badge.
// A mesma escada para as 6 classes — comparar "quanto joguei de assassino vs
// de tanque" só faz sentido se a régua for igual dos dois lados.
const CLASS_TIERS = [5, 25, 50, 100, 250];

// "desc" explica em texto o que a categoria conta e como sobe — sem isto
// várias delas eram adivinhação a partir do título (ex: "Maratona" não diz
// que conta partidas seguidas na mesma sessão).
export function buildAchievementCategories(stats, t) {
  return [
    { id: "wins", iconId: "trophy", title: t("achv_cat_wins"), desc: t("achv_cat_wins_desc"), value: stats.totalWins, unit: "", tiers: [1, 10, 25, 50, 100, 250, 500] },
    { id: "games", iconId: "arena", title: t("achv_cat_games"), desc: t("achv_cat_games_desc"), value: stats.totalGames, unit: "", tiers: [10, 50, 100, 250, 500, 1000] },
    { id: "coverage", iconId: "globe", title: t("achv_cat_coverage"), desc: t("achv_cat_coverage_desc"), value: stats.coveragePct, unit: "%", tiers: [10, 25, 50, 75, 100] },
    { id: "winstreak", iconId: "flame", title: t("achv_cat_winstreak"), desc: t("achv_cat_winstreak_desc"), value: stats.bestWinStreak, unit: "", tiers: [3, 5, 10, 15, 20] },
    { id: "top3streak", iconId: "medal", title: t("achv_cat_top3streak"), desc: t("achv_cat_top3streak_desc"), value: stats.bestTop3Streak, unit: "", tiers: [3, 5, 10, 15] },
    { id: "triplekill", iconId: "swords", title: t("achv_cat_triplekill"), desc: t("achv_cat_triplekill_desc"), value: stats.tripleKillCount, unit: "", tiers: [1, 5, 10, 25] },
    { id: "damage", iconId: "bolt", title: t("achv_cat_damage"), desc: t("achv_cat_damage_desc"), value: stats.bestDamage, unit: "k", tiers: [20000, 50000, 100000, 150000] },
    { id: "healing", iconId: "heal", title: t("achv_cat_healing"), desc: t("achv_cat_healing_desc"), value: stats.bestHealing, unit: "k", tiers: [10000, 25000, 50000, 100000] },
    { id: "favorite", iconId: "star", title: t("achv_cat_favorite"), desc: t("achv_cat_favorite_desc"), value: stats.favoriteChampGames, unit: "", tiers: [10, 25, 50, 100] },
    { id: "diversity", iconId: "masks", title: t("achv_cat_diversity"), desc: t("achv_cat_diversity_desc"), value: stats.diversityCount, unit: "", tiers: [10, 25, 50, 100] },
    { id: "marathon", iconId: "hourglass", title: t("achv_cat_marathon"), desc: t("achv_cat_marathon_desc"), value: stats.marathonGames, unit: "", tiers: [3, 5, 10, 15] },
    { id: "duo", iconId: "bond", title: t("achv_cat_duo"), desc: t("achv_cat_duo_desc"), value: stats.duoMaxGames, unit: "", tiers: [5, 10, 25, 50] },

    // ---- Marcos de carreira ----
    { id: "top3total", iconId: "podium", title: t("achv_cat_top3total"), desc: t("achv_cat_top3total_desc"), value: stats.top3Total, unit: "", tiers: [5, 25, 50, 100, 250, 500] },
    { id: "challenge_wins", iconId: "crest", title: t("achv_cat_challenge_wins"), desc: t("achv_cat_challenge_wins_desc"), value: stats.challengeWins, unit: "", tiers: [1, 3, 5, 10, 25] },
    { id: "kills", iconId: "skull", title: t("achv_cat_kills"), desc: t("achv_cat_kills_desc"), value: stats.totalKills, unit: "", tiers: [50, 250, 1000, 2500, 5000, 10000] },
    { id: "augments", iconId: "rune", title: t("achv_cat_augments"), desc: t("achv_cat_augments_desc"), value: stats.distinctAugments, unit: "", tiers: [10, 25, 50, 100, 150] },
    { id: "days", iconId: "calendar", title: t("achv_cat_days"), desc: t("achv_cat_days_desc"), value: stats.daysPlayed, unit: "", tiers: [5, 25, 50, 100, 250] },

    // ---- Por classe de campeão (tags do Data Dragon) ----
    { id: "assassin", iconId: "dagger", title: t("achv_cat_assassin"), desc: t("achv_cat_class_desc"), value: stats.classGames.Assassin, unit: "", tiers: CLASS_TIERS },
    { id: "fighter", iconId: "axe", title: t("achv_cat_fighter"), desc: t("achv_cat_class_desc"), value: stats.classGames.Fighter, unit: "", tiers: CLASS_TIERS },
    { id: "mage", iconId: "orb", title: t("achv_cat_mage"), desc: t("achv_cat_class_desc"), value: stats.classGames.Mage, unit: "", tiers: CLASS_TIERS },
    { id: "marksman", iconId: "bow", title: t("achv_cat_marksman"), desc: t("achv_cat_class_desc"), value: stats.classGames.Marksman, unit: "", tiers: CLASS_TIERS },
    { id: "support", iconId: "aid", title: t("achv_cat_support"), desc: t("achv_cat_class_desc"), value: stats.classGames.Support, unit: "", tiers: CLASS_TIERS },
    { id: "tank", iconId: "shield", title: t("achv_cat_tank"), desc: t("achv_cat_class_desc"), value: stats.classGames.Tank, unit: "", tiers: CLASS_TIERS },
  ];
}

// Conquistas booleanas (sim/não), à parte da lógica de escada: feitos únicos
// que ou se fizeram ou não, sem progressão. A maioria compara-nos com os
// outros 15-17 jogadores da partida (ver isBestOfMatch) — só possível porque
// guardamos a partida toda, não só a nossa linha. "iconId" segue a mesma
// convenção das categorias (ver buildAchievementCategories).
export function buildBooleanAchievements(stats, t) {
  return [
    { id: "perfect", iconId: "crown", title: t("achv_perfect_title"), desc: t("achv_perfect_desc"), unlocked: stats.hasPerfectVictory },
    { id: "medic", iconId: "heal", title: t("achv_medic_title"), desc: t("achv_medic_desc"), unlocked: stats.hasTopHealerAsSupport },
    { id: "carry", iconId: "bolt", title: t("achv_carry_title"), desc: t("achv_carry_desc"), unlocked: stats.hasTopDamageWin },
    { id: "juggernaut", iconId: "crest", title: t("achv_juggernaut_title"), desc: t("achv_juggernaut_desc"), unlocked: stats.hasTopTankTop3 },
    { id: "tycoon", iconId: "coin", title: t("achv_tycoon_title"), desc: t("achv_tycoon_desc"), unlocked: stats.hasTopGold },
    { id: "slayer", iconId: "swords", title: t("achv_slayer_title"), desc: t("achv_slayer_desc"), unlocked: stats.hasTopKills },
    { id: "earlybird", iconId: "moon", title: t("achv_earlybird_title"), desc: t("achv_earlybird_desc"), unlocked: stats.hasEarlyBird },
  ];
}

export function summarizeBadges(categories, booleanAchievements) {
  let total = 0;
  let unlocked = 0;
  categories.forEach((c) => {
    total += c.tiers.length;
    unlocked += c.tiers.filter((tier) => c.value >= tier).length;
  });
  total += booleanAchievements.length;
  unlocked += booleanAchievements.filter((b) => b.unlocked).length;
  return { totalBadges: total, unlockedBadges: unlocked };
}

// ================= DETEÇÃO DE PROGRESSO (para as notificações) =================
// "Fotografia" do estado das conquistas: por categoria, quantos níveis estão
// conquistados; por especial, se está ou não. É o mínimo para saber, na
// sincronização seguinte, o que subiu — guardar as conquistas todas seria
// pesado e não acrescentava nada (ver useNotifications.js).
export function buildAchievementSnapshot(categories, booleanAchievements) {
  const snapshot = {};
  categories.forEach((c) => {
    snapshot[`cat:${c.id}`] = c.tiers.filter((tier) => c.value >= tier).length;
  });
  booleanAchievements.forEach((b) => {
    snapshot[`bool:${b.id}`] = b.unlocked ? 1 : 0;
  });
  return snapshot;
}

// O que subiu entre a fotografia anterior e o estado atual. Só olha para
// SUBIDAS: se um valor descer (ex: partidas apagadas à mão na BD), não faz
// sentido notificar "perdeste uma conquista".
export function diffAchievements(previousSnapshot, categories, booleanAchievements, t) {
  const events = [];

  categories.forEach((cat) => {
    const now = cat.tiers.filter((tier) => cat.value >= tier).length;
    const before = previousSnapshot[`cat:${cat.id}`] ?? 0;
    if (now <= before) return;

    // Uma sincronização pode saltar vários níveis de uma vez (ex: importar
    // 200 partidas antigas) — nesse caso interessa o mais alto atingido, não
    // uma notificação por cada nível pelo caminho.
    const rank = rankForTierIndex(now - 1, cat.tiers.length);
    events.push({
      type: "achievement",
      key: `cat:${cat.id}:${now}`,
      iconId: cat.iconId,
      color: rank.color,
      title: cat.title,
      body: t("notif_tier_up")
        .replace("{rank}", t(rank.labelKey))
        .replace("{value}", formatAchievementValue(cat.tiers[now - 1], cat.unit)),
    });
  });

  booleanAchievements.forEach((b) => {
    const before = previousSnapshot[`bool:${b.id}`] ?? 0;
    if (!b.unlocked || before === 1) return;

    events.push({
      type: "achievement",
      key: `bool:${b.id}`,
      iconId: b.iconId,
      color: ACHIEVEMENT_RANKS[ACHIEVEMENT_RANKS.length - 1].color,
      title: b.title,
      body: t("notif_unlocked"),
    });
  });

  return events;
}
