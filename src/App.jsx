import React, { useEffect, useState, useMemo } from "react";
import { getWins, addWin, removeWin, ensureUser } from "./db/api";

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

  // ================= LOAD ACCOUNTS =================
  useEffect(() => {
    const saved = localStorage.getItem("riot-accounts");
    const active = localStorage.getItem("active-account");

    if (saved) setAccounts(JSON.parse(saved));

    if (active) {
      setActiveAccount(active);
      setShowAccountPanel(false);
    }
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

    await ensureUser(activeAccount);
    await addWin(activeAccount, champ);

    const updated = await getWins(activeAccount);
    setWins(updated || []);
  };

  const handleRemoveWin = async (champ) => {
    if (!activeAccount) return;

    await removeWin(activeAccount, champ);

    const updated = await getWins(activeAccount);
    setWins(updated || []);
  };

  const owned = useMemo(() => new Set(wins), [wins]);

  // ================= FILTER =================
  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();

    return champions.filter((c) => {
      const name = c.id.toLowerCase();

      const matchSearch =
        q === "" || name.includes(q) || name.startsWith(q);

      const matchRole =
        roleFilter === "ALL" || c.tags.includes(roleFilter);

      return matchSearch && matchRole && !owned.has(c.id);
    });
  }, [debouncedSearch, champions, roleFilter, owned]);

  return (
    <div style={styles.app}>
      <div style={{ width: "100%", maxWidth: 1400 }}>

        {/* HEADER */}
        <div style={styles.header}>
          <h1 style={styles.title}>🏆 Arena Tracker</h1>
        </div>

        {/* ================= ACCOUNTS ================= */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>{activeAccount ? activeAccount : "Accounts"}</h2>

          {/* ACTIVE VIEW */}
          {activeAccount && !showAccountPanel && (
            <div>
              <button
                onClick={() => setShowAccountPanel(true)}
                style={styles.primaryBtn}
              >
                Switch account
              </button>
            </div>
          )}

          {/* SWITCH PANEL */}
          {(showAccountPanel || !activeAccount) && (
            <>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  placeholder="Summoner Name"
                  value={riotName}
                  onChange={(e) => setRiotName(e.target.value)}
                  style={styles.input}
                />

                <button onClick={createAccount} style={styles.primaryBtn}>
                  Create
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

              {activeAccount && (
                <button
                  onClick={() => setShowAccountPanel(false)}
                  style={styles.filterBtn}
                >
                  Cancel
                </button>
              )}
            </>
          )}
        </div>

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
            {/* STATS */}
            <div style={styles.statsCard}>
              <div style={styles.statNumber}>{wins.length}</div>
              <div style={styles.statLabel}>Victorious Champions</div>
            </div>

            {/* ADD CHAMP */}
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Champions</h2>

              {/* SEARCH */}
              <div style={styles.searchWrapper}>
                <span style={styles.searchIcon}>🔎</span>

                <input
                  placeholder="Search champions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.searchInput}
                />
              </div>

              {/* FILTERS */}
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

              {/* GRID */}
              <div style={styles.grid}>
                {filtered.map((c) => (
                  <div
                    key={c.id}
                    onMouseEnter={() => setHovered(c.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleAddWin(c.id)}
                    style={{
                      ...styles.cardChamp,
                      ...(hovered === c.id
                        ? styles.cardChampHover
                        : {}),
                    }}
                  >
                    <img
                      src={`${DRAGON}/img/champion/${c.id}.png`}
                      style={styles.icon}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* SELECTED */}
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Victorious Champions</h2>

              <div style={styles.grid}>
                {wins.map((champ) => (
                  <div
                    key={champ}
                    onClick={() => handleRemoveWin(champ)}
                    style={styles.winCard}
                  >
                    <img
                      src={`${DRAGON}/img/champion/${champ}.png`}
                      style={styles.icon}
                    />
                  </div>
                ))}
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
    color: "#e5e7eb",
    padding: "28px",
    fontFamily: "Cinzel, serif",
    display: "flex",
    justifyContent: "center",
    boxSizing: "border-box",

    /* NEW BACKGROUND */
    backgroundImage:
      "linear-gradient(rgba(5,7,13,0.85), rgba(5,7,13,0.92)), url('https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/27fd1033cf923429f0811e355402aecfb00d00cb-1751x1096.jpg?accountingTag=LoL&auto=format&fit=fill&q=80&w=1184')",

    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "fixed",
  },

  header: { textAlign: "center", marginBottom: 18 },

  title: {
    color: "#c8aa6e",
    fontSize: 34,
    letterSpacing: 2,
    textShadow: "0 0 12px rgba(200,170,110,0.4)",
  },

  card: {
    background:
      "linear-gradient(180deg, rgba(20,24,33,0.92), rgba(10,12,18,0.96))",
    border: "1px solid rgba(200,170,110,0.22)",
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
  },

  statsCard: {
    background:
      "linear-gradient(180deg, rgba(25,30,42,0.9), rgba(10,12,18,0.95))",
    border: "1px solid rgba(200,170,110,0.3)",
    borderRadius: 16,
    padding: 18,
    textAlign: "center",
    marginTop: 16,
  },

  statNumber: { fontSize: 42, color: "#c8aa6e" },

  statLabel: { fontSize: 12, color: "#9ca3af" },

  sectionTitle: { marginBottom: 12, color: "#c8aa6e" },

  input: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    background: "rgba(10,12,18,0.9)",
    color: "#fff",
    border: "1px solid rgba(200,170,110,0.25)",
    outline: "none",
  },

  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#c8aa6e",
    color: "#0b0f1a",
    cursor: "pointer",
  },

  searchWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(10,12,18,0.85)",
    border: "1px solid rgba(200,170,110,0.25)",
    marginBottom: 12,
  },

  searchIcon: { opacity: 0.7 },

  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#fff",
    fontSize: 14,
  },

  filters: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },

  filterBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(200,170,110,0.25)",
    background: "rgba(10,12,18,0.8)",
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: 12,
  },

  filterBtnActive: {
    background: "#c8aa6e",
    color: "#0b0f1a",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(54px, 1fr))",
    gap: 10,
    marginTop: 12,
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
    boxShadow: "0 0 18px rgba(200,170,110,0.25)",
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
  },

  accountRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 10,
  },

  activeAccount: {
    marginBottom: 10,
    color: "#c8aa6e",
  },
};