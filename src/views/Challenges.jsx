import { useCallback, useEffect, useRef, useState } from "react";
import { Users, Plus, Minus, LogIn, Copy, Check, Crown, Trophy, Loader2 } from "lucide-react";
import { useLanguage } from "../lib/i18n";
import Loading from "../components/Loading";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  createRoom,
  joinRoom,
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
  getRoomMatchesForPlayers,
  subscribeToMatches,
} from "../db/api";
import { scorePlayer } from "../lib/challengeScoring";
import { normalizeChampionId } from "../lib/champions";

const PLAYER_OPTIONS = [2, 3, 4, 6, 8];
const MIN_GAMES = 1;
const MAX_GAMES = 10;

// idle = escolher entre criar/entrar · creating = formulário · lobby = já numa sala
export default function Challenges({ activeAccount, accounts, matches = [], champions = [], DRAGON }) {
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
    const unsubscribe = subscribeToRoom(room.id, async () => {
      const [freshPlayers, mine] = await Promise.all([
        getRoomPlayers(room.id),
        getMyActiveRoom(activeAccount),
      ]);

      // A sala desapareceu (o host desfê-la) — volta ao início em vez de
      // ficar preso num lobby que já não existe.
      if (!mine) {
        setRoom(null);
        setPlayers([]);
        setScreen("idle");
        return;
      }
      setRoom(mine);
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
    await leaveRoom(room.id, activeAccount);
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
          error={error}
          busy={busy}
        />
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
          matches={matches}
          champions={champions}
          DRAGON={DRAGON}
        />
      )}
    </div>
  );
}

// ================= ECRÃ INICIAL =================
function IdleScreen({ onCreate, onJoin, error, busy }) {
  const { t } = useLanguage();
  const [code, setCode] = useState("");

  return (
    <>
      <div style={styles.card}>
        <h2 style={styles.title}>{t("chal_page_title")}</h2>
        <p style={styles.intro}>{t("chal_intro")}</p>
        <div style={styles.hint}>{t("chal_soon_scoring")}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={onCreate} style={styles.bigChoice} className="clickableCard">
          <Plus size={22} strokeWidth={2.25} color="var(--accent-text)" />
          <span style={styles.bigChoiceTitle}>{t("chal_create_room")}</span>
        </button>

        <div style={styles.card}>
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
    <div style={styles.card}>
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
function Lobby({ room, players, activeAccount, onLeave, onClose, matches, champions, DRAGON }) {
  const { t } = useLanguage();
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const isHost = room.host_username === activeAccount;
  const full = players.length >= room.max_players;

  const emptySlots = Math.max(0, room.max_players - players.length);

  const handleStart = useCallback(async () => {
    setBusy(true);
    await startRoom(room.id);
    setBusy(false);
  }, [room.id]);

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

  // Se o desafio já começou, mostra o painel de pontuações
  if (room.status === "running") {
    return (
      <ScoreBoard
        room={room}
        players={players}
        activeAccount={activeAccount}
        onLeave={onLeave}
        matches={matches}
        champions={champions}
        DRAGON={DRAGON}
      />
    );
  }

  return (
    <>
      <div style={styles.card}>
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
function PlayerCard({ player, isHost, hostText }) {
  const name = player
    ? player.riot_game_name && player.riot_tag_line
      ? `${player.riot_game_name}#${player.riot_tag_line}`
      : player.username
    : "—";

  return (
    <div style={player ? styles.playerCard : styles.playerCardEmpty}>
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

// ================= PAINEL DE PONTUAÇÕES (Em Curso) =================
// Vai buscar diretamente à base de dados as partidas de TODOS os jogadores da
// sala (não só as da conta ativa neste dispositivo — "matches" é aberta, ver
// db/rooms.js) e mantém-se em tempo real via subscrição a novas partidas.
function ScoreBoard({ room, players, activeAccount, onLeave, matches = [], champions = [], DRAGON }) {
  const { t } = useLanguage();
  const [playerMatches, setPlayerMatches] = useState({});
  const [loaded, setLoaded] = useState(false);

  const targetGames = room?.target_games || MAX_GAMES;
  const sinceISO = room?.started_at || new Date().toISOString();
  const usernames = players.map((p) => p.username);
  const usernamesKey = usernames.join(",");

  const fetchAll = useCallback(async () => {
    const rows = await getRoomMatchesForPlayers(usernames, sinceISO);
    const grouped = {};
    for (const u of usernames) grouped[u] = [];
    for (const row of rows) {
      (grouped[row.username] ||= []).push(row);
    }
    for (const u of usernames) grouped[u] = grouped[u].slice(0, targetGames);
    setPlayerMatches(grouped);
    setLoaded(true);
  }, [usernamesKey, sinceISO, targetGames]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Nova partida de qualquer conta da sala — refaz o placar sem precisar de
  // clicar em nada, é o que torna isto "ao vivo".
  useEffect(() => {
    const unsubscribe = subscribeToMatches((payload) => {
      if (usernames.includes(payload?.new?.username)) fetchAll();
    });
    return unsubscribe;
  }, [usernamesKey, fetchAll]);

  // A própria conta pode ter uma partida otimista em "matches" (App.jsx) uns
  // instantes antes de a base de dados a confirmar de volta — evita esperar
  // pelo round-trip para ver o próprio resultado aparecer.
  useEffect(() => {
    if (!activeAccount) return;
    const sinceTime = new Date(sinceISO).getTime();
    const own = matches
      .filter((m) => m.created_at && new Date(m.created_at).getTime() >= sinceTime)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(0, targetGames);

    setPlayerMatches((prev) => {
      if (own.length <= (prev[activeAccount]?.length || 0)) return prev;
      return { ...prev, [activeAccount]: own };
    });
  }, [matches, activeAccount, sinceISO, targetGames]);

  const champName = (id) => champions.find((c) => c.id === normalizeChampionId(id, champions))?.name || id;

  const scored = {};
  for (const p of players) {
    const ms = playerMatches[p.username] || [];
    scored[p.username] = ms.length
      ? scorePlayer(ms, { champions, rules: {} })
      : { total: 0, games: [], countedGames: 0 };
  }

  const sortedPlayers = [...players].sort(
    (a, b) => (scored[b.username]?.total || 0) - (scored[a.username]?.total || 0)
  );

  return (
    <>
      <div style={styles.card}>
        <div style={styles.scoreboardHeader}>
          <div>
            <div style={styles.kicker}>
              <span style={styles.liveDot} /> {t("chal_in_progress")}
            </div>
            <h2 style={styles.title}>{room.name}</h2>
          </div>
          <div style={styles.scoreboardMeta}>
            <span>
              <b>{players.length}</b>/{room.max_players} {t("chal_players").toLowerCase()}
            </span>
            <span>
              <b>{room.target_games}</b> {t("chal_games").toLowerCase()}
            </span>
          </div>
        </div>

        {!loaded ? (
          <div style={styles.scoreboardLoading}>
            <Loader2 size={16} strokeWidth={2.5} style={styles.spinIcon} /> {t("loading_generic")}
          </div>
        ) : (
          <div style={styles.scoreboardGrid}>
            {sortedPlayers.map((p, idx) => {
              const games = scored[p.username]?.games || [];
              const emptyGames = Math.max(0, targetGames - games.length);
              return (
                <div key={p.username} style={styles.scoreRow}>
                  <RankBadge rank={idx} />
                  <div style={styles.scorePlayer}>
                    <div style={styles.scorePlayerTop}>
                      <div style={styles.playerName}>
                        {p.riot_game_name && p.riot_tag_line
                          ? `${p.riot_game_name}#${p.riot_tag_line}`
                          : p.username}
                      </div>
                      {p.username === room.host_username && (
                        <span style={styles.hostTag}>
                          <Crown size={10} strokeWidth={2.5} /> {t("chal_host")}
                        </span>
                      )}
                    </div>

                    <div style={styles.champStrip}>
                      {games.map((g, i) => (
                        <div
                          key={i}
                          style={{
                            ...styles.champChip,
                            borderColor: g.match.win ? "rgba(88,199,120,0.55)" : "rgba(226,85,95,0.5)",
                          }}
                          title={`${champName(g.match.champion)} · ${g.match.kills}/${g.match.deaths}/${g.match.assists} · ${Math.round(g.score.total)} pts`}
                        >
                          {DRAGON && (
                            <img
                              src={`${DRAGON}/img/champion/${normalizeChampionId(g.match.champion, champions)}.png`}
                              style={styles.champChipIcon}
                            />
                          )}
                        </div>
                      ))}
                      {Array.from({ length: emptyGames }).map((_, i) => (
                        <div key={`e${i}`} style={styles.champChipEmpty} />
                      ))}
                    </div>
                  </div>

                  <div style={styles.scoreValueWrap}>
                    <div style={styles.scoreValue}>{Math.round(scored[p.username]?.total || 0)}</div>
                    <div style={styles.scoreValueSub}>
                      {games.length}/{targetGames}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={styles.scoreboardNote}>{t("chal_scoring_in_progress")}</div>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={onLeave} style={styles.ghostBtn}>
            {t("chal_leave")}
          </button>
        </div>
      </div>
    </>
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
      setResults(rows.filter((r) => !inRoom.has(r.username)));
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
    <div style={styles.card}>
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
    <div style={{ ...styles.card, borderColor: "rgba(var(--accent-rgb),0.5)" }}>
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
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.92), rgba(var(--panel-deep-rgb),0.96))",
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

  scoreboardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },

  scoreboardMeta: {
    display: "flex",
    gap: 12,
    fontSize: 11.5,
    color: "var(--text-secondary)",
    flexWrap: "wrap",
  },

  scoreboardGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
  },

  scoreRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
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

  scorePlayer: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  scorePlayerTop: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  champStrip: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
  },

  champChip: {
    width: 22,
    height: 22,
    borderRadius: "var(--radius-sm, 5px)",
    overflow: "hidden",
    border: "1.5px solid",
    background: "rgba(var(--panel-deep-rgb),0.9)",
  },

  champChipIcon: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  champChipEmpty: {
    width: 22,
    height: 22,
    borderRadius: "var(--radius-sm, 5px)",
    border: "1.5px dashed rgba(var(--border-rgb),0.4)",
    opacity: 0.5,
  },

  scoreValueWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    minWidth: 52,
  },

  scoreValue: {
    fontSize: 16,
    fontWeight: 800,
    color: "var(--accent-text)",
    textAlign: "right",
    lineHeight: 1.1,
  },

  scoreValueSub: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--text-muted)",
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

  liveDot: {
    display: "inline-block",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#58c778",
    marginRight: 5,
    animation: "livePulse 1.6s ease-in-out infinite",
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
