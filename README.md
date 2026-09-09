# Arena Tracker

Aplicação de desktop (Windows) que segue o teu progresso no modo **Arena** do
League of Legends: histórico de partidas, coleção de campeões, estatísticas de
augments e itens, deteção da partida a decorrer e desafios entre amigos.

> Projeto pessoal, sem qualquer ligação à Riot Games.

## O que faz

**Coleção e histórico** — todos os campeões do jogo com os que já ganhaste
marcados, e o histórico partida a partida com lugar, KDA, build, augments e a
lista completa de colegas e adversários.

**Estatísticas** — números por campeão, ordenáveis por lugar médio, KDA ou
dano, com um filtro de build que recalcula tudo só sobre as partidas em que
levaste um dado augment ou item. A tab Augments compara a taxa de vitória e de
pódio de cada augment com a tua média.

**Em Jogo** — enquanto jogas, mostra o campeão, o KDA e a build a atualizar de
3 em 3 segundos, ao lado dos augments e itens que costumam correr melhor com
esse campeão e de quais dos recomendados ainda te faltam comprar. Há também uma
sobreposição arrastável para veres isto sem sair do jogo.

**Desafios** — competições entre amigos ao longo de várias partidas. Cria-se
uma sala, convida-se gente, e cada um joga a Arena normalmente: a pontuação
soma ao vivo (kills, assists, dano, cura, multikills e sequências sem morrer
somam; mortes tiram), com handicap por classe de campeão.

**Conquistas, Comparar e Visão Geral** — objetivos que sobem à medida que
jogas, comparação lado a lado com outro jogador, e um resumo com a forma
recente, as sessões agrupadas por sentada, calendário de atividade e destaques.

Interface em português e inglês, tema claro/escuro, modo em segundo plano
(bandeja do sistema) e atualizações automáticas.

## Como funciona por dentro

- **Electron** para a janela e para tudo o que precisa do sistema operativo:
  deteção da partida ao vivo, sobreposição, bandeja, arranque com o Windows e
  auto-update.
- **React + Vite** para a interface.
- **Supabase (Postgres)** para os dados partilhados — é o que permite a
  comparação entre amigos e o reaproveitamento de partidas: uma partida de
  Arena tem 18 jogadores reais, por isso se um amigo já sincronizou uma partida
  em que jogaram juntos, os dados dele servem para ti sem gastar pedidos à Riot.
- **Cloudflare Worker** (`riot-proxy/`) como intermediário para a Riot API,
  para a chave só existir no servidor e nunca em cada instalação.
- Os dados ao vivo vêm da **Live Client Data API** oficial da Riot
  (`127.0.0.1:2999`), só de leitura — não toca no processo do jogo nem na sua
  memória.

Cada módulo em `electron/` trata de uma área (janela, updater, deteção ao vivo,
cliente da Riot, sobreposição, segundo plano) e regista os próprios handlers.
O código está comentado em português, com as decisões e o porquê delas —
começa por `src/lib/howItWorks.js` para o mapa das funcionalidades.

## Desenvolvimento

```bash
npm install
```

Cria um `.env` na raiz com:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

O esquema da base de dados está em `supabase/schema.sql` — corre-o no SQL
Editor do teu projeto Supabase (é seguro repetir).

```bash
npm run dev
```

Arranca o Vite e o Electron em paralelo, com hot reload.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Vite + Electron em desenvolvimento |
| `npm test` | Corre os testes (Vitest) |
| `npm run build` | Compila a interface para `dist/` |
| `npm run dist` | Gera o instalador Windows com o electron-builder |

## Publicar uma versão

`npm run release` tem um problema conhecido com o publisher do
electron-builder. O caminho que funciona é gerar o instalador sem publicar e
criar a release à mão:

```bash
npm run dist -- --publish never
```

Depois `gh release create` com os ficheiros de `release/`, incluindo o
`latest.yml` — sem ele o auto-update dos clientes não vê a versão nova. As
notas de cada versão vivem no corpo da release no GitHub, divididas em
`## Português` e `## English` (é daí que a app lê o "Novidades" e o histórico
de patches).
