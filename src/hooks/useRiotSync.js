import { useEffect, useMemo, useState } from "react";
import { loadSyncReport, saveSyncReport } from "../lib/syncReport";
import {
  getWins,
  addWin,
  getMatches,
  getImportedMatchIds,
  addMatchesBulk,
  updateTeamSizeForIds,
  updateMatchDetails,
  getMatchCacheByIds,
  buildMatchFromCache,
  buildBackfillDetailsFromCache,
  setUserRiotIdentity,
  repairMismatchedMatches,
  deduplicateLiveCaptures,
} from "../db/api";
import { normalizeChampionId } from "../lib/champions";

// QueueIds da Arena descobertos pelo canário (ver riotapi:canaryCheck em
// electron/riotApi.js) numa sincronização anterior, DEPOIS de a Riot ter
// mudado o valor com um patch — persistidos aqui (não por conta: o queueId é
// global, o mesmo para toda a gente) para a próxima sincronização já saber
// filtrar por eles sem precisar de uma atualização de código. Ver
// ARENA_QUEUE_IDS em electron/riotApi.js para os valores "de fábrica".
const EXTRA_QUEUE_IDS_KEY = "extra-arena-queue-ids";

function getExtraQueueIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(EXTRA_QUEUE_IDS_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function addExtraQueueIds(newIds) {
  if (!newIds?.length) return;
  const merged = new Set([...getExtraQueueIds(), ...newIds]);
  localStorage.setItem(EXTRA_QUEUE_IDS_KEY, JSON.stringify([...merged]));
}

// Processa uma lista com um nº fixo de "trabalhadores" em paralelo — mesmo
// padrão do processWithConcurrency em electron.js, mas usado aqui só para
// UPDATEs à Supabase (ver enrichHistory), que não têm nenhum rate limit da
// Riot a respeitar, por isso sem nenhum wait() entre pedidos.
async function runWithConcurrency(items, concurrency, handler) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await handler(items[current], current);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

// Nº de UPDATEs à Supabase em voo ao mesmo tempo durante o "Reparar tudo" —
// sem relação nenhuma com o limite da Riot API (isto fala só com a nossa
// própria base de dados). Valor conservador para não sobrecarregar a ligação
// do utilizador nem a Supabase, mas já bem acima do "1 de cada vez" anterior.
const DB_UPDATE_CONCURRENCY = 10;

// Rede de segurança para a verificação "canário" (ver riotapi:canaryCheck em
// electron.js e canaryDue abaixo) — o gatilho normal é o patch atual ter
// mudado desde a última verificação (um queueId de Arena só muda mesmo num
// patch novo), não um temporizador. Isto só entra em jogo se "patch" nunca
// tiver sido resolvido (ex: sem internet no arranque) — nesse caso cai para
// repetir de X em X tempo, para a verificação não ficar permanentemente
// desligada.
const CANARY_CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;


// Sincronização com a Riot API (importação de partidas novas + correção de
// partidas antigas incompletas) para a conta ativa. Depende de accounts/
// matches/champions/patch geridos por outros hooks (useAccounts,
// useStaticData), por isso recebe-os como parâmetros.
export function useRiotSync({ accounts, setAccounts, activeAccount, matches, setMatches, setWins, champions, patch, t }) {
  // Sincronização com a Riot API para a conta ativa: null = inativo,
  // { status: "loading"|"done"|"error", message }
  const [syncStatus, setSyncStatus] = useState(null);
  // Confirmação antes de "Reparar dados" (enrichHistory em modo force) —
  // gasta mais pedidos do que o normal e reescreve dados já guardados, por
  // isso pede confirmação em vez de disparar logo ao clicar.
  const [showRepairAllConfirm, setShowRepairAllConfirm] = useState(false);

  // Relatório da última sincronização desta conta (ver lib/syncReport.js) —
  // relido do localStorage a cada troca de conta, para estar lá mesmo numa
  // sessão em que ainda não se sincronizou nada.
  const [syncReport, setSyncReport] = useState(null);
  useEffect(() => {
    setSyncReport(activeAccount ? loadSyncReport(activeAccount) : null);
  }, [activeAccount]);

  // Marca de "desde quando sincronizar" — antes vinha de "lastSyncAt" só no
  // localStorage (por conta), que se perdia ao limpar dados locais ou
  // trocar de PC, obrigando a um resync completo (não incorreto, só mais
  // pesado do que precisava). Agora deriva sempre da partida mais recente
  // já guardada na BD para esta conta — a mesma fonte que "matches" (ver
  // getMatches), por isso reflete sempre o estado real já sincronizado,
  // nunca um valor local que possa ter ficado para trás.
  const latestMatchTimestamp = useMemo(() => {
    if (!matches.length) return null;
    return Math.max(...matches.map((m) => new Date(m.created_at).getTime()));
  }, [matches]);

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
  const syncActiveAccount = async (forceFullHistory = false) => {
    const account = accounts.find((a) => a.username === activeAccount);
    if (!account || !window.electron?.listMatchIds || !window.electron?.fetchMatchDetails) return;

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

    // Relatório desta passagem (ver lib/syncReport.js). Preenchido à medida
    // que cada passo corre e gravado no fim, INCLUINDO quando algo falha a
    // meio — um sync que rebentou é precisamente o caso em que os números
    // parciais mais valem, porque dizem até onde é que se chegou.
    const startedAt = Date.now();
    const report = {
      at: startedAt,
      mode: forceFullHistory ? "full" : "incremental",
      latestMatchAt: latestMatchTimestamp || null,
    };
    const finish = (extra = {}) => {
      Object.assign(report, extra, { durationMs: Date.now() - startedAt });
      setSyncReport(report);
      saveSyncReport(account.username, report);
    };

    try {
      const sinceUsed = forceFullHistory ? null : latestMatchTimestamp || null;
      report.sinceUsed = sinceUsed;
      report.queueIds = getExtraQueueIds();

      // 1) Só a lista de ids — barato, 1 pedido por cada 100 partidas.
      const listRes = await window.electron.listMatchIds({
        gameName: account.riotAccount,
        tagLine: account.riotTag,
        region: account.region || "europe",
        since: sinceUsed,
        // Se já sabemos o puuid desta conta (ver abaixo), poupa o pedido a
        // account-v1 que resolveria gameName+tagLine -> puuid outra vez —
        // um Riot ID só muda por ação do próprio jogador (ver
        // updateRiotAccountFor, que limpa o puuid guardado nesse caso).
        puuid: account.puuid || null,
        extraQueueIds: getExtraQueueIds(),
      });

      if (!listRes.success) {
        const msg =
          listRes.error === "missing-api-key"
            ? t("missing_api_key")
            : listRes.error || t("unknown_error");
        setSyncStatus({ status: "error", message: msg });
        finish({ error: msg });
        return;
      }

      // Primeira vez que resolvemos este puuid (ou a key mudou de algum
      // modo) — guarda-o na conta para todas as sincronizações seguintes,
      // incluindo o enrichHistory logo a seguir, poderem reaproveitá-lo.
      if (listRes.puuid && listRes.puuid !== account.puuid) {
        const updatedAccounts = accounts.map((a) =>
          a.username === account.username ? { ...a, puuid: listRes.puuid } : a
        );
        setAccounts(updatedAccounts);
        localStorage.setItem("riot-accounts", JSON.stringify(updatedAccounts));
      }

      // Sempre (não só quando o puuid muda) — garante que qualquer conta com
      // histórico já importado fica pesquisável pela tab Comparar assim que
      // sincronizar de novo, incluindo contas criadas antes de esta
      // identidade Riot existir na Supabase (ver findUsernameByRiotId).
      setUserRiotIdentity(account.username, {
        riotGameName: account.riotAccount,
        riotTagLine: account.riotTag,
        puuid: listRes.puuid,
      });

      const existingIds = await getImportedMatchIds(account.username);
      const candidateIds = listRes.ids.filter((id) => !existingIds.has(id));

      report.listed = listRes.ids.length;
      report.candidates = candidateIds.length;
      report.alreadyKnown = listRes.ids.length - candidateIds.length;

      // 2) Antes de gastar pedidos à Riot API pelos detalhes de cada
      // partida, vê se algum amigo já a importou — a Arena tem sempre
      // vários jogadores reais (16-18), por isso os dados que ele já
      // guardou servem também para nós (ver getMatchCacheByIds).
      const cacheMap = await getMatchCacheByIds(candidateIds, account.username);

      const cachedMatches = [];
      const idsNeedingApi = [];
      candidateIds.forEach((id) => {
        const cached = cacheMap.get(id);
        const fromCache = cached ? buildMatchFromCache(id, cached, listRes.puuid, account.riotAccount) : null;
        if (fromCache) cachedMatches.push(fromCache);
        else idsNeedingApi.push(id);
      });

      // 3) Só pede à Riot API os ids que sobraram (sem cache partilhada).
      const detailsRes = idsNeedingApi.length
        ? await window.electron.fetchMatchDetails({
            matchIds: idsNeedingApi,
            puuid: listRes.puuid,
            region: account.region || "europe",
          })
        : { success: true, matches: [] };

      if (!detailsRes.success) {
        const msg =
          detailsRes.error === "missing-api-key"
            ? t("missing_api_key")
            : detailsRes.error || t("unknown_error");
        setSyncStatus({ status: "error", message: msg });
        finish({ fromCache: cachedMatches.length, error: msg });
        return;
      }

      report.fromCache = cachedMatches.length;
      report.fromApi = detailsRes.matches.length;

      // 4) De vez em quando (não a cada sync), confirma que a listagem
      // filtrada por queue (passo 1) não está a deixar escapar partidas de
      // Arena com um queueId que ainda não conhecemos — ver
      // riotapi:canaryCheck em electron.js. Um queueId de Arena só muda
      // mesmo num patch novo (foi assim que aconteceu desta vez, ver
      // ARENA_QUEUE_IDS), e a app já sabe o patch atual (Data Dragon, ver
      // "patch" acima) — por isso corre sempre que o patch mudou desde a
      // última verificação, em vez de um temporizador cego: nunca falha uma
      // mudança de patch, e nunca gasta pedidos extra a meio de um patch sem
      // alterações. Se o patch nunca tiver sido resolvido (offline, ver
      // "patchFailed"), cai para o temporizador (CANARY_CHECK_INTERVAL_MS)
      // como rede de segurança, para a verificação não ficar permanentemente
      // desligada. Silenciosamente ignorado se falhar (não é crítico, tenta-
      // se de novo no próximo sync).
      //
      // GATILHO EXTRA (independente do patch): a listagem filtrada não trouxe
      // NENHUMA partida nova. Numa sincronização normal isso é o caso comum e
      // inofensivo (não se jogou nada desde a última vez), mas é EXATAMENTE o
      // mesmo sintoma de a Riot ter mudado o queueId da Arena outra vez — o
      // filtro deixa de encontrar seja o que for e o sync diz "concluído"
      // sem trazer nada, sem erro nenhum. Como o canário é barato (1 pedido
      // de listagem + detalhes só das partidas ainda desconhecidas, que
      // nesse caso são poucas) e é a única forma de detetar a mudança,
      // vale sempre a pena confirmar nesse cenário em vez de esperar pelo
      // patch seguinte.
      let canaryMatches = [];
      const foundNothingNew = candidateIds.length === 0;
      const canaryDue =
        foundNothingNew ||
        (patch
          ? account.lastCanaryPatch !== patch
          : !account.lastCanaryCheck || Date.now() - account.lastCanaryCheck > CANARY_CHECK_INTERVAL_MS);
      report.canaryRan = canaryDue && !!window.electron?.canaryCheck;
      if (canaryDue && window.electron?.canaryCheck) {
        const canaryRes = await window.electron.canaryCheck({
          puuid: listRes.puuid,
          region: account.region || "europe",
          knownIds: [...existingIds, ...listRes.ids],
          extraQueueIds: getExtraQueueIds(),
        });

        if (canaryRes.success) {
          canaryMatches = canaryRes.newArenaMatches || [];
          report.fromCanary = canaryMatches.length;
          report.canaryUnknownQueueIds = canaryRes.unknownQueueIds || [];
          if (canaryRes.unknownQueueIds?.length) {
            console.warn(
              "[canary] queueId(s) de Arena desconhecido(s) detetado(s):",
              canaryRes.unknownQueueIds
            );
            // Aprende-os já: a partir daqui, qualquer sincronização (desta
            // conta ou de outra) passa a filtrar também por este queueId,
            // sem precisar de uma atualização de código (ver
            // ARENA_QUEUE_IDS em electron/riotApi.js).
            addExtraQueueIds(canaryRes.unknownQueueIds);
          }

          // Guarda os dois: "lastCanaryPatch" é o gatilho normal (ver
          // canaryDue acima); "lastCanaryCheck" só serve de rede de
          // segurança para quando "patch" não está disponível.
          const updatedAccounts = accounts.map((a) =>
            a.username === account.username
              ? { ...a, lastCanaryPatch: patch || a.lastCanaryPatch, lastCanaryCheck: Date.now() }
              : a
          );
          setAccounts(updatedAccounts);
          localStorage.setItem("riot-accounts", JSON.stringify(updatedAccounts));
        }
      }

      const normalized = [...cachedMatches, ...detailsRes.matches, ...canaryMatches].map((m) => ({
        ...m,
        champion: normalizeChampionId(m.champion, champions),
      }));
      const newMatches = normalized.filter(
        (m, index, arr) => !existingIds.has(m.matchId) && arr.findIndex((x) => x.matchId === m.matchId) === index
      );

      const result = await addMatchesBulk(account.username, newMatches);

      if (!result.success) {
        setSyncStatus({
          status: "error",
          message: t("save_matches_error").replace("{error}", result.error),
        });
        finish({ error: result.error });
        return;
      }

      report.inserted = result.inserted;

      for (const m of newMatches) {
        if (m.win) await addWin(account.username, m.champion);
      }

      // "latestMatchTimestamp" (usado no próximo "since") recalcula-se
      // sozinho a partir de "matches" assim que o setMatches abaixo correr —
      // não precisa de nenhuma marca própria a guardar aqui. "created_at"
      // já vem do fim de jogo (gameEndTimestamp), não da hora da
      // sincronização — os jogos por vezes demoram alguns minutos a
      // aparecer na API depois de terminarem, e usar a hora "agora" como
      // referência deixaria sempre um jogo ainda não propagado de fora do
      // intervalo pedido na próxima sincronização.
      if (account.username === activeAccount) {
        getWins(activeAccount).then((d) => setWins(d || []));
        getMatches(activeAccount).then((d) => setMatches(d || []));
      }

      const cacheHits = cachedMatches.filter((m) => !existingIds.has(m.matchId)).length;
      setSyncStatus({
        status: "done",
        message:
          result.inserted > 0
            ? `${result.inserted} ${t("matches_imported")}` +
              (cacheHits > 0 ? ` (${cacheHits} ${t("matches_from_cache")})` : "")
            : t("already_up_to_date"),
      });

      setTimeout(() => setSyncStatus((prev) => (prev?.status === "done" ? null : prev)), 4000);

      // Encadeia a correção de partidas já importadas mas incompletas — fica
      // sem efeito nenhum (nem sequer muda o status na UI) quando não há
      // nada para corrigir, ver early-return no início de enrichHistory.
      // Passa o puuid já resolvido acima para não o voltar a pedir à Riot.
      await enrichHistory(false, listRes.puuid);
    } catch (err) {
      const msg = err?.message || String(err);
      setSyncStatus({ status: "error", message: msg });
      finish({ error: msg });
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
  // "force" ignora por completo qualquer deteção de "o que precisa de
  // correção" e a cache partilhada — reconsulta a Riot API para TODAS as
  // partidas com riot_match_id, para repor valores corretos independente-
  // mente da causa. Existe por causa de um bug já corrigido em
  // getMatchCacheByIds (a cache podia usar-se a si própria — uma partida
  // tua já incompleta — como se fosse "de outro user", escrevendo de volta
  // double_kills/triple_kills a 0 por cima de um valor já correto). Como
  // 0 não é "null", isso não fica marcado como "por corrigir" pela deteção
  // normal — só um "force" (ignora deteção, ignora cache) restaura de vez.
  // "knownPuuid" é opcional: quando chamado logo a seguir a um sync (ver
  // syncActiveAccount), o puuid acabado de resolver ainda não está visível
  // aqui via "accounts" (o setAccounts que o guarda só se reflete no
  // próximo render) — passá-lo explicitamente evita um pedido a account-v1
  // que, de outra forma, se repetiria já a seguir ao de listMatchIds.
  const enrichHistory = async (force = false, knownPuuid = null) => {
    const account = accounts.find((a) => a.username === activeAccount);
    const puuid = knownPuuid || account?.puuid || null;

    const missingTeamSize = force ? [] : matches.filter((m) => !m.team_size);
    // "participants" pode existir mas vir de uma versão mais antiga desta
    // funcionalidade, sem os campos de dano/ouro/cura por jogador (só
    // campeão/KDA/build/augments) — sem verificar isto, uma partida já
    // "enriquecida" uma vez nunca mais seria revisitada, mesmo depois de
    // adicionarmos novos dados a extrair (ver extractAllParticipants em
    // electron.js), e ficava para sempre incompleta no Histórico.
    const hasIncompleteParticipants = (m) =>
      Array.isArray(m.participants) &&
      m.participants.length > 0 &&
      (m.participants[0].damageDealt === undefined ||
        m.participants[0].doubleKills === undefined);
    const missingDetails = force
      ? matches.filter((m) => m.riot_match_id)
      : matches.filter(
          (m) =>
            m.riot_match_id &&
            (m.damage_dealt == null ||
              m.healing == null ||
              m.participants == null ||
              m.double_kills == null ||
              m.triple_kills == null ||
              hasIncompleteParticipants(m))
        );

    const localFix = force ? [] : missingTeamSize.filter((m) => m.placement === 7 || m.placement === 8);
    const localFixIds = new Set(localFix.map((m) => m.id));

    const needsApiMap = new Map();
    missingTeamSize
      .filter((m) => !localFixIds.has(m.id) && m.riot_match_id)
      .forEach((m) => needsApiMap.set(m.id, m));
    missingDetails.forEach((m) => needsApiMap.set(m.id, m));
    const needsApi = [...needsApiMap.values()];

    const allAffectedIds = new Set([...missingTeamSize.map((m) => m.id), ...missingDetails.map((m) => m.id)]);

    if (!allAffectedIds.size) return;

    setSyncStatus({
      status: "loading",
      message: force ? t("repairing_all_history") : t("enriching_history"),
    });

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

        // Antes de pedir à Riot API, vê se algum amigo já tem estes mesmos
        // ids com os dados completos — se sim, o UPDATE usa logo esses
        // dados, sem gastar pedido nenhum (ver getMatchCacheByIds). Em modo
        // "force" ignora-se a cache de propósito: o objetivo é repor a
        // verdade a partir da Riot API, não confiar em mais nenhuma linha
        // guardada (que podia ter sido afetada pelo mesmo bug).
        const detailsByMatchId = new Map();
        const stillNeedsApi = [];

        if (force) {
          stillNeedsApi.push(...needsApi);
        } else {
          const cacheMap = await getMatchCacheByIds(
            needsApi.map((m) => m.riot_match_id),
            account.username
          );
          needsApi.forEach((m) => {
            const cached = cacheMap.get(m.riot_match_id);
            const fromCache = cached ? buildBackfillDetailsFromCache(cached, puuid, account.riotAccount) : null;
            if (fromCache) detailsByMatchId.set(m.riot_match_id, { matchId: m.riot_match_id, ...fromCache });
            else stillNeedsApi.push(m);
          });
        }

        let dbError = null;

        // Um histórico grande (sobretudo em "force") pode facilmente ter
        // centenas de partidas a pedir de novo à Riot API — um único pedido
        // IPC com todas de uma vez só devolve alguma coisa à interface no
        // fim, o que faz o "Reparar tudo" parecer preso mesmo a funcionar.
        // Dividir em lotes deixa atualizar o syncStatus entre cada um, sem
        // mudar nada no ritmo de pedidos à Riot API em si (esse continua a
        // ser controlado só pelo FETCH_CONCURRENCY dentro de cada lote, ver
        // electron.js).
        const BACKFILL_BATCH_SIZE = 60;
        if (stillNeedsApi.length && window.electron?.backfillMatchDetails) {
          const total = stillNeedsApi.length;
          let done = 0;

          for (let i = 0; i < stillNeedsApi.length; i += BACKFILL_BATCH_SIZE) {
            const batch = stillNeedsApi.slice(i, i + BACKFILL_BATCH_SIZE);

            setSyncStatus({
              status: "loading",
              message: `${force ? t("repairing_all_history") : t("enriching_history")} (${done}/${total})`,
            });

            const res = await window.electron.backfillMatchDetails({
              matchIds: batch.map((m) => m.riot_match_id),
              region: account?.region || "europe",
              gameName: account.riotAccount,
              tagLine: account.riotTag,
              puuid,
            });

            if (res.success) {
              res.results.forEach((r) => detailsByMatchId.set(r.matchId, r));
            } else if (res.error === "missing-api-key") {
              setSyncStatus({ status: "error", message: t("missing_api_key") });
              return;
            }

            done += batch.length;
          }
        }

        // Os UPDATEs à Supabase (ao contrário dos pedidos à Riot API acima)
        // não têm nenhum limite a respeitar — são só um pedido nosso à nossa
        // própria base de dados. Fazê-los um a um em série (await dentro do
        // for) era o verdadeiro gargalo do "Reparar tudo" num histórico
        // grande: cada UPDATE espera pela viagem de ida e volta à Supabase
        // antes do seguinte começar. Com vários em voo ao mesmo tempo
        // (mesmo padrão de "trabalhadores" do processWithConcurrency em
        // electron.js, só que aqui sem nenhum wait() entre pedidos — não há
        // rate limit da Riot a respeitar neste passo) isto fica muito mais
        // rápido sem tocar em nada do ritmo de pedidos à Riot API.
        const toUpdate = needsApi.filter((m) => detailsByMatchId.has(m.riot_match_id));
        const updateResults = await runWithConcurrency(toUpdate, DB_UPDATE_CONCURRENCY, (m) =>
          updateMatchDetails(m.id, detailsByMatchId.get(m.riot_match_id))
        );

        // IMPORTANTE: só conta como corrigida se o UPDATE na Supabase tiver
        // mesmo sucesso — antes isto era contado sempre, mesmo quando
        // falhava (ex: coluna "participants" em falta na tabela), fazendo a
        // app dizer "N partidas enriquecidas" quando na verdade nada tinha
        // sido gravado, e a mesma partida nunca mais era assinalada como
        // precisando de correção.
        updateResults.forEach((result) => {
          if (result.success) {
            apiFixed += 1;
          } else if (!dbError) {
            dbError = result.error;
          }
        });
        if (dbError && apiFixed === 0) {
          setSyncStatus({
            status: "error",
            message: t("save_matches_error").replace("{error}", dbError),
          });
          return;
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

  // "Reparar dados": o botão para quando algo na conta parece errado.
  // Encadeia tudo o que pode corrigir, por esta ordem:
  //  1) traz partidas em falta (ex: jogadas antes do último sync — "since"
  //     incremental deixa-as sempre para trás, ver syncActiveAccount);
  //  2) volta a pedir à Riot API TODAS as partidas já importadas, sem usar
  //     cache partilhada (enrichHistory force);
  //  3) corrige campos pessoais (campeão/KDA/build/etc.) que não batem
  //     certo com a própria entrada em "participants" — ver
  //     repairMismatchedMatches para o porquê disto poder acontecer;
  //  4) remove duplicados de um jogo guardado ao vivo E depois importado da
  //     Riot API (ver deduplicateLiveCaptures).
  const repairAllData = async () => {
    const account = accounts.find((a) => a.username === activeAccount);
    if (!account) return;

    await syncActiveAccount(true);
    await enrichHistory(true);

    setSyncStatus({ status: "loading", message: t("repairing_personal_data") });
    const repairRes = await repairMismatchedMatches(
      activeAccount,
      account.riotAccount,
      account.riotTag,
      account.puuid
    );

    setSyncStatus({ status: "loading", message: t("removing_duplicates") });
    const dedupRes = await deduplicateLiveCaptures(activeAccount);

    getMatches(activeAccount).then((d) => setMatches(d || []));

    const parts = [];
    if (repairRes.repaired) parts.push(`${repairRes.repaired} ${t("matches_fixed_short")}`);
    if (dedupRes.removed) parts.push(`${dedupRes.removed} ${t("duplicates_removed_short")}`);

    setSyncStatus({
      status: "done",
      message: parts.length ? parts.join(", ") : t("repair_all_done_clean"),
    });
    setTimeout(() => setSyncStatus((prev) => (prev?.status === "done" ? null : prev)), 6000);
  };

  return {
    syncStatus,
    setSyncStatus,
    syncReport,
    showRepairAllConfirm,
    setShowRepairAllConfirm,
    latestMatchTimestamp,
    syncActiveAccount,
    enrichHistory,
    repairAllData,
  };
}
