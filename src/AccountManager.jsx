import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Tooltip from "./Tooltip";
import { useLanguage } from "./i18n";

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
  const [newRiotTag, setNewRiotTag] = useState("");
  const [editingUsername, setEditingUsername] = useState(null);
  const [editRiotAccount, setEditRiotAccount] = useState("");
  const [editRiotTag, setEditRiotTag] = useState("");

  const startEdit = (acc) => {
    setEditingUsername(acc.username);
    setEditRiotAccount(acc.riotAccount || "");
    setEditRiotTag(acc.riotTag || "");
  };

  const saveEdit = () => {
    onUpdateRiotAccount(editingUsername, {
      riotAccount: editRiotAccount,
      riotTag: editRiotTag,
    });
    setEditingUsername(null);
  };

  const handleCreate = () => {
    if (!newUsername.trim()) return;
    onCreate(newUsername.trim(), newRiotAccount.trim(), newRiotTag.trim());
    setNewUsername("");
    setNewRiotAccount("");
    setNewRiotTag("");
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
                        <input
                          value={editRiotAccount}
                          onChange={(e) => setEditRiotAccount(e.target.value)}
                          placeholder={t("riot_name_placeholder")}
                          style={styles.input}
                          autoFocus
                        />
                        <input
                          value={editRiotTag}
                          onChange={(e) => setEditRiotTag(e.target.value)}
                          placeholder={t("tag_placeholder")}
                          style={{ ...styles.input, maxWidth: 90 }}
                        />
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
              <input
                placeholder={t("tag_placeholder")}
                value={newRiotTag}
                onChange={(e) => setNewRiotTag(e.target.value)}
                style={{ ...styles.input, maxWidth: 90 }}
              />
            </div>
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
    width: 420,
    maxHeight: "80vh",
    overflowY: "auto",
    borderRadius: 16,
    padding: 20,
    background: "linear-gradient(180deg, rgba(var(--panel-rgb),0.98), rgba(var(--panel-deep-rgb),0.99))",
    border: "1px solid rgba(var(--border-rgb),0.5)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    fontFamily: "Cinzel, serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    color: "var(--accent-text)",
    fontSize: 18,
    margin: 0,
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
    padding: "10px 12px",
    borderRadius: 10,
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
    background: "#4f46e5",
    color: "#ffffff",
  },

  accountRiot: {
    fontSize: 11,
    color: "var(--text-secondary)",
  },

  editRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
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
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    background: "#4f46e5",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
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
    border: "1px solid rgba(var(--soft