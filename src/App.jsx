import React, { useEffect, useState, useMemo } from "react";

const ROLES = ["ALL", "Fighter", "Tank", "Mage", "Assassin", "Marksman", "Support"];

export default function App() {
  const [patch, setPatch] = useState(null);

  const [champions, setChampions] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [ready, setReady] = useState(false);

  // ACCOUNTS
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [riotName, setRiotName] = useState("");

  // WINS
  const [wins, setWins] = useState([]);

  // ANIMATION STATE
  const [switching, setSwitching] = useState(false);

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

  // ================= CHAMPS =================
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
        setTimeout(() => setReady(true), 80);
      });
  }, [DRAGON]);

  // ================= LOAD ACCOUNTS =================
  useEffect(() => {
    const saved = localStorage.getItem("riot-accounts");
    const active = localStorage.getItem("active-account");

    if (saved) setAccounts(JSON.parse(saved));
    if (active) setActiveAccount(active);
  }, []);

  // ================= STORAGE KEY =================
  const storageKey = activeAccount
    ? `arena-wins:${activeAccount}`
    : null;

  // ================= LOAD WINS =================
  useEffect(() => {
    if (!storageKey) return;

    const saved = localStorage.getItem(storageKey);
    setWins(saved ? JSON.parse(saved) : []);
  }, [storageKey]);

  // ================= CREATE ACCOUNT =================
  const createAccount = () => {
    if (!riotName) return;

    const updated = [...accounts, riotName];

    setAccounts(updated);
    setActiveAccount(riotName);

    localStorage.setItem("riot-accounts", JSON.stringify(updated));
    localStorage.setItem("active-account", riotName);

    setRiotName("");
  };

  // ================= SWITCH ACCOUNT (ANIMATION) =================
  const switchAccount = (name) => {
    setSwitching(true);

    setTimeout(() => {
      setActiveAccount(name);
      localStorage.setItem("active-account", name);
      setSwitching(false);
    }, 180);
  };

  // ================= WINS =================
  const addWin = (champion) => {
    const newWin = { champion, timestamp: Date.now() };
    const updated = [newWin, ...wins];

    setWins(updated);

    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  };

  const removeWin = (champion) => {
    const updated = wins.filter((w) => w.champion !== champion);

    setWins(updated);

    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  };

  // ================= FILTER =================
  const owned = useMemo(
    () => new Set(wins.map((w) => w.champion)),
    [wins]
  );

  const filtered = useMemo(() => {
    return champions.filter((c) => {
      const matchSearch = c.id.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "ALL" || c.tags.includes(roleFilter);
      return matchSearch && matchRole && !owned.has(c.id);
    });
  }, [search, champions, roleFilter, owned]);

  // ================= UI =================
  return (
    <div style={styles.app}>
      {/* HEADER */}
      <div style={styles.header}>
        <h1 style={styles.title}>🏆 Arena Tracker</h1>
      </div>

      {/* ACCOUNTS */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Contas</h2>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="Nova conta (Game Name)"
            value={riotName}
            onChange={(e) => setRiotName(e.target.value)}
            style={styles.input}
          />

          <button onClick={createAccount} style={styles.filterBtnActive}>
            criar
          </button>
        </div>

        <div style={styles.accountRow}>
          {accounts.map((acc) => (
            <button
              key={acc}
              onClick={() => switchAccount(acc)}
              style={{
                ...styles.filterBtn,
                ...(activeAccount === acc ? styles.filterBtnActive : {}),
              }}
            >
              {acc}
            </button>
          ))}
        </div>

        {activeAccount && (
          <div style={styles.activeAccount}>
            conta ativa: <b>{activeAccount}</b>
          </div>
        )}
      </div>

      {/* MAIN (ANIMATED SWITCH) */}
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
            <div style={styles.statLabel}>vitórias desta conta</div>
          </div>

          {/* CHAMPS GRID */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Adicionar campeão</h2>

            <input
              placeholder="Procurar campeão..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.input}
            />

            <div style={styles.filters}>
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  style={{
                    ...styles.filterBtn,
                    ...(roleFilter === r ? styles.filterBtnActive : {}),
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            <div style={styles.grid}>
              {filtered.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => addWin(c.id)}
                  className="champ"
                  style={{
                    ...styles.cardChamp,
                    opacity: ready ? 1 : 0,
                    transform: ready
                      ? "translateY(0)"
                      : "translateY(10px) scale(0.95)",
                    transition: `all 0.25s ease ${i * 10}ms`,
                  }}
                >
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${c.id}.png`}
                    style={styles.icon}
                  />
                  <div style={styles.glow}></div>
                </div>
              ))}
            </div>
          </div>

          {/* WINS GRID */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Champs com vitória</h2>

            <div style={styles.grid}>
              {wins.map((w) => (
                <div
                  key={w.champion + w.timestamp}
                  onClick={() => removeWin(w.champion)}
                  className="champ"
                  style={styles.winCard}
                >
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${w.champion}.png`}
                    style={styles.icon}
                  />
                  <div style={styles.removeOverlay}>remover</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL ANIMATIONS */}
      <style>{`
        .champ {
          position: relative;
          cursor: pointer;
          transition: transform 0.18s ease, filter 0.18s ease;
        }

        .champ:hover {
          transform: translateY(-4px) scale(1.12);
          filter: brightness(1.25);
        }

        .champ:active {
          transform: scale(0.96);
        }
      `}</style>
    </div>
  );
}

/* STYLE */
const styles = {
  app: {
    background: "radial-gradient(circle at top, #0f172a, #0b0f19)",
    minHeight: "100vh",
    color: "#e5e7eb",
    padding: "28px",
    fontFamily: "Inter, Arial",
  },

  header: { marginBottom: 18 },

  title: {
    color: "#f5d06f",
    fontSize: 28,
  },

  subtitle: {
    color: "#9ca3af",
    fontSize: 12,
  },

  card: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(245,208,111,0.2)",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },

  statsCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(245,208,111,0.2)",
    borderRadius: 14,
    padding: 16,
    textAlign: "center",
    marginTop: 16,
  },

  statNumber: {
    fontSize: 34,
    color: "#f5d06f",
  },

  statLabel: {
    fontSize: 12,
    color: "#9ca3af",
  },

  sectionTitle: {
    marginBottom: 12,
    color: "#f5d06f",
  },

  input: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    background: "#0f172a",
    color: "#fff",
    border: "1px solid rgba(245,208,111,0.2)",
    marginBottom: 10,
  },

  filters: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },

  filterBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(245,208,111,0.2)",
    background: "#0f172a",
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: 12,
  },

  filterBtnActive: {
    background: "#f5d06f",
    color: "#000",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(46px, 1fr))",
    gap: 6,
    marginTop: 10,
  },

  cardChamp: { position: "relative" },
  winCard: { position: "relative" },

  icon: {
    width: 46,
    height: 46,
    borderRadius: 10,
  },

  glow: {
    position: "absolute",
    inset: 0,
    borderRadius: 10,
    background:
      "radial-gradient(circle at center, rgba(245,208,111,0.25), transparent 70%)",
    opacity: 0,
  },

  removeOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
    color: "#f5d06f",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    opacity: 0,
  },

  accountRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 10,
  },

  activeAccount: {
    marginTop: 10,
    color: "#f5d06f",
  },
};