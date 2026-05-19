import { supabase } from "./supabase";

// ================= ENSURE USER =================
export async function ensureUser(username) {
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
        },
      ]);

    if (insertError) {
      console.error("ensureUser insert error:", insertError);
    }
  }else console.log("criado user")
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

// ================= REMOVE =================
export async function removeWin(username, champion) {
  const { data, error } = await supabase
    .from("wins")
    .select("champions")
    .eq("username", username)
    .maybeSingle(); // 🔥 FIX AQUI

  if (error) {
    console.error("removeWin select error:", error);
    return;
  }

  const current = data?.champions || [];

  const updated = current.filter((c) => c !== champion);

  const { error: updateError } = await supabase
    .from("wins")
    .update({ champions: updated })
    .eq("username", username);

  if (updateError) {
    console.error("removeWin update error:", updateError);
  }
}