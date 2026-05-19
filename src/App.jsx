import React, { useEffect, useState, useMemo } from "react";
import { getWins, addWin, removeWin, ensureUser } from "./db/api";
import { motion, AnimatePresence } from "framer-motion";
const ROLES = [
  "ALL",
  "Fighter",
  "Tank",
  "Mage",
  "Assassin",
  "Marksman",
  "Support",
];

export default function App() {
  const [patch, setPatch] = useState(null);
  const [champions, setChampions] = useState([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [roleFilter, setRoleFilter] = useState("ALL");

  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [riotName, setRiotName] = useState("");

  const [wins, setWins] = useState([]);
  const [switching, setSwitching] = useState(false);

  const [showAccountPanel, setShowAccountPanel] = useState(false);

  const [hovered, setHovered] = useState(null);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(!!window.electron);
  }, []);

  console.log(window.electron)
  // ================= LOAD ACCOUNTS =================
  useEffect(() => {
    const saved = localStorage.getItem("riot-accounts");
    const active = localStorage.getItem("active-account");

    if (saved) setAccounts(JSON.parse(saved));
    if (active) setActiveAccount(active);
  }, []);

  // ================= PATCH =================
  useEffect(() => {
    async function loadPatch() {
      const res = await fetch(
        "https://ddragon.leagueoflegends.com/api/versions.json"
      );
      const versions = await res.json();
      setPatch(versions[0]);
    }
    loadPatch();
  }, []);

  const DRAGON = patch
    ? `https://ddragon.leagueoflegends.com/cdn/${patch}`
    : null;

  // ================= CHAMPIONS =================
  useEffect(() => {
    if (!DRAGON) return;

    fetch(`${DRAGON}/data/en_US/champion.json`)
      .then((r) => r.json())
      .then((data) => {
        const champs = Object.values(data.data).map((c) => ({
          id: c.id,
          tags: c.tags,
        }));

        setChampions(champs);
      });
  }, [DRAGON]);

  // ================= WINS =================
  useEffect(() => {
    if (!activeAccount) return;

    getWins(activeAccount).then((data) => {
      setWins(data || []);
    });
  }, [activeAccount]);

  // ================= SEARCH DEBOUNCE =================
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
    }, 120);

    return () => clearTimeout(t);
  }, [search]);

  // ================= CREATE ACCOUNT =================
  const createAccount = async () => {
    if (!riotName) return;

    const updated = accounts.includes(riotName)
      ? accounts
      : [...accounts, riotName];

    setAccounts(updated);
    setActiveAccount(riotName);

    localStorage.setItem("riot-accounts", JSON.stringify(updated));
    localStorage.setItem("active-account", riotName);

    await ensureUser(riotName);

    setRiotName("");
    setShowAccountPanel(false);
  };

  // ================= SWITCH ACCOUNT =================
  const switchAccount = async (name) => {
    setSwitching(true);

    await ensureUser(name);
    localStorage.setItem("active-account", name);

    setTimeout(() => {
      setActiveAccount(name);
      setSwitching(false);
      setShowAccountPanel(false);
    }, 180);
  };

  // ================= ADD / REMOVE =================
  const handleAddWin = async (champ) => {
    if (!activeAccount) return;

    setWins((prev) => {
      if (prev.includes(champ)) return prev; // 👈 trava duplicados instantaneamente
      return [...prev, champ];
    });

    try {
      await ensureUser(activeAccount);
      await addWin(activeAccount, champ);
    } catch (err) {
      console.error(err);

      // rollback seguro
      setWins((prev) => prev.filter((c) => c !== champ));
    }
  };
  const handleRemoveWin = async (champ) => {
    if (!activeAccount) return;

    setWins((prev) => prev.filter((c) => c !== champ));

    try {
      await removeWin(activeAccount, champ);
    } catch (err) {
      console.error(err);

      // rollback
      setWins((prev) => [...prev, champ]);
    }
  };
  const owned = useMemo(() => new Set(wins), [wins]);

  // ================= FILTER =================
  const q = debouncedSearch.toLowerCase().trim();

  const filteredChampions = useMemo(() => {
    return champions
      .filter((c) => {
        const name = c.id.toLowerCase();

        const matchSearch =
          q === "" || name.includes(q) || name.startsWith(q);

        const matchRole =
          roleFilter === "ALL" || c.tags.includes(roleFilter);

        return matchSearch && matchRole && !owned.has(c.id);
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [debouncedSearch, champions, roleFilter, owned]);
  const filteredWins = useMemo(() => {
    return wins
      .filter((w) => {
        return q === "" || w.toLowerCase().includes(q);
      })
      .sort((a, b) => a.localeCompare(b));
  }, [wins, debouncedSearch]);
  return (
    <div style={styles.app}>
      <div style={{ width: "100%", maxWidth: 1800 }}>

        {/* HEADER */}
        <div style={styles.header}>
          <img height={80} src="./logo.ico" />
        </div>

        {/* ================= TOP BAR ================= */}
        <div style={styles.topBar}>

          <div style={styles.accountBox}>
            <div style={styles.accountName}>
              {activeAccount || "No account"}
            </div>

            {activeAccount && (
              <button
                onClick={() => setShowAccountPanel((v) => !v)}
                style={{
                  ...styles.smallBtn,
                  ...(showAccountPanel
                    ? {
                      background: "#c8aa6e",
                      color: "#0b0f1a",
                      border: "1px solid rgba(200,170,110,0.6)",
                    }
                    : {}),
                }}
              >
                ⚙
              </button>
            )}
          </div>

          {activeAccount && (
            <div style={styles.winsBox}>
              <div style={styles.winsNumber}>{wins.length}</div>
              <div style={styles.winsLabel}>Wins</div>
            </div>
          )}
        </div>

        {/* ================= ACCOUNT DROPDOWN ================= */}
        {((showAccountPanel && activeAccount) || !activeAccount) && (
          <div style={styles.dropdown}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Summoner name"
                value={riotName}
                onChange={(e) => setRiotName(e.target.value)}
                style={styles.input}
              />

              <button onClick={createAccount} style={styles.primaryBtn}>
                Add
              </button>
            </div>

            <div style={styles.accountRow}>
              {accounts.map((acc) => (
                <button
                  key={acc}
                  onClick={() => switchAccount(acc)}
                  style={{
                    ...styles.filterBtn,
                    ...(activeAccount === acc
                      ? styles.filterBtnActive
                      : {}),
                  }}
                >
                  {acc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ================= MAIN ================= */}
        {activeAccount && (
          <div
            style={{
              opacity: switching ? 0 : 1,
              transform: switching
                ? "translateY(10px) scale(0.98)"
                : "translateY(0) scale(1)",
              transition: "all 0.18s ease",
            }}
          >
            <div style={styles.globalSearch}>
              <span>🔎</span>

              <input
                placeholder="Search champions or wins..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.globalSearchInput}
              />
            </div>
            {/* CHAMPIONS */}
            <div style={styles.cardScroll}>
              <h2 style={styles.sectionTitle}>Champions</h2>
              <div style={styles.filters}>
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    style={{
                      ...styles.filterBtn,
                      ...(roleFilter === r
                        ? styles.filterBtnActive
                        : {}),
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div style={styles.grid} className="scrollArea">
                <AnimatePresence>
                  {filteredChampions.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.08 }}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAddWin(c.id)}
                      style={{
                        ...styles.cardChamp,
                        border:
                          hovered === c.id
                            ? "1px solid rgba(200,170,110,0.5)"
                            : "1px solid rgba(200,170,110,0.12)",
                      }}
                    >
                      <img
                        src={`${DRAGON}/img/champion/${c.id}.png`}
                        style={styles.icon}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* WINS */}
            <div style={styles.cardScroll}>
              <h2 style={styles.sectionTitle}>Your Victories</h2>

              <div style={styles.grid} className="scrollArea">
                <AnimatePresence>
                  {filteredWins.map((champ) => (
                    <motion.div
                      key={champ}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.08 }}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.08 }}
                      onClick={() => handleRemoveWin(champ)}
                      style={styles.winCard}
                    >
                      <img
                        src={`${DRAGON}/img/champion/${champ}.png`}
                        style={styles.icon}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ================= STYLE ================= */
const styles = {
  app: {
    minHeight: "100vh",
    width: "100vw",
    overflowX: "hidden",
    overflowY: "hidden",
    color: "#e5e7eb",
    paddingTop: "32px",
    fontFamily: "Cinzel, serif",
    display: "flex",
    justifyContent: "center",
    boxSizing: "border-box",
    backgroundImage:
      "linear-gradient(rgba(5,7,13,0.85), rgba(5,7,13,0.92)), url('https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/27fd1033cf923429f0811e355402aecfb00d00cb-1751x1096.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    overflow: "hidden"
  },

  header: { textAlign: "center", marginBottom: 10, marginTop: 5 },

  title: { color: "#c8aa6e", fontSize: 34 },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: 14,
    marginTop: 10,
    background:
      "linear-gradient(180deg, rgba(20,24,33,0.92), rgba(10,12,18,0.96))",
    border: "1px solid rgba(200,170,110,0.22)",
  },

  accountBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  accountName: {
    color: "#c8aa6e",
    fontWeight: 600,
    fontSize: 14,
  },

  smallBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(200,170,110,0.25)",
    background: "rgba(10,12,18,0.85)",
    color: "#c8aa6e",
    cursor: "pointer",
    fontSize: 12,
    transition: "all 0.15s ease",
  },

  winsBox: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
  },

  winsNumber: {
    fontSize: 20,
    color: "#c8aa6e",
    fontWeight: 700,
  },

  winsLabel: {
    fontSize: 12,
    color: "#9ca3af",
  },

  dropdown: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    background: "rgba(10,12,18,0.92)",
    border: "1px solid rgba(200,170,110,0.22)",
  },

  cardScroll: {
    background:
      "linear-gradient(180deg, rgba(20,24,33,0.92), rgba(10,12,18,0.96))",
    border: "1px solid rgba(200,170,110,0.22)",
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    display: "flex",
    flexDirection: "column",
  },

  sectionTitle: { marginBottom: 12, color: "#c8aa6e" },

  input: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    background: "rgba(10,12,18,0.9)",
    color: "#c8aa6e",
    border: "1px solid rgba(200,170,110,0.25)",
  },

  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#c8aa6e",
    color: "#0b0f1a",
    cursor: "pointer",
  },

  accountRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 10,
  },

  filterBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(200,170,110,0.25)",
    background: "rgba(10,12,18,0.8)",
    color: "#c8aa6e",
    cursor: "pointer",
    fontSize: 12,
  },

  filterBtnActive: {
    background: "#c8aa6e",
    color: "#0b0f1a",
  },
  searchIcon: { opacity: 0.7 },
  globalSearch: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(10,12,18,0.85)",
    border: "1px solid rgba(200,170,110,0.25)",
    marginTop: 12,
    marginBottom: 16,
  },

  globalSearchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#c8aa6e",
  },

  filters: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },

  grid: {
    padding: "3px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(54px, 1fr))",
    gap: 10,
    marginTop: 12,
    maxHeight: "26vh"
  },

  cardChamp: {
    cursor: "pointer",
    borderRadius: 12,
    padding: 3,
    border: "1px solid rgba(200,170,110,0.12)",
    background: "rgba(0,0,0,0.25)",
    transition: "all 0.2s ease",
  },

  cardChampHover: {
    transform: "scale(1.08)",
    border: "1px solid rgba(200,170,110,0.5)",
  },

  winCard: {
    cursor: "pointer",
    borderRadius: 12,
    padding: 3,
    border: "1px solid rgba(200,170,110,0.4)",
    background: "rgba(200,170,110,0.12)",
  },

  icon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    pointerEvents: "none", // 👈 ISTO resolve o hover
  },

};