import { useEffect, useState } from "react";
import { Check, Loader2, Plus, Search, UserPlus, X, Zap } from "lucide-react";
import { useLanguage } from "../lib/i18n";
import { searchAccountsByGameName } from "../db/api";
import { dedupeByIdentity, recentRivals, rivalDisplayName, rivalInitials } from "../lib/challengeRivals";
import { ICON_STROKE } from "../lib/ui";

// ================= CONVITES (rápidos + pesquisa) =================
// Convidar alguém era sempre o mesmo trabalho: escrever o nome de cor, letra
// a letra, numa caixa de pesquisa. Na prática os desafios repetem-se com as
// MESMAS pessoas, por isso o que faltava era a lista de quem já jogou contigo
// — um clique por pessoa (ver recentRivals em lib/challengeRivals.js, tirado
// do histórico que a aba já lê).
//
// Dois modos, porque há dois momentos diferentes para convidar:
//  - "select": AINDA NÃO existe sala (assistente de criação). Aqui só se
//    junta gente a uma lista; os convites só saem depois de a sala existir,
//    porque um convite precisa do room_id (ver inviteToRoom).
//  - "send": a sala já existe (lobby). Cada clique envia o convite logo.
export default function ChallengeInvitePicker({
  activeAccount,
  history = [],
  excludeUsernames = [],
  mode = "send",
  selected = [],
  onToggle,
  onInvite,
  slotsLeft = null,
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  // O que a pesquisa devolveu, SEM filtrar por quem já está na sala: quem
  // excluir é decisão de render, não da busca (ver "results" mais abaixo).
  // Isto não é arrumação: "excludeUsernames" chega como um array novo a cada
  // render do pai, e filtrar dentro do efeito obrigava-o a depender dele —
  // o efeito voltava a correr a cada render, punha estado novo, provocava
  // outro render, e a aba ficava a renderizar em ciclo sem ninguém tocar em
  // nada.
  const [found, setFound] = useState([]);
  // A pesquisa que os "found" em cima representam. Guardar isto (em vez de
  // um "a procurar?" à parte) deixa o estado de espera ser DERIVADO: o que
  // está escrito ainda não é o que está respondido. Com um booleano próprio,
  // havia dois estados a ter de concordar um com o outro.
  const [resolvedQuery, setResolvedQuery] = useState("");
  // Modo "send": quem já recebeu convite nesta sessão de ecrã. Em "select" a
  // lista é do pai (prop "selected"), que é quem a vai usar depois de criar.
  const [sent, setSent] = useState([]);

  const excluded = new Set(excludeUsernames);
  const chosen = mode === "select" ? selected : sent;
  const full = slotsLeft != null && chosen.length >= slotsLeft;

  const rivals = recentRivals(history, activeAccount).filter((r) => !excluded.has(r.username));
  const results = found.filter((r) => !excluded.has(r.username));

  const trimmed = query.trim();
  const searching = trimmed.length >= 2 && resolvedQuery !== trimmed;

  // Mesma pesquisa da tab Comparar (contas que já sincronizaram), com
  // debounce para não disparar um pedido por tecla. Só depende do que está
  // escrito — ver a nota em "found".
  useEffect(() => {
    const q = query.trim();
    let cancelled = false;

    const timer = setTimeout(async () => {
      const rows = q.length < 2 ? [] : await searchAccountsByGameName(q);
      if (cancelled) return;
      setFound(dedupeByIdentity(rows));
      setResolvedQuery(q);
    }, q.length < 2 ? 0 : 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const pick = async (entry) => {
    const username = entry.username;
    if (mode === "select") {
      onToggle?.(username);
      return;
    }
    if (sent.includes(username)) return;
    setSent((prev) => [...prev, username]);
    await onInvite?.(username);
  };

  const isChosen = (username) => chosen.includes(username);

  return (
    <div>
      {rivals.length > 0 && (
        <>
          <div style={styles.label}>
            <Zap size={12} strokeWidth={ICON_STROKE} /> {t("chal_quick_invites")}
          </div>
          <div style={styles.chipRow}>
            {rivals.map((r, i) => {
              const picked = isChosen(r.username);
              return (
                <button
                  key={r.username}
                  type="button"
                  onClick={() => pick(r)}
                  disabled={!picked && full}
                  className="at-chal-rival riseIn"
                  style={{
                    ...styles.rivalChip,
                    ...(picked ? styles.rivalChipOn : null),
                    animationDelay: `${Math.min(i, 8) * 25}ms`,
                  }}
                  title={rivalDisplayName(r)}
                >
                  <span style={{ ...styles.avatar, ...(picked ? styles.avatarOn : null) }}>
                    {rivalInitials(r)}
                  </span>
                  <span style={styles.rivalText}>
                    <span style={styles.rivalName}>{rivalDisplayName(r)}</span>
                    <span style={styles.rivalMeta}>
                      {r.challenges} {t(r.challenges === 1 ? "chal_one_challenge" : "chal_many_challenges")}
                    </span>
                  </span>
                  <span style={{ ...styles.chipAction, ...(picked ? styles.chipActionOn : null) }}>
                    {picked ? <Check size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div style={{ ...styles.label, marginTop: rivals.length ? 14 : 0 }}>
        <Search size={12} strokeWidth={ICON_STROKE} />{" "}
        {rivals.length ? t("chal_invite_search_more") : t("chal_invite_direct")}
      </div>
      <div style={styles.searchWrap}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("chal_invite_search_placeholder")}
          style={styles.input}
          autoComplete="off"
        />
        {searching && <Loader2 size={14} strokeWidth={ICON_STROKE} style={styles.searchSpin} />}
      </div>

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <div style={styles.emptyNote}>{t("chal_invite_no_results")}</div>
      )}

      {results.length > 0 && (
        <div style={styles.results}>
          {results.map((r, i) => {
            const picked = isChosen(r.username);
            const entry = {
              username: r.username,
              riotGameName: r.riot_game_name,
              riotTagLine: r.riot_tag_line,
            };
            return (
              <div
                key={r.username}
                className="riseIn"
                style={{ ...styles.resultRow, animationDelay: `${Math.min(i, 8) * 25}ms` }}
              >
                <span style={styles.avatar}>{rivalInitials(entry)}</span>
                <span style={styles.resultName}>{rivalDisplayName(entry)}</span>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  disabled={picked || (!picked && full)}
                  style={picked ? styles.doneBtn : styles.addBtn}
                >
                  {picked ? (
                    <>
                      <Check size={12} strokeWidth={3} />{" "}
                      {mode === "select" ? t("chal_added") : t("chal_invited")}
                    </>
                  ) : (
                    <>
                      <UserPlus size={12} strokeWidth={ICON_STROKE} />{" "}
                      {mode === "select" ? t("chal_add") : t("chal_invite_btn")}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Só no assistente: a lista do que vai sair assim que a sala existir.
          No lobby o convite já foi enviado e o chip fica com o visto. */}
      {mode === "select" && selected.length > 0 && (
        <div style={styles.selectedBox}>
          <div style={styles.selectedTitle}>
            {selected.length === 1
              ? t("chal_invites_ready_one")
              : t("chal_invites_ready").replace("{count}", selected.length)}
          </div>
          <div style={styles.chipRow}>
            {selected.map((username) => (
              <button
                key={username}
                type="button"
                onClick={() => onToggle?.(username)}
                style={styles.selectedChip}
                title={t("chal_remove")}
              >
                {username}
                <X size={11} strokeWidth={3} />
              </button>
            ))}
          </div>
        </div>
      )}

      {full && <div style={styles.emptyNote}>{t("chal_invite_slots_full")}</div>}
    </div>
  );
}

const styles = {
  label: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-secondary)",
    marginBottom: 7,
  },

  chipRow: { display: "flex", flexWrap: "wrap", gap: 6 },

  rivalChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 9px 6px 6px",
    borderRadius: "var(--radius-pill)",
    border: "1px solid rgba(var(--border-rgb),0.45)",
    background: "rgba(var(--panel-deep-rgb),0.8)",
    color: "var(--text-body)",
    cursor: "pointer",
    maxWidth: 230,
  },

  rivalChipOn: {
    borderColor: "rgba(var(--accent-rgb),0.7)",
    background: "rgba(var(--accent-rgb),0.14)",
  },

  avatar: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    flexShrink: 0,
    borderRadius: "50%",
    background: "rgba(var(--soft-rgb),0.1)",
    color: "var(--text-secondary)",
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: 0.2,
  },

  avatarOn: {
    background: "var(--accent-gradient)",
    color: "var(--accent-solid-text)",
  },

  rivalText: { display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 },

  rivalName: {
    fontSize: 11.5,
    fontWeight: 700,
    maxWidth: 150,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  rivalMeta: { fontSize: 9.5, color: "var(--text-muted)", fontWeight: 600 },

  chipAction: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    flexShrink: 0,
    borderRadius: "50%",
    background: "rgba(var(--soft-rgb),0.1)",
    color: "var(--text-secondary)",
  },

  chipActionOn: { background: "rgba(var(--accent-rgb),0.25)", color: "var(--accent-text)" },

  searchWrap: { position: "relative" },

  input: {
    width: "100%",
    padding: 10,
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    color: "var(--text-body)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    fontSize: 13,
  },

  searchSpin: {
    position: "absolute",
    right: 10,
    top: "50%",
    marginTop: -7,
    color: "var(--accent-text)",
    animation: "spin 0.9s linear infinite",
  },

  results: { display: "flex", flexDirection: "column", gap: 6, marginTop: 8 },

  resultRow: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "7px 10px",
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  resultName: {
    flex: 1,
    minWidth: 0,
    fontSize: 12.5,
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  addBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 11px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--accent-rgb),0.3)",
    background: "rgba(var(--accent-rgb),0.12)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  doneBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 11px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "default",
    fontSize: 11.5,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  selectedBox: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--accent-rgb),0.07)",
    border: "1px solid rgba(var(--accent-rgb),0.3)",
  },

  selectedTitle: {
    fontSize: 11,
    fontWeight: 800,
    color: "var(--accent-text)",
    marginBottom: 7,
  },

  selectedChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "4px 8px",
    borderRadius: "var(--radius-pill)",
    border: "1px solid rgba(var(--accent-rgb),0.35)",
    background: "rgba(var(--panel-deep-rgb),0.7)",
    color: "var(--text-body)",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },

  emptyNote: { fontSize: 10.5, color: "var(--text-muted)", marginTop: 7 },
};
