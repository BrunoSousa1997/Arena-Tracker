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

alter table public.matches enable row level security;

drop policy if exists "Allow anon read/write matches" on public.matches;

create policy "Allow anon read/write matches"
on public.matches
for all
using (true)
with check (true);
