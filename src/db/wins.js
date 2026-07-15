import { supabase } from "./supabase";

// ================= ENSURE USER =================
// "identity" (opcional) é a informação Riot conhecida já nesta altura
// (ver createAccountFromManager em useAccounts.js) — só grava o que já
// houver; ver setUserRiotIdentity para o preenchimento/atualização feito a
// cada sincronização (é aí que o puuid fica conhecido).
export async function ensureUser(username, identity = null) {
  const { data, error } = await supabase
    .from("wins")
    .select("username")
    .eq("username", username);

  if (error) {
    console.error("ensureUser error:", error);
    return;
  }

  if (!data || data.length === 0) {
    const { error: insertError } = await supabase
      .from("wins")
      .insert([
        {
          username,
          champions: [],
          riot_game_name: identity?.riotGameName || null,
          riot_tag_line: identity?.riotTagLine || null,
          puuid: identity?.puuid || null,
        },
      ]);

    if (insertError) {
      console.error("ensureUser insert error:", insertError);
    }
  }else console.log("criado user")
}

// ================= IDENTIDADE RIOT (para a tab Comparar) =================
// Grava/atualiza o Riot ID (e puuid, quando já resolvido) associado a um
// username — permite à tab Comparar encontrar a conta de alguém pelo Riot
// ID dele, mesmo que o "username" (etiqueta livre da app) não tenha nada a
// ver com o nome/tag Riot reais. Chamado a cada sincronização com sucesso
// (ver useRiotSync.js), por isso qualquer conta com histórico já importado
// fica automaticamente pesquisável assim que sincronizar de novo — mesmo
// contas criadas antes desta funcionalidade existir.
export async function setUserRiotIdentity(username, { riotGameName, riotTagLine, puuid } = {}) {
  if (!username || !riotGameName || !riotTagLine) return;

  const { error } = await supabase
    .from("wins")
    .update({
      riot_game_name: riotGameName,
      riot_tag_line: riotTagLine,
      puuid: puuid || null,
    })
    .eq("username", username);

  if (error) {
    console.error("setUserRiotIdentity error:", error);
  }
}

// Resolve um Riot ID (nome + tag) para o username de uma conta já
// sincronizada por alguém (a própria conta do utilizador, ou a de um
// amigo — a Supabase é partilhada) — ver setUserRiotIdentity acima para
// como este mapeamento é preenchido. Comparação sem distinguir maiúsculas
// (a Riot também não distingue).
export async function findUsernameByRiotId(gameName, tagLine) {
  if (!gameName || !tagLine) return null;

  const { data, error } = await supabase
    .from("wins")
    .select("username")
    .ilike("riot_game_name", gameName.trim())
    .ilike("riot_tag_line", tagLine.trim())
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("findUsernameByRiotId error:", error);
    return null;
  }

  return data?.username || null;
}

// Pesquisa contas (de qualquer user, a Supabase é partilhada) cujo nome Riot
// comece por "query" — usado pelo autocompletar da tab Comparar: escrever
// "skygee" mostra TODAS as contas conhecidas com esse nome (tags/servidores
// diferentes), para escolher a certa em vez de adivinhar a tag de cor.
// "has_matches" (calculado na própria function, ver search_accounts_by_name
// em supabase/schema.sql) diz logo quais já têm partidas sincronizadas, sem
// precisar de um segundo pedido por sugestão. Só entram contas com
// identidade Riot já preenchida (ver setUserRiotIdentity), ou seja, que já
// sincronizaram pelo menos uma vez depois desta funcionalidade existir.
export async function searchAccountsByGameName(query) {
  const q = query?.trim();
  if (!q) return [];

  const { data, error } = await supabase.rpc("search_accounts_by_name", { p_query: q });

  if (error) {
    console.error("searchAccountsByGameName error:", error);
    return [];
  }

  return data || [];
}

// ================= GET =================
export async function getWins(username) {
  const { data, error } = await supabase
    .from("wins")
    .select("champions")
    .eq("username", username)
    .maybeSingle(); // 🔥 FIX AQUI

  if (error) {
    console.error("getWins error:", error);
    return [];
  }

  return data?.champions || [];
}

// ================= ADD =================
export async function addWin(username, champion) {
    console.log(username, champion)
  const { data, error } = await supabase
    .from("wins")
    .select("champions")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error("addWin select error:", error);
    return;
  }

  let current = data?.champions;
  console.log(current)
  // 🔥 se não existir row → cria
  if (!current) {
    const { error: insertError } = await supabase.from("wins").insert([
      {
        username,
        champions: [champion],
      },
    ]);

    if (insertError) console.error(insertError);
    return;
  }

  if (current.includes(champion)) return;

  const updated = [...current, champion];
  console.log(updated)
  const { error: updateError } = await supabase
    .from("wins")
    .update({ champions: updated })
    .eq("username", username);
  if (updateError) {
    console.error("addWin update error:", updateError);
  }
}
