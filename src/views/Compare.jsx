import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../lib/i18n";
import { normalizeChampionId } from "../lib/champions";
import {
  computeAchievementStats,
  buildAchievementCategories,
  buildBooleanAchievements,
  summarizeBadges,
  formatAchievementValue,
} from "../lib/achievementStats";
import { computeCareerSummary, computeSpotlightGroups } from "../lib/overviewSpotlights";
import { regionForTag } from "../lib/riotTags";
import { loadCompareFriends, rememberCompareFriend, forgetCompareFriend } from "../lib/compareFriends";
import {
  getMatches,
  getWins,
  addMatchesBulk,
  addWin,
  getMatchCacheByIds,
  buildMatchFromCache,
  findUsernameByRiotId,
  ensureUser,
  searchMatchesByParticipantName,
  searchAccountsByGameName,
} from "../db/api";
import Loading from "../components/Loading";
import AchievementIcon from "../components/AchievementIcon";

function kdaLabel(k, d, a) {
  return `${k.toFixed(1)} / ${d.toFixed(1)} / ${a.toFixed(1)}`;
}

// Mesmo resumo simples da StatsBar (games/vitórias/top3/winrate/KDA), sem o
// cruzamento por formato — a tab Comparar já mostra sempre o histórico
// completo de cada lado, tal como as Conquistas.
function summarize(matches) {
  const games = matches.length;
  const winMatches = matches.filter((m) => m.win);
  const wins = winMatches.length;
  const top3Games = matches.filter((m) => (m.placement ? m.placement <= 3 : m.win)).length;
  const totals = matches.reduce(
    (acc, m) => {
      acc.k += m.kills || 0;
      acc.d += m.deaths || 0;
      acc.a += m.assists || 0;
      return acc;
    },
    { k: 0, d: 0, a: 0 }
  );

  return {
    games,
    wins,
    top3Games,
    winrate: games ? Math.round((wins / games) * 100) : 0,
    top3Rate: games ? Math.round((top3Games / games) * 100) : 0,
    avgK: games ? totals.k / games : 0,
    avgD: games ? totals.d / games : 0,
    avgA: games ? totals.a / games : 0,
  };
}

// Cor de destaque para o lado que está à frente numa métrica — empate fica
// sem destaque nenhum (não faz sentido "vencer" um empate).
function leaderColor(a, b) {
  if (a === b) return null;
  return a > b ? "var(--place-good)" : null;
}

// Chave de reserva para guardar os dados de um adversário que ainda não
// tem nenhuma conta reconhecida na app: o próprio Riot ID (não um
// "username" da app, que é uma etiqueta livre escolhida por cada conta —
// ver useAccounts.js). Só é usada quando findUsernameByRiotId (ver
// checkOpponent) não encontra nenhum username já associado a este Riot ID —
// se encontrar (a conta de outra pessoa já sincronizada, com ou sem esta
// etiqueta), usamos sempre esse username diretamente em vez desta chave.
function opponentKeyFor(gameName, tagLine) {
  return `${gameName.trim()}#${tagLine.trim()}`;
}

// Um único campo de texto ("Nome#Tag", ao estilo do próprio cliente do
// League) em vez de nome+tag em campos separados — a tag normalmente vem de
// uma sugestão (ver nameSuggestions), mas também dá para escrever à mão
// quando não há nenhuma sugestão (jogador ainda desconhecido da app).
function parseRiotIdText(text) {
  const raw = text.trim();
  const hashIdx = raw.indexOf("#");
  if (hashIdx === -1) return { name: raw, tag: "" };
  return { name: raw.slice(0, hashIdx).trim(), tag: raw.slice(hashIdx + 1).trim() };
}

export default function Compare({ matches, wins, champions, DRAGON, ownLabel, teamSizeFilter }) {
  const { t } = useLanguage();

  // Resumo e destaques respeitam o filtro de formato da barra do topo
  // (Todos/2v2/3v3), tal como a Visão Geral e as Estatísticas — mas as
  // Conquistas (mais abaixo) usam sempre o histórico completo em "matches"/
  // "opponentMatches" sem filtrar, tal como a própria tab Conquistas (são
  // marcos de carreira, não devem mudar consoante o formato em vista).
  const formatMatches = useMemo(
    () => (teamSizeFilter === "all" ? matches : matches.filter((m) => m.team_size === teamSizeFilter)),
    [matches, teamSizeFilter]
  );

  // Um único campo — "Nome#Tag" — em vez de nome+tag em campos separados; a
  // tag normalmente vem de escolher uma sugestão (ver nameSuggestions logo
  // abaixo), que já mostra todas as contas conhecidas com esse nome para
  // escolher a certa, em vez de obrigar a adivinhar/escrever a tag à mão.
  const [riotIdText, setRiotIdText] = useState("");
  const { name: typedName, tag: typedTag } = useMemo(() => parseRiotIdText(riotIdText), [riotIdText]);

  // Jogadores já comparados antes (só neste dispositivo, ver
  // lib/compareFriends.js) — para preencher o campo mais depressa da
  // próxima vez, tanto por um clique num "chip" recente como escrevendo o
  // nome (ver nameSuggestions abaixo).
  const [savedFriends, setSavedFriends] = useState(() => loadCompareFriends());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const localSuggestions = useMemo(() => {
    const q = typedName.toLowerCase();
    if (!q) return [];
    return savedFriends.filter((f) => f.gameName.toLowerCase().includes(q));
  }, [typedName, savedFriends]);

  // Pesquisa na Supabase partilhada (não só entre amigos já guardados neste
  // dispositivo) — escrever "skygee" mostra TODAS as contas conhecidas com
  // esse nome, mesmo com tags/servidores diferentes, já com indicação de
  // quais têm dados sincronizados (ver has_matches, calculado no próprio
  // search_accounts_by_name). Com debounce (250ms) para não disparar um
  // pedido a cada tecla premida.
  const [remoteSuggestions, setRemoteSuggestions] = useState([]);
  useEffect(() => {
    const q = typedName;
    if (q.length < 2) {
      setRemoteSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const rows = await searchAccountsByGameName(q);
      if (cancelled) return;
      setRemoteSuggestions(
        rows.map((r) => ({
          // Contas antigas podem ainda não ter riot_game_name gravado (só
          // fica preenchido ao sincronizar com a versão atual da app) — cai
          // para o username, que existe sempre e muitas vezes É o nome Riot.
          gameName: r.riot_game_name || r.username,
          tagLine: r.riot_tag_line || "",
          region: regionForTag(r.riot_tag_line) || "europe",
          hasData: !!r.has_matches,
          // Username real da conta na Supabase — permite carregar os dados
          // diretamente (ver loadOpponentByUsername), sem passar pela
          // resolução por Riot ID que depende da identidade estar gravada.
          username: r.username,
        }))
      );
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [typedName]);

  // Junta os dois — a Supabase primeiro (sabe de certeza se há dados, ver
  // hasData acima), depois os amigos locais que a pesquisa não tenha
  // apanhado (sem identidade Riot gravada ainda, logo sem dados mesmo),
  // sem repetir o mesmo Riot ID duas vezes.
  const nameSuggestions = useMemo(() => {
    const seen = new Set();
    const combined = [];
    [...remoteSuggestions, ...localSuggestions.map((f) => ({ ...f, hasData: false }))].forEach((f) => {
      const key = `${f.gameName.toLowerCase()}#${f.tagLine.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      combined.push(f);
    });
    return combined.slice(0, 8);
  }, [localSuggestions, remoteSuggestions]);

  // Aplica uma sugestão/chip ao campo e pesquisa logo de seguida — os
  // valores vão diretos por parâmetro (não pelo estado, que só se reflete no
  // próximo render). Sugestões vindas da Supabase trazem o "username" real
  // da conta — nesse caso carrega-se diretamente por ele
  // (loadOpponentByUsername), sem depender da identidade Riot estar gravada;
  // chips/sugestões locais (sem username) seguem o caminho normal por Riot ID.
  const applyFriend = (friend) => {
    const label = friend.tagLine ? `${friend.gameName}#${friend.tagLine}` : friend.gameName;
    setRiotIdText(label);
    setShowSuggestions(false);
    if (friend.username) {
      loadOpponentByUsername(friend.username, label, friend);
    } else {
      checkOpponent(friend.gameName, friend.tagLine, friend.region);
    }
  };

  const removeFriend = (friend, e) => {
    e.stopPropagation();
    setSavedFriends((prev) => forgetCompareFriend(prev, friend));
  };

  // idle -> checking -> needs-sync | ready ; ou syncing (a partir de needs-sync) -> ready
  const [phase, setPhase] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [opponentLabel, setOpponentLabel] = useState("");
  // Username sob o qual os dados deste adversário vivem na Supabase — a
  // conta real dele (encontrada por findUsernameByRiotId), ou, se ainda não
  // existir nenhuma, a chave de reserva baseada no próprio Riot ID (ver
  // opponentKeyFor). Resolvido em checkOpponent e reutilizado por
  // syncOpponent, para uma sincronização nunca criar uma entrada duplicada
  // quando já existe uma conta real (só sem partidas ainda).
  const [opponentUsername, setOpponentUsername] = useState(null);
  // true quando os dados mostrados vieram só de partidas de OUTRAS pessoas
  // onde este jogador apareceu como participante (ver
  // searchMatchesByParticipantName) — não é o histórico completo dele, só a
  // sobreposição com quem já sincronizou. Controla o aviso + o botão para
  // sincronizar o histórico completo mesmo já havendo dados parciais.
  const [opponentPartial, setOpponentPartial] = useState(false);
  const [opponentMatches, setOpponentMatches] = useState([]);
  const [opponentWins, setOpponentWins] = useState([]);

  // Mesma filtragem para o adversário, para os dois lados ficarem sempre
  // sob a mesma lente de formato.
  const opponentFormatMatches = useMemo(
    () => (teamSizeFilter === "all" ? opponentMatches : opponentMatches.filter((m) => m.team_size === teamSizeFilter)),
    [opponentMatches, teamSizeFilter]
  );

  const ownStats = useMemo(() => computeAchievementStats(matches, champions, wins), [matches, champions, wins]);
  const ownCategories = useMemo(() => buildAchievementCategories(ownStats, t), [ownStats, t]);
  const ownBoolean = useMemo(() => buildBooleanAchievements(ownStats, t), [ownStats, t]);
  const ownBadges = useMemo(() => summarizeBadges(ownCategories, ownBoolean), [ownCategories, ownBoolean]);
  const ownSummary = useMemo(() => summarize(formatMatches), [formatMatches]);
  const ownCareer = useMemo(
    () => computeCareerSummary(formatMatches, wins, champions),
    [formatMatches, wins, champions]
  );
  const ownSpotlights = useMemo(
    () => computeSpotlightGroups(formatMatches, champions, t),
    [formatMatches, champions, t]
  );

  const opponentStats = useMemo(
    () => computeAchievementStats(opponentMatches, champions, opponentWins),
    [opponentMatches, champions, opponentWins]
  );
  const opponentCategories = useMemo(() => buildAchievementCategories(opponentStats, t), [opponentStats, t]);
  const opponentBoolean = useMemo(() => buildBooleanAchievements(opponentStats, t), [opponentStats, t]);
  const opponentBadges = useMemo(
    () => summarizeBadges(opponentCategories, opponentBoolean),
    [opponentCategories, opponentBoolean]
  );
  const opponentSummary = useMemo(() => summarize(opponentFormatMatches), [opponentFormatMatches]);
  const opponentCareer = useMemo(
    () => computeCareerSummary(opponentFormatMatches, opponentWins, champions),
    [opponentFormatMatches, opponentWins, champions]
  );
  const opponentSpotlights = useMemo(
    () => computeSpotlightGroups(opponentFormatMatches, champions, t),
    [opponentFormatMatches, champions, t]
  );

  const resetSearch = () => {
    setPhase("idle");
    setStatusMessage("");
    setErrorMessage("");
    setOpponentLabel("");
    setOpponentUsername(null);
    setOpponentPartial(false);
    setOpponentMatches([]);
    setOpponentWins([]);
  };

  // Caminho direto para uma sugestão vinda da Supabase: já sabemos o
  // username exato da conta, por isso carregam-se logo os dados dele sem
  // passar pela resolução por Riot ID (findUsernameByRiotId), que depende da
  // identidade Riot estar gravada — é isso que permite encontrar contas
  // antigas que ainda não sincronizaram com a versão atual da app.
  const loadOpponentByUsername = async (username, label, meta = {}) => {
    setOpponentLabel(label);
    setErrorMessage("");
    setPhase("checking");

    // Só entra nos "amigos recentes" com a tag conhecida — sem ela, um chip
    // não teria como voltar a pesquisar mais tarde (o username pode não ser
    // pesquisável se a linha for entretanto apagada, e a Riot API exige tag).
    if (meta.gameName && meta.tagLine) {
      setSavedFriends((prev) =>
        rememberCompareFriend(prev, { gameName: meta.gameName, tagLine: meta.tagLine, region: meta.region || "europe" })
      );
    }

    try {
      const [matchesData, winsData] = await Promise.all([getMatches(username), getWins(username)]);
      setOpponentUsername(username);
      setOpponentPartial(false);
      setOpponentMatches(matchesData || []);
      setOpponentWins(winsData || []);
      setPhase(matchesData?.length ? "ready" : "needs-sync");
    } catch (err) {
      setErrorMessage(err?.message || String(err));
      setPhase("error");
    }
  };

  // Só consulta a Supabase (nunca a Riot API) — a Riot API só é pedida se o
  // utilizador clicar explicitamente em "Sincronizar" (ver syncOpponent),
  // depois de aqui não se encontrar informação nenhuma já recolhida.
  // Os 3 parâmetros são opcionais (o clique normal no botão não passa
  // nenhum, usa sempre o estado atual) — só são usados por applyFriend, que
  // precisa do valor exato escolhido já nesta chamada, sem esperar pelo
  // próximo render para o estado refletir isso.
  const checkOpponent = async (nameArg, tagArg, regionArg) => {
    const name = (nameArg ?? typedName).trim();
    const tag = (tagArg ?? typedTag).trim();
    const reg = regionArg ?? regionForTag(tag) ?? "europe";
    if (!name || !tag) return;

    setSavedFriends((prev) => rememberCompareFriend(prev, { gameName: name, tagLine: tag, region: reg }));
    setOpponentLabel(`${name}#${tag}`);
    setErrorMessage("");
    setPhase("checking");

    try {
      // 1) A conta real de alguém já sincronizado com este Riot ID (o
      // próprio username escolhido por essa pessoa dentro da app — ver
      // findUsernameByRiotId) — o histórico mais completo possível, se
      // existir.
      const foundUsername = await findUsernameByRiotId(name, tag);
      if (foundUsername) {
        const [matchesData, winsData] = await Promise.all([getMatches(foundUsername), getWins(foundUsername)]);
        if (matchesData?.length) {
          setOpponentUsername(foundUsername);
          setOpponentPartial(false);
          setOpponentMatches(matchesData);
          setOpponentWins(winsData || []);
          setPhase("ready");
          return;
        }
      }

      // 2) Sem conta própria (ou sem partidas nela ainda) — vê se este
      // jogador já aparece como colega/adversário em partidas que OUTRA
      // pessoa já sincronizou (ver searchMatchesByParticipantName). Não é o
      // histórico completo dele, mas é informação já recolhida na Supabase,
      // por isso conta como "já tem dados" antes de pedir a Riot API.
      const sharedRows = await searchMatchesByParticipantName(name);
      // Se mais do que uma pessoa já importou a mesma partida, a procura
      // devolve uma linha por cada uma — dedup por riot_match_id para não
      // contar a mesma partida do adversário duas vezes.
      const uniqueSharedRows = [...new Map(sharedRows.map((row) => [row.riot_match_id, row])).values()];
      const derivedMatches = uniqueSharedRows
        .map((row) => buildMatchFromCache(row.riot_match_id, row, null, name))
        .filter(Boolean)
        .map((m) => ({ ...m, champion: normalizeChampionId(m.champion, champions) }));

      if (derivedMatches.length) {
        const derivedWins = [...new Set(derivedMatches.filter((m) => m.win).map((m) => m.champion))];
        setOpponentUsername(foundUsername || null);
        setOpponentPartial(true);
        setOpponentMatches(derivedMatches);
        setOpponentWins(derivedWins);
        setPhase("ready");
        return;
      }

      // 3) Nada encontrado em lado nenhum da Supabase — só agora faz
      // sentido oferecer sincronizar com a Riot API.
      setOpponentUsername(foundUsername || null);
      setOpponentPartial(false);
      setOpponentMatches([]);
      setOpponentWins([]);
      setPhase("needs-sync");
    } catch (err) {
      setErrorMessage(err?.message || String(err));
      setPhase("error");
    }
  };

  // Mesma sequência de 3 passos que syncActiveAccount (useRiotSync.js) usa
  // para uma conta normal — listar ids, aproveitar a cache partilhada entre
  // users para os que já foram importados por um amigo, e só pedir à Riot
  // API os que sobrarem. Sem "since" (sempre a primeira sincronização deste
  // Riot ID) e sem canário/enrich — buildArenaMatchRecord já traz os
  // detalhes todos completos numa importação de raiz.
  const syncOpponent = async () => {
    const name = typedName.trim();
    const tag = typedTag.trim();
    if (!name || !tag || !window.electron?.listMatchIds || !window.electron?.fetchMatchDetails) return;

    const reg = regionForTag(tag) || "europe";

    // Reaproveita o username já resolvido em checkOpponent (a conta real de
    // alguém, se já existir uma para este Riot ID; senão a chave de reserva)
    // — nunca uma sincronização à parte, para não duplicar dados de uma
    // conta que já existe só porque ainda não tinha partidas guardadas.
    const key = opponentUsername || opponentKeyFor(name, tag);
    setPhase("syncing");
    setStatusMessage(t("compare_syncing"));
    setErrorMessage("");

    try {
      const listRes = await window.electron.listMatchIds({
        gameName: name,
        tagLine: tag,
        region: reg,
        since: null,
        puuid: null,
      });

      if (!listRes.success) {
        setErrorMessage(listRes.error === "missing-api-key" ? t("missing_api_key") : listRes.error || t("unknown_error"));
        setPhase("error");
        return;
      }

      // Garante que existe uma linha "wins" com a identidade Riot associada
      // a esta chave — sem efeito se já existir (ensureUser só insere
      // quando falta), o que cobre tanto uma conta real já existente (não
      // mexe em nada) como a chave de reserva na primeira vez (fica logo
      // pesquisável por outros para a próxima comparação).
      await ensureUser(key, { riotGameName: name, riotTagLine: tag, puuid: listRes.puuid });

      const cacheMap = await getMatchCacheByIds(listRes.ids, key);
      const cachedMatches = [];
      const idsNeedingApi = [];
      listRes.ids.forEach((id) => {
        const cached = cacheMap.get(id);
        const fromCache = cached ? buildMatchFromCache(id, cached, listRes.puuid, name) : null;
        if (fromCache) cachedMatches.push(fromCache);
        else idsNeedingApi.push(id);
      });

      if (idsNeedingApi.length) {
        setStatusMessage(`${t("compare_syncing")} (${idsNeedingApi.length}/${listRes.ids.length})`);
      }

      const detailsRes = idsNeedingApi.length
        ? await window.electron.fetchMatchDetails({ matchIds: idsNeedingApi, puuid: listRes.puuid, region: reg })
        : { success: true, matches: [] };

      if (!detailsRes.success) {
        setErrorMessage(
          detailsRes.error === "missing-api-key" ? t("missing_api_key") : detailsRes.error || t("unknown_error")
        );
        setPhase("error");
        return;
      }

      const normalized = [...cachedMatches, ...detailsRes.matches].map((m) => ({
        ...m,
        champion: normalizeChampionId(m.champion, champions),
      }));

      if (normalized.length) {
        const result = await addMatchesBulk(key, normalized);
        if (!result.success) {
          setErrorMessage(t("save_matches_error").replace("{error}", result.error));
          setPhase("error");
          return;
        }

        for (const m of normalized) {
          if (m.win) await addWin(key, m.champion);
        }
      }

      const [matchesData, winsData] = await Promise.all([getMatches(key), getWins(key)]);
      setOpponentMatches(matchesData || []);
      setOpponentWins(winsData || []);
      setPhase(matchesData?.length ? "ready" : "needs-sync");
    } catch (err) {
      setErrorMessage(err?.message || String(err));
      setPhase("error");
    }
  };

  return (
    <div style={styles.wrap}>
      <div className="riseIn" style={styles.searchCard}>
        <h2 style={styles.title}>{t("compare_page_title")}</h2>
        <p style={styles.intro}>{t("compare_intro")}</p>

        {savedFriends.length > 0 && (
          <div style={styles.friendChipsRow}>
            {savedFriends
              .slice()
              .sort((a, b) => b.lastUsed - a.lastUsed)
              .slice(0, 8)
              .map((f) => (
                <button
                  key={`${f.gameName.toLowerCase()}#${f.tagLine.toLowerCase()}`}
                  onClick={() => applyFriend(f)}
                  style={styles.friendChip}
                  disabled={phase === "checking" || phase === "syncing"}
                >
                  {f.gameName}#{f.tagLine}
                  <span onClick={(e) => removeFriend(f, e)} style={styles.friendChipRemove}>
                    ×
                  </span>
                </button>
              ))}
          </div>
        )}

        <div style={styles.searchRow}>
          <div style={styles.autocompleteWrap}>
            <input
              value={riotIdText}
              onChange={(e) => setRiotIdText(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter") checkOpponent();
              }}
              placeholder={t("compare_riot_id_placeholder")}
              style={{ ...styles.input, width: "100%" }}
              autoComplete="off"
            />
            {showSuggestions && nameSuggestions.length > 0 && (
              <div style={styles.suggestionsList}>
                {nameSuggestions.map((f) => (
                  <div
                    key={`${f.gameName.toLowerCase()}#${f.tagLine.toLowerCase()}`}
                    onMouseDown={() => applyFriend(f)}
                    style={styles.suggestionItem}
                  >
                    <span>{f.tagLine ? `${f.gameName}#${f.tagLine}` : f.gameName}</span>
                    <span style={f.hasData ? styles.suggestionBadgeYes : styles.suggestionBadgeNo}>
                      {f.hasData ? t("compare_suggestion_has_data") : t("compare_suggestion_no_data")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => checkOpponent()}
            disabled={!typedName || !typedTag || phase === "checking" || phase === "syncing"}
            style={styles.primaryBtn}
          >
            {t("compare_search_button")}
          </button>
        </div>

        <div style={styles.hint}>{t("compare_riot_id_hint")}</div>
      </div>

      {phase === "checking" && <Loading label={t("compare_checking")} size="sm" fullHeight={false} />}

      {phase === "syncing" && <Loading label={statusMessage || t("compare_syncing")} size="sm" fullHeight={false} />}

      {phase === "needs-sync" && (
        <div className="riseIn" style={styles.noticeCard}>
          <div style={styles.noticeTitle}>{t("compare_needs_sync_title")}</div>
          <div style={styles.noticeText}>{t("compare_needs_sync_text")}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={syncOpponent} style={styles.primaryBtn}>
              {t("compare_sync_button")}
            </button>
            <button onClick={resetSearch} style={styles.ghostBtn}>
              {t("compare_new_search_button")}
            </button>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="riseIn" style={{ ...styles.noticeCard, borderColor: "rgba(226,85,95,0.4)" }}>
          <div style={{ ...styles.noticeTitle, color: "#e2555f" }}>{errorMessage}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={resetSearch} style={styles.ghostBtn}>
              {t("compare_new_search_button")}
            </button>
          </div>
        </div>
      )}

      {phase === "ready" && !opponentMatches.length && (
        <div className="riseIn" style={styles.noticeCard}>
          <div style={styles.noticeTitle}>{t("compare_opponent_still_empty")}</div>
          <button onClick={resetSearch} style={{ ...styles.ghostBtn, marginTop: 10 }}>
            {t("compare_new_search_button")}
          </button>
        </div>
      )}

      {phase === "ready" && !!opponentMatches.length && opponentPartial && (
        <div className="riseIn" style={styles.noticeCard}>
          <div style={styles.noticeTitle}>{t("compare_partial_title")}</div>
          <div style={styles.noticeText}>{t("compare_partial_text")}</div>
          <button onClick={syncOpponent} style={{ ...styles.primaryBtn, marginTop: 10 }}>
            {t("compare_sync_button")}
          </button>
        </div>
      )}

      {phase === "ready" && !!opponentMatches.length && (
        <>
          <div className="riseIn" style={styles.section}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>{t("compare_summary_title")}</h3>
              <button onClick={resetSearch} style={styles.ghostBtnSmall}>
                {t("compare_new_search_button")}
              </button>
            </div>

            <div style={styles.playerHeaders}>
              <div style={styles.playerName}>{ownLabel || t("compare_you_label")}</div>
              <div style={styles.playerVs}>vs</div>
              <div style={{ ...styles.playerName, textAlign: "right" }}>{opponentLabel}</div>
            </div>

            {!formatMatches.length && <div style={styles.emptyHint}>{t("compare_own_empty")}</div>}

            {[
              { label: t("stat_games"), a: ownSummary.games, b: opponentSummary.games, fmt: (v) => v },
              { label: t("stat_wins_first"), a: ownSummary.wins, b: opponentSummary.wins, fmt: (v) => v },
              { label: t("stat_wins_top3"), a: ownSummary.top3Games, b: opponentSummary.top3Games, fmt: (v) => v },
              { label: t("stat_winrate_first"), a: ownSummary.winrate, b: opponentSummary.winrate, fmt: (v) => `${v}%` },
              { label: t("stat_winrate_top3"), a: ownSummary.top3Rate, b: opponentSummary.top3Rate, fmt: (v) => `${v}%` },
            ].map((row) => (
              <CompareRow key={row.label} label={row.label} valueA={row.fmt(row.a)} valueB={row.fmt(row.b)} colorA={leaderColor(row.a, row.b)} colorB={leaderColor(row.b, row.a)} />
            ))}
            <CompareRow
              label={t("stat_kda")}
              valueA={kdaLabel(ownSummary.avgK, ownSummary.avgD, ownSummary.avgA)}
              valueB={kdaLabel(opponentSummary.avgK, opponentSummary.avgD, opponentSummary.avgA)}
              colorA={null}
              colorB={null}
            />
            <CompareRow
              label={t("overview_roster_progress")}
              valueA={`${ownCareer.coverage}%`}
              valueB={`${opponentCareer.coverage}%`}
              colorA={leaderColor(ownCareer.coverage, opponentCareer.coverage)}
              colorB={leaderColor(opponentCareer.coverage, ownCareer.coverage)}
            />
            <CompareRow
              label={t("compare_current_streak")}
              valueA={ownCareer.streakCurrent > 0 ? `${ownCareer.streakCurrentType === "win" ? "🔥" : "❄️"} ${ownCareer.streakCurrent}` : "—"}
              valueB={
                opponentCareer.streakCurrent > 0
                  ? `${opponentCareer.streakCurrentType === "win" ? "🔥" : "❄️"} ${opponentCareer.streakCurrent}`
                  : "—"
              }
              colorA={null}
              colorB={null}
            />
            <CompareRow
              label={t("streak_best_label")}
              valueA={`🏆 ${ownCareer.streakBestWin}`}
              valueB={`🏆 ${opponentCareer.streakBestWin}`}
              colorA={leaderColor(ownCareer.streakBestWin, opponentCareer.streakBestWin)}
              colorB={leaderColor(opponentCareer.streakBestWin, ownCareer.streakBestWin)}
            />
          </div>

          <div className="riseIn" style={{ ...styles.section, animationDelay: "30ms" }}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>{t("compare_achievements_title")}</h3>
              <div style={styles.badgeTotals}>
                <span>{ownBadges.unlockedBadges}/{ownBadges.totalBadges}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{opponentBadges.unlockedBadges}/{opponentBadges.totalBadges}</span>
              </div>
            </div>

            {ownCategories.map((cat, i) => {
              const oppCat = opponentCategories[i];
              return (
                <CompareRow
                  key={cat.id}
                  iconId={cat.iconId}
                  label={cat.title}
                  valueA={formatAchievementValue(cat.value, cat.unit)}
                  valueB={formatAchievementValue(oppCat.value, oppCat.unit)}
                  colorA={leaderColor(cat.value, oppCat.value)}
                  colorB={leaderColor(oppCat.value, cat.value)}
                />
              );
            })}
          </div>

          <div className="riseIn" style={{ ...styles.section, animationDelay: "60ms" }}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>{t("compare_special_title")}</h3>
            </div>
            {ownBoolean.map((b, i) => {
              const oppB = opponentBoolean[i];
              return (
                <CompareRow
                  key={b.id}
                  iconId={b.iconId}
                  label={b.title}
                  valueA={b.unlocked ? "✓" : "—"}
                  valueB={oppB.unlocked ? "✓" : "—"}
                  colorA={b.unlocked ? "var(--place-good)" : null}
                  colorB={oppB.unlocked ? "var(--place-good)" : null}
                />
              );
            })}
          </div>

          {/* Mesmos destaques por campeão da Visão Geral (ver
              lib/overviewSpotlights.js) — cada item existe sempre dos dois
              lados na mesma posição (mesma lista de ids), por isso emparelha-
              se diretamente por índice; uma linha só aparece se pelo menos
              um dos dois lados tiver esse recorde. */}
          {ownSpotlights.map((group, gi) => {
            const oppGroup = opponentSpotlights[gi];
            const rows = group.items
              .map((item, ii) => ({ own: item, opp: oppGroup.items[ii] }))
              .filter((r) => r.own.value != null || r.opp.value != null);

            if (!rows.length) return null;

            return (
              <div
                key={group.key}
                className="riseIn"
                style={{ ...styles.section, animationDelay: `${90 + Math.min(gi, 8) * 30}ms` }}
              >
                <div style={styles.sectionHeader}>
                  <h3 style={styles.sectionTitle}>
                    {group.icon} {group.title}
                  </h3>
                </div>
                {rows.map(({ own, opp }) => (
                  <SpotlightCompareRow
                    key={own.id}
                    label={own.label}
                    DRAGON={DRAGON}
                    champA={own.champion}
                    valueA={own.value}
                    champB={opp.champion}
                    valueB={opp.value}
                  />
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function CompareRow({ iconId, label, valueA, valueB, colorA, colorB }) {
  return (
    <div style={styles.row}>
      <div style={{ ...styles.rowValue, color: colorA || "var(--text-body)" }}>{valueA}</div>
      <div style={styles.rowLabel}>
        {iconId && (
          <span style={styles.rowLabelIcon}>
            <AchievementIcon iconId={iconId} size={14} />
          </span>
        )}
        {label}
      </div>
      <div style={{ ...styles.rowValue, textAlign: "right", color: colorB || "var(--text-body)" }}>{valueB}</div>
    </div>
  );
}

// Linha de um destaque por campeão (ver overviewSpotlights.js) — mostra o
// ícone+nome do campeão de cada lado (quando o destaque tem um campeão
// associado) junto do valor, tal como os cartões da Visão Geral. "—" quando
// esse lado não tem dados suficientes para este destaque em concreto.
function SpotlightCompareRow({ label, DRAGON, champA, valueA, champB, valueB }) {
  return (
    <div style={styles.row}>
      <div style={styles.spotlightSide}>
        {champA && DRAGON && <img src={`${DRAGON}/img/champion/${champA}.png`} style={styles.spotlightIcon} />}
        <span style={styles.rowValue}>{valueA ?? "—"}</span>
      </div>
      <div style={styles.rowLabel}>{label}</div>
      <div style={{ ...styles.spotlightSide, justifyContent: "flex-end" }}>
        <span style={styles.rowValue}>{valueB ?? "—"}</span>
        {champB && DRAGON && <img src={`${DRAGON}/img/champion/${champB}.png`} style={styles.spotlightIcon} />}
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

  searchCard: {
    background: "var(--panel-bg)",
    backdropFilter: "var(--panel-blur)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-2xl)",
    padding: 16,
  },

  title: {
    color: "var(--accent-text)",
    margin: "0 0 4px",
    fontSize: 16,
  },

  intro: {
    fontSize: 12.5,
    color: "var(--text-secondary)",
    margin: "0 0 12px",
  },

  searchRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  friendChipsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },

  friendChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 8px 5px 10px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--accent-rgb),0.25)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 11.5,
  },

  friendChipRemove: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 14,
    height: 14,
    borderRadius: "50%",
    color: "var(--text-muted)",
    fontSize: 12,
    lineHeight: 1,
  },

  // Wrapper com position:relative para a lista de sugestões (absolute) ficar
  // encostada mesmo por baixo do campo de nome, sem afetar o layout do resto
  // da linha de pesquisa.
  autocompleteWrap: {
    position: "relative",
    flex: 1,
    minWidth: 140,
  },

  suggestionsList: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    zIndex: 20,
    borderRadius: "var(--radius-lg)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    background: "rgba(var(--panel-deep-rgb),0.98)",
    boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
    overflow: "hidden",
  },

  suggestionItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "8px 12px",
    fontSize: 12.5,
    color: "var(--text-body)",
    cursor: "pointer",
  },

  suggestionBadgeYes: {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--place-good)",
    whiteSpace: "nowrap",
  },

  suggestionBadgeNo: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
  },

  input: {
    flex: 1,
    minWidth: 140,
    padding: 10,
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    color: "var(--text-body)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    fontSize: 13,
  },

  select: {
    padding: 10,
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    color: "var(--text-body)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    fontSize: 12.5,
    cursor: "pointer",
  },

  primaryBtn: {
    padding: "10px 16px",
    borderRadius: "var(--radius-lg)",
    border: "none",
    background: "var(--accent-gradient)",
    color: "var(--accent-solid-text)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
  },

  ghostBtn: {
    padding: "10px 16px",
    borderRadius: "var(--radius-lg)",
    border: "1px solid rgba(var(--soft-rgb),0.15)",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 13,
  },

  ghostBtnSmall: {
    padding: "5px 10px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--soft-rgb),0.15)",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 11.5,
  },

  hint: {
    fontSize: 10.5,
    color: "var(--text-muted)",
    marginTop: 8,
  },

  noticeCard: {
    background: "var(--panel-bg)",
    backdropFilter: "var(--panel-blur)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-xl)",
    padding: 16,
  },

  noticeTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--accent-text)",
    marginBottom: 4,
  },

  noticeText: {
    fontSize: 12.5,
    color: "var(--text-secondary)",
  },

  section: {
    background: "var(--panel-bg)",
    backdropFilter: "var(--panel-blur)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-2xl)",
    padding: 16,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--accent-text)",
    margin: 0,
  },

  badgeTotals: {
    display: "flex",
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text-secondary)",
  },

  playerHeaders: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
    marginBottom: 6,
    borderBottom: "1px solid rgba(var(--border-rgb),0.35)",
  },

  playerName: {
    fontSize: 13,
    fontWeight: 800,
    color: "var(--text-body)",
  },

  playerVs: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-muted)",
  },

  emptyHint: {
    fontSize: 11.5,
    color: "var(--text-muted)",
    marginBottom: 6,
  },

  row: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 10,
    padding: "6px 0",
    borderBottom: "1px solid rgba(var(--border-rgb),0.2)",
  },

  rowValue: {
    fontSize: 13,
    fontWeight: 700,
  },

  rowLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontSize: 11.5,
    color: "var(--text-secondary)",
    textAlign: "center",
    whiteSpace: "nowrap",
  },

  rowLabelIcon: {
    display: "inline-flex",
    alignItems: "center",
  },

  spotlightSide: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },

  spotlightIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    flexShrink: 0,
    pointerEvents: "none",
  },
};
