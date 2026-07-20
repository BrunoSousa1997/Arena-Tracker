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
  tab_compare: { pt: "Comparar", en: "Compare" },
  tab_challenges: { pt: "Desafios", en: "Challenges" },

  // ================= DESAFIOS =================
  chal_page_title: { pt: "Desafios", en: "Challenges" },
  chal_intro: {
    pt: "Cria uma sala e desafia amigos: cada um joga as suas partidas de Arena e no fim compara-se o desempenho.",
    en: "Create a room and challenge friends: everyone plays their own Arena matches, then performance is compared.",
  },
  chal_create_room: { pt: "Criar sala", en: "Create room" },
  chal_join_room: { pt: "Entrar numa sala", en: "Join room" },
  chal_room_name: { pt: "Nome da sala", en: "Room name" },
  chal_room_name_placeholder: { pt: "Ex: Noite de Arena", en: "e.g. Arena Night" },
  chal_players: { pt: "Nº de jogadores", en: "Players" },
  chal_games: { pt: "Nº de jogos", en: "Games" },
  chal_games_hint: {
    pt: "Contam as próximas partidas de cada um a partir do início do desafio.",
    en: "Counts each player's next matches from the moment the challenge starts.",
  },
  chal_rules: { pt: "Regras", en: "Rules" },
  chal_rules_basic: { pt: "Básicas", en: "Basic" },
  chal_rules_custom: { pt: "Específicas", en: "Custom" },
  chal_rules_basic_desc: {
    pt: "Pontua por lugar, KDA, dano, cura, dano recebido e proteção dos colegas — cada um medido pela tua posição dentro da própria partida.",
    en: "Scores by placement, KDA, damage, healing, damage taken and teammate protection — each measured by your rank within your own match.",
  },
  chal_rules_custom_desc: {
    pt: "Escolhe o que conta para a pontuação deste desafio.",
    en: "Pick what counts towards this challenge's scoring.",
  },
  chal_rule_class_handicap: { pt: "Handicap por arquétipo", en: "Archetype handicap" },
  chal_rule_class_handicap_hint: {
    pt: "Multiplica o total pelo arquétipo do campeão (tanque, encantador, assassino…), para todos renderem em média o mesmo.",
    en: "Multiplies the total by the champion's archetype (tank, enchanter, assassin…), so they all score the same on average.",
  },
  chal_rule_only_kda: { pt: "Só KDA", en: "KDA only" },
  chal_rule_only_kda_hint: {
    pt: "Ignora dano, cura, dano sofrido e multikills — contam só abates, mortes, assistências e sequências.",
    en: "Ignores damage, healing, damage taken and multikills — only kills, deaths, assists and streaks count.",
  },
  chal_rule_only_solo: { pt: "Só jogos sem adversários do desafio", en: "Only games without challenge rivals" },
  chal_rule_only_solo_hint: {
    pt: "Não conta partidas em que dois do desafio calharam na mesma Arena — aí influenciaram-se um ao outro.",
    en: "Skips matches where two challenge players landed in the same Arena — there they affected each other directly.",
  },
  chal_create_btn: { pt: "Criar", en: "Create" },
  chal_creating: { pt: "A criar…", en: "Creating…" },
  chal_code_placeholder: { pt: "Código da sala", en: "Room code" },
  chal_join_btn: { pt: "Entrar", en: "Join" },
  chal_room_not_found: { pt: "Não há nenhuma sala com esse código.", en: "No room with that code." },
  chal_room_full: { pt: "Essa sala já está cheia.", en: "That room is already full." },
  chal_room_started: { pt: "Esse desafio já começou.", en: "That challenge has already started." },
  chal_invite_title: { pt: "Convidar", en: "Invite" },
  chal_invite_code_hint: {
    pt: "Partilha este código — quem o tiver entra pela opção \"Entrar numa sala\".",
    en: "Share this code — anyone with it can join via \"Join room\".",
  },
  chal_copy: { pt: "Copiar", en: "Copy" },
  chal_copied: { pt: "Copiado!", en: "Copied!" },
  chal_invite_direct: { pt: "Ou convida diretamente", en: "Or invite directly" },
  chal_invite_search_placeholder: { pt: "Procurar jogador…", en: "Search player…" },
  chal_invite_btn: { pt: "Convidar", en: "Invite" },
  chal_invited: { pt: "Convidado", en: "Invited" },
  chal_lobby: { pt: "Sala", en: "Lobby" },
  chal_waiting_players: { pt: "À espera de jogadores…", en: "Waiting for players…" },
  chal_room_ready: { pt: "Sala cheia — prontos para começar.", en: "Room full — ready to start." },
  chal_host: { pt: "anfitrião", en: "host" },
  chal_leave: { pt: "Sair da sala", en: "Leave room" },
  chal_back_to_menu: { pt: "Voltar aos desafios", en: "Back to challenges" },
  chal_forfeit: { pt: "Desistir", en: "Forfeit" },
  chal_end_now: { pt: "Terminar desafio", en: "End challenge" },
  chal_end_now_confirm_title: { pt: "Terminar o desafio já?", en: "End the challenge now?" },
  chal_end_now_confirm_msg: {
    pt: "O desafio fecha com as pontuações atuais e ganha quem estiver à frente, mesmo que faltem partidas. Serve para desbloquear um desafio em que alguém desapareceu — não há forma de voltar atrás.",
    en: "The challenge closes with the current scores and whoever is ahead wins, even with matches left. Use it to unblock a challenge someone abandoned — this can't be undone.",
  },
  chal_end_now_hint: {
    pt: "Como anfitrião podes fechar o desafio a qualquer momento, se alguém desistir de aparecer.",
    en: "As host you can close the challenge at any time if someone stops showing up.",
  },
  chal_forfeited: { pt: "Desistiu", en: "Forfeited" },
  chal_forfeit_confirm_title: { pt: "Desistir do desafio?", en: "Forfeit the challenge?" },
  chal_forfeit_confirm_msg: {
    pt: "Dás o desafio como perdido. Os pontos que já fizeste ficam registados, mas ficas em último lugar e não há forma de voltar atrás.",
    en: "You give the challenge up as lost. The points you've already scored are kept, but you drop to last place and this can't be undone.",
  },
  chal_forfeit_hint: {
    pt: "Depois de o desafio começar já não dá para sair da sala — só desistir, o que o dá como perdido.",
    en: "Once the challenge has started you can't leave the room — only forfeit, which counts as a loss.",
  },
  chal_forfeit_too_early: {
    pt: "Ainda não podes desistir — joga pelo menos uma partida, ou espera mais {minutes} min.",
    en: "You can't forfeit yet — play at least one match, or wait another {minutes} min.",
  },
  chal_forfeit_cooldown: {
    pt: "Desististe de um desafio há pouco — só podes voltar a desistir daqui a {minutes} min.",
    en: "You forfeited a challenge recently — you can only forfeit again in {minutes} min.",
  },
  chal_you_forfeited: {
    pt: "Desististe deste desafio. Podes acompanhar o resto, mas as tuas partidas já não contam.",
    en: "You forfeited this challenge. You can still follow along, but your matches no longer count.",
  },
  chal_finished_saved_hint: {
    pt: "Este desafio fica guardado no histórico — podes voltar a vê-lo a qualquer momento.",
    en: "This challenge is saved to your history — you can revisit it any time.",
  },
  chal_close_room: { pt: "Desfazer sala", en: "Close room" },
  chal_close_confirm_title: { pt: "Desfazer a sala?", en: "Close the room?" },
  chal_close_confirm_msg: {
    pt: "A sala desaparece para toda a gente que lá está e os convites são cancelados.",
    en: "The room disappears for everyone in it and all invites are cancelled.",
  },
  chal_invites_received: { pt: "Convites recebidos", en: "Invites received" },
  chal_invite_from: { pt: "convidou-te", en: "invited you" },
  chal_accept: { pt: "Aceitar", en: "Accept" },
  chal_decline: { pt: "Recusar", en: "Decline" },
  chal_notif_invite_title: { pt: "Convite para desafio", en: "Challenge invite" },
  chal_notif_invite_sent_title: { pt: "Convite enviado", en: "Invite sent" },
  chal_notif_invite_sent_prefix: { pt: "Convite enviado para", en: "Invite sent to" },
  chal_no_account: {
    pt: "Precisas de uma conta ativa para criar ou entrar numa sala.",
    en: "You need an active account to create or join a room.",
  },
  chal_realtime_hint: {
    pt: "A sala atualiza-se sozinha — não precisas de recarregar nada.",
    en: "The room updates by itself — no need to refresh anything.",
  },
  chal_start: { pt: "Iniciar desafio", en: "Start challenge" },
  chal_starting: { pt: "A iniciar…", en: "Starting…" },
  chal_in_progress: { pt: "Em curso", en: "In progress" },
  chal_live_now: { pt: "A jogar agora:", en: "Playing now:" },
  chal_scoring_in_progress: {
    pt: "As pontuações atualizam-se automaticamente conforme as partidas são completas.",
    en: "Scores update automatically as matches complete.",
  },
  chal_keep_app_open: {
    pt: "Mantém a app aberta enquanto jogas: é ela que conta os teus kills, mortes e assistências em tempo real. Se fechares a app a meio de uma partida, essa partida pode ficar mal contabilizada ou nem sequer contar para o desafio.",
    en: "Keep the app open while you play: it's what tracks your kills, deaths and assists in real time. If you close the app mid-match, that game may be miscounted or not count towards the challenge at all.",
  },
  chal_scoring_how: { pt: "Como funciona a pontuação", en: "How scoring works" },
  chal_score_kill: { pt: "Abate", en: "Kill" },
  chal_score_death: { pt: "Morte", en: "Death" },
  chal_score_assist: { pt: "Assistência", en: "Assist" },
  chal_score_streak: {
    pt: "Sequência de kills/assist. sem morrer",
    en: "Kill/assist streak without dying",
  },
  chal_score_streak_value: {
    pt: "cada um acima de {threshold} vale +1, e sobe de nível a cada {step}",
    en: "each one past {threshold} is worth +1, going up a level every {step}",
  },
  chal_score_streak_example: {
    pt: "Ex.: 5 abates seguidos sem morrer = 2+2+2+3+3 = 12 pontos.",
    en: "e.g. 5 kills in a row without dying = 2+2+2+3+3 = 12 points.",
  },
  chal_score_death_streak: { pt: "Mortes seguidas sem abate/assist.", en: "Deaths in a row without a kill/assist" },
  chal_score_death_streak_value: {
    pt: "mesma escalada, mas a tirar pontos",
    en: "same escalation, but taking points away",
  },
  chal_score_damage: { pt: "Dano causado", en: "Damage dealt" },
  chal_score_healing: { pt: "Cura", en: "Healing" },
  chal_score_taken: { pt: "Dano sofrido", en: "Damage taken" },
  chal_score_per_points: { pt: "+1 por cada {amount}", en: "+1 per {amount}" },
  chal_score_double: { pt: "Double kill", en: "Double kill" },
  chal_score_triple: { pt: "Triple kill", en: "Triple kill" },
  chal_score_live_note: {
    pt: "Enquanto a partida decorre só contam abates, mortes, assistências e sequências — dano, cura e multikills só entram depois de a partida terminar e sincronizar.",
    en: "While a match is in progress, only kills/deaths/assists/streaks count — damage, healing and multikills only come in once the match ends and syncs.",
  },
  chal_score_class_handicap: { pt: "Handicap por tipo de campeão", en: "Champion type handicap" },
  chal_score_class_handicap_note: {
    pt: "O total da partida é multiplicado pelo arquétipo do campeão jogado — valores afinados com as partidas reais registadas na app, para todos os arquétipos renderem em média o mesmo. Campeões fora da lista contam a ×1.00.",
    en: "The match total is multiplied by the played champion's archetype — values tuned against the real matches recorded in the app, so every archetype scores the same on average. Champions outside the list count at ×1.00.",
  },
  chal_arch_tank: { pt: "Tanque", en: "Tank" },
  chal_arch_engage: { pt: "Engage/Utilidade", en: "Engage/Utility" },
  chal_arch_juggernaut: { pt: "Juggernaut", en: "Juggernaut" },
  chal_arch_skirmisher: { pt: "Duelista", en: "Skirmisher" },
  chal_arch_assassin: { pt: "Assassino", en: "Assassin" },
  chal_arch_marksman: { pt: "Atirador", en: "Marksman" },
  chal_arch_caster: { pt: "Mago", en: "Caster" },
  chal_arch_enchanter: { pt: "Encantador", en: "Enchanter" },
  chal_recover_games: { pt: "Recuperar jogos em falta", en: "Recover missing games" },
  chal_recovering: { pt: "A recuperar…", en: "Recovering…" },
  chal_recover_hint: {
    pt: "Se jogaste alguma partida com a app fechada, ela não entrou no desafio — isto vai buscá-la ao teu histórico.",
    en: "If you played a match with the app closed, it didn't count towards the challenge — this pulls it from your history.",
  },
  chal_recover_done: {
    pt: "{count} partida(s) recuperada(s).",
    en: "{count} game(s) recovered.",
  },
  chal_recover_none: {
    pt: "Nenhuma partida em falta — está tudo contabilizado.",
    en: "No missing games — everything is already counted.",
  },
  chal_recover_error: {
    pt: "Não foi possível recuperar as partidas. Tenta de novo.",
    en: "Couldn't recover the games. Try again.",
  },
  chal_kills: { pt: "Abates", en: "Kills" },
  chal_deaths: { pt: "Mortes", en: "Deaths" },
  chal_assists: { pt: "Assist.", en: "Assists" },
  chal_avg_kda: { pt: "KDA médio", en: "Avg KDA" },
  chal_multikills: { pt: "Multikills", en: "Multikills" },
  chal_stat_streaks: { pt: "Bónus de sequência", en: "Streak bonus" },
  chal_stat_death_streaks: { pt: "Sequências de mortes", en: "Death streaks" },
  chal_stat_streaks_hint: { pt: "Maior sequência: {best}", en: "Longest streak: {best}" },
  chal_class_handicap_delta: {
    pt: "Base {base} pts · handicap por classe {delta}",
    en: "Base {base} pts · class handicap {delta}",
  },
  chal_no_games_yet: {
    pt: "Ainda sem partidas neste desafio.",
    en: "No games in this challenge yet.",
  },
  chal_game_pending: { pt: "Por jogar", en: "Not played yet" },
  chal_win: { pt: "Vitória", en: "Win" },
  chal_loss: { pt: "Derrota", en: "Loss" },
  chal_points_breakdown: { pt: "Base × classe", en: "Base × class" },
  chal_challenge_winner: { pt: "venceu o desafio", en: "won the challenge" },
  chal_finished: { pt: "Concluído", en: "Finished" },
  chal_history: { pt: "Histórico", en: "History" },
  chal_history_empty: {
    pt: "Ainda não terminaste nenhum desafio.",
    en: "You haven't finished any challenges yet.",
  },
  chal_back: { pt: "Voltar", en: "Back" },
  chal_scored_with: { pt: "Pontuado com:", en: "Scored with:" },
  chal_scoring_legacy: {
    pt: "regras antigas (sem handicap por classe)",
    en: "legacy rules (no class handicap)",
  },
  chal_scoring_plain: { pt: "pontuação simples", en: "plain scoring" },

  // ================= COMPARAR =================
  compare_page_title: { pt: "Comparar jogadores", en: "Compare players" },
  compare_intro: {
    pt: "Escreve o Riot ID de outro jogador para comparares estatísticas e conquistas com as tuas.",
    en: "Enter another player's Riot ID to compare stats and achievements with yours.",
  },
  compare_you_label: { pt: "Tu", en: "You" },
  compare_region_label: { pt: "Servidor", en: "Server" },
  compare_search_button: { pt: "Comparar", en: "Compare" },
  compare_checking: { pt: "A verificar…", en: "Checking…" },
  compare_syncing: { pt: "A sincronizar partidas…", en: "Syncing matches…" },
  compare_needs_sync_title: { pt: "Ainda sem dados guardados", en: "No saved data yet" },
  compare_needs_sync_text: {
    pt: "Este jogador ainda não tem partidas de Arena guardadas na app. Sincroniza agora para ires buscar o histórico dele à Riot API.",
    en: "This player doesn't have any Arena matches saved yet. Sync now to fetch their history from the Riot API.",
  },
  compare_sync_button: { pt: "🔄 Sincronizar agora", en: "🔄 Sync now" },
  compare_new_search_button: { pt: "Nova pesquisa", en: "New search" },
  compare_opponent_still_empty: {
    pt: "Não foram encontradas partidas de Arena para este Riot ID.",
    en: "No Arena matches were found for this Riot ID.",
  },
  compare_summary_title: { pt: "Resumo", en: "Summary" },
  compare_achievements_title: { pt: "Conquistas", en: "Achievements" },
  compare_special_title: { pt: "Especiais", en: "Special" },
  compare_own_empty: {
    pt: "Ainda não tens partidas para comparar.",
    en: "You don't have any matches to compare yet.",
  },
  compare_riot_id_placeholder: { pt: "Nome#Tag (ex: Faker#EUW)", en: "Name#Tag (e.g. Faker#EUW)" },
  compare_riot_id_hint: {
    pt: "Escreve o nome para veres as contas conhecidas e escolheres a certa (com a tag), ou escreve já Nome#Tag.",
    en: "Type the name to see known accounts and pick the right one (with the tag), or type Name#Tag directly.",
  },
  compare_suggestion_has_data: { pt: "✓ com dados", en: "✓ has data" },
  compare_suggestion_no_data: { pt: "sem dados", en: "no data" },
  compare_current_streak: { pt: "Sequência atual", en: "Current streak" },
  compare_partial_title: { pt: "Dados parciais", en: "Partial data" },
  compare_partial_text: {
    pt: "Este jogador ainda não tem conta própria sincronizada na app — estes números vêm só de partidas em que apareceu como colega/adversário de alguém que já sincronizou. Sincroniza para veres o histórico completo dele.",
    en: "This player doesn't have their own synced account in the app yet — these numbers come only from matches where they showed up as a teammate/opponent of someone who already synced. Sync to see their full history.",
  },

  // ================= TOPO / CONTA =================
  no_account: { pt: "Sem conta", en: "No account" },
  cold_loading: { pt: "A carregar dados do patch…", en: "Loading patch data…" },
  loading_generic: { pt: "A carregar…", en: "Loading…" },
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
  settings_display_mode_label: { pt: "Modo de ecrã", en: "Display mode" },
  settings_display_windowed_opt: { pt: "Janela", en: "Windowed" },
  settings_display_fullscreen_opt: { pt: "Ecrã inteiro", en: "Full screen" },
  settings_resolution_label: { pt: "Resolução da janela", en: "Window resolution" },
  settings_resolution_disabled_fullscreen: {
    pt: "Indisponível em ecrã inteiro",
    en: "Unavailable in full screen",
  },
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
  // ================= NOTIFICAÇÕES =================
  notif_title: { pt: "Notificações", en: "Notifications" },
  notif_empty: {
    pt: "Sem notificações. Sincroniza depois de jogar — as conquistas novas aparecem aqui.",
    en: "No notifications. Sync after playing — new achievements show up here.",
  },
  notif_clear: { pt: "Limpar", en: "Clear" },
  notif_tier_up: { pt: "Subiste a {rank} · {value}", en: "Reached {rank} · {value}" },
  notif_unlocked: { pt: "Conquista desbloqueada!", en: "Achievement unlocked!" },

  achv_rank_iron: { pt: "Ferro", en: "Iron" },
  achv_rank_bronze: { pt: "Bronze", en: "Bronze" },
  achv_rank_silver: { pt: "Prata", en: "Silver" },
  achv_rank_gold: { pt: "Ouro", en: "Gold" },
  achv_rank_platinum: { pt: "Platina", en: "Platinum" },
  achv_rank_emerald: { pt: "Esmeralda", en: "Emerald" },
  achv_rank_diamond: { pt: "Diamante", en: "Diamond" },
  achv_rank_master: { pt: "Mestre", en: "Master" },
  achv_rank_grandmaster: { pt: "Grão-Mestre", en: "Grandmaster" },
  achv_rank_challenger: { pt: "Desafiante", en: "Challenger" },
  achv_page_title: { pt: "Conquistas", en: "Achievements" },
  achv_empty: {
    pt: "Ainda sem conquistas para mostrar. Joga uma Arena com a app aberta — os teus marcos começam a aparecer aqui.",
    en: "No achievements to show yet. Play an Arena match with the app open — your milestones start showing up here.",
  },
  achv_closest_title: { pt: "Quase lá", en: "Almost there" },
  achv_cat_wins: { pt: "Vitórias totais", en: "Total wins" },
  achv_cat_wins_desc: {
    pt: "Partidas em que ficaste em 1º lugar, somadas ao longo de toda a carreira.",
    en: "Matches where you finished 1st, added up across your whole career.",
  },
  achv_cat_games: { pt: "Partidas jogadas", en: "Games played" },
  achv_cat_games_desc: {
    pt: "Total de partidas de Arena registadas, ganhas ou perdidas.",
    en: "Total Arena matches recorded, won or lost.",
  },
  achv_cat_coverage: { pt: "Cobertura do roster", en: "Roster coverage" },
  achv_cat_coverage_desc: {
    pt: "Percentagem do roster com que já tens pelo menos uma vitória.",
    en: "Percentage of the roster you already have at least one win with.",
  },
  achv_cat_winstreak: { pt: "Melhor sequência de vitórias", en: "Best win streak" },
  achv_cat_winstreak_desc: {
    pt: "A maior fila de 1ºs lugares seguidos que alguma vez fizeste.",
    en: "The longest run of back-to-back 1st places you've ever had.",
  },
  achv_cat_top3streak: { pt: "Melhor sequência de Top 3", en: "Best Top 3 streak" },
  achv_cat_top3streak_desc: {
    pt: "A maior fila de partidas seguidas a acabar no pódio (1º a 3º).",
    en: "The longest run of back-to-back podium finishes (1st to 3rd).",
  },
  achv_cat_triplekill: { pt: "Triple Kills conquistados", en: "Triple Kills earned" },
  achv_cat_triplekill_desc: {
    pt: "Número de partidas em que fizeste pelo menos um triple kill.",
    en: "Number of matches where you landed at least one triple kill.",
  },
  achv_cat_damage: { pt: "Maior dano numa partida", en: "Highest damage in a game" },
  achv_cat_damage_desc: {
    pt: "O teu recorde de dano a campeões numa única partida.",
    en: "Your record for damage to champions in a single match.",
  },
  achv_cat_healing: { pt: "Maior cura numa partida", en: "Highest healing in a game" },
  achv_cat_healing_desc: {
    pt: "O teu recorde de cura (a ti e a aliados) numa única partida.",
    en: "Your record for healing (self and allies) in a single match.",
  },
  achv_cat_favorite: { pt: "Partidas com o campeão favorito", en: "Games with favorite champion" },
  achv_cat_favorite_desc: {
    pt: "Partidas jogadas com o campeão que mais repetes.",
    en: "Matches played with the champion you pick most.",
  },
  achv_cat_diversity: { pt: "Campeões diferentes jogados", en: "Different champions played" },
  achv_cat_diversity_desc: {
    pt: "Quantos campeões distintos já levaste para a Arena, ganhando ou não.",
    en: "How many distinct champions you've taken into the Arena, win or lose.",
  },
  achv_cat_marathon: { pt: "Maratona (sessão mais longa)", en: "Marathon (longest session)" },
  achv_cat_marathon_desc: {
    pt: "Partidas seguidas na mesma sentada — uma sessão quebra ao fim de 90 min sem jogar.",
    en: "Back-to-back matches in one sitting — a session breaks after 90 min without playing.",
  },
  achv_cat_duo: { pt: "Parceiro premade mais fiel", en: "Most loyal premade partner" },
  achv_cat_duo_desc: {
    pt: "Partidas jogadas ao lado do colega de equipa que mais se repete.",
    en: "Matches played alongside the teammate who shows up most often.",
  },
  achv_cat_top3total: { pt: "Pódios totais", en: "Total podiums" },
  achv_cat_top3total_desc: {
    pt: "Partidas em que acabaste no Top 3, somadas ao longo da carreira.",
    en: "Matches where you finished Top 3, added up across your career.",
  },
  achv_cat_challenge_wins: { pt: "Desafios vencidos", en: "Challenges won" },
  achv_cat_challenge_wins_desc: {
    pt: "Salas de Desafios em que ficaste em 1º no placar final, contra outros jogadores.",
    en: "Challenge rooms where you finished 1st on the final scoreboard, against other players.",
  },
  achv_cat_kills: { pt: "Abates totais", en: "Total kills" },
  achv_cat_kills_desc: {
    pt: "Todos os abates que já fizeste na Arena, somados.",
    en: "Every kill you've ever landed in the Arena, added up.",
  },
  achv_cat_augments: { pt: "Augments diferentes", en: "Different augments" },
  achv_cat_augments_desc: {
    pt: "Quantos augments distintos já experimentaste — a assinatura da Arena.",
    en: "How many distinct augments you've tried — the Arena's signature mechanic.",
  },
  achv_cat_days: { pt: "Dias a jogar", en: "Days played" },
  achv_cat_days_desc: {
    pt: "Dias diferentes em que jogaste pelo menos uma partida de Arena.",
    en: "Distinct days on which you played at least one Arena match.",
  },
  achv_cat_assassin: { pt: "Partidas com assassinos", en: "Games as Assassin" },
  achv_cat_fighter: { pt: "Partidas com lutadores", en: "Games as Fighter" },
  achv_cat_mage: { pt: "Partidas com magos", en: "Games as Mage" },
  achv_cat_marksman: { pt: "Partidas com atiradores", en: "Games as Marksman" },
  achv_cat_support: { pt: "Partidas com suportes", en: "Games as Support" },
  achv_cat_tank: { pt: "Partidas com tanques", en: "Games as Tank" },
  achv_cat_class_desc: {
    pt: "Partidas com campeões desta classe. Um campeão de duas classes conta para as duas.",
    en: "Matches with champions of this class. A champion with two classes counts for both.",
  },
  achv_cat_special: { pt: "Especiais", en: "Special" },
  achv_special_hint: {
    pt: "Feitos únicos — ou se fazem ou não, sem níveis. A maioria compara-te com os outros jogadores da partida.",
    en: "One-off feats — you either did them or not, no levels. Most compare you against the other players in the match.",
  },
  achv_perfect_title: { pt: "Vitória perfeita", en: "Perfect victory" },
  achv_perfect_desc: {
    pt: "Terminar em 1º lugar sem morrer nenhuma vez",
    en: "Finish in 1st place without dying once",
  },
  achv_medic_title: { pt: "Curandeiro", en: "Field medic" },
  achv_medic_desc: {
    pt: "Com um campeão de suporte, seres o que mais curou de toda a partida",
    en: "With a support champion, be the top healer of the entire match",
  },
  achv_carry_title: { pt: "Carregador", en: "Hard carry" },
  achv_carry_desc: {
    pt: "Venceres a partida sendo quem mais dano fez a campeões",
    en: "Win the match as the player who dealt the most damage to champions",
  },
  achv_juggernaut_title: { pt: "Muralha", en: "Juggernaut" },
  achv_juggernaut_desc: {
    pt: "Acabares no Top 3 sendo quem mais dano levou de toda a partida",
    en: "Finish Top 3 as the player who took the most damage in the match",
  },
  achv_tycoon_title: { pt: "Magnata", en: "Tycoon" },
  achv_tycoon_desc: {
    pt: "Seres quem mais ouro juntou de toda a partida",
    en: "Be the player who earned the most gold in the entire match",
  },
  achv_slayer_title: { pt: "Ceifeiro", en: "Slayer" },
  achv_slayer_desc: {
    pt: "Seres quem mais abates fez de toda a partida",
    en: "Be the player with the most kills in the entire match",
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
  spotlight_best_avg_placement: { pt: "Melhor lugar médio", en: "Best average placement" },
  spotlight_worst_avg_placement: { pt: "Pior lugar médio", en: "Worst average placement" },
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
  filter_group_sort: { pt: "Ordenar por", en: "Sort by" },
  search_champion_placeholder: { pt: "Procurar campeão...", en: "Search champion..." },
  compare_slot_a_label: { pt: "Comparar A", en: "Compare A" },
  compare_slot_b_label: { pt: "Comparar B", en: "Compare B" },
  no_filtered_results: {
    pt: "Nenhuma partida corresponde aos filtros atuais.",
    en: "No matches fit the current filters.",
  },
  load_more: { pt: "Carregar mais", en: "Load more" },
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
  build_filter_augments_label: { pt: "Augments", en: "Augments" },
  build_filter_augments_placeholder: { pt: "Filtrar por augment...", en: "Filter by augment..." },
  build_filter_items_label: { pt: "Itens", en: "Items" },
  build_filter_items_placeholder: { pt: "Filtrar por item...", en: "Filter by item..." },
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
    pt: 'Não foi possível guardar as partidas: {error}. Corre de novo o supabase/schema.sql no SQL Editor do Supabase (adiciona colunas novas em segurança) e, se o erro persistir, força também um "reload schema" em Settings → API.',
    en: 'Could not save the matches: {error}. Re-run supabase/schema.sql in the Supabase SQL Editor (safely adds new columns) and, if the error persists, also force a "reload schema" in Settings → API.',
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
    pt: "Corrige tudo o que puder estar errado na tua conta: traz partidas em falta, volta a pedir todas à Riot API (sem usar dados partilhados), corrige campeão/KDA/build que não batam certo, e remove duplicados. Usa mais pedidos e pode demorar.",
    en: "Fixes anything that might be wrong with your account: brings in missing matches, re-fetches everything from the Riot API (without shared data), fixes mismatched champion/KDA/build, and removes duplicates. Uses more requests and may take a while.",
  },
  repair_all_confirm_title: { pt: "Reparar todo o histórico?", en: "Repair your whole history?" },
  repair_all_confirm_message: {
    pt: "Isto traz partidas em falta, volta a pedir cada partida já importada diretamente à Riot API, corrige campeão/KDA/build errados e remove duplicados. Pode demorar bastante e gasta mais pedidos do que uma sincronização normal. Só precisas de fazer isto uma vez.",
    en: "This brings in missing matches, re-fetches every already-imported match directly from the Riot API, fixes wrong champion/KDA/build, and removes duplicates. It can take a while and uses more requests than a normal sync. You should only need to do this once.",
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
  live_banner_reopen: {
    pt: "Voltar a mostrar a partida em curso",
    en: "Show the ongoing match again",
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
    pt: "A app sincroniza sozinha para mostrar o lugar exato, dano, ouro e augments.",
    en: "The app syncs automatically to show the exact placement, damage, gold, and augments.",
  },
  no_kda_data_yet: { pt: "Sem dados de KDA ainda", en: "No KDA data yet" },
  wins_count_kda: { pt: "vitória(s) · KDA médio", en: "win(s) · average KDA" },
  enrich_history_tooltip: {
    pt: '{count} partida(s) sem formato e/ou sem estatísticas detalhadas (dano/ouro/CS/colegas/adversários/etc.) — sincronizar não corrige partidas já importadas, é por isso que este botão existe.',
    en: '{count} match(es) missing format and/or detailed stats (damage/gold/CS/teammates/opponents/etc.) — syncing does not fix already-imported matches, which is why this button exists.',
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

  // ================= REPARAR DADOS (passos extra encadeados no botão) =================
  repairing_personal_data: {
    pt: "A corrigir campeão/KDA/build errados…",
    en: "Fixing wrong champion/KDA/build…",
  },
  removing_duplicates: { pt: "A remover partidas duplicadas…", en: "Removing duplicate matches…" },
  matches_fixed_short: { pt: "corrigida(s)", en: "fixed" },
  duplicates_removed_short: { pt: "duplicado(s) removido(s)", en: "duplicate(s) removed" },
  repair_all_done_clean: { pt: "Tudo em ordem — nada para corrigir.", en: "All good — nothing to fix." },

  // ================= WHAT'S NEW (notas de patch) =================
  whats_new_title: { pt: "Novidades", en: "What's New" },
  whats_new_empty: {
    pt: "Sem notas para esta versão.",
    en: "No notes for this version.",
  },
  close_btn: { pt: "Fechar", en: "Close" },

  settings_patch_history_label: { pt: "Histórico de atualizações", en: "Update history" },
  settings_patch_history_btn: { pt: "Ver anteriores", en: "View previous" },
  patch_history_title: { pt: "Histórico de patches", en: "Patch history" },
  patch_history_loading: { pt: "A carregar…", en: "Loading…" },
  patch_history_error: {
    pt: "Não foi possível obter o histórico agora. Tenta mais tarde.",
    en: "Couldn't fetch the history right now. Try again later.",
  },
  patch_history_empty: { pt: "Ainda sem releases publicadas.", en: "No releases published yet." },
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
