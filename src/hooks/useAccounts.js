import { useEffect, useState } from "react";
import { ensureUser, getWins, getMatches } from "../db/api";

// Gestão de contas (cada uma: { username, riotAccount, riotTag, region,
// puuid?, lastCanaryPatch?, lastCanaryCheck? }) + a Coleção/Histórico da
// conta ativa. Estão juntos aqui (não em hooks separados) porque, no código
// original, sempre estiveram interligados por design: trocar de conta ativa
// recarrega logo wins/matches, e apagar a conta ativa tem de os limpar
// explicitamente (ver deleteAccount) — separar isto exigiria o mesmo nível
// de coordenação entre hooks, só que mais difícil de seguir.
// "onNeedsAccountSetup" é chamado no efeito de arranque quando não há
// nenhuma conta guardada (ou a lista guardada está vazia) — usado pelo
// App.jsx para abrir logo as Definições na tab de contas.
export function useAccounts({ onNeedsAccountSetup } = {}) {
  // cada conta: { username, riotAccount, riotTag }
  // "username" é só a etiqueta que vês na app; "riotAccount" (+ "riotTag") é
  // o Riot ID usado para sincronizar automaticamente com o League e para
  // importar histórico via Riot API.
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [switching, setSwitching] = useState(false);

  const [wins, setWins] = useState([]);
  const [matches, setMatches] = useState([]);
  // Distingue "ainda não chegaram dados" de "chegaram e não há nenhum" —
  // sem isto, trocar de conta (ou o arranque inicial) mostrava por instantes
  // um ecrã "sem partidas" só porque wins/matches ainda estavam vazios à
  // espera da resposta da Supabase, não porque a conta realmente não
  // tivesse histórico nenhum (ver Loading.jsx, usado enquanto isto é true).
  const [dataLoading, setDataLoading] = useState(false);

  // ================= LOAD ACCOUNTS =================
  useEffect(() => {
    const saved = localStorage.getItem("riot-accounts");
    const active = localStorage.getItem("active-account");

    if (saved) {
      const parsed = JSON.parse(saved);
      // migração: versões antigas guardavam só strings, ou objetos sem riotTag
      const normalized = parsed.map((a) =>
        typeof a === "string"
          ? { username: a, riotAccount: a, riotTag: "", region: "europe" }
          : { riotTag: "", region: "europe", ...a }
      );
      setAccounts(normalized);

      if (normalized.length === 0) onNeedsAccountSetup?.();
    } else {
      onNeedsAccountSetup?.();
    }

    if (active) setActiveAccount(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ================= WINS + MATCHES =================
  useEffect(() => {
    if (!activeAccount) return;

    let cancelled = false;
    setDataLoading(true);
    const startedAt = Date.now();

    // Uma conta com poucos dados responde tão depressa (Supabase local/perto)
    // que "dataLoading" ligava e desligava num único frame — impercetível a
    // olho nu, por isso o Loading nunca chegava a aparecer visivelmente. Um
    // mínimo de tempo visível (comum em UIs de loading) garante que, quando
    // aparece, dá para ver mesmo, sem depender da sorte da velocidade da rede.
    const MIN_VISIBLE_MS = 400;

    Promise.all([getWins(activeAccount), getMatches(activeAccount)]).then(([winsData, matchesData]) => {
      if (cancelled) return;

      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

      setTimeout(() => {
        if (cancelled) return;
        setWins(winsData || []);
        setMatches(matchesData || []);
        setDataLoading(false);
      }, remaining);
    });

    // Se a conta ativa mudar outra vez antes desta resposta chegar (troca
    // rápida de conta), não deixa a resposta antiga da conta anterior
    // repor "dataLoading" a false por cima do carregamento da conta nova.
    return () => {
      cancelled = true;
    };
  }, [activeAccount]);

  // ================= GESTÃO DE CONTAS =================
  const createAccountFromManager = async (username, riotAccountRaw, riotTagRaw, regionRaw) => {
    const riotAccount = riotAccountRaw || username;
    const riotTag = riotTagRaw || "";
    const region = regionRaw || "europe";

    const exists = accounts.some((a) => a.username === username);
    const updated = exists
      ? accounts
      : [...accounts, { username, riotAccount, riotTag, region }];

    setAccounts(updated);
    setActiveAccount(username);

    localStorage.setItem("riot-accounts", JSON.stringify(updated));
    localStorage.setItem("active-account", username);

    await ensureUser(username);
  };

  const updateRiotAccountFor = (username, { riotAccount, riotTag, region }) => {
    const updated = accounts.map((a) => {
      if (a.username !== username) return a;

      const newRiotAccount = riotAccount?.trim() || username;
      const newRiotTag = riotTag?.trim() || "";
      // Se o Riot ID (nome ou tag) mudar, o puuid guardado em cache já não
      // corresponde a ninguém real — limpa-o para forçar uma nova resolução
      // via account-v1 na próxima sincronização (ver puuid em syncActiveAccount).
      const identityChanged = newRiotAccount !== a.riotAccount || newRiotTag !== a.riotTag;

      return {
        ...a,
        riotAccount: newRiotAccount,
        riotTag: newRiotTag,
        region: region || a.region || "europe",
        puuid: identityChanged ? null : a.puuid,
      };
    });

    setAccounts(updated);
    localStorage.setItem("riot-accounts", JSON.stringify(updated));
  };

  const deleteAccount = (username) => {
    const updated = accounts.filter((a) => a.username !== username);
    setAccounts(updated);
    localStorage.setItem("riot-accounts", JSON.stringify(updated));

    if (activeAccount === username) {
      setActiveAccount(null);
      setWins([]);
      setMatches([]);
      localStorage.removeItem("active-account");
    }
  };

  // "onSwitched" é chamado no mesmo instante que setActiveAccount/setSwitching
  // (dentro do mesmo setTimeout) — usado pelo App.jsx para fechar as
  // Definições exatamente quando a troca de conta se torna visível, não
  // antes (o próprio switchAccount não espera pelo setTimeout, por isso
  // encadear depois de "await switchAccount(...)" fecharia as Definições
  // demasiado cedo).
  const switchAccount = async (name, onSwitched) => {
    setSwitching(true);

    await ensureUser(name);
    localStorage.setItem("active-account", name);

    setTimeout(() => {
      setActiveAccount(name);
      setSwitching(false);
      onSwitched?.();
    }, 180);
  };

  return {
    accounts,
    setAccounts,
    activeAccount,
    setActiveAccount,
    switching,
    wins,
    setWins,
    matches,
    setMatches,
    dataLoading,
    createAccountFromManager,
    updateRiotAccountFor,
    deleteAccount,
    switchAccount,
  };
}
