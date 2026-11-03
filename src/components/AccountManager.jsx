import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  AlertTriangle,
  ChevronDown,
  Pencil,
  Trash2,
  UserPlus,
  Plus,
} from "lucide-react";
import Tooltip from "./Tooltip";
import ConfirmDialog from "./ConfirmDialog";
import RiotIdGuide from "./RiotIdGuide";
import { useLanguage } from "../lib/i18n";
import { FALLBACK_REGIONS, parseRiotId } from "../lib/riotTags";

// Nomes curtos do servidor para a leitura em tempo real do Riot ID. Os do
// FALLBACK_REGIONS trazem a lista de tags entre parênteses ("Europa (EUW,
// EUNE, TR, RU)"), que ali ajuda a escolher à mão mas não cabe numa etiqueta
// a dizer o que já foi percebido.
const REGION_SHORT = {
  europe: "region_short_europe",
  americas: "region_short_americas",
  asia: "region_short_asia",
  sea: "region_short_sea",
};

export default function AccountManager({
  accounts,
  activeAccount,
  onSwitch,
  onCreate,
  onUpdateRiotAccount,
  onDelete,
}) {
  const { t } = useLanguage();
  const [showCreate, setShowCreate] = useState(accounts.length === 0);

  // ---- FORMULÁRIO DE LIGAR CONTA ----
  //
  // Um campo, não três. Antes pedia-se o nome na app, o nome Riot e a tag num
  // menu — três decisões antes de conseguir carregar em Criar, duas delas
  // sobre a mesma coisa (nome na app vs. nome Riot) e a terceira marcada como
  // "opcional" quando é dela que depende tudo o que a app faz.
  //
  // Agora pede-se o Riot ID inteiro, como está no cliente do jogo e como se
  // copia: "Nome#EUW". O parseRiotId parte-o, decide o servidor pela tag, e o
  // que fica no ecrã é a app a dizer o que entendeu. O nome na app passou a
  // ser detalhe (fica igual ao nome Riot), escondido em "Mais opções" para
  // quem tem mais do que uma conta.
  const [newRiotId, setNewRiotId] = useState("");
  const [newRegion, setNewRegion] = useState("europe");
  const [newLabel, setNewLabel] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [createError, setCreateError] = useState(null);
  // A ajuda abre sozinha para a primeira conta: quem está a ligar a primeira
  // é precisamente quem nunca procurou o Riot ID. A partir daí fica fechada.
  const [guideOpen, setGuideOpen] = useState(accounts.length === 0);

  const parsed = parseRiotId(newRiotId);
  const effectiveLabel = newLabel.trim() || parsed.gameName;
  const typedSomething = newRiotId.trim().length > 0;

  // ---- EDIÇÃO DE UMA CONTA JÁ LIGADA ----
  const [editingUsername, setEditingUsername] = useState(null);
  const [editRiotId, setEditRiotId] = useState("");
  const [editRegion, setEditRegion] = useState("europe");

  const editParsed = parseRiotId(editRiotId);

  const startEdit = (acc) => {
    setEditingUsername(acc.username);
    // Volta a montar o ID como ele é visto no jogo — é esse que a pessoa sabe
    // comparar com o que tem à frente, não um nome e uma tag em campos
    // separados.
    setEditRiotId(
      acc.riotAccount ? `${acc.riotAccount}${acc.riotTag ? `#${acc.riotTag}` : ""}` : ""
    );
    setEditRegion(acc.region || "europe");
  };

  const saveEdit = () => {
    const { gameName, tagLine, region, knownTag } = editParsed;
    onUpdateRiotAccount(editingUsername, {
      riotAccount: gameName,
      riotTag: tagLine,
      // Tag conhecida decide o servidor; nas outras vale o que ficou escolhido
      // no menu que aparece só nesse caso.
      region: knownTag ? region : editRegion,
    });
    setEditingUsername(null);
  };

  const resetCreate = () => {
    setNewRiotId("");
    setNewLabel("");
    setNewRegion("europe");
    setShowMore(false);
    setCreateError(null);
  };

  const handleCreate = () => {
    if (!effectiveLabel) {
      setCreateError(t("create_err_empty"));
      return;
    }
    // Duas contas com a mesma etiqueta eram aceites em silêncio e a segunda
    // limitava-se a saltar para a primeira (ver createAccountFromManager) —
    // parecia que o botão não tinha feito nada. Agora diz-se, e abre-se a
    // secção onde o problema se resolve.
    if (accounts.some((a) => a.username === effectiveLabel)) {
      setCreateError(t("create_err_duplicate").replace("{name}", effectiveLabel));
      setShowMore(true);
      return;
    }

    onCreate(
      effectiveLabel,
      parsed.gameName,
      parsed.tagLine,
      parsed.knownTag ? parsed.region : newRegion
    );
    resetCreate();
    setShowCreate(false);
  };

  const [pendingDelete, setPendingDelete] = useState(null);

  const handleDelete = (username) => {
    setPendingDelete(username);
  };

  const confirmDelete = () => {
    onDelete(pendingDelete);
    setPendingDelete(null);
  };

  // Linha de servidor para uma tag que não está na lista — o único caso em que
  // ainda é preciso perguntar. Aparece igual no criar e no editar.
  const regionPicker = (value, onChange) => (
    <div style={styles.unknownTag}>
      <div style={styles.unknownTagText}>{t("riotid_unknown_tag")}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={styles.select}>
        {FALLBACK_REGIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {t(r.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );

  // O que a app entendeu do que está escrito, a cada letra: nome, tag e
  // servidor em etiquetas separadas. É isto que substitui a instrução de
  // formato em texto pequeno — em vez de explicar a regra, mostra-se o
  // resultado de a ter cumprido (ou não).
  const readout = ({ gameName, tagLine, region, knownTag }) => {
    if (!gameName && !tagLine) return null;

    if (!gameName) {
      return (
        <div style={{ ...styles.readout, ...styles.readoutWarn }}>
          <AlertTriangle size={13} strokeWidth={2.25} style={styles.readoutIcon} />
          <span style={styles.readoutWarnText}>{t("riotid_missing_name")}</span>
        </div>
      );
    }

    if (!tagLine) {
      return (
        <div style={{ ...styles.readout, ...styles.readoutWarn }}>
          <AlertTriangle size={13} strokeWidth={2.25} style={styles.readoutIcon} />
          <span style={styles.readoutWarnText}>
            {t("riotid_missing_tag").replace("{example}", `${gameName}#EUW`)}
          </span>
        </div>
      );
    }

    return (
      <div style={{ ...styles.readout, ...styles.readoutOk }}>
        <Check size={13} strokeWidth={2.75} style={styles.readoutIcon} />
        <div style={styles.chips}>
          <span style={styles.chip}>
            <span style={styles.chipKey}>{t("riotid_ok_name")}</span>
            <span style={styles.chipVal}>{gameName}</span>
          </span>
          <span style={styles.chip}>
            <span style={styles.chipKey}>{t("riotid_ok_tag")}</span>
            <span style={styles.chipVal}>#{tagLine}</span>
          </span>
          {knownTag && (
            <span style={styles.chip}>
              <span style={styles.chipKey}>{t("riotid_ok_server")}</span>
              <span style={styles.chipVal}>{t(REGION_SHORT[region])}</span>
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.section}>
      {/* Com o formulário aberto (o que acontece sempre quando não há contas)
          esta linha dizia a mesma coisa que o título dele, duas vezes seguidas
          no mesmo ecrã. Fica só para quando o formulário está fechado. */}
      {accounts.length === 0 && !showCreate && (
        <div style={styles.emptyHint}>{t("no_accounts_hint")}</div>
      )}

      {/* LISTA DE CONTAS */}
      <div style={styles.accountList} className="scrollArea">
        <AnimatePresence initial={false}>
          {accounts.map((acc) => {
            const isActive = acc.username === activeAccount;
            const isEditing = editingUsername === acc.username;

            return (
              <motion.div
                key={acc.username}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  ...styles.accountCard,
                  border: isActive
                    ? "1px solid rgba(var(--accent-rgb),0.7)"
                    : "1px solid rgba(var(--accent-rgb),0.15)",
                  // O cartão inativo recua para --panel-deep-rgb, como o
                  // champCard em MatchReports.jsx. Era um preto fixo, que só
                  // recua por cima de um tema escuro: no claro dava #bfbfbf,
                  // mais escuro que a própria página.
                  background: isActive
                    ? "rgba(var(--accent-rgb),0.1)"
                    : "rgba(var(--panel-deep-rgb),0.85)",
                }}
              >
                <div style={styles.accountInfo}>
                  <div style={styles.accountUsername}>
                    {acc.username}
                    {isActive && <span style={styles.activePill}>{t("active_pill")}</span>}
                  </div>

                  {!isEditing && (
                    <div style={styles.accountRiot}>
                      {t("riot_label")} {acc.riotAccount || acc.username}
                      {acc.riotTag ? `#${acc.riotTag}` : ` ${t("no_tag")}`}
                    </div>
                  )}

                  {isEditing && (
                    <div style={styles.editRow}>
                      <input
                        value={editRiotId}
                        onChange={(e) => setEditRiotId(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                        placeholder={t("riotid_placeholder")}
                        style={styles.input}
                        autoFocus
                      />
                      {readout(editParsed)}
                      {editParsed.tagLine &&
                        !editParsed.knownTag &&
                        regionPicker(editRegion, setEditRegion)}
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={saveEdit} style={styles.smallBtn}>
                          {t("save_btn")}
                        </button>
                        <button
                          onClick={() => setEditingUsername(null)}
                          style={styles.smallBtnGhost}
                        >
                          {t("cancel_btn")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <div style={styles.accountActions}>
                    {!isActive && (
                      <button onClick={() => onSwitch(acc.username)} style={styles.smallBtn}>
                        {t("use_btn")}
                      </button>
                    )}
                    <Tooltip label={t("edit_riot_account_tooltip")}>
                      <button onClick={() => startEdit(acc)} style={styles.iconBtn}>
                        <Pencil size={13} strokeWidth={2.25} />
                      </button>
                    </Tooltip>
                    <Tooltip label={t("remove_btn")}>
                      <button
                        onClick={() => handleDelete(acc.username)}
                        style={styles.iconBtnDanger}
                      >
                        <Trash2 size={13} strokeWidth={2.25} />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* LIGAR UMA CONTA NOVA */}
      {!showCreate && (
        <button onClick={() => setShowCreate(true)} style={styles.newAccountBtn}>
          <Plus size={13} strokeWidth={2.5} />
          {t("new_account_btn")}
        </button>
      )}

      {showCreate && (
        <div style={styles.createForm}>
          <div style={styles.createHead}>
            <div style={styles.createTitle}>{t("account_create_title")}</div>
            <div style={styles.createSub}>{t("account_create_sub")}</div>
          </div>

          <div style={styles.field}>
            <label htmlFor="riot-id-field" style={styles.fieldLabel}>
              {t("riotid_label")}
            </label>
            <input
              id="riot-id-field"
              placeholder={t("riotid_placeholder")}
              value={newRiotId}
              onChange={(e) => {
                setNewRiotId(e.target.value);
                setCreateError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              style={styles.bigInput}
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
            {!typedSomething && <div style={styles.fieldHint}>{t("riotid_field_hint")}</div>}
            {readout(parsed)}
            {parsed.tagLine && !parsed.knownTag && regionPicker(newRegion, setNewRegion)}
          </div>

          <RiotIdGuide open={guideOpen} onToggle={() => setGuideOpen((v) => !v)} />

          <div>
            <button onClick={() => setShowMore((v) => !v)} style={styles.moreToggle}>
              <ChevronDown
                size={12}
                strokeWidth={2.5}
                style={{ transform: showMore ? "rotate(180deg)" : "none" }}
              />
              {t("create_more_options")}
            </button>

            {showMore && (
              <div style={styles.moreBody}>
                <label htmlFor="account-label-field" style={styles.fieldLabel}>
                  {t("create_label_label")}
                </label>
                <input
                  id="account-label-field"
                  placeholder={parsed.gameName || t("create_label_placeholder")}
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    setCreateError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  style={styles.input}
                />
                <div style={styles.fieldHint}>{t("create_label_hint")}</div>
              </div>
            )}
          </div>

          {createError && (
            <div style={styles.errorBox}>
              <AlertTriangle size={13} strokeWidth={2.25} style={{ flexShrink: 0 }} />
              <span>{createError}</span>
            </div>
          )}

          <div style={styles.createActions}>
            <button onClick={handleCreate} style={styles.primaryBtn}>
              <UserPlus size={13} strokeWidth={2.25} />
              {/* Sem tag não há sincronização possível, e o botão passa a
                  dizê-lo: a conta fica criada, mas as vitórias são marcadas à
                  mão. Mais honesto do que um "Criar" que promete o mesmo nos
                  dois casos. */}
              {parsed.tagLine ? t("create_account_btn") : t("create_without_sync_btn")}
            </button>
            {accounts.length > 0 && (
              <button
                onClick={() => {
                  resetCreate();
                  setShowCreate(false);
                }}
                style={styles.smallBtnGhost}
              >
                {t("cancel_btn")}
              </button>
            )}
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          message={t("confirm_remove_account").replace("{name}", pendingDelete)}
          danger
          confirmLabel={t("remove_btn")}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

// Fonte de leitura para frases (a Cinzel é de display e cansa em texto
// corrido), igual ao que se faz no guia e no ecrã de boas-vindas.
const READING = "system-ui, -apple-system, Segoe UI, sans-serif";

const styles = {
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  emptyHint: {
    fontSize: 12,
    lineHeight: 1.55,
    color: "var(--text-secondary)",
    textAlign: "center",
    padding: "8px 0",
    fontFamily: READING,
  },

  accountList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: "32vh",
  },

  accountCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 12,
    transition: "background 0.15s ease, border-color 0.15s ease",
  },

  accountInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
    minWidth: 0,
  },

  accountUsername: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text-body)",
  },

  activePill: {
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: "var(--radius-sm)",
    background: "var(--accent-solid)",
    color: "var(--accent-solid-text)",
  },

  accountRiot: {
    fontSize: 11,
    color: "var(--text-secondary)",
  },

  editRow: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 6,
  },

  select: {
    width: "100%",
    padding: 10,
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    color: "var(--text-body)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    fontSize: 13,
    fontFamily: "Cinzel, serif",
    cursor: "pointer",
  },

  accountActions: {
    display: "flex",
    gap: 6,
    flexShrink: 0,
  },

  iconBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--accent-rgb),0.25)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    color: "var(--accent-text)",
    cursor: "pointer",
    padding: 0,
  },

  iconBtnDanger: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(226,85,95,0.35)",
    background: "rgba(226,85,95,0.1)",
    color: "#e2555f",
    cursor: "pointer",
    padding: 0,
  },

  newAccountBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "10px 14px",
    borderRadius: "var(--radius-lg)",
    border: "1px dashed rgba(var(--accent-rgb),0.35)",
    background: "transparent",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Cinzel, serif",
  },

  // O formulário ganhou moldura própria: dentro das Definições ele é o passo
  // a dar, não mais uma linha de opções entre as outras.
  createForm: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 14,
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.6)",
    border: "1px solid rgba(var(--accent-rgb),0.22)",
  },

  createHead: { display: "flex", flexDirection: "column", gap: 4 },

  createTitle: { fontSize: 14, fontWeight: 700, color: "var(--accent-text)" },

  createSub: {
    fontSize: 11.5,
    lineHeight: 1.55,
    color: "var(--text-secondary)",
    fontFamily: READING,
  },

  field: { display: "flex", flexDirection: "column", gap: 6 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-body)",
    letterSpacing: 0.2,
  },

  fieldHint: {
    fontSize: 10.5,
    lineHeight: 1.5,
    color: "var(--text-muted)",
    fontFamily: READING,
  },

  // O campo do Riot ID é o único obrigatório do formulário, e é o maior:
  // o tamanho diz, sem o escrever, onde é que se tem de carregar.
  bigInput: {
    width: "100%",
    padding: "12px 13px",
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.95)",
    color: "var(--text-body)",
    border: "1px solid rgba(var(--accent-rgb),0.4)",
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: 0.3,
    boxSizing: "border-box",
  },

  readout: {
    display: "flex",
    alignItems: "flex-start",
    gap: 7,
    padding: "8px 10px",
    borderRadius: "var(--radius-md)",
    fontFamily: READING,
  },

  readoutIcon: { flexShrink: 0, marginTop: 1 },

  readoutOk: {
    background: "rgba(var(--accent-rgb),0.1)",
    border: "1px solid rgba(var(--accent-rgb),0.28)",
    color: "var(--accent-text)",
  },

  readoutWarn: {
    background: "rgba(226,85,95,0.08)",
    border: "1px solid rgba(226,85,95,0.3)",
    color: "#e2555f",
  },

  readoutWarnText: { fontSize: 11, lineHeight: 1.5 },

  chips: { display: "flex", flexWrap: "wrap", gap: 6, minWidth: 0 },

  chip: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: 5,
    padding: "2px 7px",
    borderRadius: "var(--radius-sm)",
    background: "rgba(var(--panel-deep-rgb),0.75)",
    maxWidth: "100%",
  },

  chipKey: { fontSize: 9.5, textTransform: "uppercase", opacity: 0.75, letterSpacing: 0.4 },

  chipVal: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "var(--text-body)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  unknownTag: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "9px 10px",
    borderRadius: "var(--radius-md)",
    background: "rgba(var(--soft-rgb),0.06)",
    border: "1px solid rgba(var(--border-rgb),0.35)",
  },

  unknownTagText: {
    fontSize: 11,
    lineHeight: 1.5,
    color: "var(--text-secondary)",
    fontFamily: READING,
  },

  moreToggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 0",
    border: "none",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "Cinzel, serif",
  },

  moreBody: { display: "flex", flexDirection: "column", gap: 6, marginTop: 6 },

  input: {
    width: "100%",
    padding: 10,
    borderRadius: "var(--radius-lg)",
    background: "rgba(var(--panel-deep-rgb),0.9)",
    color: "var(--text-body)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    fontSize: 13,
    boxSizing: "border-box",
  },

  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 7,
    padding: "9px 11px",
    borderRadius: "var(--radius-md)",
    background: "rgba(226,85,95,0.1)",
    border: "1px solid rgba(226,85,95,0.35)",
    color: "#e2555f",
    fontSize: 11,
    lineHeight: 1.5,
    fontFamily: READING,
  },

  createActions: { display: "flex", alignItems: "center", gap: 8 },

  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "11px 18px",
    borderRadius: "var(--radius-lg)",
    border: "none",
    background: "var(--accent-gradient)",
    color: "var(--accent-solid-text)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "Cinzel, serif",
    boxShadow: "0 4px 14px var(--accent-glow)",
  },

  smallBtn: {
    padding: "6px 10px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--accent-rgb),0.25)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 12,
  },

  smallBtnGhost: {
    padding: "6px 10px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(var(--soft-rgb),0.15)",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 12,
  },
};
