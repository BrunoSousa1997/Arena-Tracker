-- Corre isto no SQL Editor do teu projeto Supabase.
-- Seguro de repetir mesmo que já tenhas corrido versões anteriores deste ficheiro.

-- 1) Criação da tabela (ignora se já existir)
create table if not exists public.matches (
  id bigint generated always as identity primary key,
  username text not null,
  champion text not null,
  kills int not null default 0,
  deaths int not null default 0,
  assists int not null default 0,
  win boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) Colunas adicionadas em versões seguintes (seguro re-correr)
alter table public.matches add column if not exists win boolean not null default true;
alter table public.matches add column if not exists items jsonb;         -- build (itens)
alter table public.matches add column if not exists placement int;       -- 1º-8º (ou 1º-6º) lugar (Riot API)
alter table public.matches add column if not exists augments jsonb;      -- augments da Arena (Riot API)
alter table public.matches add column if not exists riot_match_id text;  -- id da partida na Riot, evita duplicados ao importar
alter table public.matches add column if not exists team_size int;       -- jogadores por equipa: 2 (8 equipas) ou 3 (6 equipas)

-- 3) Estatísticas extra ao estilo op.gg (seguro re-correr)
alter table public.matches add column if not exists damage_dealt int;    -- dano causado a campeões
alter table public.matches add column if not exists damage_taken int;    -- dano recebido
alter table public.matches add column if not exists gold_earned int;     -- ouro ganho
alter table public.matches add column if not exists cs int;              -- creep score (minions + monstros de jungle)
alter table public.matches add column if not exists vision_score int;    -- vision score
alter table public.matches add column if not exists champ_level int;     -- nível do campeão no fim da partida
alter table public.matches add column if not exists game_duration int;   -- duração da partida, em segundos
alter table public.matches add column if not exists multikill int;       -- maior multikill (0-5)
alter table public.matches add column if not exists summoner1 text;      -- nome do 1º feitiço de invocador (ex: "Flash")
alter table public.matches add column if not exists summoner2 text;      -- nome do 2º feitiço de invocador
alter table public.matches add column if not exists healing int;         -- total de cura (a si próprio + aliados)
alter table public.matches add column if not exists max_hp int;         -- maior "vida máxima" (championStats.maxHealth) vista na partida; só Live Client Data, não vem da Riot API
alter table public.matches add column if not exists double_kills int;    -- nº de double kills nesta partida (só Riot API)
alter table public.matches add column if not exists triple_kills int;    -- nº de triple kills nesta partida (só Riot API)
-- Sequências "sem morrer" medidas ao vivo (só Live Client Data). Guardam a
-- LISTA de todas as corridas de kills/assists entre mortes (ex: [4,2,5]), não
-- só a maior — a pontuação soma o bónus de cada uma (ver challengeScoring.js).
-- Uma versão anterior (curta) guardou isto como int "best_*"; se essas colunas
-- chegaram a ser criadas, largam-se aqui (não chegaram a ter dados de verdade).
alter table public.matches drop column if exists best_kill_streak;
alter table public.matches drop column if exists best_assist_streak;
alter table public.matches add column if not exists kill_streaks jsonb;
alter table public.matches add column if not exists assist_streaks jsonb;
-- Simétrico, mas ao contrário: corridas de MORTES seguidas sem kill/assist
-- pelo meio, para a pontuação penalizar pela mesma regra (ver
-- sumStreakBonus em src/lib/challengeScoring.js).
alter table public.matches add column if not exists death_streaks jsonb;

-- saves_from_death (participant.challenges.saveAllyFromDeath) chegou a ser
-- guardado para pontuar revives nos desafios; pedido explícito para não usar
-- essa variável, por isso a coluna larga-se aqui (não chegou a ter dados de
-- verdade em produção que valha a pena preservar).
alter table public.matches drop column if exists saves_from_death;

-- 4) Colegas e adversários (estilo op.gg) — lista de todos os jogadores da
-- partida (campeão, KDA, lugar da equipa, build, augments), só disponível
-- via Riot API (import/backfill), não via Live Client Data.
alter table public.matches add column if not exists participants jsonb;

-- Limpa uma coluna de uma tentativa anterior (fundir capturas ao vivo com a
-- Riot API diretamente em "matches") que foi revertida — os challenges têm
-- agora a sua própria tabela (ver secção 9, "challenge_games"), sem tocar em
-- nada disto.
alter table public.matches drop column if exists is_live_capture;

-- evita importar a mesma partida duas vezes para a mesma conta
create unique index if not exists idx_matches_riot_match_id
  on public.matches (username, riot_match_id)
  where riot_match_id is not null;

-- 5) Cache partilhada entre users: uma partida de Arena tem sempre vários
-- jogadores reais (16-18), por isso se um amigo já importou uma partida,
-- os dados de "participants" já servem para qualquer outro user que também
-- lá tenha jogado — poupa pedidos à Riot API (ver getMatchCacheByIds em
-- src/db/api.js). O índice acima é por (username, riot_match_id); este é
-- só por riot_match_id (sem filtrar por username), para essa consulta
-- entre users ser rápida.
create index if not exists idx_matches_riot_match_id_shared
  on public.matches (riot_match_id)
  where riot_match_id is not null and participants is not null;

-- 6) Identidade Riot por conta (username) — permite encontrar a conta de
-- alguém (para a tab Comparar) pelo Riot ID dele, mesmo que o "username"
-- (etiqueta livre dentro da app, ver useAccounts.js) não tenha nada a ver
-- com o nome/tag Riot reais. Preenchido sempre que uma conta sincroniza com
-- sucesso (ver useRiotSync.js) — por isso qualquer conta com histórico já
-- importado fica automaticamente pesquisável assim que sincronizar de novo.
alter table public.wins add column if not exists riot_game_name text;
alter table public.wins add column if not exists riot_tag_line text;
alter table public.wins add column if not exists puuid text;

create index if not exists idx_wins_riot_id
  on public.wins (lower(riot_game_name), lower(riot_tag_line));

-- 6b) "ensureUser" (ver src/db/wins.js) fazia "verifica se existe, depois
-- insere" em dois pedidos separados — sem transação nenhuma a segurar isso,
-- duas chamadas quase simultâneas para o mesmo username (ex: deteção de
-- partida ao vivo + troca de conta ao mesmo tempo) podiam ambas ver "não
-- existe" e inserir DUAS linhas para a mesma conta. É essa duplicação que
-- aparecia como entradas repetidas na pesquisa da tab Desafios/Comparar, e
-- podia levar um convite para uma linha "fantasma" que já ninguém usa.
--
-- Antes de impedir duplicados novos com uma constraint, limpa os que já
-- existirem: por cada username repetido, mantém só a linha mais recente
-- (maior id) e apaga as outras — o "username" que sobra é sempre o mesmo,
-- por isso nenhuma referência de matches/challenge_room_players/etc parte.
delete from public.wins w
using (
  select id, row_number() over (partition by username order by id desc) as rn
  from public.wins
) dup
where w.id = dup.id and dup.rn > 1;

create unique index if not exists idx_wins_username_unique on public.wins (username);

-- 7) Procura por nome dentro de "participants" (para a tab Comparar) — antes
-- de pedir à Riot API o histórico de alguém que nunca sincronizou a própria
-- conta na app, vale a pena ver se ele já aparece como colega/adversário
-- nalguma partida que outra pessoa já tenha importado (a Arena tem sempre
-- vários jogadores reais por partida, ver ponto 5 acima) — nesse caso já
-- temos as estatísticas dele nessa partida, sem gastar nenhum pedido à Riot.
-- Não dá para fazer isto só com filtros do PostgREST (não há "ILIKE dentro de
-- um array jsonb"), por isso é uma function em SQL puro.
create or replace function public.search_matches_by_participant_name(p_name text)
returns setof public.matches
language sql
stable
as $$
  select m.*
  from public.matches m
  where m.participants is not null
    and exists (
      select 1 from jsonb_array_elements(m.participants) p
      where p->>'name' ilike p_name
    );
$$;

grant execute on function public.search_matches_by_participant_name(text) to anon, authenticated;

-- 8) Autocompletar da tab Comparar/Desafios — escrever um nome (ex: "Skygee")
-- devolve TODAS as contas conhecidas com esse nome (tags/servidores
-- diferentes), para escolher a certa em vez de adivinhar, já com
-- "has_matches" para mostrar logo quais é que já têm dados sincronizados.
-- Procura tanto pelo nome Riot (riot_game_name, quando já foi gravado por uma
-- sincronização recente) como pelo próprio username da conta — contas antigas
-- podem ainda não ter a identidade Riot preenchida, mas o username (que
-- muitas vezes É o nome Riot) existe sempre. "has_matches" tem de ser
-- calculado aqui (não dá para um filtro do PostgREST fazer um EXISTS contra
-- outra tabela).
--
-- Uma pessoa pode ter mais do que uma linha em "wins" para a MESMA
-- identidade Riot (ex: reinstalou a app e criou outra etiqueta local antes
-- desta versão ter constraint de unicidade em username, ver 6b acima) — sem
-- filtrar isso aqui, aparecia como "duplicado" na pesquisa e um convite podia
-- ir parar à conta antiga que já ninguém usa. Fica só a linha mais recente
-- (maior id) por identidade Riot; contas sem Riot ID conhecido continuam
-- distintas por username.
create or replace function public.search_accounts_by_name(p_query text)
returns table(username text, riot_game_name text, riot_tag_line text, has_matches boolean)
language sql
stable
as $$
  select username, riot_game_name, riot_tag_line, has_matches
  from (
    select
      w.username, w.riot_game_name, w.riot_tag_line,
      exists(select 1 from public.matches m where m.username = w.username) as has_matches,
      row_number() over (
        partition by coalesce(lower(w.riot_game_name) || '#' || lower(w.riot_tag_line), lower(w.username))
        order by w.id desc
      ) as rn
    from public.wins w
    where w.riot_game_name ilike p_query || '%'
       or w.username ilike p_query || '%'
  ) ranked
  where rn = 1
  order by has_matches desc, coalesce(riot_game_name, username) asc
  limit 10;
$$;

grant execute on function public.search_accounts_by_name(text) to anon, authenticated;

alter table public.matches enable row level security;

drop policy if exists "Allow anon read/write matches" on public.matches;

create policy "Allow anon read/write matches"
on public.matches
for all
using (true)
with check (true);

-- ============================================================
-- 9) DESAFIOS — salas, jogadores e convites
-- ============================================================
-- Uma "sala" é um desafio combinado entre jogadores: cada um joga as suas
-- próprias partidas de Arena e, no fim, compara-se o desempenho. Ver
-- src/db/rooms.js (camada de acesso) e src/views/Challenges.jsx (interface).
--
-- AVISO, para quem ler isto e assumir o contrário: NÃO há autenticação
-- nenhuma nesta app — tudo passa pela chave anónima e as políticas abaixo
-- são abertas, tal como as de "matches". Ou seja, qualquer cliente pode
-- escrever qualquer linha em nome de qualquer pessoa. Entre amigos isso é
-- aceitável (é o compromisso já assumido no resto do projeto), mas se algum
-- dia isto servir para algo com valor a sério, tem de passar primeiro por
-- Supabase Auth + políticas por utilizador.

create table if not exists public.challenge_rooms (
  id bigint generated always as identity primary key,
  -- Código curto e legível para entrar sem convite (ver generateRoomCode).
  code text not null unique,
  name text not null,
  host_username text not null,
  max_players int not null default 2,
  target_games int not null default 5,
  -- 'basic' = as regras que a app já sabe pontuar. 'custom' fica preparado
  -- para as regras específicas (a definir), guardadas em rules_config.
  rules text not null default 'basic',
  rules_config jsonb,
  -- lobby -> running -> finished (ou cancelled, se o host desistir)
  status text not null default 'lobby',
  created_at timestamptz not null default now(),
  started_at timestamptz
);

-- Preenchidos quando TODOS os jogadores atingem target_games (ver finishRoom
-- em src/db/rooms.js, chamado só pelo anfitrião a partir do ScoreBoard) — é
-- o que transforma a sala numa entrada de histórico em vez de desaparecer
-- como as salas fechadas manualmente (closeRoom continua a apagar a linha).
-- "alter table" (não dentro do "create table" acima) porque a tabela já
-- existe em produção — um "create table if not exists" é ignorado nesse
-- caso e as colunas novas nunca chegariam a ser criadas.
alter table public.challenge_rooms add column if not exists finished_at timestamptz;
alter table public.challenge_rooms add column if not exists winner_username text;
-- Fotografia do placar final: [{username, riot_game_name, riot_tag_line,
-- total, games_played, rank}, ...] — gravada uma única vez ao terminar, para
-- o histórico não depender de recalcular sempre a partir de "matches" (que
-- podem ser reparadas/editadas mais tarde, ver repairMismatchedMatches).
alter table public.challenge_rooms add column if not exists results jsonb;

create table if not exists public.challenge_room_players (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.challenge_rooms(id) on delete cascade,
  username text not null,
  -- Identidade Riot copiada no momento de entrar: o placar tem de continuar
  -- a fazer sentido mesmo que a pessoa mude o Riot ID a meio do desafio.
  riot_game_name text,
  riot_tag_line text,
  joined_at timestamptz not null default now(),
  -- Impede a mesma pessoa de ocupar dois lugares na mesma sala.
  unique (room_id, username)
);

-- Limpa colunas de uma tentativa anterior de progresso ao vivo (guardado
-- diretamente em challenge_room_players) — substituída pela tabela própria
-- "challenge_games" abaixo, onde cada partida (ao vivo ou já terminada) tem
-- a sua própria linha em vez de campos soltos no jogador.
alter table public.challenge_room_players drop column if exists live_champion;
alter table public.challenge_room_players drop column if exists live_kills;
alter table public.challenge_room_players drop column if exists live_deaths;
alter table public.challenge_room_players drop column if exists live_assists;
alter table public.challenge_room_players drop column if exists live_streak_bonus;
alter table public.challenge_room_players drop column if exists live_updated_at;

create table if not exists public.challenge_invites (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.challenge_rooms(id) on delete cascade,
  from_username text not null,
  to_username text not null,
  status text not null default 'pending', -- pending | accepted | declined
  created_at timestamptz not null default now(),
  -- Um convite por pessoa por sala — sem isto, carregar duas vezes no botão
  -- enchia a campainha do outro com o mesmo convite repetido.
  unique (room_id, to_username)
);

-- Uma partida de Arena jogada dentro de um challenge — coleção PRÓPRIA,
-- separada de "matches" (o histórico normal, alimentado pelo sync com a
-- Riot API em src/hooks/useRiotSync.js, que nada aqui altera). Nasce "live"
-- quando a partida começa e vai sendo atualizada a cada poll da Live Client
-- Data (3s); fecha com o resultado quando a partida acaba; e é enriquecida à
-- parte com dano/cura/multikills assim que esses dados aparecerem em
-- "matches" — ver startChallengeGame/updateChallengeGameProgress/
-- finishChallengeGame/enrichChallengeGame em src/db/rooms.js, e a máquina de
-- estados em src/hooks/useLiveGame.js.
create table if not exists public.challenge_games (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.challenge_rooms(id) on delete cascade,
  username text not null,
  champion text,
  kills int not null default 0,
  deaths int not null default 0,
  assists int not null default 0,
  win boolean,
  -- Listas de corridas (ver challengeScoring.js/sumStreakBonus) — kills/
  -- assists sem morrer somam pontos, mortes seguidas sem kill/assist pelo
  -- meio subtraem. Vazio [] enquanto a partida ainda não teve nenhuma.
  kill_streaks jsonb,
  assist_streaks jsonb,
  death_streaks jsonb,
  -- Só chegam depois de a partida terminar E sincronizar com a Riot API
  -- (ver enrichChallengeGame) — a Live Client Data não os expõe ao vivo.
  damage_dealt int,
  damage_taken int,
  healing int,
  double_kills int,
  triple_kills int,
  -- live = a decorrer; finished = resultado conhecido, ainda sem dano/cura/
  -- multikills; enriched = já tem tudo.
  status text not null default 'live',
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_room_players_room on public.challenge_room_players (room_id);
create index if not exists idx_room_players_username on public.challenge_room_players (username);
create index if not exists idx_invites_to on public.challenge_invites (to_username, status);
create index if not exists idx_challenge_games_room on public.challenge_games (room_id);
create index if not exists idx_challenge_games_username on public.challenge_games (username);
-- Contagem de desafios vencidos (achievement "challenge_wins", ver
-- getChallengeWinCount em src/db/rooms.js) e lista do histórico por sala
-- terminada.
create index if not exists idx_rooms_winner on public.challenge_rooms (winner_username) where status = 'finished';
create index if not exists idx_rooms_finished_at on public.challenge_rooms (finished_at desc) where status = 'finished';

alter table public.challenge_rooms enable row level security;
alter table public.challenge_room_players enable row level security;
alter table public.challenge_invites enable row level security;
alter table public.challenge_games enable row level security;

drop policy if exists "Allow anon read/write rooms" on public.challenge_rooms;
create policy "Allow anon read/write rooms" on public.challenge_rooms
for all using (true) with check (true);

drop policy if exists "Allow anon read/write room players" on public.challenge_room_players;
create policy "Allow anon read/write room players" on public.challenge_room_players
for all using (true) with check (true);

drop policy if exists "Allow anon read/write invites" on public.challenge_invites;
create policy "Allow anon read/write invites" on public.challenge_invites
for all using (true) with check (true);

drop policy if exists "Allow anon read/write challenge games" on public.challenge_games;
create policy "Allow anon read/write challenge games" on public.challenge_games
for all using (true) with check (true);

-- Por omissão, um evento DELETE só transporta a CHAVE PRIMÁRIA da linha
-- apagada. As subscrições em src/db/rooms.js filtram por "room_id" e por
-- "to_username" — que não são chave primária — por isso, sem isto, o filtro
-- não encontrava nada num DELETE e o evento era descartado: alguém sair da
-- sala nunca chegava aos outros, e sem erro nenhum a dizer porquê.
-- "replica identity full" faz o DELETE trazer a linha inteira.
alter table public.challenge_room_players replica identity full;
alter table public.challenge_invites replica identity full;
alter table public.challenge_games replica identity full;

-- Realtime: é isto que faz o lobby, os convites e o placar ao vivo dos
-- challenges chegarem sozinhos, sem a app andar a perguntar de X em X
-- segundos. Sem estas linhas as subscrições em src/db/rooms.js ligam-se com
-- sucesso e simplesmente nunca recebem nada (falham em silêncio, que é o
-- pior tipo de falha).
--
-- Não existe "add table if not exists" para publicações, e repetir o ALTER dá
-- erro — daí o bloco a apanhar a exceção, para este ficheiro continuar
-- seguro de correr as vezes que forem precisas.
do $$
begin
  alter publication supabase_realtime add table public.challenge_games;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.challenge_rooms;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.challenge_room_players;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.challenge_invites;
exception when duplicate_object then null;
end $$;
