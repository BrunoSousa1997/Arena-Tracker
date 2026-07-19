import { useCallback, useEffect, useRef, useState } from "react";
import {
  Users,
  Plus,
  Minus,
  LogIn,
  Copy,
  Check,
  Crown,
  Trophy,
  Loader2,
  Swords,
  Skull,
  Handshake,
  Target,
  Flame,
  Shield,
  HeartPulse,
  Zap,
  ChevronDown,
  History,
  ArrowLeft,
  Info,
  MonitorCheck,
} from "lucide-react";
import { useLanguage } from "../lib/i18n";
import Loading from "../components/Loading";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  createRoom,
  joinRoom,
  getRoom,
  getRoomByCode,
  getRoomPlayers,
  getMyActiveRoom,
  leaveRoom,
  closeRoom,
  inviteToRoom,
  getPendingInvites,
  respondToInvite,
  subscribeToRoom,
  subscribeToInvites,
  searchAccountsByGameName,
  startRoom,
  finishRoom,
  getRoomChallengeGames,
  subscribeToChallengeGames,
  recoverMissingChallengeGames,
  getChallengeHistory,
} from "../db/api";
import { scorePlayer, SCORE_POINTS, CLASS_MULTIPLIER, DEFAULT_RULES, sumStreakBonus } from "../lib/challengeScoring";
import { normalizeChampionId } from "../lib/champions";

const PLAYER_OPTIONS = [2, 3, 4, 6, 8];
const MIN_GAMES = 1;
const MAX_GAMES = 10;

// Cor de identidade por jogador no placar ao vivo (ver ScoreBoard) — só
// entra em jogo enquanto o desafio decorre, antes de haver medalhas.
const PLAYER_COLORS = ["#5b8cff", "#ff6b6b", "#4ade80", "#fbbf24", "#c084fc", "#22d3ee", "#f472b6", "#fb923c"];

// Uma pessoa pode ter mais do que uma conta ("wins.username") para a mesma
// identidade Riot — reinstalações antigas antes de "wins" ter constraint de
// unicidade (ver ponto 6b em supabase/schema.sql), ou contas sem Riot ID
// preenchido. Sem isto, a pesquisa de convite mostrava a mesma pessoa duas
// vezes e era fácil convidar a conta errada (uma que já ninguém usa). Fica
// só a primeira ocorrência por identidade — a RPC já devolve por ordem de
// "has_matches desc", por isso a conta ativa tende a vir primeiro.
function dedupeByIdentity(rows) {
  const seen = new Set();
  const result = [];
  for (const r of rows) {
    const key =
      r.riot_game_name && r.riot_tag_line
        ? `${r.riot_game_name.toLowerCase()}#${r.riot_tag_line.toLowerCase()}`
        : r.username.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(r);
  }
  return result;
}

// "Ao vivo" = linha em challenge_games ainda com status "live" e atualizada
// nos últimos 20s (ver updateChallengeGameProgress em db/rooms.js, chamado a
// cada poll de 3s). A margem cobre falhas de rede pontuais sem deixar a
// etiqueta "a jogar agora" presa quando já não há partida nenhuma.
//
// Uma linha "live" mais velha do que isto NÃO é descartada — é tratada como
// uma partida terminada (ver fetchAll no ScoreBoard). Acontece quando a app
// morre de repente (crash, fim de processo) sem chegar a fechar a linha em
// condições: os pontos já feitos continuam a contar, só deixam de aparecer
// como "a decorrer". Um desafio nunca tira pontos a ninguém.
function isGameLive(row) {
  return (
    !!row &&
    row.status === "live" &&
    !!row.updated_at &&
    Date.now() - new Date(row.updated_at).getTime() < 20_000
  );
}

// ================= AVISO: MANTER A APP ABERTA =================
// A pontuação dos challenges depende inteiramente da Live Client Data (ver
// electron/liveGame.js) — sem a app aberta durante a partida não há poll
// nenhum, e o que não for captado nesse momento não entra no desafio (dá
// para repescar depois a partir do histórico, ver o botão "Recuperar jogos
// em falta" no placar, mas é sempre melhor não precisar dele). O que já
// tiver sido captado NUNCA se perde. Mostrado em todos os ecrãs onde isto
// importa: antes de começar (idle/lobby) e durante o desafio (placar).
function KeepAppOpenNotice() {
  const { t } = useLanguage();
  return (
    <div style={styles.keepOpenNotice}>
      <MonitorCheck size={14} strokeWidth={2.25} style={styles.keepOpenIcon} />
      <span>{t("chal_keep_app_open")}</span>
    </div>
  );
}

// ================= EXPLICAÇÃO: COMO FUNCIONA A PONTUAÇÃO =================
// Painel expansível com a tabela de pontos exata usada em challengeScoring.js
// (os valores vêm de lá, SCORE_POINTS — nunca escritos à mão aqui, para não
// desalinhar se algum dia forem afinados) — para os jogadores saberem de onde
// vêm os pontos em vez de confiarem num número que não conseguem verificar.
function ScoringRulesInfo() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const streakSuffix = t("chal_score_streak_value")
    .replace("{step}", SCORE_POINTS.streakStep)
    .replace("{threshold}", SCORE_POINTS.streakThreshold);
  const deathStreakSuffix = t("chal_score_death_streak_value")
    .replace("{step}", SCORE_POINTS.streakStep)
    .replace("{threshold}", SCORE_POINTS.streakThreshold);
  const per = (amount) => t("chal_score_per_points").replace("{amount}", amount.toLocaleString());

  const classLabelKeys = {
    Assassin: "chal_class_assassin",
    Mage: "chal_class_mage",
    Marksman: "chal_class_marksman",
    Support: "chal_class_support",
    Fighter: "chal_class_fighter",
    Tank: "chal_class_tank",
  };
  // Ordenado do multiplicador mais alto para o mais baixo — lê-se como uma
  // escala (quem sobe primeiro, quem desce por último), não por ordem
  // alfabética arbitrária.
  const classRows = Object.entries(CLASS_MULTIPLIER)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, mult]) => ({ label: t(classLabelKeys[tag]) || tag, value: `×${mult.toFixed(2)}` }));

  const rows = [
    { label: t("chal_score_kill"), value: `+${SCORE_POINTS.kill}` },
    { label: t("chal_score_death"), value: `${SCORE_POINTS.death}` },
    { label: t("chal_score_assist"), value: `+${SCORE_POINTS.assist}` },
    { label: t("chal_score_streak"), value: streakSuffix },
    { label: t("chal_score_death_streak"), value: deathStreakSuffix },
    { label: t("chal_score_damage"), value: per(SCORE_POINTS.damageDealtPer) },
    { label: t("chal_score_healing"), value: per(SCORE_POINTS.healingPer) },
    { label: t("chal_score_taken"), value: per(SCORE_POINTS.damageTakenPer) },
    { label: t("chal_score_double"), value: `+${SCORE_POINTS.doubleKill}` },
    { label: t("chal_score_triple"), value: `+${SCORE_POINTS.tripleKill}` },
  ];

  return (
    <div style={styles.scoringInfoWrap}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={styles.scoringInfoToggle}>
        <Info size={13} strokeWidth={2.25} />
        {t("chal_scoring_how")}
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
        />
      </button>
      {open && (
        <div style={styles.scoringInfoBody}>
          {rows.map((r) => (
            <div key={r.label} style={styles.scoringInfoRow}>
              <span style={styles.scoringInfoLabel}>{r.label}</span>
              <span style={styles.scoringInfoValue}>{r.value}</span>
            </div>
          ))}

          <div style={styles.scoringInfoSubheader}>{t("chal_score_class_handicap")}</div>
          {classRows.map((r) => (
            <div key={r.label} style={styles.scoringInfoRow}>
              <span style={styles.scoringInfoLabel}>{r.label}</span>
              <span style={styles.scoringInfoValue}>{r.value}</span>
            </div>
          ))}
          <div style={styles.scoringInfoNote}>{t("chal_score_class_handicap_note")}</div>

          <div style={styles.scoringInfoNote}>{t("chal_score_live_note")}</div>
        </div>
      )}
    </div>
  );
}

// idle = escolher entre criar/entrar · creating = formulário · lobby = já numa sala
export default function Challenges({ activeAccount, accounts, champions = [], DRAGON, onChallengeWon }) {
  const { t } = useLanguage();

  const [screen, setScreen] = useState("idle");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [invites, setInvites] = useState([]);

  // Identidade Riot da conta ativa — copiada para a sala ao entrar, para o
  // placar continuar a fazer sentido se a pessoa mudar de Riot ID depois.
  const account = accounts.find((a) => a.username === activeAccount);
  const identity = { riotGameName: account?.riotAccount, riotTagLine: account?.riotTag };

  // ================= CARREGAR ESTADO =================
  const refreshRoom = useCallback(async (roomId) => {
    const list = await getRoomPlayers(roomId);
    setPlayers(list);
  }, []);

  const loadState = useCallback(async () => {
    if (!activeAccount) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [mine, pending] = await Promise.all([
      getMyActiveRoom(activeAccount),
      getPendingInvites(activeAccount),
    ]);

    setInvites(pending);
    if (mine) {
      setRoom(mine);
      await refreshRoom(mine.id);
      setScreen("lobby");
    } else {
      setRoom(null);
      setPlayers([]);
      setScreen("idle");
    }
    setLoading(false);
  }, [activeAccount, refreshRoom]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // ================= TEMPO REAL: A SALA =================
  useEffect(() => {
    if (!room?.id) return;

    // Qualquer mudança na sala ou nos seus jogadores relê o estado. Reler é
    // mais simples (e mais fiável) do que tentar aplicar cada evento à mão —
    // o volume aqui é de meia dúzia de linhas, não vale a complicação.
    //
    // "getRoom" por id (não "getMyActiveRoom", que só devolve lobby/running)
    // — um desafio que acaba de terminar continua a ser ESTA sala, só que
    // com status "finished"; só voltamos ao início se a sala tiver mesmo
    // desaparecido (o host desfê-la a meio, ver closeRoom).
    const unsubscribe = subscribeToRoom(room.id, async () => {
      const [freshPlayers, fresh] = await Promise.all([
        getRoomPlayers(room.id),
        getRoom(room.id),
      ]);

      if (!fresh) {
        setRoom(null);
        setPlayers([]);
        setScreen("idle");
        return;
      }
      setRoom(fresh);
      setPlayers(freshPlayers);
    });

    return unsubscribe;
  }, [room?.id, activeAccount]);

  // ================= TEMPO REAL: CONVITES =================
  useEffect(() => {
    if (!activeAccount) return;

    const unsubscribe = subscribeToInvites(activeAccount, async () => {
      setInvites(await getPendingInvites(activeAccount));
    });

    return unsubscribe;
  }, [activeAccount]);

  // ================= AÇÕES =================
  const handleJoinByCode = async (code) => {
    setError("");
    const found = await getRoomByCode(code);
    if (!found) return setError(t("chal_room_not_found"));
    if (found.status !== "lobby") return setError(t("chal_room_started"));

    const current = await getRoomPlayers(found.id);
    const alreadyIn = current.some((p) => p.username === activeAccount);
    if (!alreadyIn && current.length >= found.max_players) return setError(t("chal_room_full"));

    setBusy(true);
    const res = await joinRoom(found.id, activeAccount, identity);
    setBusy(false);
    if (!res.success) return setError(res.error);

    setRoom(found);
    await refreshRoom(found.id);
    setScreen("lobby");
  };

  const handleAcceptInvite = async (invite) => {
    await respondToInvite(invite.id, "accepted");
    await handleJoinByCode(invite.challenge_rooms.code);
    setInvites(await getPendingInvites(activeAccount));
  };

  const handleDeclineInvite = async (invite) => {
    await respondToInvite(invite.id, "declined");
    setInvites(await getPendingInvites(activeAccount));
  };

  const handleLeave = async () => {
    // Um desafio já terminado não tem "sair" nenhum para desfazer — a sala
    // fica tal como está (é o que alimenta o histórico, ver
    // getChallengeHistory), só voltamos ao ecrã inicial. Apagar a própria
    // linha em challenge_room_players faria este desafio desaparecer da
    // conta no histórico, já que essa é a tabela usada para o encontrar.
    if (room.status !== "finished") {
      await leaveRoom(room.id, activeAccount);
    }
    setRoom(null);
    setPlayers([]);
    setScreen("idle");
  };

  const handleClose = async () => {
    await closeRoom(room.id);
    setRoom(null);
    setPlayers([]);
    setScreen("idle");
  };

  if (!activeAccount) return <div style={styles.empty}>{t("chal_no_account")}</div>;
  if (loading) return <Loading label={t("loading_generic")} />;

  return (
    <div style={styles.wrap}>
      {screen !== "lobby" && invites.length > 0 && (
        <InvitesPanel invites={invites} onAccept={handleAcceptInvite} onDecline={handleDeclineInvite} />
      )}

      {screen === "idle" && (
        <IdleScreen
          onCreate={() => {
            setError("");
            setScreen("creating");
          }}
          onJoin={handleJoinByCode}
          onHistory={() => setScreen("history")}
          error={error}
          busy={busy}
        />
      )}

      {screen === "history" && (
        <ChallengeHistory activeAccount={activeAccount} onBack={() => setScreen("idle")} />
      )}

      {screen === "creating" && (
        <CreateForm
          hostUsername={activeAccount}
          identity={identity}
          onCancel={() => setScreen("idle")}
          onCreated={async (created) => {
            setRoom(created);
            await refreshRoom(created.id);
            setScreen("lobby");
          }}
        />
      )}

      {screen === "lobby" && room && (
        <Lobby
          room={room}
          players={players}
          activeAccount={activeAccount}
          onLeave={handleLeave}
          onClose={handleClose}
          champions={champions}
          DRAGON={DRAGON}
          onChallengeWon={onChallengeWon}
          onRoomUpdate={setRoom}
        />
      )}
    </div>
  );
}

// ================= ECRÃ INICIAL =================
function IdleScreen({ onCreate, onJoin, onHistory, error, busy }) {
  const { t } = useLanguage();
  const [code, setCode] = useState("");

  return (
    <>
      <div className="riseIn" style={styles.card}>
        <div style={styles.idleHeaderRow}>
          <div>
            <h2 style={styles.title}>{t("chal_page_title")}</h2>
            <p style={styles.intro}>{t("chal_intro")}</p>
          </div>
          <button onClick={onHistory} style={styles.ghostBtn}>
            <History size={13} strokeWidth={2.25} /> {t("chal_history")}
          </button>
        </div>
        <KeepAppOpenNotice />
        <ScoringRulesInfo />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onCreate}
          style={{ ...styles.bigChoice, animationDelay: "30ms" }}
          className="clickableCard riseIn"
        >
          <Plus size={22} strokeWidth={2.25} color="var(--accent-text)" />
          <span style={styles.bigChoiceTitle}>{t("chal_create_room")}</span>
        </button>

        <div className="riseIn" style={{ ...styles.card, animationDelay: "60ms" }}>
          <div style={styles.bigChoiceHeader}>
            <LogIn size={18} strokeWidth={2.25} color="var(--accent-text)" />
            <span style={styles.bigChoiceTitle}>{t("chal_join_room")}</span>
          </div>
          <div style={styles.joinRow}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && code.trim() && onJoin(code)}
              placeholder={t("chal_code_placeholder")}
              style={{ ...styles.input, letterSpacing: 3, fontWeight: 800 }}
              maxLength={5}
            />
            <button
              onClick={() => onJoin(code)}
              disabled={!code.trim() || busy}
              style={styles.primaryBtn}
            >
              {t("chal_join_btn")}
            </button>
          </div>
          {error && <div style={styles.error}>{error}</div>}
        </div>
      </div>
    </>
  );
}

// ================= HISTÓRICO DE DESAFIOS =================
function ChallengeHistory({ activeAccount, onBack }) {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState(null); // null = a carregar

  useEffect(() => {
    let cancelled = false;
    getChallengeHistory(activeAccount).then((data) => {
      if (!cancelled) setRooms(data);
    });
    return () => {
      cancelled = true;
    };
  }, [activeAccount]);

  return (
    <>
      <div className="riseIn" style={styles.card}>
        <div style={styles.idleHeaderRow}>
          <h2 style={styles.title}>{t("chal_history")}</h2>
          <button onClick={onBack} style={styles.ghostBtn}>
            <ArrowLeft size={13} strokeWidth={2.25} /> {t("chal_back")}
          </button>
        </div>

        {rooms === null && (
          <div style={styles.scoreboardLoading}>
            <Loader2 size={16} strokeWidth={2.5} style={styles.spinIcon} /> {t("loading_generic")}
          </div>
        )}

        {rooms !== null && rooms.length === 0 && (
          <div style={styles.hint}>{t("chal_history_empty")}</div>
        )}
      </div>

      {rooms?.map((room, i) => (
        <HistoryEntry key={room.id} room={room} activeAccount={activeAccount} t={t} delay={Math.min(i, 8) * 30} />
      ))}
    </>
  );
}

// Um desafio terminado — usa a fotografia gravada em "results" (ver
// finishRoom), não recalcula nada: é a mesma pontuação que se viu ao vivo.
function HistoryEntry({ room, activeAccount, t, delay = 0 }) {
  const results = Array.isArray(room.results) ? room.results : [];
  const won = room.winner_username === activeAccount;

  return (
    <div
      className="riseIn"
      style={{ ...styles.card, ...(won ? styles.combatCardSelf : null), animationDelay: `${delay}ms` }}
    >
      <div style={styles.idleHeaderRow}>
        <div>
          <div style={styles.kicker}>
            {new Date(room.finished_at).toLocaleDateString()} · {room.target_games} {t("chal_games").toLowerCase()}
          </div>
          <h3 style={{ ...styles.sectionTitle, margin: "2px 0 0" }}>{room.name}</h3>
        </div>
        {won && (
          <span style={styles.leaderBanner}>
            <Crown size={13} strokeWidth={2.5} /> {t("chal_challenge_winner")}
          </span>
        )}
      </div>

      <div style={styles.historyResultsList}>
        {results
          .slice()
          .sort((a, b) => a.rank - b.rank)
          .map((r) => (
            <div key={r.username} style={styles.historyResultRow}>
              <RankBadge rank={r.rank - 1} />
              <div style={styles.playerName}>
                {r.riot_game_name && r.riot_tag_line ? `${r.riot_game_name}#${r.riot_tag_line}` : r.username}
              </div>
              <div style={styles.combatGamePts}>{r.total} pts</div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ================= STEPPER (nº de jogos, 1-10) =================
function Stepper({ value, onChange, min, max }) {
  return (
    <div style={styles.stepperRow}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        style={{ ...styles.stepperBtn, ...(value <= min ? styles.stepperBtnDisabled : null) }}
      >
        <Minus size={15} strokeWidth={2.5} />
      </button>
      <div style={styles.stepperValue}>{value}</div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        style={{ ...styles.stepperBtn, ...(value >= max ? styles.stepperBtnDisabled : null) }}
      >
        <Plus size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ================= FORMULÁRIO DE CRIAÇÃO =================
function CreateForm({ hostUsername, identity, onCancel, onCreated }) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [targetGames, setTargetGames] = useState(5);
  const [rules, setRules] = useState("basic");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError("");

    const res = await createRoom({ name, hostUsername, maxPlayers, targetGames, rules, identity });
    setBusy(false);
    if (!res.success) return setError(res.error);
    onCreated(res.room);
  };

  return (
    <div className="riseIn" style={styles.card}>
      <h2 style={styles.title}>{t("chal_create_room")}</h2>

      <label style={styles.label}>{t("chal_room_name")}</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("chal_room_name_placeholder")}
        style={styles.input}
        autoFocus
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginTop: 14 }}>
        <div>
          <label style={styles.label}>{t("chal_players")}</label>
          <div style={styles.segRow}>
            {PLAYER_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setMaxPlayers(n)}
                style={{ ...styles.seg, ...(maxPlayers === n ? styles.segActive : null) }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={styles.label}>{t("chal_games")}</label>
          <Stepper value={targetGames} onChange={setTargetGames} min={MIN_GAMES} max={MAX_GAMES} />
          <div style={styles.fieldHint}>{t("chal_games_hint")}</div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={styles.label}>{t("chal_rules")}</label>
        <div style={styles.segRow}>
          {[
            { key: "basic", label: t("chal_rules_basic") },
            { key: "custom", label: t("chal_rules_custom") },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRules(opt.key)}
              style={{ ...styles.seg, flex: 1, ...(rules === opt.key ? styles.segActive : null) }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={styles.fieldHint}>
          {rules === "basic" ? t("chal_rules_basic_desc") : t("chal_rules_custom_desc")}
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={submit} disabled={!name.trim() || busy} style={styles.primaryBtn}>
          {busy ? t("chal_creating") : t("chal_create_btn")}
        </button>
        <button onClick={onCancel} style={styles.ghostBtn}>
          {t("cancel_btn")}
        </button>
      </div>
    </div>
  );
}

// ================= LOBBY (+ convidar) =================
function Lobby({ room, players, activeAccount, onLeave, onClose, champions, DRAGON, onChallengeWon, onRoomUpdate }) {
  const { t } = useLanguage();
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const isHost = room.host_username === activeAccount;
  const full = players.length >= room.max_players;

  const emptySlots = Math.max(0, room.max_players - players.length);

  const handleStart = useCallback(async () => {
    setBusy(true);
    const startedAt = new Date().toISOString();
    const res = await startRoom(room.id);
    // Otimista: passa já para o placar sem esperar pela volta pelo Realtime
    // (escrever -> Supabase difundir -> Challenges.jsx voltar a ler tudo) —
    // esse ciclo pode facilmente demorar 1-2s, e quem escreveu a mudança já
    // sabe o resultado sem precisar de esperar por ela. Os outros jogadores
    // continuam a receber a transição pela via normal (subscribeToRoom).
    if (res.success) {
      onRoomUpdate?.({ ...room, status: "running", started_at: startedAt });
    }
    setBusy(false);
  }, [room, onRoomUpdate]);

  // Assim que a sala atinge o nº máximo de jogadores, o anfitrião arranca o
  // desafio automaticamente — ninguém precisa de clicar em nada. A ref evita
  // disparar outra vez se "full" oscilar (ex: alguém sai e entra de volta).
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (room.status !== "lobby") return;
    if (!full) {
      autoStartedRef.current = false;
      return;
    }
    if (!isHost || autoStartedRef.current || busy) return;
    autoStartedRef.current = true;
    handleStart();
  }, [isHost, full, room.status, busy, handleStart]);

  // Se o desafio já começou (ou já acabou — a sala fica com status
  // "finished" em vez de ser apagada, ver finishRoom), mostra o painel de
  // pontuações.
  if (room.status === "running" || room.status === "finished") {
    return (
      <ScoreBoard
        room={room}
        players={players}
        activeAccount={activeAccount}
        onLeave={onLeave}
        champions={champions}
        DRAGON={DRAGON}
        onChallengeWon={onChallengeWon}
      />
    );
  }

  return (
    <>
      <div className="riseIn" style={styles.card}>
        <div style={styles.lobbyHeader}>
          <div>
            <div style={styles.kicker}>{t("chal_lobby")}</div>
            <h2 style={styles.title}>{room.name}</h2>
          </div>
          <div style={styles.lobbyMeta}>
            <span>
              <b>{players.length}</b>/{room.max_players} {t("chal_players").toLowerCase()}
            </span>
            <span>
              <b>{room.target_games}</b> {t("chal_games").toLowerCase()}
            </span>
            <span>{room.rules === "basic" ? t("chal_rules_basic") : t("chal_rules_custom")}</span>
          </div>
        </div>

        {/* Grid de players — adapta ao número: 2 = lado-a-lado com VS, 3+ = grid */}
        {players.length > 0 && (
          <div style={getGridStyle(players.length + emptySlots)}>
            {players.map((p, idx) => (
              <PlayerCard
                key={p.username}
                player={p}
                isHost={p.username === room.host_username}
                hostText={t("chal_host")}
                delay={Math.min(idx, 8) * 30}
              />
            ))}
            {/* Slots vazios */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <PlayerCard key={`empty-${i}`} player={null} />
            ))}
            {/* Divider "VS" só para 2 players */}
            {players.length + emptySlots === 2 && (
              <div style={styles.vsDivider}>VS</div>
            )}
          </div>
        )}

        <div style={styles.statusLine}>
          {full ? (
            <span style={styles.statusStarting}>
              <Loader2 size={13} strokeWidth={2.5} style={styles.spinIcon} /> {t("chal_starting")}
            </span>
          ) : (
            <>
              {t("chal_waiting_players")}
              <span style={styles.realtimeHint}>· {t("chal_realtime_hint")}</span>
            </>
          )}
        </div>

        <KeepAppOpenNotice />
        <ScoringRulesInfo />

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {isHost ? (
            <button onClick={() => setConfirmClose(true)} style={styles.ghostBtn}>
              {t("chal_close_room")}
            </button>
          ) : (
            <button onClick={onLeave} style={styles.ghostBtn}>
              {t("chal_leave")}
            </button>
          )}
        </div>
      </div>

      {!full && <InvitePanel room={room} activeAccount={activeAccount} players={players} />}

      {confirmClose && (
        <ConfirmDialog
          title={t("chal_close_confirm_title")}
          message={t("chal_close_confirm_msg")}
          confirmLabel={t("chal_close_room")}
          danger
          onConfirm={() => {
            setConfirmClose(false);
            onClose();
          }}
          onCancel={() => setConfirmClose(false)}
        />
      )}
    </>
  );
}

// ================= CARD DE PLAYER =================
function PlayerCard({ player, isHost, hostText, delay = 0 }) {
  const name = player
    ? player.riot_game_name && player.riot_tag_line
      ? `${player.riot_game_name}#${player.riot_tag_line}`
      : player.username
    : "—";

  return (
    <div
      className="riseIn"
      style={{ ...(player ? styles.playerCard : styles.playerCardEmpty), animationDelay: `${delay}ms` }}
    >
      {player && (
        <>
          <div style={styles.playerAvatar}>
            <Users size={24} strokeWidth={2} color="var(--accent-text)" />
          </div>
          <div style={styles.playerInfo}>
            <div style={styles.playerCardName}>{name}</div>
            {isHost && (
              <div style={styles.playerCardBadge}>
                <Crown size={10} strokeWidth={2.5} /> {hostText}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Helper para determinar o grid baseado no número total de slots
function getGridStyle(totalSlots) {
  const base = {
    display: "grid",
    gap: 12,
    marginBottom: 12,
    position: "relative",
  };

  if (totalSlots === 2) {
    return { ...base, gridTemplateColumns: "1fr 1fr" };
  } else if (totalSlots === 3) {
    return { ...base, gridTemplateColumns: "1fr 1fr 1fr" };
  } else if (totalSlots === 4) {
    return { ...base, gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr" };
  } else if (totalSlots === 6) {
    return { ...base, gridTemplateColumns: "1fr 1fr 1fr" };
  } else if (totalSlots === 8) {
    return { ...base, gridTemplateColumns: "1fr 1fr 1fr 1fr" };
  }
  // Fallback
  return { ...base, gridTemplateColumns: "1fr 1fr" };
}

// Grelha do placar ao vivo — nº de colunas dita pelo nº de jogadores da sala,
// para os cards ocuparem sempre o espaço todo disponível em vez de
// depender de "quantos cabem" num minmax. 2 e 4 ficam com cards maiores
// (2 colunas); 3, 5 e 6 em 3 colunas; 7 e 8 em 4 — mesmos patamares do
// nº de jogadores permitido na criação da sala (ver PLAYER_OPTIONS).
function getCombatGridStyle(playerCount) {
  let cols;
  if (playerCount <= 2) cols = 2;
  else if (playerCount === 4) cols = 2;
  else if (playerCount <= 6) cols = 3;
  else cols = 4;

  return {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gap: 16,
  };
}

// ================= PAINEL DE PONTUAÇÕES (Em Curso) =================
// Vai buscar diretamente à base de dados os jogos de TODOS os jogadores da
// sala (não só os da conta ativa neste dispositivo — "challenge_games" é
// aberta, ver db/rooms.js) e mantém-se em tempo real via subscrição à
// própria sala nessa tabela — cada partida (a decorrer ou já terminada) é a
// sua própria linha, coleção separada do histórico normal.
function ScoreBoard({ room, players, activeAccount, onLeave, champions = [], DRAGON, onChallengeWon }) {
  const { t } = useLanguage();
  const [finishedByUsername, setFinishedByUsername] = useState({});
  const [liveByUsername, setLiveByUsername] = useState({});
  const [loaded, setLoaded] = useState(false);
  // Recuperação manual de partidas que o desafio perdeu (ver
  // recoverMissingChallengeGames em db/rooms.js). null = nunca corrida.
  const [recovering, setRecovering] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState(null);

  const targetGames = room?.target_games || MAX_GAMES;
  const sinceISO = room?.started_at || new Date().toISOString();
  const usernames = players.map((p) => p.username);
  const usernamesKey = usernames.join(",");

  const fetchAll = useCallback(async () => {
    const rows = await getRoomChallengeGames(usernames, sinceISO);
    const finished = {};
    const live = {};
    for (const u of usernames) finished[u] = [];
    for (const row of rows) {
      // Só conta como "a decorrer" se ainda estiver a receber atualizações
      // (ver isGameLive). Uma linha "live" abandonada — app fechada de
      // repente sem chegar a fechá-la — entra na lista das terminadas, para
      // os pontos já feitos continuarem a contar em vez de desaparecerem.
      if (isGameLive(row)) live[row.username] = row;
      else (finished[row.username] ||= []).push(row);
    }
    for (const u of usernames) finished[u] = finished[u].slice(0, targetGames);
    setFinishedByUsername(finished);
    setLiveByUsername(live);
    setLoaded(true);
  }, [usernamesKey, sinceISO, targetGames]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Repesca partidas que a captura ao vivo não apanhou (app fechada durante
  // o jogo, aberta a meio, sala que só arrancou depois) — só para a PRÓPRIA
  // conta: o histórico de cada um só está acessível a partir do seu próprio
  // dispositivo, por isso cada jogador recupera as suas.
  const handleRecover = async () => {
    setRecovering(true);
    setRecoverMsg(null);
    const res = await recoverMissingChallengeGames(room.id, activeAccount, sinceISO);
    setRecovering(false);

    if (!res.success) setRecoverMsg(t("chal_recover_error"));
    else if (!res.recovered) setRecoverMsg(t("chal_recover_none"));
    else setRecoverMsg(t("chal_recover_done").replace("{count}", res.recovered));

    if (res.recovered) await fetchAll();
  };

  // Qualquer mudança nos jogos desta sala (nova partida a começar, KDA a
  // atualizar, partida a terminar ou a ganhar dano/cura) — refaz o placar
  // sem precisar de clicar em nada, é o que torna isto "ao vivo". Já não é
  // preciso depois de o desafio terminar (a fotografia em "results" é que
  // manda a partir daí).
  useEffect(() => {
    if (room.status === "finished") return;
    const unsubscribe = subscribeToChallengeGames(room.id, fetchAll);
    return unsubscribe;
  }, [room.id, fetchAll, room.status]);

  // Rede de segurança: se a subscrição em tempo real perder algum evento
  // (rede instável, canal que cai e volta), o placar não tinha nenhuma forma
  // de se corrigir sozinho e ficava preso no último estado recebido — dava a
  // sensação de os dados de uma partida terem "desaparecido" quando na
  // verdade só deixaram de chegar atualizações. Repete o mesmo fetchAll do
  // realtime, só que por tempo, para o placar se corrigir sozinho mesmo que
  // um evento se perca pelo caminho.
  useEffect(() => {
    if (room.status === "finished") return;
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [fetchAll, room.status]);

  const champName = (id) => champions.find((c) => c.id === normalizeChampionId(id, champions))?.name || id;

  const scored = {};
  for (const p of players) {
    const ms = finishedByUsername[p.username] || [];
    const base = ms.length
      ? scorePlayer(ms, { champions, rules: DEFAULT_RULES })
      : { total: 0, games: [], countedGames: 0 };

    // Bónus da partida a decorrer — kills/deaths/assists + streaks (mesma
    // regra de scoreGame, ver sumStreakBonus em challengeScoring.js). Fica
    // de fora o resto da pontuação (dano/cura/multikills): só chega depois
    // de a partida terminar e sincronizar (ver enrichChallengeGame). Sem
    // multiplicador de classe: ainda não sabemos o total final da partida
    // para valer a pena aplicá-lo, e seria só reajustado assim que o jogo
    // terminasse e entrasse em "games".
    const live = liveByUsername[p.username];
    const liveBonus = isGameLive(live)
      ? (live.kills || 0) * SCORE_POINTS.kill +
        (live.deaths || 0) * SCORE_POINTS.death +
        (live.assists || 0) * SCORE_POINTS.assist +
        sumStreakBonus(live.kill_streaks) +
        sumStreakBonus(live.assist_streaks) -
        sumStreakBonus(live.death_streaks)
      : 0;

    scored[p.username] = { ...base, total: base.total + liveBonus };
  }

  const sortedPlayers = [...players].sort(
    (a, b) => (scored[b.username]?.total || 0) - (scored[a.username]?.total || 0)
  );

  // Cor por jogador — atribuída pela ordem de entrada na sala ("players", já
  // vem ordenado por joined_at), NUNCA pela posição no placar: se fosse por
  // rank, a cor de cada um trocava a cada partida em vez de servir para o
  // identificar de relance.
  const colorByUsername = {};
  players.forEach((p, i) => {
    colorByUsername[p.username] = PLAYER_COLORS[i % PLAYER_COLORS.length];
  });

  // "Posição dourada" (medalhas, brilho, banner de vencedor) só faz sentido
  // depois de o desafio acabar de vez — enquanto decorre, ninguém "já
  // ganhou", por isso os jogadores distinguem-se só pela cor.
  const challengeFinished =
    sortedPlayers.length > 0 &&
    sortedPlayers.every((p) => (scored[p.username]?.games?.length || 0) >= targetGames);

  const leader = sortedPlayers[0];

  // Assim que TODOS os jogadores atingem o nº de jogos alvo, o anfitrião
  // persiste o fim do desafio — status "finished" + a fotografia do placar
  // final (ver finishRoom). Mesma convenção do auto-start: só o anfitrião
  // escreve, todos os outros só leem via subscrição à sala. A ref evita
  // escrever duas vezes se este efeito voltar a correr antes de "room.status"
  // chegar via tempo real.
  const finishedRef = useRef(false);
  useEffect(() => {
    if (room.status !== "running" || !challengeFinished) return;
    const isHost = room.host_username === activeAccount;
    if (!isHost || finishedRef.current) return;
    finishedRef.current = true;

    const results = sortedPlayers.map((p, idx) => ({
      username: p.username,
      riot_game_name: p.riot_game_name,
      riot_tag_line: p.riot_tag_line,
      total: Math.round(scored[p.username]?.total || 0),
      games_played: scored[p.username]?.games?.length || 0,
      rank: idx + 1,
    }));

    finishRoom(room.id, { winnerUsername: sortedPlayers[0]?.username, results });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeFinished, room.status, room.id, room.host_username, activeAccount]);

  // Avisa a conquista de vitórias em desafios assim que a PRÓPRIA conta vê a
  // sala já persistida como "finished" com "winner_username" a apontar para
  // ela — em TODOS os clientes (não só o do anfitrião, que é o único que
  // escreve o finishRoom acima), porque quem ganhou pode não ser o anfitrião.
  const notifiedWinRef = useRef(false);
  useEffect(() => {
    if (room.status !== "finished" || room.winner_username !== activeAccount) return;
    if (notifiedWinRef.current) return;
    notifiedWinRef.current = true;
    onChallengeWon?.();
  }, [room.status, room.winner_username, activeAccount, onChallengeWon]);

  return (
    <>
      <div className="riseIn" style={styles.epicCard}>
        <div style={styles.scoreboardHeader}>
          <div>
            <div style={styles.kicker}>
              {challengeFinished ? (
                t("chal_finished")
              ) : (
                <>
                  <span style={styles.liveDot} /> {t("chal_in_progress")}
                </>
              )}
            </div>
            <h2 style={styles.epicTitle}>
              <Trophy size={20} strokeWidth={2.25} />
              {room.name}
            </h2>
          </div>
          <div style={styles.metaPills}>
            <span style={styles.metaPill}>
              <Users size={12} strokeWidth={2.5} />
              <b>{players.length}</b>/{room.max_players}
            </span>
            <span style={styles.metaPill}>
              <Target size={12} strokeWidth={2.5} />
              <b>{room.target_games}</b> {t("chal_games").toLowerCase()}
            </span>
            <span style={styles.metaPill}>
              {room.rules === "basic" ? t("chal_rules_basic") : t("chal_rules_custom")}
            </span>
          </div>
        </div>

        {loaded && challengeFinished && leader && (
          <div style={styles.leaderBanner}>
            <Crown size={15} strokeWidth={2.5} />
            <span>
              <b>
                {leader.riot_game_name && leader.riot_tag_line
                  ? `${leader.riot_game_name}#${leader.riot_tag_line}`
                  : leader.username}
              </b>{" "}
              {t("chal_challenge_winner")}
            </span>
          </div>
        )}

        {!loaded ? (
          <div style={styles.scoreboardLoading}>
            <Loader2 size={16} strokeWidth={2.5} style={styles.spinIcon} /> {t("loading_generic")}
          </div>
        ) : (
          <div style={styles.combatGridWrap}>
            <div style={getCombatGridStyle(players.length)}>
              {sortedPlayers.map((p, idx) => (
                <PlayerCombatCard
                  key={p.username}
                  player={p}
                  rank={idx}
                  color={colorByUsername[p.username]}
                  finished={challengeFinished}
                  isHost={p.username === room.host_username}
                  isSelf={p.username === activeAccount}
                  games={scored[p.username]?.games || []}
                  total={scored[p.username]?.total || 0}
                  liveGame={liveByUsername[p.username]}
                  targetGames={targetGames}
                  DRAGON={DRAGON}
                  champions={champions}
                  champName={champName}
                  t={t}
                />
              ))}
            </div>
            {players.length === 2 && <div style={styles.vsDivider}>VS</div>}
          </div>
        )}

        <div style={styles.scoreboardNote}>{t("chal_scoring_in_progress")}</div>

        {!challengeFinished && <KeepAppOpenNotice />}
        <ScoringRulesInfo />

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button onClick={onLeave} style={styles.ghostBtn}>
            {t("chal_leave")}
          </button>
          {!challengeFinished && (
            <button onClick={handleRecover} disabled={recovering} style={styles.ghostBtn}>
              {recovering ? (
                <>
                  <Loader2 size={13} strokeWidth={2.5} style={styles.spinIcon} /> {t("chal_recovering")}
                </>
              ) : (
                <>
                  <History size={13} strokeWidth={2.25} /> {t("chal_recover_games")}
                </>
              )}
            </button>
          )}
        </div>

        {!challengeFinished && <div style={styles.fieldHint}>{t("chal_recover_hint")}</div>}
        {recoverMsg && <div style={styles.recoverMsg}>{recoverMsg}</div>}
      </div>
    </>
  );
}

// ================= CARD DE COMBATE (por jogador) =================
function PlayerCombatCard({
  player,
  rank,
  color,
  finished,
  isHost,
  isSelf,
  games,
  total,
  liveGame,
  targetGames,
  DRAGON,
  champions,
  champName,
  t,
}) {
  const [expandedIdx, setExpandedIdx] = useState(null);

  const name =
    player.riot_game_name && player.riot_tag_line
      ? `${player.riot_game_name}#${player.riot_tag_line}`
      : player.username;

  const isLive = !finished && isGameLive(liveGame);

  const agg = games.reduce(
    (acc, g) => {
      const m = g.match;
      acc.kills += m.kills || 0;
      acc.deaths += m.deaths || 0;
      acc.assists += m.assists || 0;
      acc.damageDealt += m.damage_dealt || 0;
      acc.damageTaken += m.damage_taken || 0;
      acc.healing += m.healing || 0;
      acc.multikills += (m.double_kills || 0) + (m.triple_kills || 0);
      return acc;
    },
    { kills: 0, deaths: 0, assists: 0, damageDealt: 0, damageTaken: 0, healing: 0, multikills: 0 }
  );

  // Soma o KDA da partida a decorrer por cima das já terminadas — dano/cura/
  // multikills ficam de fora porque a Live Client Data não os expõe ao vivo
  // (só chegam depois de a partida terminar e sincronizar, ver
  // enrichChallengeGame).
  if (isLive) {
    agg.kills += liveGame.kills || 0;
    agg.deaths += liveGame.deaths || 0;
    agg.assists += liveGame.assists || 0;
  }

  const kda = agg.deaths > 0 ? (agg.kills + agg.assists) / agg.deaths : agg.kills + agg.assists;

  const emptyGames = Math.max(0, targetGames - games.length);
  const progressPct = Math.min(100, (games.length / targetGames) * 100);

  return (
    <div
      className="historyCard riseIn"
      style={{
        ...styles.combatCard,
        borderLeft: `3px solid ${color}`,
        ...(isSelf ? styles.combatCardSelf : null),
        ...(finished && rank === 0 ? styles.combatCardLeader : null),
        animationDelay: `${Math.min(rank, 8) * 30}ms`,
      }}
    >
      <div style={styles.combatCardHeader}>
        {finished ? <RankBadge rank={rank} /> : <PlayerColorBadge color={color} />}
        <div style={styles.combatNameBlock}>
          <div style={styles.scorePlayerTop}>
            <div style={styles.playerName}>{name}</div>
            {isHost && (
              <span style={styles.hostTag}>
                <Crown size={10} strokeWidth={2.5} /> {t("chal_host")}
              </span>
            )}
          </div>
          <div style={styles.combatProgressTrack}>
            <div style={{ ...styles.combatProgressFill, width: `${progressPct}%`, background: color }} />
          </div>
          <div style={styles.combatProgressLabel}>
            {games.length}/{targetGames} {t("chal_games").toLowerCase()}
          </div>
        </div>
        <div style={styles.combatScoreBlock}>
          <div style={{ ...styles.combatScoreValue, color: finished ? "var(--accent-text)" : color }}>
            {Math.round(total)}
          </div>
          <div style={styles.combatScoreLabel}>pts</div>
        </div>
      </div>

      {isLive && (
        <div style={styles.liveProgressBadge}>
          {DRAGON && (
            <img
              src={`${DRAGON}/img/champion/${normalizeChampionId(liveGame.champion, champions)}.png`}
              style={styles.liveProgressIcon}
            />
          )}
          <span style={styles.liveDot} />
          <span style={styles.liveProgressLabel}>
            {t("chal_live_now")} {champName(liveGame.champion)}
          </span>
          <span style={styles.liveProgressKda}>
            {liveGame.kills}/{liveGame.deaths}/{liveGame.assists}
          </span>
        </div>
      )}

      <div style={styles.combatStatsGrid}>
        <StatTile icon={Swords} label={t("chal_kills")} value={agg.kills} />
        <StatTile icon={Skull} label={t("chal_deaths")} value={agg.deaths} />
        <StatTile icon={Handshake} label={t("chal_assists")} value={agg.assists} />
        <StatTile icon={Target} label={t("chal_avg_kda")} value={kda.toFixed(2)} />
        <StatTile icon={Flame} label={t("stat_damage_dealt")} value={agg.damageDealt.toLocaleString()} />
        <StatTile icon={Shield} label={t("stat_damage_taken")} value={agg.damageTaken.toLocaleString()} />
        <StatTile icon={HeartPulse} label={t("stat_healing")} value={agg.healing.toLocaleString()} />
        <StatTile icon={Zap} label={t("chal_multikills")} value={agg.multikills} />
      </div>

      <div style={styles.combatGamesList}>
        {games.length === 0 && <div style={styles.combatEmptyNote}>{t("chal_no_games_yet")}</div>}

        {games.map((g, i) => {
          const m = g.match;
          const isOpen = expandedIdx === i;
          return (
            <div key={i} style={styles.combatGameWrap}>
              <button
                type="button"
                onClick={() => setExpandedIdx(isOpen ? null : i)}
                style={{
                  ...styles.combatGameRow,
                  borderColor: m.win ? "rgba(88,199,120,0.5)" : "rgba(226,85,95,0.45)",
                }}
              >
                {DRAGON && (
                  <img
                    src={`${DRAGON}/img/champion/${normalizeChampionId(m.champion, champions)}.png`}
                    style={styles.combatGameIcon}
                  />
                )}
                <div style={styles.combatGameInfo}>
                  <div style={styles.combatGameChamp}>{champName(m.champion)}</div>
                  <div style={styles.combatGameKda}>
                    {m.kills}/{m.deaths}/{m.assists}
                  </div>
                </div>
                <span style={{ ...styles.combatGameBadge, ...(m.win ? styles.badgeWin : styles.badgeLoss) }}>
                  {m.win ? t("chal_win") : t("chal_loss")}
                </span>
                <div style={styles.combatGamePts}>+{Math.round(g.score.total)}</div>
                <ChevronDown
                  size={14}
                  strokeWidth={2.5}
                  style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
                />
              </button>

              {isOpen && (
                <div style={styles.combatGameDetail}>
                  <DetailRow label={t("stat_damage_dealt")} value={(m.damage_dealt || 0).toLocaleString()} />
                  <DetailRow label={t("stat_damage_taken")} value={(m.damage_taken || 0).toLocaleString()} />
                  <DetailRow label={t("stat_healing")} value={(m.healing || 0).toLocaleString()} />
                  {!!(m.double_kills || m.triple_kills) && (
                    <DetailRow
                      label={t("chal_multikills")}
                      value={`${m.double_kills || 0}x2 · ${m.triple_kills || 0}x3`}
                    />
                  )}
                  <DetailRow
                    label={t("chal_points_breakdown")}
                    value={`${Math.round(g.score.base)} × ${g.score.multiplier.toFixed(2)}`}
                  />
                </div>
              )}
            </div>
          );
        })}

        {Array.from({ length: emptyGames }).map((_, i) => (
          <div key={`e${i}`} style={styles.combatGameEmpty}>
            {t("chal_game_pending")}
          </div>
        ))}
      </div>
    </div>
  );
}

// ================= PEQUENA PEÇA DE STAT (grid do card de combate) =================
function StatTile({ icon: Icon, label, value }) {
  return (
    <div style={styles.statTile}>
      <Icon size={13} strokeWidth={2.25} style={styles.statTileIcon} />
      <div style={styles.statTileValue}>{value}</div>
      <div style={styles.statTileLabel}>{label}</div>
    </div>
  );
}

// ================= LINHA DE DETALHE (jogo expandido) =================
function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

// ================= MEDALHA DE POSIÇÃO =================
function RankBadge({ rank }) {
  const styleByRank = [
    { bg: "linear-gradient(135deg, #f5c451, #b8860b)", color: "#3a2a00" },
    { bg: "linear-gradient(135deg, #d8d8e0, #8a8a96)", color: "#26262e" },
    { bg: "linear-gradient(135deg, #d99a63, #8a5a2e)", color: "#2e1c08" },
  ];
  const medal = styleByRank[rank];

  if (medal) {
    return (
      <div style={{ ...styles.rankMedal, background: medal.bg, color: medal.color }}>
        <Trophy size={14} strokeWidth={2.5} />
      </div>
    );
  }
  return <div style={styles.rankPlain}>#{rank + 1}</div>;
}

// ================= IDENTIDADE POR COR (enquanto o desafio decorre) =================
// Substitui a medalha antes de o desafio acabar — ainda não há "posição",
// só a cor que identifica o jogador de relance nos cards e na barra de
// progresso.
function PlayerColorBadge({ color }) {
  return (
    <div style={styles.colorBadgeWrap}>
      <div style={{ ...styles.colorBadge, background: color }} />
    </div>
  );
}

// ================= PAINEL DE CONVITE =================
// Aparece depois de a sala existir (não no formulário): é aqui que se
// partilha o código ou se convida gente diretamente.
function InvitePanel({ room, activeAccount, players }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [invited, setInvited] = useState([]);
  const copyTimer = useRef(null);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const copy = () => {
    navigator.clipboard?.writeText(room.code);
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1800);
  };

  // Mesma pesquisa da tab Comparar (contas que já sincronizaram), com
  // debounce para não disparar um pedido por tecla.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const rows = await searchAccountsByGameName(q);
      if (cancelled) return;
      // Quem já está na sala não precisa de convite.
      const inRoom = new Set(players.map((p) => p.username));
      setResults(dedupeByIdentity(rows).filter((r) => !inRoom.has(r.username)));
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, players]);

  const invite = async (username) => {
    await inviteToRoom(room.id, activeAccount, username);
    setInvited((prev) => [...prev, username]);
  };

  return (
    <div className="riseIn" style={styles.card}>
      <h3 style={styles.sectionTitle}>{t("chal_invite_title")}</h3>

      <div style={styles.codeRow}>
        <div style={styles.code}>{room.code}</div>
        <button onClick={copy} style={styles.ghostBtn}>
          {copied ? (
            <>
              <Check size={13} strokeWidth={2.5} /> {t("chal_copied")}
            </>
          ) : (
            <>
              <Copy size={13} strokeWidth={2.25} /> {t("chal_copy")}
            </>
          )}
        </button>
      </div>
      <div style={styles.fieldHint}>{t("chal_invite_code_hint")}</div>

      <label style={{ ...styles.label, marginTop: 16 }}>{t("chal_invite_direct")}</label>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("chal_invite_search_placeholder")}
        style={styles.input}
        autoComplete="off"
      />

      {results.length > 0 && (
        <div style={styles.results}>
          {results.map((r) => {
            const done = invited.includes(r.username);
            return (
              <div key={r.username} style={styles.resultRow}>
                <span style={styles.playerName}>
                  {r.riot_game_name && r.riot_tag_line
                    ? `${r.riot_game_name}#${r.riot_tag_line}`
                    : r.username}
                </span>
                <button
                  onClick={() => invite(r.username)}
                  disabled={done}
                  style={done ? styles.ghostBtnSmall : styles.smallBtn}
                >
                  {done ? t("chal_invited") : t("chal_invite_btn")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ================= CONVITES RECEBIDOS =================
function InvitesPanel({ invites, onAccept, onDecline }) {
  const { t } = useLanguage();

  return (
    <div className="riseIn" style={{ ...styles.card, borderColor: "rgba(var(--accent-rgb),0.5)" }}>
      <h3 style={styles.sectionTitle}>{t("chal_invites_received")}</h3>
      {invites.map((inv) => (
        <div key={inv.id} style={styles.inviteRow}>
          <div style={styles.inviteText}>
            <b>{inv.from_username}</b> {t("chal_invite_from")} — <b>{inv.challenge_rooms.name}</b>
            <div style={styles.fieldHint}>
              {inv.challenge_rooms.max_players} {t("chal_players").toLowerCase()} ·{" "}
              {inv.challenge_rooms.target_games} {t("chal_games").toLowerCase()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onAccept(inv)} style={styles.smallBtn}>
              {t("chal_accept")}
            </button>
            <button onClick={() => onDecline(inv)} style={styles.ghostBtnSmall}>
              {t("chal_decline")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 16, marginTop: 12 },

  empty: {
    padding: 20,
    marginTop: 12,
    textAlign: "center",
    color: "var(--text-secondary)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-xl)",
  },

  card: {
    background: "var(--panel-bg)",
    backdropFilter: "var(--panel-blur)",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    borderRadius: "var(--radius-2xl)",
    padding: 16,
  },

  title: { color: "var(--accent-text)", margin: "0 0 4px", fontSize: 16 },
  kicker: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "var(--text-muted)",
  },
  intro: { fontSize: 12.5, color: "var(--text-secondary)", margin: "0 0 8px" },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "var(--accent-text)", margin: "0 0 10px" },

  hint: { fontSize: 10.5, color: "var(--text-muted)" },
  fieldHint: { fontSize: 10.5, color: "var(--text-muted)", marginTop: 5, lineHeight: 1.35 },
  error: { fontSize: 11.5, color: "#e2555f", marginTop: 8, fontWeight: 600 },

  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-secondary)",
    marginBottom: 5,
  },

  input: {
    width: "100%",
    padding: 10,
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    color: "var(--text-body)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    fontSize: 13,
  },

  bigChoice: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 118,
    padding: 16,
    borderRadius: "var(--radius-2xl)",
    border: "1px dashed rgba(var(--accent-rgb),0.4)",
    background: "rgba(var(--accent-rgb),0.06)",
    cursor: "pointer",
  },

  bigChoiceHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  bigChoiceTitle: { fontSize: 13.5, fontWeight: 800, color: "var(--text-body)" },

  joinRow: { display: "flex", gap: 8 },

  segRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  seg: {
    minWidth: 40,
    padding: "7px 10px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--border-rgb),0.45)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },
  segActive: {
    background: "var(--accent-gradient)",
    color: "var(--accent-solid-text)",
    borderColor: "transparent",
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
    whiteSpace: "nowrap",
  },

  ghostBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 14px",
    borderRadius: "var(--radius-lg)",
    border: "1px solid rgba(var(--soft-rgb),0.15)",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 12.5,
    whiteSpace: "nowrap",
  },

  smallBtn: {
    padding: "6px 11px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--accent-rgb),0.3)",
    background: "rgba(var(--accent-rgb),0.12)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 700,
  },

  ghostBtnSmall: {
    padding: "6px 11px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--soft-rgb),0.15)",
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: 11.5,
  },

  lobbyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },

  idleHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },

  historyResultsList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 12,
  },

  historyResultRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.6)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  lobbyMeta: {
    display: "flex",
    gap: 12,
    fontSize: 11.5,
    color: "var(--text-secondary)",
    flexWrap: "wrap",
  },

  playerList: { display: "flex", flexDirection: "column", gap: 6 },

  playerRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 11px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  playerRowEmpty: {
    borderStyle: "dashed",
    opacity: 0.45,
    justifyContent: "center",
  },

  playerName: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--text-body)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  hostTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 9.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "var(--accent-text)",
  },

  statusLine: {
    marginTop: 12,
    fontSize: 11.5,
    fontWeight: 600,
    color: "var(--text-secondary)",
  },

  realtimeHint: { color: "var(--text-muted)", fontWeight: 500 },

  codeRow: { display: "flex", alignItems: "center", gap: 10 },

  code: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    border: "1px solid rgba(var(--accent-rgb),0.35)",
    color: "var(--accent-text)",
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: 6,
    textAlign: "center",
    fontFamily: "Cinzel, serif",
  },

  results: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 8,
  },

  resultRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  inviteRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  inviteText: { fontSize: 12, color: "var(--text-body)", minWidth: 0 },

  playerCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 20,
    borderRadius: "var(--radius-xl)",
    background: "linear-gradient(135deg, rgba(var(--accent-rgb),0.08), rgba(var(--panel-deep-rgb),0.9))",
    border: "1.5px solid rgba(var(--accent-rgb),0.3)",
    minHeight: 140,
  },

  playerCardEmpty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 20,
    borderRadius: "var(--radius-xl)",
    background: "rgba(var(--panel-deep-rgb),0.5)",
    border: "1.5px dashed rgba(var(--border-rgb),0.3)",
    minHeight: 140,
    color: "var(--text-muted)",
    fontSize: 20,
    fontWeight: 700,
  },

  playerAvatar: {
    width: 56,
    height: 56,
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--accent-rgb),0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  playerInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    textAlign: "center",
  },

  playerCardName: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text-body)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  },

  playerCardBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    color: "var(--accent-text)",
    padding: "3px 7px",
    background: "rgba(var(--accent-rgb),0.15)",
    borderRadius: "var(--radius-md)",
  },

  vsDivider: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: 14,
    fontWeight: 900,
    color: "var(--accent-text)",
    background: "rgba(var(--panel-rgb),0.95)",
    padding: "6px 12px",
    borderRadius: "var(--radius-md)",
    border: "1.5px solid rgba(var(--accent-rgb),0.4)",
    letterSpacing: 1.5,
  },

  epicCard: {
    background: "linear-gradient(165deg, rgba(var(--panel-rgb),0.95), rgba(var(--panel-deep-rgb),0.98))",
    border: "1px solid rgba(var(--accent-rgb),0.28)",
    borderRadius: "var(--radius-2xl)",
    padding: "18px 20px 20px",
    boxShadow: "0 10px 34px rgba(0,0,0,0.28)",
  },

  scoreboardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },

  epicTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "var(--accent-text)",
    margin: "2px 0 0",
    fontSize: 20,
    fontWeight: 800,
  },

  metaPills: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignSelf: "flex-start",
  },

  metaPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-secondary)",
    padding: "5px 10px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  leaderBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12.5,
    color: "#f5c451",
    background: "linear-gradient(90deg, rgba(245,196,81,0.14), rgba(245,196,81,0.02))",
    border: "1px solid rgba(245,196,81,0.3)",
    borderRadius: "var(--radius-lg)",
    padding: "9px 14px",
    marginBottom: 16,
  },

  combatGridWrap: {
    position: "relative",
    marginBottom: 12,
  },

  combatCard: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
    borderRadius: "var(--radius-xl)",
    background: "rgba(var(--panel-deep-rgb),0.75)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  combatCardSelf: {
    borderColor: "rgba(var(--accent-rgb),0.5)",
    background: "linear-gradient(180deg, rgba(var(--accent-rgb),0.08), rgba(var(--panel-deep-rgb),0.85))",
  },

  combatCardLeader: {
    borderColor: "rgba(245,196,81,0.5)",
    animation: "leaderGlow 2.4s ease-in-out infinite",
  },

  combatCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  rankMedal: {
    width: 30,
    height: 30,
    minWidth: 30,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
  },

  rankPlain: {
    width: 30,
    height: 30,
    minWidth: 30,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 800,
    color: "var(--text-muted)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  colorBadgeWrap: {
    width: 30,
    height: 30,
    minWidth: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  colorBadge: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    boxShadow: "0 0 0 3px rgba(var(--panel-deep-rgb),0.9), 0 0 0 4px rgba(255,255,255,0.08)",
  },

  combatNameBlock: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  scorePlayerTop: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  combatProgressTrack: {
    width: "100%",
    height: 5,
    borderRadius: 3,
    background: "rgba(var(--border-rgb),0.35)",
    overflow: "hidden",
  },

  combatProgressFill: {
    height: "100%",
    borderRadius: 3,
    background: "var(--accent-gradient)",
    transition: "width 0.3s ease",
  },

  combatProgressLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--text-muted)",
  },

  combatScoreBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    minWidth: 52,
  },

  combatScoreValue: {
    fontSize: 20,
    fontWeight: 900,
    color: "var(--accent-text)",
    textAlign: "right",
    lineHeight: 1.1,
  },

  combatScoreLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  combatStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 6,
  },

  statTile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "8px 4px",
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-rgb),0.55)",
    border: "1px solid rgba(var(--border-rgb),0.3)",
  },

  statTileIcon: { color: "var(--accent-text)" },

  statTileValue: {
    fontSize: 13,
    fontWeight: 800,
    color: "var(--text-body)",
  },

  statTileLabel: {
    fontSize: 8.5,
    fontWeight: 600,
    color: "var(--text-muted)",
    textAlign: "center",
    lineHeight: 1.2,
  },

  combatGamesList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  combatEmptyNote: {
    fontSize: 11,
    color: "var(--text-muted)",
    fontStyle: "italic",
    padding: "6px 0",
  },

  combatGameWrap: {
    display: "flex",
    flexDirection: "column",
  },

  combatGameRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "6px 8px",
    borderRadius: "var(--radius-md)",
    border: "1.5px solid",
    background: "rgba(var(--panel-rgb),0.55)",
    cursor: "pointer",
    textAlign: "left",
    color: "inherit",
    font: "inherit",
  },

  combatGameIcon: {
    width: 24,
    height: 24,
    borderRadius: "var(--radius-sm, 5px)",
    objectFit: "cover",
    flexShrink: 0,
  },

  combatGameInfo: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 1,
  },

  combatGameChamp: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "var(--text-body)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  combatGameKda: {
    fontSize: 10,
    color: "var(--text-muted)",
  },

  combatGameBadge: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    padding: "2px 6px",
    borderRadius: "var(--radius-sm, 5px)",
  },

  badgeWin: { color: "#58c778", background: "rgba(88,199,120,0.14)" },
  badgeLoss: { color: "#e2555f", background: "rgba(226,85,95,0.14)" },

  combatGamePts: {
    fontSize: 11.5,
    fontWeight: 800,
    color: "var(--accent-text)",
    minWidth: 34,
    textAlign: "right",
  },

  combatGameDetail: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "8px 10px",
    marginTop: 2,
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-deep-rgb),0.6)",
    border: "1px solid rgba(var(--border-rgb),0.3)",
  },

  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 10.5,
  },

  detailLabel: { color: "var(--text-muted)" },
  detailValue: { color: "var(--text-body)", fontWeight: 700 },

  combatGameEmpty: {
    padding: "6px 8px",
    borderRadius: "var(--radius-md)",
    border: "1.5px dashed rgba(var(--border-rgb),0.35)",
    color: "var(--text-muted)",
    fontSize: 10.5,
    fontStyle: "italic",
    textAlign: "center",
  },

  scoreboardLoading: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "18px 0",
    fontSize: 12,
    color: "var(--text-secondary)",
  },

  scoreboardNote: {
    fontSize: 11,
    color: "var(--text-muted)",
    fontStyle: "italic",
    marginBottom: 12,
  },

  keepOpenNotice: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "9px 12px",
    marginTop: 10,
    borderRadius: "var(--radius-lg)",
    background: "rgba(251,191,36,0.1)",
    border: "1px solid rgba(251,191,36,0.3)",
    fontSize: 11,
    lineHeight: 1.45,
    color: "var(--text-secondary)",
  },

  keepOpenIcon: {
    flexShrink: 0,
    marginTop: 1,
    color: "#fbbf24",
  },

  scoringInfoWrap: {
    marginTop: 8,
  },

  scoringInfoToggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 0",
    border: "none",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 700,
  },

  scoringInfoBody: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    padding: "10px 12px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
  },

  scoringInfoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    fontSize: 11,
  },

  scoringInfoLabel: {
    color: "var(--text-secondary)",
  },

  scoringInfoValue: {
    color: "var(--accent-text)",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  scoringInfoNote: {
    fontSize: 10.5,
    color: "var(--text-muted)",
    lineHeight: 1.4,
    marginTop: 4,
    paddingTop: 8,
    borderTop: "1px solid rgba(var(--border-rgb),0.35)",
  },

  recoverMsg: {
    fontSize: 11.5,
    fontWeight: 600,
    color: "var(--accent-text)",
    marginTop: 8,
  },

  scoringInfoSubheader: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "var(--text-muted)",
    marginTop: 6,
    paddingTop: 8,
    borderTop: "1px solid rgba(var(--border-rgb),0.35)",
  },

  liveDot: {
    display: "inline-block",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#58c778",
    marginRight: 5,
    animation: "livePulse 1.6s ease-in-out infinite",
  },

  liveProgressBadge: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "7px 10px",
    marginBottom: 10,
    borderRadius: "var(--radius-lg)",
    background: "rgba(88,199,120,0.1)",
    border: "1px solid rgba(88,199,120,0.35)",
  },

  liveProgressIcon: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    flexShrink: 0,
  },

  liveProgressLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: 700,
    color: "#58c778",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  liveProgressKda: {
    fontSize: 11,
    fontWeight: 800,
    color: "var(--text-body)",
  },

  statusStarting: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: "var(--accent-text)",
  },

  spinIcon: {
    animation: "spin 0.9s linear infinite",
  },

  stepperRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--border-rgb),0.45)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    color: "var(--accent-text)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  stepperBtnDisabled: {
    opacity: 0.35,
    cursor: "not-allowed",
  },

  stepperValue: {
    minWidth: 34,
    textAlign: "center",
    fontSize: 18,
    fontWeight: 800,
    color: "var(--text-body)",
  },
};
