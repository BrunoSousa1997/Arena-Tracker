import { useMemo, useState, useEffect } from "react";
import { useLanguage } from "../lib/i18n";
import { normalizeChampionId } from "../lib/champions";
import {
  augmentRarityColor,
  augmentRarityStyle,
  AUGMENT_RARITY_ORDER,
  AUGMENT_RARITY_LABEL_KEYS,
} from "../lib/augments";
import { computeAugmentStats, AUGMENT_SORTS } from "../lib/augmentStats";
import { computeItemStats, recommendCore, coreProgress, DEFAULT_MIN_GAMES } from "../lib/itemStats";
import { ITEM_TIER_ORDER, ITEM_TIER } from "../lib/itemTiers";
import { groupWithBaseline } from "../lib/statGroups";
import { scoreLiveGame, resolveRoomRules } from "../lib/challengeScoring";
import { normalizeItems } from "../lib/items";
import Tooltip from "../components/Tooltip";

// ================= A TAB "EM JOGO" =================
// Junta num só ecrã as três coisas que só fazem sentido juntas enquanto a
// partida decorre: o estado da partida (o mesmo que o banner flutuante e a
// sobreposição já mostram), o que costuma correr bem com este campeão
// (augments e itens), e quantos pontos do desafio já estão feitos.
//
// Não está na barra de tabs: chega-se aqui pelo botão ao lado do Sincronizar,
// que só existe enquanto há partida a decorrer (ver liveSessionActive em
// App.jsx). Acabado o jogo, a app devolve quem cá estiver à vista anterior.
//
// Mesmo assim isto sabe desenhar-se SEM partida, com um seletor de campeão em
// vez do cartão ao vivo. Não é caso morto: é o que a visita guiada mostra na
// primeira utilização (ver TAB_GUIDE em lib/howItWorks.js) e é o que aparece
// no intervalo entre a partida acabar e o regresso à vista anterior. Sem
// esse caminho, os dois momentos davam ecrã em branco.
//
// Não há aqui nenhuma lógica de deteção de jogo: tudo o que é "ao vivo" vem
// pronto de liveChampionAlert (ver hooks/useLiveGame.js), pela mesma razão
// que o GameOverlay também não a tem — uma segunda cópia dessa lógica
// divergiria da primeira.

// Abaixo disto a amostra é pequena de mais para as percentagens quererem
// dizer alguma coisa, e a interface diz isso em vez de as mostrar como se
// fossem sólidas. Não bloqueia nada: mostra na mesma, com o aviso ao lado.
const LOW_SAMPLE_GAMES = 20;

// Quantas linhas por prateleira. A Arena oferece TRÊS augments de cada vez,
// por isso cinco é o número que cobre a oferta e sobra um pouco para o caso
// de os três oferecidos serem todos maus — mais do que isso e a secção passa
// a ser uma tabela para estudar, que não é o que se faz a meio de um jogo.
const PER_AUGMENT_RARITY = 5;

const PER_ITEM_TIER = {
  [ITEM_TIER.PRISMATIC]: 5,
  [ITEM_TIER.LEGENDARY]: 6,
  // Há oito botas no jogo todo e escolhem-se uma vez — três chegam.
  [ITEM_TIER.BOOTS]: 3,
};

const ITEM_TIER_LABEL_KEYS = {
  [ITEM_TIER.PRISMATIC]: "tier_prismatic",
  [ITEM_TIER.LEGENDARY]: "tier_legendary",
  [ITEM_TIER.BOOTS]: "tier_boots",
};

// O prismático herda o roxo que os augments prismáticos já usam (ver
// augmentRarityColor) — é a mesma ideia de raridade nas duas listas e nada
// se ganhava em pintá-la de outra cor de cada lado.
const ITEM_TIER_COLORS = {
  [ITEM_TIER.PRISMATIC]: "#b165ff",
  [ITEM_TIER.LEGENDARY]: "#ffa94d",
  [ITEM_TIER.BOOTS]: "#9aa0ab",
};

export default function InGame({
  matches,
  champions,
  augmentsMap,
  itemsMap,
  itemTiersMap,
  DRAGON,
  liveChampionAlert,
}) {
  const { t, lang } = useLanguage();

  const isLive = !!liveChampionAlert && !liveChampionAlert.gameEnded;
  const liveChampionId = liveChampionAlert?.championId || null;

  // O campeão da análise. Com partida a decorrer é sempre o que se está a
  // jogar (não faria sentido estar a ver outro); sem partida, é escolhido à
  // mão, com o último jogado por omissão.
  // "matches" chega ordenado do mais recente para o mais antigo (ver o
  // .order("created_at", { ascending: false }) em db/matches.js), por isso o
  // último jogado é o primeiro da lista e não é preciso ordenar aqui.
  const lastPlayedChampion = useMemo(() => {
    const last = matches?.[0];
    return last ? normalizeChampionId(last.champion, champions) : null;
  }, [matches, champions]);

  const [picked, setPicked] = useState(lastPlayedChampion);

  // Entrar em partida troca o campeão da análise para o que está a ser
  // jogado. Sem isto, quem tivesse deixado a tab noutro campeão via a
  // partida de um e as recomendações de outro — o erro mais caro que esta
  // tab pode cometer, porque não é nada óbvio a olhar para o ecrã.
  useEffect(() => {
    if (liveChampionId) setPicked(liveChampionId);
  }, [liveChampionId]);

  const championId = liveChampionId || picked;

  // "Todos os jogadores" por omissão, ao contrário da tab Augments. Filtrada
  // por campeão, a amostra própria é quase sempre pequena de mais para dizer
  // seja o que for (ver LOW_SAMPLE_GAMES) — aqui a população grande é o
  // default sensato, não a alternativa.
  const [population, setPopulation] = useState("all");
  const allPlayers = population === "all";

  const champion = champions.find((c) => c.id === championId);

  // Quantas partidas (não escolhas) sustentam o que se está a ver. É este o
  // número que decide se se mostra o aviso de amostra pequena, e é mostrado
  // ao utilizador em vez de ficar só implícito nas percentagens.
  const sampleGames = useMemo(() => {
    if (!championId) return 0;

    if (allPlayers) {
      return (matches || []).reduce(
        (n, m) =>
          n +
          (m.participants || []).filter(
            (p) => p.placement != null && normalizeChampionId(p.champion, champions) === championId
          ).length,
        0
      );
    }

    return (matches || []).filter(
      (m) => m.placement != null && normalizeChampionId(m.champion, champions) === championId
    ).length;
  }, [matches, champions, championId, allPlayers]);

  const statsOpts = { allPlayers, championId, champions };

  const { rows: augmentRows } = useMemo(
    () => computeAugmentStats(matches, statsOpts),
    [matches, allPlayers, championId, champions]
  );

  const { rows: itemRows } = useMemo(
    () => computeItemStats(matches, { ...statsOpts, itemsMap }),
    [matches, allPlayers, championId, champions, itemsMap]
  );

  // O mínimo de jogos acompanha o tamanho da amostra: exigir 8 jogos por
  // item numa amostra de 15 partidas não devolvia linha nenhuma e a tab
  // aparecia vazia sem explicação. Com amostra pequena baixa-se o mínimo e
  // é o aviso de amostra que passa a fazer o trabalho de dizer o que valem.
  const minGames = sampleGames < LOW_SAMPLE_GAMES ? 2 : DEFAULT_MIN_GAMES;

  // ================= PRATELEIRAS =================
  // Os augments partem-se por raridade e os itens por tier, com a média
  // recalculada dentro de cada prateleira (ver lib/statGroups.js para o
  // porquê). Sem isto, a lista de augments era só os prismáticos todos
  // seguidos e a de itens só prismáticos também — a comparação que interessa
  // é entre o que te vai ser oferecido ao mesmo tempo, não entre prateleiras.
  const augmentGroups = useMemo(
    () =>
      groupWithBaseline(
        augmentRows.filter((r) => r.games >= minGames),
        (r) => augmentsMap?.[r.augmentId]?.rarity ?? null,
        { order: AUGMENT_RARITY_ORDER, sort: AUGMENT_SORTS.delta }
      )
        .map((g) => ({ ...g, rows: g.rows.slice(0, PER_AUGMENT_RARITY) }))
        .filter((g) => g.rows.length > 0),
    [augmentRows, augmentsMap, minGames]
  );

  // Ao contrário dos augments, aqui exige-se desvio positivo (é o que o
  // recommendCore faz): um augment tem de se escolher à força entre os três
  // oferecidos, mesmo que os três sejam maus, mas um item ninguém é obrigado
  // a comprar — recomendar um que está abaixo da média era conselho a mais.
  const itemGroups = useMemo(
    () =>
      groupWithBaseline(itemRows, (r) => itemTiersMap?.[r.itemId] ?? null, {
        order: ITEM_TIER_ORDER,
      })
        .map((g) => ({
          ...g,
          rows: recommendCore(g.rows, { size: PER_ITEM_TIER[g.key] ?? 4, minGames }),
        }))
        .filter((g) => g.rows.length > 0),
    [itemRows, itemTiersMap, minGames]
  );

  // Havia itens que cheguem, tenham ou não desvio positivo? Serve só para a
  // mensagem de lista vazia: "não há jogos suficientes" e "há jogos, mas
  // nenhum item está acima da média" são coisas diferentes, e mostrar a
  // primeira quando é a segunda manda o utilizador jogar mais para resolver
  // um problema que não é de amostra.
  const hasEligibleItems = useMemo(
    () => itemRows.some((r) => r.games >= minGames && itemTiersMap?.[r.itemId]),
    [itemRows, minGames, itemTiersMap]
  );

  // O diff da build, agora prateleira a prateleira: dentro de cada uma, o que
  // ainda não compraste vem primeiro. Só faz sentido com partida a decorrer —
  // fora dela o inventário é sempre vazio e "falta-te tudo" não informa nada.
  const itemGroupsWithProgress = useMemo(
    () =>
      itemGroups.map((g) => {
        if (!isLive) return { ...g, ordered: g.rows.map((row) => ({ row, owned: false })) };

        const { have, missing } = coreProgress(g.rows, liveChampionAlert?.items);
        return {
          ...g,
          ordered: [
            ...missing.map((row) => ({ row, owned: false })),
            ...have.map((row) => ({ row, owned: true })),
          ],
        };
      }),
    [itemGroups, isLive, liveChampionAlert?.items]
  );

  const liveScore = useMemo(() => {
    if (!isLive || !liveChampionAlert?.challengeRoom) return null;
    return scoreLiveGame(
      {
        champion: championId,
        kills: liveChampionAlert.kda?.kills,
        deaths: liveChampionAlert.kda?.deaths,
        assists: liveChampionAlert.kda?.assists,
        killStreaks: liveChampionAlert.streaks?.kill,
        assistStreaks: liveChampionAlert.streaks?.assist,
        deathStreaks: liveChampionAlert.streaks?.death,
      },
      { champions, rules: resolveRoomRules(liveChampionAlert.challengeRoom) }
    );
  }, [isLive, liveChampionAlert, championId, champions]);

  if (!championId) {
    return <div style={styles.empty}>{t("ingame_empty_no_champion")}</div>;
  }

  return (
    <div style={styles.wrap}>
      {/* ================= CABEÇALHO ================= */}
      <div
        style={{
          ...styles.hero,
          borderColor: isLive
            ? "rgba(var(--accent-rgb),0.45)"
            : "rgba(var(--border-rgb),0.35)",
        }}
      >
        {DRAGON && (
          <img
            src={`${DRAGON}/img/champion/${championId}.png`}
            alt=""
            style={styles.heroIcon}
          />
        )}

        <div style={styles.heroText}>
          <div style={styles.heroTopRow}>
            <span style={styles.heroChampion}>{champion?.name || championId}</span>

            {isLive ? (
              <span style={{ ...styles.heroBadge, ...styles.heroBadgeLive }}>
                {t("ingame_badge_live")}
              </span>
            ) : (
              <span style={styles.heroBadge}>{t("ingame_badge_idle")}</span>
            )}

            {isLive && (
              <span
                style={{
                  ...styles.heroBadge,
                  color: liveChampionAlert.hasWin ? "var(--place-good)" : "var(--place-mid)",
                  borderColor: liveChampionAlert.hasWin
                    ? "var(--place-good)"
                    : "var(--place-mid)",
                }}
              >
                {liveChampionAlert.hasWin ? t("ingame_has_win") : t("ingame_needs_win")}
              </span>
            )}
          </div>

          {isLive && liveChampionAlert.kda && (
            <div style={styles.heroKda}>
              <span style={styles.heroKdaLabel}>KDA</span>
              <b>{liveChampionAlert.kda.kills}</b>
              <span style={styles.slash}>/</span>
              <b style={{ color: "var(--place-low)" }}>{liveChampionAlert.kda.deaths}</b>
              <span style={styles.slash}>/</span>
              <b>{liveChampionAlert.kda.assists}</b>
            </div>
          )}

          {isLive && normalizeItems(liveChampionAlert.items).length > 0 && (
            <div style={styles.heroItems}>
              {normalizeItems(liveChampionAlert.items).map((it, idx) => (
                <Tooltip key={idx} label={itemsMap?.[it.itemID] || `#${it.itemID}`}>
                  <img
                    src={`${DRAGON}/img/item/${it.itemID}.png`}
                    alt=""
                    style={styles.heroItemIcon}
                  />
                </Tooltip>
              ))}
            </div>
          )}

          {isLive && liveChampionAlert.roast && (
            <div style={styles.heroRoast}>“{liveChampionAlert.roast}”</div>
          )}

          {/* Sem partida: o seletor de campeão. Um <select> simples e não uma
              grelha de campeões — esta tab é sobre os números, e uma grelha
              de 170 retratos roubava-lhes o ecrã todo. */}
          {!isLive && (
            <div style={styles.pickerRow}>
              <span style={styles.pickerLabel}>{t("ingame_picker_label")}</span>
              <select
                value={picked || ""}
                onChange={(e) => setPicked(e.target.value)}
                style={styles.picker}
              >
                {[...champions]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ================= PONTUAÇÃO DO DESAFIO ================= */}
      {liveScore && (
        <div style={styles.panel}>
          <div style={styles.panelHead}>
            <span style={styles.panelTitle}>{t("ingame_score_title")}</span>
            <span style={styles.panelHint}>
              {liveChampionAlert.challengeRoom.name || t("ingame_score_room")}
            </span>
          </div>

          <div style={styles.scoreRow}>
            <span style={styles.scoreValue}>
              {liveScore.partial > 0 ? "+" : ""}
              {liveScore.partial.toFixed(1)}
            </span>
            <div style={styles.scoreParts}>
              {[
                ["ingame_score_kills", liveScore.parts.kills],
                ["ingame_score_deaths", liveScore.parts.deaths],
                ["ingame_score_assists", liveScore.parts.assists],
                ["ingame_score_streaks", liveScore.parts.killStreak + liveScore.parts.assistStreak + liveScore.parts.deathStreak],
              ].map(([key, value]) => (
                <span key={key} style={styles.scorePart}>
                  <span style={styles.scorePartLabel}>{t(key)}</span>
                  <b
                    style={{
                      color: value > 0 ? "var(--place-good)" : value < 0 ? "var(--place-low)" : "var(--text-muted)",
                    }}
                  >
                    {value > 0 ? "+" : ""}
                    {value}
                  </b>
                </span>
              ))}
              {liveScore.multiplier !== 1 && (
                <span style={styles.scorePart}>
                  <span style={styles.scorePartLabel}>{t("ingame_score_handicap")}</span>
                  <b>×{liveScore.multiplier}</b>
                </span>
              )}
            </div>
          </div>

          {/* Não é um detalhe de rodapé: sem isto o número acima parece final
              e depois sobe sozinho ao sincronizar, o que se lê como um bug. */}
          <div style={styles.panelNote}>{t("ingame_score_partial_note")}</div>
        </div>
      )}

      {/* ================= CONTROLO DA POPULAÇÃO + AMOSTRA ================= */}
      <div style={styles.sampleBar}>
        <div style={styles.segGroup}>
          <button
            onClick={() => setPopulation("all")}
            style={{ ...styles.segBtn, ...(allPlayers ? styles.segBtnActive : null) }}
          >
            {t("aug_pop_all")}
          </button>
          <button
            onClick={() => setPopulation("mine")}
            style={{ ...styles.segBtn, ...(!allPlayers ? styles.segBtnActive : null) }}
          >
            {t("aug_pop_mine")}
          </button>
        </div>

        <span style={styles.sampleCount}>
          {sampleGames.toLocaleString(lang === "en" ? "en-US" : "pt-PT")}{" "}
          {t("ingame_sample_games")}
        </span>

        {sampleGames < LOW_SAMPLE_GAMES && (
          <span style={styles.sampleWarning}>
            {allPlayers ? t("ingame_low_sample_all") : t("ingame_low_sample_mine")}
          </span>
        )}
      </div>

      <div style={styles.columns}>
        {/* ================= AUGMENTS ================= */}
        <div style={styles.panel}>
          <div style={styles.panelHead}>
            <span style={styles.panelTitle}>{t("ingame_augments_title")}</span>
            <span style={styles.panelHint}>{t("ingame_augments_hint")}</span>
          </div>

          {augmentGroups.length === 0 ? (
            <div style={styles.panelEmpty}>{t("ingame_augments_empty")}</div>
          ) : (
            augmentGroups.map((group) => (
              <div key={group.key}>
                <ShelfHead
                  label={t(AUGMENT_RARITY_LABEL_KEYS[group.key] || "rarity_other")}
                  color={augmentRarityColor(group.key)}
                  baseline={group.baseline}
                  t={t}
                />
                {group.rows.map((r) => (
                  <AugmentLine key={r.augmentId} row={r} info={augmentsMap?.[r.augmentId]} />
                ))}
              </div>
            ))
          )}
        </div>

        {/* ================= BUILD ================= */}
        <div style={styles.panel}>
          <div style={styles.panelHead}>
            <span style={styles.panelTitle}>{t("ingame_build_title")}</span>
            <span style={styles.panelHint}>{t("ingame_build_hint")}</span>
          </div>

          {itemGroupsWithProgress.length === 0 ? (
            <div style={styles.panelEmpty}>
              {hasEligibleItems ? t("ingame_build_none_above") : t("ingame_build_empty")}
            </div>
          ) : (
            itemGroupsWithProgress.map((group) => (
              <div key={group.key}>
                <ShelfHead
                  label={t(ITEM_TIER_LABEL_KEYS[group.key] || "rarity_other")}
                  color={ITEM_TIER_COLORS[group.key]}
                  baseline={group.baseline}
                  t={t}
                />
                {group.ordered.map(({ row, owned }) => (
                  <ItemLine
                    key={row.itemId}
                    row={row}
                    name={itemsMap?.[row.itemId]}
                    DRAGON={DRAGON}
                    owned={owned}
                    ownedLabel={t("ingame_build_owned")}
                  />
                ))}
              </div>
            ))
          )}

          <div style={styles.panelNote}>{t("ingame_build_note")}</div>
        </div>
      </div>

      <div style={styles.footnote}>{t("ingame_footnote")}</div>
    </div>
  );
}

// O título de uma prateleira (raridade de augment ou tier de item).
//
// Traz sempre a média da própria prateleira ao lado. Sem ela, "+8" numa
// secção e "+8" noutra pareciam a mesma coisa e não são: cada uma é medida
// contra a sua própria média, e é preciso ver contra o quê para o número
// dizer alguma coisa.
function ShelfHead({ label, color, baseline, t }) {
  return (
    <div style={styles.shelfHead}>
      <span style={{ ...styles.shelfDot, background: color || "var(--text-muted)" }} />
      <span style={{ ...styles.shelfLabel, color: color || "var(--text-body)" }}>{label}</span>
      <span style={styles.shelfBaseline}>
        {t("ingame_shelf_avg")} {baseline.top3Rate.toFixed(0)}%
      </span>
    </div>
  );
}

// Uma linha de augment: ícone, nome e o desvio face à média do campeão.
function AugmentLine({ row, info }) {
  const good = row.delta >= 0;
  const rarityColor = augmentRarityColor(info?.rarity);

  return (
    <div style={styles.line}>
      <span style={{ ...styles.lineIconWrap, ...augmentRarityStyle(info?.rarity) }}>
        {info?.icon && <img src={info.icon} alt="" style={styles.lineIcon} loading="lazy" />}
      </span>

      <span style={{ ...styles.lineName, color: rarityColor || "var(--text-body)" }}>
        {info?.name || `#${row.augmentId}`}
      </span>

      <span style={styles.lineGames}>{row.games}</span>

      <span
        style={{
          ...styles.lineDelta,
          color: good ? "var(--place-good)" : "var(--place-low)",
        }}
      >
        {good ? "+" : ""}
        {row.delta.toFixed(0)}
      </span>
    </div>
  );
}

// Uma linha de item. "owned" só é passado com partida a decorrer — fora dela
// o inventário não existe e não faz sentido marcar nada como já comprado.
function ItemLine({ row, name, DRAGON, owned, ownedLabel }) {
  const good = row.delta >= 0;

  return (
    <div style={{ ...styles.line, ...(owned ? styles.lineOwned : null) }}>
      <span style={styles.lineIconWrap}>
        {DRAGON && (
          <img
            src={`${DRAGON}/img/item/${row.itemId}.png`}
            alt=""
            style={styles.lineIcon}
            loading="lazy"
          />
        )}
      </span>

      <span style={styles.lineName}>
        {name || `#${row.itemId}`}
        {owned && <span style={styles.ownedTag}>{ownedLabel}</span>}
      </span>

      <span style={styles.lineGames}>{row.games}</span>

      <span
        style={{
          ...styles.lineDelta,
          color: good ? "var(--place-good)" : "var(--place-low)",
        }}
      >
        {good ? "+" : ""}
        {row.delta.toFixed(0)}
      </span>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 12 },

  // ---- cabeçalho ----
  hero: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 16px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    border: "1px solid",
  },

  heroIcon: {
    width: 62,
    height: 62,
    flexShrink: 0,
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--accent-rgb),0.35)",
  },

  heroText: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 },

  heroTopRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },

  heroChampion: {
    fontSize: 18,
    fontWeight: 700,
    fontFamily: "Cinzel, serif",
    color: "var(--text-body)",
  },

  heroBadge: {
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid rgba(var(--border-rgb),0.5)",
    color: "var(--text-muted)",
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  heroBadgeLive: { color: "var(--accent-text)", borderColor: "rgba(var(--accent-rgb),0.6)" },

  heroKda: { display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-body)" },

  heroKdaLabel: {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 0.4,
    color: "var(--text-muted)",
    marginRight: 4,
  },

  slash: { color: "var(--text-muted)" },

  heroItems: { display: "flex", gap: 4, flexWrap: "wrap" },

  heroItemIcon: {
    width: 26,
    height: 26,
    borderRadius: "var(--radius-sm)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  heroRoast: { fontSize: 11.5, fontStyle: "italic", color: "var(--text-secondary)" },

  pickerRow: { display: "flex", alignItems: "center", gap: 8 },

  pickerLabel: { fontSize: 11, color: "var(--text-muted)" },

  picker: {
    padding: "6px 10px",
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-deep-rgb),0.95)",
    border: "1px solid rgba(var(--border-rgb),0.45)",
    color: "var(--text-body)",
    fontSize: 12,
    outline: "none",
  },

  // ---- painéis ----
  columns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 12,
    alignItems: "start",
  },

  panel: {
    display: "flex",
    flexDirection: "column",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--accent-rgb),0.15)",
    overflow: "hidden",
  },

  panelHead: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    padding: "9px 14px",
    background: "rgba(var(--panel-deep-rgb),0.95)",
    borderBottom: "1px solid rgba(var(--border-rgb),0.2)",
  },

  panelTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "var(--text-body)",
  },

  panelHint: { fontSize: 10, color: "var(--text-muted)", marginLeft: "auto" },

  panelEmpty: { padding: "18px 14px", fontSize: 11.5, color: "var(--text-muted)", textAlign: "center" },

  panelNote: {
    padding: "8px 14px",
    fontSize: 10,
    lineHeight: 1.5,
    color: "var(--text-muted)",
    borderTop: "1px solid rgba(var(--border-rgb),0.18)",
  },

  shelfHead: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 14px 5px",
  },

  shelfDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },

  shelfLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  shelfBaseline: {
    marginLeft: "auto",
    fontSize: 9.5,
    color: "var(--text-muted)",
    fontVariantNumeric: "tabular-nums",
  },

  // ---- linhas ----
  line: {
    display: "grid",
    gridTemplateColumns: "30px minmax(0,1fr) 38px 42px",
    alignItems: "center",
    gap: 9,
    padding: "7px 14px",
    borderBottom: "1px solid rgba(var(--border-rgb),0.14)",
  },

  lineOwned: { opacity: 0.5 },

  lineIconWrap: {
    width: 30,
    height: 30,
    borderRadius: "var(--radius-sm)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  lineIcon: { width: "100%", height: "100%", objectFit: "cover" },

  lineName: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-body)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  ownedTag: {
    marginLeft: 6,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: "var(--place-good)",
  },

  lineGames: {
    fontSize: 11,
    color: "var(--text-muted)",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },

  lineDelta: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },

  // ---- pontuação ----
  scoreRow: { display: "flex", alignItems: "center", gap: 16, padding: "12px 14px", flexWrap: "wrap" },

  scoreValue: {
    fontSize: 30,
    fontWeight: 700,
    fontFamily: "Cinzel, serif",
    color: "var(--accent-text)",
    fontVariantNumeric: "tabular-nums",
  },

  scoreParts: { display: "flex", gap: 14, flexWrap: "wrap" },

  scorePart: { display: "flex", flexDirection: "column", gap: 1, fontSize: 12 },

  scorePartLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "var(--text-muted)",
  },

  // ---- amostra ----
  sampleBar: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

  segGroup: {
    display: "flex",
    gap: 2,
    padding: 2,
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  segBtn: {
    padding: "6px 11px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 600,
    fontFamily: "Cinzel, serif",
    whiteSpace: "nowrap",
  },

  segBtnActive: { background: "var(--accent-solid)", color: "var(--accent-solid-text)" },

  sampleCount: { fontSize: 11, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" },

  // Sem fundo colorido de propósito: não é um erro, é uma ressalva sobre o
  // que os números ao lado valem. Um bloco vermelho cheio lia-se como
  // "alguma coisa correu mal" e essa não é a mensagem.
  sampleWarning: {
    padding: "4px 10px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--place-mid)",
    fontSize: 10.5,
    color: "var(--place-mid)",
  },

  empty: {
    padding: "26px 18px",
    textAlign: "center",
    fontSize: 12.5,
    color: "var(--text-muted)",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  footnote: { fontSize: 10.5, lineHeight: 1.5, color: "var(--text-muted)" },
};
