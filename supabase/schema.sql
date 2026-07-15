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

-- 4) Colegas e adversários (estilo op.gg) — lista de todos os jogadores da
-- partida (campeão, KDA, lugar da equipa, build, augments), só disponível
-- via Riot API (import/backfill), não via Live Client Data.
alter table public.matches add column if not exists participants jsonb;

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

-- 8) Autocompletar da tab Comparar — escrever um nome (ex: "Skygee") devolve
-- TODAS as contas conhecidas com esse nome (tags/servidores diferentes),
-- para escolher a certa em vez de adivinhar, já com "has_matches" para
-- mostrar logo quais é que já têm dados sincronizados. Procura tanto pelo
-- nome Riot (riot_game_name, quando já foi gravado por uma sincronização
-- recente) como pelo próprio username da conta — contas antigas podem ainda
-- não ter a identidade Riot preenchida, mas o username (que muitas vezes É o
-- nome Riot) existe sempre. "has_matches" tem de ser calculado aqui (não dá
-- para um filtro do PostgREST fazer um EXISTS contra outra tabela).
create or replace function public.search_accounts_by_name(p_query text)
returns table(username text, riot_game_name text, riot_tag_line text, has_matches boolean)
language sql
stable
as $$
  select w.username, w.riot_game_name, w.riot_tag_line,
    exists(select 1 from public.matches m where m.username = w.username) as has_matches
  from public.wins w
  where w.riot_game_name ilike p_query || '%'
     or w.username ilike p_query || '%'
  order by has_matches desc, coalesce(w.riot_game_name, w.username) asc
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
