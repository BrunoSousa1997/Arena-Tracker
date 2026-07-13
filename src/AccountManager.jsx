import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Tooltip from "./Tooltip";
import { useLanguage } from "./i18n";

// Tags mais comuns da Riot (o servidor de origem já vem embutido nelas) —
// escolher a tag certa já define sozinho o servidor certo para a Riot API,
// sem precisar de um select de servidor à parte (que só duplicava a mesma
// informação e podia ficar dessincronizado da tag escolhida).
const TAG_OPTIONS = [
  { value: "EUW", region: "europe" },
  { value: "EUNE", region: "europe" },
  { value: "TR1", region: "europe" },
  { value: "RU", region: "europe" },
  { value: "NA1", region: "americas" },
  { value: "BR1", region: "americas" },
  { value: "LAN", region: "americas" },
  { value: "LAS", region: "americas" },
  { value: "OCE", region: "americas" },
  { value: "KR", region: "asia" },
  { value: "JP1", region: "asia" },
  { value: "PH2", region: "sea" },
  { value: "SG2", region: "sea" },
  { value: "TH2", region: "sea" },
  { value: "TW2", region: "sea" },
  { value: "VN2", region: "sea" },
];

const CUSTOM_TAG = "__custom__";

// Só usado quando a tag é "Outra" (personalizada) — nesse caso já não dá
// para adivinhar o servidor a partir da tag, por isso volta a perguntar.
const FALLBACK_REGIONS = [
  { value: "europe", labelKey: "region_europe" },
  { value: "americas", labelKey: "region_americas" },
  { value: "asia", labelKey: "region_asia" },
  { value: "sea", labelKey: "region_sea" },
];

function regionForTag(tag) {
  return TAG_OPTIONS.find((o) => o.value === tag)?.region || null;
}

export default function AccountManager({
  accounts,
  activeAccount,
  onClose,
  onSwitch,
  onCreate,
  onUpdateRiotAccount,
  onDelete,
}) {
  const { t } = useLanguage();
  const [showCreate, setShowCreate] = useState(accounts.length === 0);
  const [newUsername, setNewUsername] = useState("");
  const [newRiotAccount, setNewRiotAccount] = useState("");
  const [newTagChoice, setNewTagChoice] = useState(TAG_OPTIONS[0].value);
  const [newRiotTag, setNewRiotTag] = useState(TAG_OPTIONS[0].value);
  const [newRegion, setNewRegion] = useState("europe");
  const [editingUsername, setEditingUsername] = useState(null);
  const [editRiotAccount, setEditRiotAccount] = useState("");
  const [editTagChoice, setEditTagChoice] = useState(TAG_OPTIONS[0].value);
  const [editRiotTag, setEditRiotTag] = useState("");
  const [editRegion, setEditRegion] = useState("europe");

  const selectNewTag = (value) => {
    setNewTagChoice(value);
    setNewRiotTag(value === CUSTOM_TAG ? "" : value);
  };

  const selectEditTag = (value) => {
    setEditTagChoice(value);
    setEditRiotTag(value === CUSTOM_TAG ? "" : value);
  };

  const startEdit = (acc) => {
    setEditingUsername(acc.username);
    setEditRiotAccount(acc.riotAccount || "");
    const knownTag = TAG_OPTIONS.some((o) => o.value === acc.riotTag);
    setEditTagChoice(knownTag ? acc.riotTag : CUSTOM_TAG);
    setEditRiotTag(acc.riotTag || "");
    setEditRegion(acc.region || "europe");
  };

  const saveEdit = () => {
    const region =
      editTagChoice === CUSTOM_TAG ? editRegion : regionForTag(editTagChoice) || "europe";
    onUpdateRiotAccount(editingUsername, {
      riotAccount: editRiotAccount,
      riotTag: editRiotTag,
      region,
    });
    setEditingUsername(null);
  };

  const handleCreate = () => {
    if (!newUsername.trim()) return;
    const region = newTagChoice === CUSTOM_TAG ? newRegion : regionForTag(newTagChoice) || "europe";
    onCreate(newUsername.trim(), newRiotAccount.trim(), newRiotTag.trim(), region);
    setNewUsername("");
    setNewRiotAccount("");
    setNewTagChoice(TAG_OPTIONS[0].value);
    setNewRiotTag(TAG_OPTIONS[0].value);
    setNewRegion("europe");
    setShowCreate(false);
  };

  const handleDelete = (username) => {
    if (!window.confirm(t("confirm_remove_account").replace("{name}", username))) {
      return;
    }
    onDelete(username);
  };

  return (
    <motion.div
      style={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        style={styles.panel}
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>{t("manage_accounts_title")}</h2>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        {accounts.length === 0 && (
          <div style={styles.emptyHint}>
            {t("no_accounts_hint")}
          </div>
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
                    background: isActive
                      ? "rgba(var(--accent-rgb),0.1)"
                      : "rgba(0,0,0,0.25)",
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
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            value={editRiotAccount}
                            onChange={(e) => setEditRiotAccount(e.target.value)}
                            placeholder={t("riot_name_placeholder")}
                            style={styles.input}
                            autoFocus
                          />
                          <select
                            value={editTagChoice}
                            onChange={(e) => selectEditTag(e.target.value)}
                            style={{ ...styles.select, maxWidth: 100 }}
                          >
                            {TAG_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.value}
                              </option>
                            ))}
                            <option value={CUSTOM_TAG}>{t("tag_custom_option")}</option>
                          </select>
                        </div>
                        {editTagChoice === CUSTOM_TAG && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              value={editRiotTag}
                              onChange={(e) => setEditRiotTag(e.target.value)}
                              placeholder={t("tag_placeholder")}
                              style={{ ...styles.input, maxWidth: 90 }}
                            />
                            <select
                              value={editRegion}
                              onChange={(e) => setEditRegion(e.target.value)}
                              style={styles.select}
                            >
                              {FALLBACK_REGIONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {t(r.labelKey)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
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
                          ✎
                        </button>
                      </Tooltip>
                      <Tooltip label={t("remove_btn")}>
                        <button
                          onClick={() => handleDelete(acc.username)}
                          style={styles.iconBtnDanger}
                        >
                          🗑
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* CRIAR NOVA CONTA */}
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} style={styles.newAccountBtn}>
            {t("new_account_btn")}
          </button>
        )}

        {showCreate && (
          <div style={styles.createForm}>
            <input
              placeholder={t("app_name_placeholder")}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              style={styles.input}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder={t("riot_account_sync_placeholder")}
                value={newRiotAccount}
                onChange={(e) => setNewRiotAccount(e.target.value)}
                style={styles.input}
              />
              <select
                value={newTagChoice}
                onChange={(e) => selectNewTag(e.target.value)}
                style={{ ...styles.select, maxWidth: 100 }}
              >
                {TAG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value}
                  </option>
                ))}
                <option value={CUSTOM_TAG}>{t("tag_custom_option")}</option>
              </select>
            </div>
            {newTagChoice === CUSTOM_TAG && (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  placeholder={t("tag_placeholder")}
                  value={newRiotTag}
                  onChange={(e) => setNewRiotTag(e.target.value)}
                  style={styles.input}
                />
                <select
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  style={{ ...styles.select, maxWidth: 160 }}
                >
                  {FALLBACK_REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {t(r.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div style={styles.tagHint}>
              {t("tag_hint")}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleCreate} style={styles.primaryBtn}>
                {t("create_btn")}
              </button>
              {accounts.length > 0 && (
                <button onClick={() => setShowCreate(false)} style={styles.smallBtnGhost}>
                  {t("cancel_btn")}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(3px)",
    zIndex: 99997,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  panel: {
    width: 540,
    maxHeight: "84vh",
    overflowY: "auto",
    borderRadius: 20,
    padding: 26,
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.98), rgba(var(--panel-deep-rgb),0.99))",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    fontFamily: "Cinzel, serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottom: "1px solid rgba(var(--border-rgb),0.35)",
  },

  title: {
    color: "var(--accent-text)",
    fontSize: 20,
    margin: 0,
    letterSpacing: 0.3,
  },

  closeBtn: {
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "none",
    background: "rgba(var(--soft-rgb),0.08)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 13,
    lineHeight: 1,
    padding: 0,
  },

  linkBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(var(--accent-rgb),0.35)",
    background: "rgba(var(--accent-rgb),0.08)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 13,
  },

  emptyHint: {
    fontSize: 12,
    color: "var(--text-secondary)",
    textAlign: "center",
    padding: "8px 0",
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
    borderRadius: 6,
    background: "#7c3aed",
    color: "#ffffff",
  },

  accountRiot: {
    fontSize: 11,
    color: "var(--text-secondary)",
  },

  editRow: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 4,
  },

  select: {
    width: "100%",
    padding: 10,
    borderRadius: 10,
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
  },

  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid rgba(var(--accent-rgb),0.25)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 12,
  },

  iconBtnDanger: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid rgba(226,85,95,0.35)",
    background: "rgba(226,85,95,0.1)",
    color: "#e2555f",
    cursor: "pointer",
    fontSize: 12,
  },

  newAccountBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px dashed rgba(var(--accent-rgb),0.35)",
    background: "transparent",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 13,
  },

  createForm: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  tagHint: {
    fontSize: 10,
    color: "var(--text-muted)",
    marginTop: -4,
  },

  input: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    background: "rgba(var(--panel-deep-rgb),0.9)",
    color: "var(--text-body)",
    border: "1px solid rgba(var(--border-rgb),0.4)",
    fontSize: 13,
  },

  primaryBtn: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #a855f7, #7c3aed)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
  },

  smallBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(var(--accent-rgb),0.25)",
    background: "rgba(var(--panel-deep-rgb),0.85)",
    color: "var(--accent-text)",
    cursor: "pointer",
    fontSize: 12,
  },

  smallBtnGhost: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(var(--soft-rgb),0.15)",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 12,
  },
};
