import { createContext, createElement, useContext, useEffect, useState } from "react";

// Idioma da interface — Português (Portugal) por defeito, com alternativa em
// inglês. Cobre os textos estáticos (abas, botões, filtros, títulos,
// tooltips, estados vazios). Mensagens muito dinâmicas (ex: resultado da
// sincronização com contagens/pluralização) continuam só em português nesta
// primeira versão — ver DICTIONARY mais abaixo para a lista completa de
// chaves já traduzidas.
export const LANGUAGES = { pt: "Português", en: "English" };

const DICTIONARY = {
  // ================= ABAS =================
  tab_overview: { pt: "Visão Geral", en: "Overview" },
  tab_wins: { pt: "Coleção", en: "Collection" },
  tab_history: { pt: "Histórico", en: "History" },
  tab_stats: { pt: "Estatísticas", en: "Statistics" },
  tab_achievements: { pt: "Conquistas", en: "Achievements" },

  // ================= TOPO / CONTA =================
  no_account: { pt: "Sem conta", en: "No account" },
  cold_loading: { pt: "A carregar dados do patch…", en: "Loading patch data…" },
  theme_to_light: { pt: "Mudar para tema claro", en: "Switch to light theme" },
  theme_to_dark: { pt: "Mudar para tema escuro", en: "Switch to dark theme" },
  manage_accounts: { pt: "Gerir contas", en: "Manage accounts" },
  switch_account_tooltip: { pt: "Trocar de conta / gerir contas", en: "Switch account / manage accounts" },
  open_settings: { pt: "Definições", en: "Settings" },
  settings_title: { pt: "Definições", en: "Settings" },
  settings_tab_general: { pt: "Geral", en: "General" },
  settings_tab_accounts: { pt: "Contas", en: "Accounts" },
  settings_theme_label: { pt: "Tema", en: "Theme" },
  settings_theme_dark: { pt: "Escuro", en: "Dark" },
  settings_theme_light: { pt: "Claro", en: "Light" },
  settings_header_label: { pt: "Cabeçalho", en: "Header" },
  settings_header_compact_opt: { pt: "Compacto", en: "Compact" },
  settings_header_expanded_opt: { pt: "Expandido", en: "Expanded" },
  settings_general_hint: {
    pt: "Preferências rápidas — para gerir contas, usa a aba \"Contas\".",
    en: "Quick preferences — to manage accounts, use the \"Accounts\" tab.",
  },
  sync_btn: { pt: "Sincronizar", en: "Sync" },
  sync_btn_loading: { pt: "A sincronizar…", en: "Syncing…" },
  sync_btn_tooltip: {
    pt: "Sincronizar com a Riot API (só partidas novas desde a última vez)",
    en: "Sync with the Riot API (only new matches since last time)",
  },
  enrich_btn: { pt: "🩹 Enriquecer histórico", en: "🩹 Enrich history" },
  repair_wins_btn: { pt: "🏆 Reparar vitórias", en: "🏆 Repair wins" },
  repair_wins_tooltip: {
    pt: "{count} campeão(ões) têm partidas ganhas no histórico mas não constam na tua lista de vitórias — corrige isso a partir dos dados já guardados",
    en: "{count} champion(s) have won matches in your history but aren't in your wins list — fixes this from the data already saved",
  },
  repairing_wins: { pt: "A reparar vitórias…", en: "Repairing wins…" },
  wins_repaired: { pt: "vitória(s) recuperada(s).", en: "win(s) recovered." },
  last_sync: { pt: "Última sincronização", en: "Last sync" },
  never: { pt: "nunca", en: "never" },

  // ================= STATSBAR =================
  format_all: { pt: "Todos os formatos", en: "All formats" },
  format_2v2: { pt: "2v2 (8 equipas)", en: "2v2 (8 teams)" },
  format_3v3: { pt: "3v3 (6 equipas)", en: "3v3 (6 teams)" },
  // Versões curtas — usadas no seletor de formato quando este partilha a
  // linha com as tabs (ver App.jsx); o texto completo acima passa a viver
  // no tooltip de cada botão.
  format_all_short: { pt: "Todos", en: "All" },
  format_2v2_short: { pt: "2v2", en: "2v2" },
  format_3v3_short: { pt: "3v3", en: "3v3" },
  stat_games: { pt: "Jogos", en: "Games" },
  stat_games_singular: { pt: "jogo", en: "game" },
  placement_first_short: { pt: "1º", en: "1st" },
  stat_wins_first: { pt: "Vitórias (1º)", en: "Wins (1st)" },
  stat_wins_top3: { pt: "Vitórias (Top 3)", en: "Wins (Top 3)" },
  stat_losses: { pt: "Derrotas (abaixo do Top 3)", en: "Losses (below Top 3)" },
  stat_winrate_first: { pt: "Winrate (1º)", en: "Winrate (1st)" },
  stat_winrate_top3: { pt: "Winrate (Top 3)", en: "Winrate (Top 3)" },
  stat_kda: { pt: "KDA médio", en: "Average KDA" },
  champions_suffix: { pt: "campeões", en: "champions" },
  stats_collapse: { pt: "Comprimir cabeçalho", en: "Compress header" },
  stats_expand: { pt: "Expandir cabeçalho", en: "Expand header" },

  // ================= VISÃO GERAL =================
  overview_roster_progress: { pt: "Progresso do roster", en: "Roster progress" },
  overview_recent_form: { pt: "Forma recente", en: "Recent form" },
  overview_activity: { pt: "Atividade", en: "Activity" },
  overview_sessions: { pt: "Sessões recentes", en: "Recent sessions" },
  session_avg_placement: { pt: "Lugar médio", en: "Avg placement" },
  session_best: { pt: "Melhor", en: "Best" },
  overview_duo_synergy: { pt: "Jogadores premade", en: "Premade players" },
  overview_highlights: { pt: "Destaques", en: "Highlights" },
  overview_total_games: { pt: "Partidas jogadas", en: "Games played" },
  overview_top3_rate: { pt: "Taxa de Top 3", en: "Top 3 rate" },
  overview_top1_rate: { pt: "Taxa de 1º lugar", en: "1st place rate" },
  stat_top3_short: { pt: "Top3", en: "Top3" },
  achv_unlocked: { pt: "Conquistado", en: "Unlocked" },
  achv_locked: { pt: "Por conquistar", en: "Locked" },
  achv_page_title: { pt: "Conquistas", en: "Achievements" },
  achv_empty: {
    pt: "Ainda sem conquistas para mostrar. Joga uma Arena com a app aberta — os teus marcos começam a aparecer aqui.",
    en: "No achievements to show yet. Play an Arena match with the app open — your milestones start showing up here.",
  },
  achv_closest_title: { pt: "Quase lá", en: "Almost there" },
  achv_cat_wins: { pt: "Vitórias totais", en: "Total wins" },
  achv_cat_games: { pt: "Partidas jogadas", en: "Games played" },
  achv_cat_coverage: { pt: "Cobertura do roster", en: "Roster coverage" },
  achv_cat_winstreak: { pt: "Melhor sequência de vitórias", en: "Best win streak" },
  achv_cat_top3streak: { pt: "Melhor sequência de Top 3", en: "Best Top 3 streak" },
  achv_cat_triplekill: { pt: "Triple Kills conquistados", en: "Triple Kills earned" },
  achv_cat_damage: { pt: "Maior dano numa partida", en: "Highest damage in a game" },
  achv_cat_healing: { pt: "Maior cura numa partida", en: "Highest healing in a game" },
  achv_cat_favorite: { pt: "Partidas com o campeão favorito", en: "Games with favorite champion" },
  achv_cat_diversity: { pt: "Campeões diferentes jogados", en: "Different champions played" },
  achv_cat_marathon: { pt: "Maratona (sessão mais longa)", en: "Marathon (longest session)" },
  achv_cat_duo: { pt: "Parceiro premade mais fiel", en: "Most loyal premade partner" },
  achv_cat_wins2v2: { pt: "Vitórias em 2v2", en: "2v2 wins" },
  achv_cat_wins3v3: { pt: "Vitórias em 3v3", en: "3v3 wins" },
  achv_cat_special: { pt: "Especiais", en: "Special" },
  achv_perfect_title: { pt: "Vitória perfeita", en: "Perfect victory" },
  achv_perfect_desc: {
    pt: "Terminar em 1º lugar sem morrer nenhuma vez",
    en: "Finish in 1st place without dying once",
  },
  achv_earlybird_title: { pt: "Madrugador", en: "Night owl" },
  achv_earlybird_desc: {
    pt: "Jogar uma partida entre a meia-noite e as 6h",
    en: "Play a match between midnight and 6am",
  },
  heatmap_less: { pt: "Menos", en: "Less" },
  heatmap_more: { pt: "Mais", en: "More" },
  streak_wins_suffix: { pt: "vitórias seguidas", en: "win streak" },
  streak_losses_suffix: { pt: "derrotas seguidas", en: "loss streak" },
  streak_best_label: { pt: "Melhor streak", en: "Best streak" },
  streak_best_tooltip: {
    pt: "Maior sequência de vitórias seguidas de sempre",
    en: "Longest win streak ever recorded",
  },
  overview_empty: {
    pt: "Ainda sem dados. Joga uma Arena com a app aberta para começares a ver estatísticas aqui.",
    en: "No data yet. Play an Arena match with the app open to start seeing stats here.",
  },
  overview_see_more: { pt: "Ver nas Estatísticas →", en: "See in Statistics →" },
  spotlight_most_first: { pt: "Mais vezes em 1º", en: "Most 1st places" },
  spotlight_most_top3: { pt: "Mais vezes no Top 3", en: "Most Top 3 finishes" },
  spotlight_most_games: { pt: "Mais jogos", en: "Most games" },
  spotlight_best_kda: { pt: "Melhor KDA", en: "Best KDA" },
  spotlight_most_below_top3: { pt: "Mais vezes abaixo do Top 3", en: "Most finishes below Top 3" },
  spotlight_worst_kda: { pt: "Pior KDA", en: "Worst KDA" },
  spotlight_most_last: { pt: "Mais vezes em último", en: "Most last-place finishes" },
  spotlight_highest_damage: { pt: "Maior dano médio", en: "Highest average damage" },
  spotlight_highest_healing: { pt: "Maior cura média", en: "Highest average healing" },
  spotlight_highest_damage_taken: { pt: "Maior dano recebido médio", en: "Highest average damage taken" },
  spotlight_highest_hp: { pt: "Maior HP médio", en: "Highest average HP" },
  spotlight_highest_gold: { pt: "Maior ouro médio", en: "Highest average gold" },
  spotlight_best_damage_game: { pt: "Maior dano numa partida", en: "Highest damage in a game" },
  spotlight_best_healing_game: { pt: "Maior cura numa partida", en: "Highest healing in a game" },
  spotlight_best_damage_taken_game: { pt: "Mais dano levado numa partida", en: "Most damage taken in a game" },
  spotlight_best_hp_game: { pt: "Maior HP numa partida", en: "Highest HP in a game" },
  spotlight_best_gold_game: { pt: "Mais ouro numa partida", en: "Most gold in a game" },
  spotlight_fastest_win: { pt: "Vitória mais rápida", en: "Fastest win" },
  spotlight_longest_game: { pt: "Partida mais longa", en: "Longest game" },
  spotlight_most_kills_game: { pt: "Mais kills numa partida", en: "Most kills in a game" },
  spotlight_highest_doubles: { pt: "Maior média de double kills", en: "Highest average double kills" },
  spotlight_highest_triples: { pt: "Maior média de triple kills", en: "Highest average triple kills" },
  spotlight_best_doubles_game: { pt: "Mais double kills numa partida", en: "Most double kills in a game" },
  spotlight_best_triples_game: { pt: "Mais triple kills numa partida", en: "Most triple kills in a game" },
  spotlight_most_deaths_game: { pt: "Mais mortes numa partida", en: "Most deaths in a game" },
  spotlight_most_assists_game: { pt: "Mais assists numa partida", en: "Most assists in a game" },
  // Subtítulos dos 3 grupos de destaques (ver Overview.jsx) — em vez de uma
  // grelha só com tudo misturado, cada grupo diz logo que tipo de cartão é.
  // Agrupados por tema (não por "média vs. recorde de partida") — cada
  // subtítulo mistura de propósito a média por campeão com o recorde numa
  // partida do mesmo assunto (ver Overview.jsx).
  overview_highlights_wins: { pt: "Vitórias & Lugares", en: "Wins & Placements" },
  overview_highlights_combat: { pt: "Combate & KDA", en: "Combat & KDA" },
  overview_highlights_multikill: { pt: "Kills múltiplos", en: "Multikills" },
  overview_highlights_economy: { pt: "Economia", en: "Economy" },
  overview_highlights_survival: { pt: "Sobrevivência & Dano", en: "Survival & Damage" },
  stat_doubles: { pt: "Double kills (média)", en: "Double kills (avg)" },
  stat_triples: { pt: "Triple kills (média)", en: "Triple kills (avg)" },
  compare_avg_doubles: { pt: "Média de double kills", en: "Average double kills" },
  compare_avg_triples: { pt: "Média de triple kills", en: "Average triple kills" },

  // ================= HISTÓRICO =================
  history_empty: {
    pt: "Ainda sem partidas registadas. Joga uma Arena com a app aberta — o resultado aparece aqui automaticamente.",
    en: "No matches recorded yet. Play an Arena match with the app open — the result appears here automatically.",
  },
  filter_placement_tooltip: { pt: "Filtrar pelo lugar em que ficaste na Arena", en: "Filter by the placement you got in the Arena" },
  filter_all_placements: { pt: "Todos os lugares", en: "All placements" },
  filter_no_placement_data: { pt: "Sem dados de lugar", en: "No placement data" },
  filter_all_champions: { pt: "Todos os campeões", en: "All champions" },
  filter_format_tooltip: {
    pt: "A Arena já teve formatos diferentes: 8 equipas de 2 e 6 equipas de 3",
    en: "Arena has had different formats: 8 teams of 2 and 6 teams of 3",
  },
  sort_tooltip: { pt: "Ordenar", en: "Sort" },
  filter_group_placement: { pt: "Lugar", en: "Placement" },
  filter_group_format: { pt: "Formato", en: "Format" },
  filter_group_sort: { pt: "Ordenar por", en: "Sort by" },
  search_champion_placeholder: { pt: "Procurar campeão...", en: "Search champion..." },
  compare_slot_a_label: { pt: "Comparar A", en: "Compare A" },
  compare_slot_b_label: { pt: "Comparar B", en: "Compare B" },
  no_filtered_results: {
    pt: "Nenhuma partida corresponde aos filtros atuais.",
    en: "No matches fit the current filters.",
  },
  no_filtered_champions: {
    pt: "Nenhum campeão corresponde à busca.",
    en: "No champion matches the search.",
  },
  sort_most_recent: { pt: "Mais recentes", en: "Most recent" },
  sort_oldest: { pt: "Mais antigas", en: "Oldest" },
  sort_best_placement: { pt: "Melhor lugar", en: "Best placement" },
  sort_worst_placement: { pt: "Pior lugar", en: "Worst placement" },
  sort_best_kda: { pt: "Melhor KDA", en: "Best KDA" },
  sort_longest: { pt: "Partidas mais longas", en: "Longest matches" },
  export_btn: { pt: "⇩ Exportar (formato Riot)", en: "⇩ Export (Riot format)" },
  export_csv_btn: { pt: "⇩ Exportar (CSV)", en: "⇩ Export (CSV)" },
  exporting: { pt: "A exportar...", en: "Exporting..." },
  export_success: { pt: "Histórico exportado para", en: "History exported to" },
  export_error: { pt: "Erro ao exportar", en: "Export error" },
  section_stats: { pt: "Estatísticas", en: "Stats" },
  section_build: { pt: "Build", en: "Build" },
  section_augments: { pt: "Augments", en: "Augments" },
  section_teammates_opponents: { pt: "Colegas e Adversários", en: "Teammates and Opponents" },
  your_team: { pt: "A tua equipa", en: "Your team" },
  cs_tooltip: { pt: "Creep score (minions + monstros)", en: "Creep score (minions + monsters)" },
  arena_placement_tooltip: { pt: "Lugar na Arena", en: "Arena placement" },
  no_placement_fallback_tooltip: {
    pt: "Sem lugar exato (só Live Client Data) — mostra Vitória/Derrota",
    en: "No exact placement (Live Client Data only) — shows Win/Loss",
  },
  no_build_saved: { pt: "Sem build guardada para esta partida.", en: "No build saved for this match." },
  available_after_riot_sync: {
    pt: "Disponível quando sincronizares com a Riot API (histórico oficial).",
    en: "Available once you sync with the Riot API (official history).",
  },
  available_after_riot_link: {
    pt: "Disponível quando ligares a Riot API (histórico oficial).",
    en: "Available once you connect the Riot API (official history).",
  },
  available_after_riot_enrich: {
    pt: "Disponível quando sincronizares/enriqueceres esta partida com a Riot API.",
    en: "Available once you sync/enrich this match with the Riot API.",
  },
  stat_damage_dealt: { pt: "Dano a campeões", en: "Damage to champions" },
  stat_damage_taken: { pt: "Dano recebido", en: "Damage taken" },
  stat_gold: { pt: "Ouro ganho", en: "Gold earned" },
  stat_vision: { pt: "Vision score", en: "Vision score" },
  stat_healing: { pt: "Cura", en: "Healing" },
  stat_cs: { pt: "CS", en: "CS" },
  stat_hp: { pt: "HP máximo", en: "Max HP" },

  // ================= ESTATÍSTICAS =================
  stats_by_champion: { pt: "Por campeão", en: "By champion" },
  sort_champions_tooltip: { pt: "Ordenar a lista de campeões", en: "Sort the champion list" },
  sort_most_played: { pt: "Mais jogados", en: "Most played" },
  sort_best_winrate: { pt: "Melhor winrate (1º)", en: "Best winrate (1st)" },
  sort_best_top3: { pt: "Melhor Top 3", en: "Best Top 3" },
  sort_name_az: { pt: "Nome (A-Z)", en: "Name (A-Z)" },
  section_placements: { pt: "Lugares (nº de vezes em cada um)", en: "Placements (times in each)" },
  section_averages: { pt: "Médias por partida", en: "Averages per match" },
  section_best_games: { pt: "Melhores partidas", en: "Best games" },
  section_recent_placements: { pt: "Lugares recentes", en: "Recent placements" },
  section_top_items: { pt: "Itens mais usados", en: "Most used items" },
  section_top_augments: { pt: "Augments mais usados", en: "Most used augments" },
  section_winning_build: { pt: "Build vencedora", en: "Winning build" },
  in_wins_suffix: { pt: "em vitórias", en: "in wins" },
  section_matchups: { pt: "Adversários", en: "Matchups" },
  matchups_disclaimer: {
    pt: "Baseado em quem esteve na mesma partida, não necessariamente na mesma ronda em que se enfrentaram diretamente.",
    en: "Based on who was in the same match, not necessarily the exact round you fought them in.",
  },
  matchups_best: { pt: "Melhor desempenho contra", en: "Best performance against" },
  matchups_worst: { pt: "Pior desempenho contra", en: "Worst performance against" },
  build_filter_placeholder: { pt: "Filtrar por augment ou item...", en: "Filter by augment or item..." },
  build_filter_label: { pt: "Filtrar build", en: "Filter build" },
  filtered_by_build: { pt: "Filtrado por", en: "Filtered by" },
  augment_label: { pt: "Augment", en: "Augment" },
  item_label: { pt: "Item", en: "Item" },
  compare_champions: { pt: "Comparar campeões", en: "Compare champions" },
  compare_show: { pt: "Comparar", en: "Compare" },
  compare_hide: { pt: "Fechar", en: "Close" },
  compare_pick_two: { pt: "Escolhe dois campeões para comparar", en: "Pick two champions to compare" },
  compare_games: { pt: "Partidas", en: "Games" },
  compare_winrate: { pt: "Winrate", en: "Winrate" },
  compare_top3rate: { pt: "Top 3 rate", en: "Top 3 rate" },
  compare_kda: { pt: "KDA médio", en: "Average KDA" },
  compare_avg_damage: { pt: "Dano médio", en: "Avg damage" },
  compare_avg_damage_taken: { pt: "Dano sofrido médio", en: "Avg damage taken" },
  compare_avg_healing: { pt: "Cura média", en: "Avg healing" },
  compare_avg_hp: { pt: "HP máximo médio", en: "Avg max HP" },
  compare_avg_gold: { pt: "Ouro médio", en: "Avg gold" },
  best_multikill: { pt: "Melhor multikill", en: "Best multikill" },
  no_placement_data_yet: { pt: "Disponível quando sincronizares com a Riot API.", en: "Available once you sync with the Riot API." },
  no_build_yet: { pt: "Sem build guardada ainda para este campeão.", en: "No build saved yet for this champion." },

  // ================= COLEÇÃO / WINS =================
  search_placeholder: { pt: "Procurar campeões ou vitórias...", en: "Search champions or wins..." },
  shortcut_tooltip: {
    pt: "Atalho global — funciona mesmo com o League em primeiro plano",
    en: "Global shortcut — works even with League in the foreground",
  },
  already_have_win: { pt: "✅ Já tens vitória", en: "✅ Already have a win" },
  no_win_yet: { pt: "🆕 Ainda não tens vitória", en: "🆕 No win yet" },
  your_victories: { pt: "Coleção", en: "Collection" },
  collection_filter_won: { pt: "Com vitória", en: "With a win" },
  collection_filter_unowned: { pt: "Sem vitória", en: "No win yet" },
  collection_filter_all: { pt: "Todos", en: "All" },
  no_active_account: { pt: "Sem conta ativa", en: "No active account" },
  no_active_account_text: {
    pt: "Cria uma conta ou deteta a que já usas no League para começar a seguir as tuas partidas de Arena.",
    en: "Create an account or detect the one you already use in League to start tracking your Arena matches.",
  },

  // ================= APP (topo, sincronização, mensagens) =================
  language_label: { pt: "Idioma", en: "Language" },
  riot_disclaimer: {
    pt: "Arena Tracker não é endossada pela Riot Games e não reflete as opiniões da Riot Games ou de quem esteja oficialmente envolvido na produção ou gestão das propriedades da Riot Games. Riot Games e as propriedades associadas são marcas comerciais ou registadas da Riot Games, Inc.",
    en: "Arena Tracker isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.",
  },
  no_riot_tag: {
    pt: 'Define a tag Riot (ex: EUW) para "{name}" antes de sincronizar.',
    en: 'Set the Riot tag (e.g. EUW) for "{name}" before syncing.',
  },
  syncing: { pt: "A sincronizar…", en: "Syncing…" },
  missing_api_key: { pt: "Falta a RIOT_API_KEY no ficheiro .env.", en: "Missing RIOT_API_KEY in the .env file." },
  unknown_error: { pt: "Erro desconhecido.", en: "Unknown error." },
  save_matches_error: {
    pt: 'Não foi possível guardar as partidas: {error}. Corre de novo o supabase_matches_table.sql no SQL Editor do Supabase (adiciona colunas novas em segurança) e, se o erro persistir, força também um "reload schema" em Settings → API.',
    en: 'Could not save the matches: {error}. Re-run supabase_matches_table.sql in the Supabase SQL Editor (safely adds new columns) and, if the error persists, also force a "reload schema" in Settings → API.',
  },
  matches_imported: { pt: "partida(s) nova(s) importada(s).", en: "new match(es) imported." },
  matches_from_cache: {
    pt: "sem pedir à Riot API, dados de um amigo",
    en: "without querying the Riot API, from a friend's data",
  },
  already_up_to_date: { pt: "Já estava tudo atualizado.", en: "Already up to date." },
  enriching_history: { pt: "A enriquecer histórico…", en: "Enriching history…" },
  repairing_all_history: {
    pt: "A reparar todo o histórico (a verificar diretamente na Riot API)…",
    en: "Repairing your whole history (checking directly with the Riot API)…",
  },
  repair_all_btn: { pt: "🛠 Reparar dados", en: "🛠 Repair data" },
  repair_all_tooltip: {
    pt: "Volta a pedir TODAS as tuas partidas diretamente à Riot API, sem usar dados partilhados por outros users — repõe valores corretos caso algo tenha ficado errado (ex: double/triple kills a 0 por engano). Usa mais pedidos e pode demorar.",
    en: "Re-fetches ALL your matches directly from the Riot API, without using data shared by other users — restores correct values if something went wrong (e.g. double/triple kills wrongly at 0). Uses more requests and may take a while.",
  },
  repair_all_confirm_title: { pt: "Reparar todo o histórico?", en: "Repair your whole history?" },
  repair_all_confirm_message: {
    pt: "Isto volta a pedir cada partida já importada diretamente à Riot API (ignora dados partilhados por outros users) para repor valores corretos. Pode demorar bastante e gasta mais pedidos do que uma sincronização normal. Só precisas de fazer isto uma vez.",
    en: "This re-fetches every already-imported match directly from the Riot API (ignoring data shared by other users) to restore correct values. It can take a while and uses more requests than a normal sync. You should only need to do this once.",
  },
  define_riot_tag_enrich: {
    pt: 'Define a tag Riot para "{name}" para enriquecer estas partidas via Riot API.',
    en: 'Set the Riot tag for "{name}" to enrich these matches via the Riot API.',
  },
  matches_enriched: { pt: "partida(s) enriquecida(s).", en: "match(es) enriched." },
  not_enough_recovered: { pt: "sem dados suficientes para recuperar.", en: "not enough data to recover." },
  not_enough_data_at_all: {
    pt: "Sem dados suficientes para recuperar essas partidas (sem lugar 7º/8º nem histórico da Riot API).",
    en: "Not enough data to recover these matches (no 7th/8th placement or Riot API history).",
  },
  playing_now: { pt: "A jogar:", en: "Playing:" },
  match_ended_with: { pt: "Partida:", en: "Match:" },
  // Sem o "boa sorte" — já não fazia sentido logo a seguir a um roast
  // (ver roasts.js) que é o oposto de encorajador.
  no_win_yet_luck: { pt: "🆕 Ainda não tens vitória com este campeão", en: "🆕 No win yet with this champion" },
  // Banner ao vivo depois do "GameEnd" — a Live Client Data só distingue
  // Vitória (1º lugar) de Derrota, nunca o lugar exato (2º-8º); esse só
  // aparece depois de sincronizar com a Riot API (ver aviso abaixo).
  game_ended_win: { pt: "🏆 Partida terminada — 1º lugar!", en: "🏆 Game over — 1st place!" },
  game_ended_lose: { pt: "🏁 Partida terminada — sem ser 1º lugar", en: "🏁 Game over — not 1st place" },
  game_ended_sync_reminder: {
    pt: "Sincroniza dentro de uns minutos para veres o lugar exato, dano, ouro e augments.",
    en: "Sync again in a few minutes to see the exact placement, damage, gold, and augments.",
  },
  no_kda_data_yet: { pt: "Sem dados de KDA ainda", en: "No KDA data yet" },
  wins_count_kda: { pt: "vitória(s) · KDA médio", en: "win(s) · average KDA" },
  enrich_history_tooltip: {
    pt: '{count} partida(s) sem formato e/ou sem estatísticas detalhadas (dano/ouro/CS/colegas/adversários/etc.) — "Sincronizar tudo" não corrige partidas já importadas, é por isso que este botão existe.',
    en: '{count} match(es) missing format and/or detailed stats (damage/gold/CS/teammates/opponents/etc.) — "Sync all" does not fix already-imported matches, which is why this button exists.',
  },

  // ================= GESTÃO DE CONTAS =================
  no_accounts_hint: {
    pt: "Ainda não tens nenhuma conta. Cria uma abaixo — a conta sincroniza sozinha na primeira partida de Arena que jogares com a app aberta.",
    en: "You don't have any accounts yet. Create one below — it syncs automatically on the first Arena match you play with the app open.",
  },
  active_pill: { pt: "ativa", en: "active" },
  riot_label: { pt: "Riot:", en: "Riot:" },
  no_tag: { pt: "(sem tag)", en: "(no tag)" },
  riot_name_placeholder: { pt: "Nome Riot (antes do #)", en: "Riot name (before the #)" },
  tag_placeholder: { pt: "Tag (ex: EUW)", en: "Tag (e.g. EUW)" },
  tag_custom_option: { pt: "Outra (introduzir manualmente)", en: "Other (enter manually)" },
  region_europe: { pt: "Europa (EUW, EUNE, TR, RU)", en: "Europe (EUW, EUNE, TR, RU)" },
  region_americas: { pt: "Américas (NA, BR, LAN, LAS, OCE)", en: "Americas (NA, BR, LAN, LAS, OCE)" },
  region_asia: { pt: "Ásia (KR, JP)", en: "Asia (KR, JP)" },
  region_sea: { pt: "Sudeste Asiático (PH, SG, TH, TW, VN)", en: "SEA (PH, SG, TH, TW, VN)" },
  save_btn: { pt: "Guardar", en: "Save" },
  cancel_btn: { pt: "Cancelar", en: "Cancel" },
  use_btn: { pt: "Usar", en: "Use" },
  edit_riot_account_tooltip: { pt: "Editar conta Riot", en: "Edit Riot account" },
  remove_btn: { pt: "Remover", en: "Remove" },
  new_account_btn: { pt: "+ Nova conta", en: "+ New account" },
  app_name_placeholder: { pt: "Nome na app (etiqueta)", en: "Name in the app (label)" },
  riot_account_sync_placeholder: { pt: "Conta Riot p/ sincronizar (opcional)", en: "Riot account to sync (optional)" },
  tag_hint: {
    pt: 'A tag é necessária só para sincronizar o histórico via Riot API (botão "Sincronizar" no ecrã principal).',
    en: 'The tag is only needed to sync history via the Riot API (the "Sync" button on the main screen).',
  },
  create_btn: { pt: "Criar", en: "Create" },
  confirm_remove_account: {
    pt: 'Remover "{name}" da lista? O histórico guardado não é apagado.',
    en: 'Remove "{name}" from the list? Saved history is not deleted.',
  },
};

export function translate(lang, key) {
  return DICTIONARY[key]?.[lang] ?? DICTIONARY[key]?.pt ?? key;
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("language") || "pt");

  useEffect(() => {
    localStorage.setItem("language", lang);
  }, [lang]);

  const t = (key) => translate(lang, key);

  // Nota: este ficheiro é .js (não .jsx) de propósito — para não depender de
  // configuração extra do esbuild/Vite para JSX em ficheiros .js, o elemento
  // é criado diretamente com createElement em vez de sintaxe JSX.
  return createElement(LanguageContext.Provider, { value: { lang, setLang, t } }, children);
}

// Usar dentro de qualquer componente para aceder a { lang, setLang, t }.
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback defensivo (ex: componente renderizado fora do provider em
    // testes) — nunca deve acontecer na app normal, já que o provider
    // envolve tudo em main.jsx.
    return { lang: "pt", setLang: () => {}, t: (key) => translate("pt", key) };
  }
  return ctx;
}
