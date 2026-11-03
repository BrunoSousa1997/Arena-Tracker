import { useMemo, useState, useEffect } from "react";
import { Star, Plus, X, Link2, ShoppingCart, Check } from "lucide-react";
import { useLanguage } from "../lib/i18n";
import { normalizeChampionId } from "../lib/champions";
import {
  augmentRarityColor,
  augmentRarityStyle,
  AUGMENT_RARITY_LABEL_KEYS,
} from "../lib/augments";
import { ITEM_TIER } from "../lib/itemTiers";
import {
  buildGlobalContext,
  buildAdvisor,
  suggestBuild,
  suggestAugments,
  CONFIDENCE,
} from "../lib/recommend";
import { normalizedPlacement } from "../lib/sessionCurve";
import { placementColor } from "../lib/placement";
import { scoreLiveGame, resolveRoomRules } from "../lib/challengeScoring";
import { normalizeItems } from "../lib/items";
import Tooltip from "../components/Tooltip";
import { canShowIcons, championIcon, itemIcon } from "../lib/icons";

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

// Mínimo de encontros para o lugar médio contra um campeão querer dizer
// alguma coisa. Abaixo disto o campeão aparece à mesma na lista (saber que
// nunca o enfrentaste também é informação), mas sem número a fingir-se de
// facto.
const MIN_MATCHUP_GAMES = 3;

// O lugar médio contra um campeão vem em decimal (ex: 3.4); a paleta de
// lugares trabalha com posições inteiras. Arredonda-se para escolher a cor,
// mantendo o número exato no texto.
function placementColorFor(avg) {
  return placementColor(Math.round(avg || 0));
}

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

// A confiança de cada linha (ver lib/recommend.js) mostra-se como cor, não
// como texto: num painel onde cada linha já tem um nome, uma amostra e um
// desvio, uma quarta coluna de palavras tirava-lhe a leitura de relance. A
// cor diz logo se o número abaixo é para levar a sério, e o texto completo
// fica no tooltip.
const CONFIDENCE_COLORS = {
  [CONFIDENCE.HIGH]: "var(--place-good)",
  [CONFIDENCE.MEDIUM]: "var(--place-mid)",
  [CONFIDENCE.LOW]: "var(--text-muted)",
};

const CONFIDENCE_LABEL_KEYS = {
  [CONFIDENCE.HIGH]: "ingame_conf_high",
  [CONFIDENCE.MEDIUM]: "ingame_conf_medium",
  [CONFIDENCE.LOW]: "ingame_conf_low",
};

const EVIDENCE_LABEL_KEYS = {
  mine: "ingame_evidence_mine",
  champion: "ingame_evidence_champion",
  global: "ingame_evidence_global",
};

// Uma partida de Arena dá quatro augments. Marcar mais do que isso não é
// possível a jogar, e o limite evita que a lista de marcados cresça sem fim
// se alguém andar a clicar à toa.
const MAX_TAKEN_AUGMENTS = 4;

// Constante e não um [] novo em cada render: esta lista entra nas dependências
// dos useMemo que recalculam a build, e um array novo a cada render fazia-os
// recalcular sempre.
const NO_AUGMENTS = [];

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

  // ================= O LOBBY DESTA PARTIDA =================
  // O teu histórico contra cada campeão que está nesta partida: quantas vezes
  // já o enfrentaste e em que lugar costumas ficar quando ele está do outro
  // lado. É a pergunta mais acionável a meio de uma ronda ("de quem é que me
  // devo preocupar") e a resposta já estava toda guardada — só faltava a
  // lista de quem está em jogo, que agora vem da Live Client Data (ver
  // liveLobby em electron/liveGame.js).
  //
  // Um adversário é qualquer participante que NÃO partilhou o teu lugar
  // final: numa Arena, quem fica no mesmo lugar que tu é, por definição, da
  // tua equipa (é o mesmo critério usado em lib/achievementStats.js).
  const matchupHistory = useMemo(() => {
    const acc = new Map();

    (matches || []).forEach((m) => {
      if (!Array.isArray(m.participants)) return;

      // O lugar convertido para a escala de hoje — sem isto, os 7ºs e 8ºs
      // lugares do formato antigo (8 equipas) inflavam a média contra
      // campeões que só se enfrentaram nessa altura.
      const myPlace = normalizedPlacement(m);
      if (myPlace == null) return;

      // Um campeão conta uma vez por partida, mesmo que (por dados
      // estranhos) apareça repetido na lista de participantes.
      const opponents = new Set();
      m.participants.forEach((p) => {
        if (p.isSelf || !p.champion) return;
        if (p.placement != null && p.placement === m.placement) return; // colega
        opponents.add(normalizeChampionId(p.champion, champions));
      });

      opponents.forEach((id) => {
        const row = acc.get(id) || { games: 0, placementSum: 0, top3: 0 };
        row.games += 1;
        row.placementSum += myPlace;
        if (m.placement <= 3) row.top3 += 1;
        acc.set(id, row);
      });
    });

    return acc;
  }, [matches, champions]);

  // A lista pronta a desenhar: os campeões em jogo agora, do mais problemático
  // para o menos. "Problemático" = o teu lugar médio quando ele está na
  // partida ser pior; quem nunca enfrentaste (ou poucas vezes) vai para o fim,
  // porque não há nada a dizer sobre ele.
  const lobbyRows = useMemo(() => {
    const lobby = liveChampionAlert?.lobby;
    if (!Array.isArray(lobby) || !lobby.length) return [];

    return lobby
      .filter((p) => !p.isSelf && p.champion)
      .map((p) => {
        const id = normalizeChampionId(p.champion, champions);
        const row = matchupHistory.get(id);
        const games = row?.games || 0;

        return {
          id,
          name: champions.find((c) => c.id === id)?.name || id,
          isDead: !!p.isDead,
          games,
          avgPlacement: games ? row.placementSum / games : null,
          top3Rate: games ? Math.round((row.top3 / games) * 100) : null,
          thin: games > 0 && games < MIN_MATCHUP_GAMES,
        };
      })
      .sort((a, b) => {
        // Sem amostra que chegue não há ordenação possível pelo que interessa
        // — esses ficam todos no fim, por ordem alfabética.
        const aSolid = a.games >= MIN_MATCHUP_GAMES;
        const bSolid = b.games >= MIN_MATCHUP_GAMES;
        if (aSolid !== bSolid) return aSolid ? -1 : 1;
        if (aSolid && bSolid) return b.avgPlacement - a.avgPlacement;
        return a.name.localeCompare(b.name);
      });
  }, [liveChampionAlert?.lobby, matchupHistory, champions]);

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

  // ================= AUGMENTS JÁ LEVADOS =================
  // A Riot não expõe os augments durante a partida (ver o comentário na Live
  // Client Data em hooks/useLiveGame.js), por isso a app não tem como os
  // saber. Mas a informação existe — está no ecrã de quem joga — e vale
  // demasiado para se deixar de fora: com os augments desta partida na mão, a
  // build passa a ser escolhida para os acompanhar e os augments das rondas
  // seguintes deixam de repetir o que já está levado. Dois cliques pagam-se.
  //
  // A lista é guardada JUNTO com o contexto a que pertence (campeão + estar
  // ou não em partida) e lida como vazia quando o contexto muda. Trocar de
  // campeão tem de limpar a lista — são augments de uma partida concreta, não
  // uma preferência — e guardar o contexto evita o efeito que o faria a
  // seguir à renderização, com o render intermédio a mostrar os augments da
  // partida anterior já ao lado do campeão novo.
  const takenContext = `${championId}|${isLive}`;
  const [taken, setTaken] = useState({ context: null, ids: [] });
  const takenAugments = taken.context === takenContext ? taken.ids : NO_AUGMENTS;

  const toggleTaken = (id) => {
    const key = String(id);
    const ids = takenAugments.includes(key)
      ? takenAugments.filter((a) => a !== key)
      : takenAugments.length >= MAX_TAKEN_AUGMENTS
        ? takenAugments
        : [...takenAugments, key];

    setTaken({ context: takenContext, ids });
  };

  // ================= O CONSELHEIRO =================
  // Toda a inteligência vive em lib/recommend.js — encolhimento por tamanho
  // de amostra, encadeamento dos níveis (geral -> campeão -> eu) e sinergia
  // entre peças. Esta view só desenha o que ele devolve.
  //
  // O contexto geral está separado de propósito: é a parte que percorre todos
  // os participantes de todas as partidas e não depende do campeão nem da
  // população, por isso só se recalcula quando as partidas mudam.
  const globalContext = useMemo(
    () => buildGlobalContext({ matches, itemsMap, itemTiersMap }),
    [matches, itemsMap, itemTiersMap]
  );

  const advisor = useMemo(
    () =>
      buildAdvisor({
        matches,
        championId,
        champions,
        itemsMap,
        itemTiersMap,
        augmentsMap,
        // "Só eu" não troca de amostra: acrescenta as minhas partidas como
        // mais um nível por cima das de todos, com o peso que a sua amostra
        // merecer. Ver o cabeçalho do recommend.js.
        includeMine: !allPlayers,
        context: globalContext,
      }),
    [matches, championId, champions, itemsMap, itemTiersMap, augmentsMap, allPlayers, globalContext]
  );

  // O inventário ao vivo. Fora de partida é vazio, e é isso que faz a build
  // sugerida aparecer completa em vez de marcada como meio comprada.
  const liveItems = useMemo(
    () => (isLive ? normalizeItems(liveChampionAlert?.items) : []),
    [isLive, liveChampionAlert?.items]
  );

  const build = useMemo(
    () => suggestBuild(advisor, { owned: liveItems, takenAugments }),
    [advisor, liveItems, takenAugments]
  );

  const augmentShelves = useMemo(
    () =>
      suggestAugments(advisor, {
        taken: takenAugments,
        owned: liveItems,
        perRarity: PER_AUGMENT_RARITY,
      }),
    [advisor, takenAugments, liveItems]
  );

  // As prateleiras completas, por baixo da build sugerida: a build responde a
  // "o que compro", isto responde a "e se o que me calhou não for nada disso".
  // Continua a exigir desvio positivo — um augment tem de se escolher à força
  // entre os oferecidos, um item ninguém é obrigado a comprar.
  const itemShelves = useMemo(() => {
    const owned = new Set(liveItems.map((it) => String(it.itemID)));
    const inBuild = new Set(build.slots.filter((s) => !s.owned).map((s) => s.row.id));

    return advisor.items.shelves
      .map((shelf) => ({
        ...shelf,
        ordered: shelf.rows
          .filter((r) => r.effect > 0)
          .slice(0, PER_ITEM_TIER[shelf.key] ?? 4)
          .map((row) => ({ row, owned: owned.has(row.id), inBuild: inBuild.has(row.id) }))
          // O que ainda falta comprar primeiro: com partida a decorrer é a
          // única ordem que ajuda a decidir.
          .sort((a, b) => Number(a.owned) - Number(b.owned)),
      }))
      .filter((shelf) => shelf.ordered.length > 0);
  }, [advisor, liveItems, build]);

  // Havia itens de que falar, tenham ou não desvio positivo? Serve só para a
  // mensagem de lista vazia: "não há dados" e "há dados, mas nada está acima
  // da média" são coisas diferentes, e mostrar a primeira quando é a segunda
  // manda o utilizador jogar mais para resolver um problema que não é de
  // amostra.
  const hasEligibleItems = advisor.items.rows.length > 0;

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
    return <div className="at-panel" style={styles.empty}>{t("ingame_empty_no_champion")}</div>;
  }

  return (
    <div style={styles.wrap}>
      {/* ================= CABEÇALHO ================= */}
      <div className="at-panel"
        style={{
          ...styles.hero,
          borderColor: isLive
            ? "rgba(var(--accent-rgb),0.45)"
            : "rgba(var(--border-rgb),0.35)",
        }}
      >
        {canShowIcons(DRAGON) && (
          <img
            src={championIcon(championId, DRAGON)}
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
                    src={itemIcon(it.itemID, DRAGON)}
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
        <div className="at-panel" style={styles.panel}>
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

      {/* ================= QUEM ESTÁ NESTA PARTIDA ================= */}
      {/* Só com partida a decorrer: fora dela não há lobby nenhum de que
          falar, e um painel vazio à espera seria pior do que não existir. */}
      {isLive && lobbyRows.length > 0 && (
        <div className="at-panel" style={styles.panel}>
          <div style={styles.panelHead}>
            <span style={styles.panelTitle}>{t("ingame_lobby_title")}</span>
            <span style={styles.panelHint}>{t("ingame_lobby_hint")}</span>
          </div>

          <div style={styles.lobbyGrid}>
            {lobbyRows.map((p) => (
              <div
                key={p.id}
                style={{
                  ...styles.lobbyCard,
                  // Já eliminado: fica a metade da opacidade em vez de
                  // desaparecer — saber quem já caiu é metade da leitura da
                  // ronda, e removê-lo faria a lista saltar de sítio.
                  opacity: p.isDead ? 0.45 : 1,
                }}
              >
                {canShowIcons(DRAGON) && (
                  <img
                    src={championIcon(p.id, DRAGON)}
                    alt=""
                    style={styles.lobbyIcon}
                  />
                )}

                <div style={styles.lobbyText}>
                  <span style={styles.lobbyName}>{p.name}</span>

                  {p.games >= MIN_MATCHUP_GAMES ? (
                    <span
                      style={{
                        ...styles.lobbyStat,
                        color: placementColorFor(p.avgPlacement),
                      }}
                    >
                      {p.avgPlacement.toFixed(1)}º · {p.games} {t("ingame_lobby_faced")}
                    </span>
                  ) : (
                    <span style={styles.lobbyStatMuted}>
                      {p.games > 0
                        ? `${p.games} ${t("ingame_lobby_faced")}`
                        : t("ingame_lobby_never")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.panelNote}>{t("ingame_lobby_note")}</div>
        </div>
      )}

      {/* ================= CONTROLO DA POPULAÇÃO + AMOSTRA ================= */}
      <div style={styles.sampleBar}>
        {/* Os dois botões já não são duas amostras sem relação: "Só eu"
            acrescenta as minhas partidas por cima das de todos, com o peso
            que a amostra merecer (ver includeMine em lib/recommend.js). Como
            isso não se adivinha a olhar para o botão, está nos tooltips. */}
        <div style={styles.segGroup}>
          <Tooltip label={t("ingame_pop_all_hint")}>
            <button
              onClick={() => setPopulation("all")}
              style={{ ...styles.segBtn, ...(allPlayers ? styles.segBtnActive : null) }}
            >
              {t("aug_pop_all")}
            </button>
          </Tooltip>
          <Tooltip label={t("ingame_pop_mine_hint")}>
            <button
              onClick={() => setPopulation("mine")}
              style={{ ...styles.segBtn, ...(!allPlayers ? styles.segBtnActive : null) }}
            >
              {t("aug_pop_mine")}
            </button>
          </Tooltip>
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

      {/* ================= A BUILD SUGERIDA ================= */}
      {/* A resposta direta à pergunta que se faz a jogar — o que comprar, por
          esta ordem. Não é a lista dos itens com melhor número: é um conjunto
          montado peça a peça, cada uma escolhida já a saber o que está no
          resto da build, o que está no inventário e que augments foram
          levados (ver suggestBuild em lib/recommend.js). Painel próprio e à
          largura toda porque é a conclusão, e uma conclusão não se lê no meio
          de uma tabela. */}
      <div className="at-panel" style={styles.panel}>
        <div style={styles.panelHead}>
          <span style={styles.panelTitle}>{t("ingame_plan_title")}</span>
          {build.slots.length > 0 && (
            <Tooltip label={t("ingame_plan_confidence_hint")}>
              <span style={{ ...styles.confBadge, color: CONFIDENCE_COLORS[build.confidence] }}>
                {t("ingame_plan_confidence")} {t(CONFIDENCE_LABEL_KEYS[build.confidence])}
              </span>
            </Tooltip>
          )}
          <span style={styles.panelHint}>{t("ingame_plan_hint")}</span>
        </div>

        {build.slots.length === 0 ? (
          <div style={styles.panelEmpty}>
            {hasEligibleItems ? t("ingame_build_none_above") : t("ingame_build_empty")}
          </div>
        ) : (
          <>
            {/* Com partida a decorrer, a próxima compra vai para cima de tudo:
                é a única linha que ainda dá tempo de usar. */}
            {isLive && build.nextBuy && (
              <div style={styles.nextBuy}>
                <ShoppingCart size={15} strokeWidth={2.25} style={styles.nextBuyIcon} />
                <span style={styles.nextBuyLabel}>{t("ingame_plan_next")}</span>
                <b style={styles.nextBuyName}>
                  {itemsMap?.[build.nextBuy.row.id] || `#${build.nextBuy.row.id}`}
                </b>
                <ReasonTags
                  reasons={build.nextBuy.reasons}
                  itemsMap={itemsMap}
                  augmentsMap={augmentsMap}
                  t={t}
                />
              </div>
            )}

            <div style={styles.planRow}>
              {build.slots.map((slot) => (
                <PlanSlot
                  key={slot.row.id}
                  slot={slot}
                  isNext={isLive && build.nextBuy === slot}
                  name={itemsMap?.[slot.row.id]}
                  DRAGON={DRAGON}
                  itemsMap={itemsMap}
                  augmentsMap={augmentsMap}
                  t={t}
                />
              ))}
            </div>

            <div style={styles.panelNote}>{t("ingame_plan_note")}</div>
          </>
        )}
      </div>

      <div style={styles.columns}>
        {/* ================= AUGMENTS ================= */}
        <div className="at-panel" style={styles.panel}>
          <div style={styles.panelHead}>
            <span style={styles.panelTitle}>{t("ingame_augments_title")}</span>
            <span style={styles.panelHint}>{t("ingame_augments_hint")}</span>
          </div>

          {/* Os augments desta partida, marcados à mão. Alimentam as duas
              pontas: saem das sugestões (não voltam a ser oferecidos) e a
              build passa a ser escolhida para os acompanhar. */}
          <div style={styles.takenBar}>
            <span style={styles.takenLabel}>{t("ingame_taken_label")}</span>

            {takenAugments.map((id) => (
              <button
                key={id}
                onClick={() => toggleTaken(id)}
                style={{
                  ...styles.takenChip,
                  borderColor: augmentRarityColor(augmentsMap?.[id]?.rarity) || "var(--text-muted)",
                }}
              >
                {augmentsMap?.[id]?.icon && (
                  <img src={augmentsMap[id].icon} alt="" style={styles.takenChipIcon} />
                )}
                <span style={styles.takenChipName}>{augmentsMap?.[id]?.name || `#${id}`}</span>
                <X size={10} strokeWidth={2.5} />
              </button>
            ))}

            {takenAugments.length < MAX_TAKEN_AUGMENTS && (
              <AugmentPicker
                augmentsMap={augmentsMap}
                exclude={takenAugments}
                onPick={toggleTaken}
                t={t}
              />
            )}
          </div>

          {augmentShelves.length === 0 ? (
            <div style={styles.panelEmpty}>{t("ingame_augments_empty")}</div>
          ) : (
            augmentShelves.map((shelf) => (
              <div key={shelf.key}>
                <ShelfHead
                  label={t(AUGMENT_RARITY_LABEL_KEYS[shelf.key] || "rarity_other")}
                  color={augmentRarityColor(shelf.key)}
                  baseline={shelf.baseline}
                  t={t}
                />
                {shelf.rows.map((r) => (
                  <AugmentLine
                    key={r.id}
                    row={r}
                    info={augmentsMap?.[r.id]}
                    itemsMap={itemsMap}
                    augmentsMap={augmentsMap}
                    onTake={() => toggleTaken(r.id)}
                    canTake={takenAugments.length < MAX_TAKEN_AUGMENTS}
                    t={t}
                  />
                ))}
              </div>
            ))
          )}

          <div style={styles.panelNote}>{t("ingame_taken_hint")}</div>
        </div>

        {/* ================= PRATELEIRAS DE ITENS ================= */}
        {/* A build sugerida responde a "o que compro"; isto responde a "e se o
            que preciso não for nada disso" — a prateleira inteira, ordenada,
            para quando a partida não corre como o plano. */}
        <div className="at-panel" style={styles.panel}>
          <div style={styles.panelHead}>
            <span style={styles.panelTitle}>{t("ingame_build_title")}</span>
            <span style={styles.panelHint}>{t("ingame_build_hint")}</span>
          </div>

          {itemShelves.length === 0 ? (
            <div style={styles.panelEmpty}>
              {hasEligibleItems ? t("ingame_build_none_above") : t("ingame_build_empty")}
            </div>
          ) : (
            itemShelves.map((shelf) => (
              <div key={shelf.key}>
                <ShelfHead
                  label={t(ITEM_TIER_LABEL_KEYS[shelf.key] || "rarity_other")}
                  color={ITEM_TIER_COLORS[shelf.key]}
                  baseline={shelf.baseline}
                  t={t}
                />
                {shelf.ordered.map(({ row, owned, inBuild }) => (
                  <ItemLine
                    key={row.id}
                    row={row}
                    name={itemsMap?.[row.id]}
                    DRAGON={DRAGON}
                    owned={owned}
                    ownedLabel={t("ingame_build_owned")}
                    // Marca as que entraram na build sugerida acima, para as
                    // duas leituras não parecerem duas opiniões diferentes.
                    inBuild={inBuild}
                    inBuildLabel={t("ingame_plan_in_build")}
                    t={t}
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

// Uma peça da build sugerida. As slots já compradas ficam a meia opacidade
// em vez de desaparecerem: a build é um plano, e um plano com metade dos
// passos apagados deixa de se ler como plano.
function PlanSlot({ slot, isNext, name, DRAGON, itemsMap, augmentsMap, t }) {
  const { row, owned, tier } = slot;
  const label = name || `#${row.id}`;

  return (
    <div
      style={{
        ...styles.planSlot,
        borderColor: isNext
          ? "rgba(var(--accent-rgb),0.6)"
          : owned
            ? "rgba(var(--border-rgb),0.25)"
            : "rgba(var(--border-rgb),0.4)",
        opacity: owned ? 0.55 : 1,
      }}
    >
      <span style={{ ...styles.planSlotTier, color: ITEM_TIER_COLORS[tier] }}>
        {t(ITEM_TIER_LABEL_KEYS[tier] || "rarity_other")}
      </span>

      <Tooltip
        label={`${label} — ${t(EVIDENCE_LABEL_KEYS[row.evidence] || "ingame_evidence_global")}, ${row.games} ${t("ingame_plan_games")} · ${t("ingame_plan_confidence")} ${t(CONFIDENCE_LABEL_KEYS[row.confidence])}`}
      >
        <span style={styles.planSlotIconWrap}>
          {canShowIcons(DRAGON) && (
            <img
              src={itemIcon(row.id, DRAGON)}
              alt=""
              style={styles.planSlotIcon}
              loading="lazy"
            />
          )}
          <span
            style={{ ...styles.planSlotDot, background: CONFIDENCE_COLORS[row.confidence] }}
          />
        </span>
      </Tooltip>

      <span style={styles.planSlotName}>{label}</span>

      {owned ? (
        <span style={styles.planSlotOwned}>
          <Check size={10} strokeWidth={3} /> {t("ingame_build_owned")}
        </span>
      ) : (
        <span style={styles.planSlotDelta}>
          {row.effect >= 0 ? "+" : ""}
          {row.effect.toFixed(1)}
          <span style={styles.planSlotUnit}>{t("ingame_prismatic_pick_unit")}</span>
        </span>
      )}

      {isNext && <span style={styles.planSlotNext}>{t("ingame_plan_next_short")}</span>}

      <ReasonTags
        reasons={slot.reasons}
        itemsMap={itemsMap}
        augmentsMap={augmentsMap}
        t={t}
        onlySynergy
      />
    </div>
  );
}

// O "porquê" de uma recomendação, em etiquetas. Duas no máximo: de onde vêm
// os dados e com o que é que a peça encaixa (ver reasonsFor em
// lib/recommend.js). Sem isto a tab é um oráculo — com isto, dá para
// discordar de uma linha em vez de desconfiar do painel todo.
function ReasonTags({ reasons, itemsMap, augmentsMap, t, onlySynergy = false }) {
  const visible = (reasons || []).filter((r) => !onlySynergy || r.kind === "synergy");
  if (!visible.length) return null;

  return (
    <span style={styles.reasonRow}>
      {visible.map((r, i) => {
        if (r.kind === "evidence") {
          return (
            <span key={i} style={styles.reasonTag}>
              {t(EVIDENCE_LABEL_KEYS[r.level] || "ingame_evidence_global")} · {r.games}
            </span>
          );
        }

        const name =
          r.type === "item" ? itemsMap?.[r.with] : augmentsMap?.[r.with]?.name;

        return (
          <Tooltip key={i} label={`${t("ingame_reason_synergy_hint")} +${r.value.toFixed(1)}`}>
            <span style={{ ...styles.reasonTag, ...styles.reasonTagSynergy }}>
              <Link2 size={9} strokeWidth={2.5} /> {name || `#${r.with}`}
            </span>
          </Tooltip>
        );
      })}
    </span>
  );
}

// A caixa de pesquisa que marca um augment como levado. Pesquisa e não uma
// lista: são 500 e tantos augments e nenhuma grelha os mostra de forma
// utilizável a meio de uma partida.
function AugmentPicker({ augmentsMap, exclude, onPick, t }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Duas letras é onde a pesquisa começa a ser útil; com uma, qualquer
    // texto devolvia dezenas de resultados sem relação com o que se procura.
    if (q.length < 2) return [];

    return Object.values(augmentsMap || {})
      .filter((a) => !exclude.includes(String(a.id)) && (a.name || "").toLowerCase().includes(q))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      .slice(0, 6);
  }, [query, augmentsMap, exclude]);

  return (
    <div style={styles.pickerWrap}>
      <Plus size={11} strokeWidth={2.5} style={styles.pickerPlus} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("ingame_taken_search")}
        style={styles.pickerInput}
      />

      {results.length > 0 && (
        <div style={styles.pickerResults}>
          {results.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                onPick(a.id);
                setQuery("");
              }}
              style={styles.pickerResult}
            >
              {a.icon && <img src={a.icon} alt="" style={styles.takenChipIcon} />}
              <span style={{ color: augmentRarityColor(a.rarity) || "var(--text-body)" }}>
                {a.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Uma linha de augment: ícone, nome, o porquê, a confiança e o desvio já
// encolhido. O botão "+" marca-o como levado nesta partida.
function AugmentLine({ row, info, itemsMap, augmentsMap, onTake, canTake, t }) {
  const good = row.effect >= 0;
  const rarityColor = augmentRarityColor(info?.rarity);

  return (
    <div style={{ ...styles.line, ...styles.lineTakeable }}>
      <span style={{ ...styles.lineIconWrap, ...augmentRarityStyle(info?.rarity) }}>
        {info?.icon && <img src={info.icon} alt="" style={styles.lineIcon} loading="lazy" />}
      </span>

      <span style={styles.lineBody}>
        <span style={{ ...styles.lineName, color: rarityColor || "var(--text-body)" }}>
          {info?.name || `#${row.id}`}
        </span>
        <ReasonTags
          reasons={row.reasons}
          itemsMap={itemsMap}
          augmentsMap={augmentsMap}
          t={t}
        />
      </span>

      <ConfidenceDot row={row} t={t} />

      <span style={styles.lineGames}>{row.games}</span>

      <span
        style={{
          ...styles.lineDelta,
          color: good ? "var(--place-good)" : "var(--place-low)",
        }}
      >
        {good ? "+" : ""}
        {row.effect.toFixed(1)}
      </span>

      <Tooltip label={t("ingame_taken_add")}>
        <button
          onClick={onTake}
          disabled={!canTake}
          style={{ ...styles.takeBtn, opacity: canTake ? 1 : 0.35 }}
        >
          <Plus size={11} strokeWidth={2.5} />
        </button>
      </Tooltip>
    </div>
  );
}

// Uma linha de item. "owned" só é passado com partida a decorrer — fora dela
// o inventário não existe e não faz sentido marcar nada como já comprado.
// "inBuild" marca as que a build sugerida escolheu.
function ItemLine({ row, name, DRAGON, owned, ownedLabel, inBuild, inBuildLabel, t }) {
  const good = row.effect >= 0;

  return (
    <div style={{ ...styles.line, ...(owned ? styles.lineOwned : null) }}>
      <span style={styles.lineIconWrap}>
        {canShowIcons(DRAGON) && (
          <img
            src={itemIcon(row.id, DRAGON)}
            alt=""
            style={styles.lineIcon}
            loading="lazy"
          />
        )}
      </span>

      <span style={styles.lineBody}>
        <span style={styles.lineName}>
          {name || `#${row.id}`}
          {inBuild && !owned && (
            <span style={styles.topPickTag}>
              <Star size={9} strokeWidth={2.25} fill="currentColor" /> {inBuildLabel}
            </span>
          )}
          {owned && <span style={styles.ownedTag}>{ownedLabel}</span>}
        </span>
      </span>

      <ConfidenceDot row={row} t={t} />

      <span style={styles.lineGames}>{row.games}</span>

      <span
        style={{
          ...styles.lineDelta,
          color: good ? "var(--place-good)" : "var(--place-low)",
        }}
      >
        {good ? "+" : ""}
        {row.effect.toFixed(1)}
      </span>
    </div>
  );
}

// A confiança da linha, como cor. O texto completo (de onde vêm os dados,
// quantos jogos, que confiança) fica no tooltip — numa linha que já tem nome,
// amostra e desvio, uma quarta coluna de palavras tirava-lhe a leitura de
// relance.
function ConfidenceDot({ row, t }) {
  return (
    <Tooltip
      label={`${t(EVIDENCE_LABEL_KEYS[row.evidence] || "ingame_evidence_global")}, ${row.games} ${t("ingame_plan_games")} · ${t("ingame_plan_confidence")} ${t(CONFIDENCE_LABEL_KEYS[row.confidence])}`}
    >
      <span style={{ ...styles.confDot, background: CONFIDENCE_COLORS[row.confidence] }} />
    </Tooltip>
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
    background: "rgba(var(--panel-deep-rgb),0.9)",
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
    background: "rgba(var(--panel-deep-rgb),0.85)",
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

  // ================= LOBBY DA PARTIDA =================
  // Grelha que se adapta sozinha à largura: numa Arena de 3 são 17 cartões, e
  // um número fixo de colunas ou os deixava minúsculos em ecrã largo ou
  // cortados em ecrã estreito.
  lobbyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 6,
    padding: 10,
  },

  lobbyCard: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 8px",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    minWidth: 0,
  },

  lobbyIcon: { width: 26, height: 26, borderRadius: 7, flexShrink: 0 },

  lobbyText: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0 },

  lobbyName: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "var(--text-body)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  lobbyStat: { fontSize: 10.5, fontWeight: 700 },

  lobbyStatMuted: { fontSize: 10.5, color: "var(--text-muted)" },

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
  // Cinco colunas: ícone, corpo (nome + razões), ponto de confiança, amostra
  // e desvio. O corpo é o único elástico — as outras têm largura fixa para os
  // números ficarem alinhados de linha para linha, que é o que permite
  // compará-los de relance sem os ler um a um.
  line: {
    display: "grid",
    gridTemplateColumns: "30px minmax(0,1fr) 8px 32px 42px",
    alignItems: "center",
    gap: 9,
    padding: "7px 14px",
    borderBottom: "1px solid rgba(var(--border-rgb),0.14)",
  },

  // Com o botão de "já levei" no fim, a mesma grelha mais uma coluna.
  lineTakeable: { gridTemplateColumns: "30px minmax(0,1fr) 8px 32px 42px 22px" },

  lineBody: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },

  lineOwned: { opacity: 0.5 },

  confDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0, display: "block" },

  confBadge: {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    cursor: "default",
  },

  // ---- razões ----
  reasonRow: { display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", minWidth: 0 },

  reasonTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    fontSize: 9,
    lineHeight: 1.4,
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  },

  reasonTagSynergy: {
    padding: "1px 5px",
    borderRadius: 999,
    fontWeight: 700,
    color: "var(--accent-solid)",
    background: "rgba(var(--accent-rgb),0.12)",
    border: "1px solid rgba(var(--accent-rgb),0.25)",
    cursor: "default",
  },

  // ---- a build sugerida ----
  planRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))",
    gap: 8,
    padding: "12px 14px",
  },

  planSlot: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 5,
    padding: "9px 7px",
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    border: "1px solid",
    minWidth: 0,
  },

  planSlotTier: {
    fontSize: 8.5,
    fontWeight: 800,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  planSlotIconWrap: { position: "relative", display: "block", width: 42, height: 42 },

  planSlotIcon: {
    width: 42,
    height: 42,
    borderRadius: "var(--radius-sm)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  planSlotDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 9,
    height: 9,
    borderRadius: "50%",
    border: "1.5px solid rgba(var(--panel-deep-rgb),1)",
  },

  planSlotName: {
    fontSize: 10.5,
    fontWeight: 600,
    color: "var(--text-body)",
    textAlign: "center",
    lineHeight: 1.3,
    maxWidth: "100%",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },

  planSlotDelta: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: 2,
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--place-good)",
    fontVariantNumeric: "tabular-nums",
  },

  planSlotUnit: { fontSize: 8.5, fontWeight: 700, color: "var(--text-muted)" },

  planSlotOwned: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: "var(--place-good)",
  },

  planSlotNext: {
    fontSize: 8.5,
    fontWeight: 800,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "var(--accent-solid)",
  },

  nextBuy: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    margin: "12px 14px 0",
    padding: "9px 11px",
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--accent-rgb),0.12)",
    border: "1px solid rgba(var(--accent-rgb),0.35)",
  },

  nextBuyIcon: { color: "var(--accent-solid)", flexShrink: 0 },

  nextBuyLabel: {
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "var(--text-muted)",
  },

  nextBuyName: { fontSize: 13, fontWeight: 700, color: "var(--text-body)" },

  // ---- augments já levados ----
  takenBar: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    padding: "9px 14px",
    borderBottom: "1px solid rgba(var(--border-rgb),0.18)",
  },

  takenLabel: {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: "var(--text-muted)",
  },

  takenChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    maxWidth: 160,
    padding: "3px 7px",
    borderRadius: 999,
    fontSize: 10.5,
    fontWeight: 600,
    color: "var(--text-body)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    border: "1px solid",
    cursor: "pointer",
  },

  takenChipIcon: { width: 16, height: 16, borderRadius: 4, flexShrink: 0 },

  takenChipName: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },

  takeBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    borderRadius: "var(--radius-sm)",
    color: "var(--text-muted)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    border: "1px solid rgba(var(--border-rgb),0.3)",
    cursor: "pointer",
  },

  pickerWrap: { position: "relative", display: "inline-flex", alignItems: "center" },

  pickerPlus: { position: "absolute", left: 6, color: "var(--text-muted)", pointerEvents: "none" },

  pickerInput: {
    width: 150,
    padding: "4px 7px 4px 21px",
    borderRadius: 999,
    fontSize: 10.5,
    color: "var(--text-body)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    border: "1px dashed rgba(var(--border-rgb),0.45)",
    outline: "none",
  },

  // Os resultados saem por cima do painel (position absolute) em vez de
  // empurrarem a lista para baixo — a lista é a razão de o painel existir e
  // não pode saltar a cada letra que se escreve.
  pickerResults: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    zIndex: 20,
    width: 230,
    display: "flex",
    flexDirection: "column",
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-deep-rgb),0.98)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
    overflow: "hidden",
  },

  pickerResult: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "6px 9px",
    fontSize: 11,
    fontWeight: 600,
    textAlign: "left",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(var(--border-rgb),0.14)",
    cursor: "pointer",
  },

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

  topPickTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    marginLeft: 6,
    fontSize: 8.5,
    fontWeight: 800,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: "#ffc754",
    verticalAlign: "middle",
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
    background: "rgba(var(--panel-deep-rgb),0.85)",
  },

  footnote: { fontSize: 10.5, lineHeight: 1.5, color: "var(--text-muted)" },
};
