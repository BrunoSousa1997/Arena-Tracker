---
name: patch-notes
description: Gera as notas de patch (release notes) da Arena Tracker a partir do histórico de commits desde a última tag, prontas para a release do GitHub e para os modais "Novidades"/"Histórico de patches" da app. Usar quando o utilizador pedir para escrever/preparar/gerar patch notes, release notes, changelog, ou preparar uma nova versão para publicar.
---

# Gerar patch notes da Arena Tracker

Esta skill produz um ficheiro `build/release-notes.md`, que alimenta **dois
sítios diferentes** quando corres `npm run release`:

1. **`latest.yml`** (metadados do auto-updater) — daqui vem o texto do modal
   "Novidades" que aparece quando a atualização é descarregada. O
   `electron-builder` encontra o ficheiro sozinho, por procurar o nome
   `release-notes.md` na pasta de build resources (`build/`), ver
   `getResource` em `app-builder-lib/out/publish/updateInfoBuilder.js`.

2. **O corpo da release no GitHub** — daqui vem o "Histórico de
   atualizações" nas Definições, que lê o feed atom em tempo real (ver
   `updater:history` em `electron/updater.js`). **Isto NÃO é automático:**
   `resolveReleaseBody()` em `app-builder-lib/out/publish/PublishManager.js`
   só lê de `releaseInfo.releaseNotes` / `releaseInfo.releaseNotesFile` no
   `package.json`, ou de um `release-notes.md` na **raiz** do projeto — nunca
   de `build/`. Por isso o `package.json` tem:

   ```json
   "build": { "releaseInfo": { "releaseNotesFile": "build/release-notes.md" } }
   ```

   Se essa configuração desaparecer, a release é publicada com o corpo vazio
   e o GitHub passa a mostrar a **mensagem do commit** no feed em vez das
   notas — foi o que aconteceu na v2.0.4 (corrigido à mão a seguir). Depois
   de publicar, vale sempre a pena confirmar:

   ```
   gh release view vX.Y.Z --repo BrunoSousa1997/Arena-Tracker --json body
   ```

## Passo a passo

1. **Descobrir a última tag publicada**
   ```
   git describe --tags --abbrev=0
   ```
   Se não houver nenhuma tag ainda, usa o primeiro commit do repositório como
   ponto de partida.

2. **Listar os commits desde essa tag**
   ```
   git log <última-tag>..HEAD --no-merges --pretty=format:"%s"
   ```
   Se não houver commits novos, avisa o utilizador que não há nada para
   lançar e para por aqui — não cries um ficheiro vazio.

3. **Filtrar ruído** — ignora commits que não interessam ao utilizador final:
   commits só de bump de versão (`vX.Y.Z`, `v.X.Y.Z`), merges, commits de
   lint/formatação puros, ficheiros de config sem impacto visível.

4. **Classificar os commits restantes por intenção**, com juízo — este
   repositório não usa Conventional Commits, por isso guia-te pelo verbo e
   pelo conteúdo da mensagem, não por um prefixo rígido:
   - Começa por "Fix", "Corrige", "Consolidate...bug", ou descreve um
     problema a corrigir → **Correções**
   - Começa por "Add", "Cria", "Nova", "New", ou introduz uma funcionalidade
     nova → **Novidades**
   - Descreve otimização/reorganização/comportamento existente melhorado
     (ex: "Smarter auto-sync timing", "Simplify...") → **Melhorias**
   - Qualquer coisa que não encaixe claramente pode ficar em Melhorias.

   Omite grupos vazios — não escrevas "Correções" se não houver nenhuma.

5. **Escrever as notas nos dois idiomas (pt-PT e inglês)**, no mesmo tom
   direto e curto que já se vê nas strings da app (`src/lib/i18n.js`):
   frases curtas, sem jargão técnico de commit, pensadas para quem joga, não
   para quem programa. Traduz o commit para o que o jogador realmente nota —
   não copies a mensagem de commit tal e qual.

   **Cada ponto é uma frase nominal, não uma frase verbal** — descreve *o
   que a versão tem*, não *o que o programador fez*. O verbo conjugado na 3ª
   pessoa é o erro típico a evitar, sobretudo nas Correções, porque é assim
   que as mensagens de commit vêm escritas:
   - ✅ "Correção de um problema de arranque causado por um import sensível
     a maiúsculas/minúsculas." / "Redesenho da Coleção." / "Novo fundo
     animado."
   - ❌ "Corrige um problema de arranque…" / "Redesenha a Coleção." /
     "Adiciona um fundo animado."

   O mesmo em inglês: "Fix for a startup issue…", não "Fixes a startup
   issue…".

   A app é bilingue e mostra só o bloco do idioma que o utilizador tem
   escolhido. Isso depende de **cada idioma começar por um cabeçalho de
   nível 2 exatamente com estes nomes** — `## Português` e `## English` —
   porque é por eles que `pickLanguageSection()` (`src/lib/patchNotes.js`)
   corta o HTML que vem do GitHub. Não mudes estes dois títulos nem uses
   nível diferente de cabeçalho, senão a app deixa de separar os idiomas e
   passa a mostrar tudo junto.

   Formato exato (markdown simples, é isto que aparece nos modais da app):
   ```markdown
   ## Português

   ### Novidades
   - ...

   ### Melhorias
   - ...

   ### Correções
   - ...

   ## English

   ### What's New
   - ...

   ### Improvements
   - ...

   ### Fixes
   - ...
   ```
   Os dois blocos devem ter o mesmo conteúdo, não versões diferentes — o
   inglês é tradução do português, item a item.

   Não incluas o número de versão dentro do ficheiro — o GitHub já mostra o
   nome da tag/release ao lado, e a app já mostra a versão separadamente
   (`data.version` em `UpdateNotifier.jsx`/`PatchHistoryModal.jsx`).

6. **Gravar o rascunho em `build/release-notes.md`** (cria a pasta `build/`
   se não existir). Este ficheiro é só um input de build, não faz parte do
   histórico do projeto — sobrescreve sempre sem pedir confirmação para
   sobrescrever.

7. **Mostrar o rascunho ao utilizador no chat** e pedir para rever/editar
   antes de avançar. Não presumas que o texto gerado está pronto a publicar.

## O que esta skill NÃO faz sozinha

Não avances automaticamente para nenhum destes passos — pede confirmação
explícita no chat antes de cada um, porque criam estado partilhado/publicado
que não é reversível:

- Subir a versão em `package.json`
- Criar a tag git (`git tag vX.Y.Z`) ou dar `git push --tags`
- Correr `npm run release` (isto builda, publica no GitHub e distribui o
  instalador a quem tiver a app aberta com auto-update)

Depois de o utilizador confirmar o texto, o fluxo normal de publicação é:
1. Atualizar `"version"` em `package.json`
2. Commit + `git tag vX.Y.Z` + `git push && git push --tags`
3. `npm run release`

O `build/release-notes.md` vai automaticamente para o corpo da release do
GitHub nesse passo 3 — não precisas de colar nada manualmente na interface
do GitHub.

## Depois de `npm run release`: verificar sempre

Na v2.0.4 o `electron-builder` correu o publisher **duas vezes** e criou
**duas releases com a mesma tag** — uma com o `.exe` + `latest.yml`, outra só
com o blockmap. Enquanto as duas existem, o GitHub recusa editar qualquer
uma (`422 already_exists: tag_name`), por isso nem dá para corrigir o corpo
sem apagar a intrusa primeiro. Confirma o estado logo a seguir a publicar:

```
gh api repos/BrunoSousa1997/Arena-Tracker/releases --jq '.[] | select(.tag_name=="vX.Y.Z") | {id, assets: [.assets[].name], bodyLen: (.body|length)}'
```

O que deves ver: **uma** release, com `.exe` + `latest.yml` + `.blockmap`, e
`bodyLen > 0`. Se houver duas, a boa é a que tem o `latest.yml` (é dela que o
auto-update lê) — apaga a outra (`gh api -X DELETE .../releases/<id>`, não
apaga a tag) e repõe o blockmap com
`gh release upload vX.Y.Z <ficheiro> --clobber`.

## Corrigir notas de uma release já publicada

O fluxo acima só serve para a release seguinte. Para reescrever as notas de
uma versão que já está no GitHub, usa o `gh` CLI (precisa de estar instalado
e autenticado — confirma com `gh auth status`):

```
gh release edit vX.Y.Z --repo BrunoSousa1997/Arena-Tracker --notes-file <ficheiro.md>
```

Editar o corpo de uma release **não** redistribui nada nem dispara
auto-update — só muda o texto. Como a app lê o feed atom em tempo real
(`updater:history` em `electron/updater.js`), a alteração aparece no
"Histórico de atualizações" sem republicar a app. Mesmo assim, é conteúdo
público: confirma o texto com o utilizador antes de o aplicar.

Para uma versão antiga que nunca chegou a ter release, cria-a apontando ao
commit certo — **com o SHA completo**, que o abreviado é rejeitado pela API
com `target_commitish is invalid`, e com `--latest=false` para não roubar o
estatuto de "Latest" à versão mais recente:

```
gh release create vX.Y.Z --repo BrunoSousa1997/Arena-Tracker \
  --target <sha-completo> --title "X.Y.Z" \
  --notes-file <ficheiro.md> --latest=false
```
