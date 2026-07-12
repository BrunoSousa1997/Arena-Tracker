# Proxy da Riot API (Cloudflare Workers)

Isto faz com que nenhum amigo precise de configurar nenhuma chave — a app
já vem "pronta a usar". A tua chave da Riot fica só guardada no Worker,
nunca no código nem no instalador.

## Deploy (uma vez, ~2 minutos)

1. Cria conta grátis em https://dash.cloudflare.com/sign-up (se ainda não
   tiveres uma).
2. No dashboard: **Workers & Pages** → **Create** → **Create Worker**.
3. Dá um nome (ex: `arena-tracker-proxy`) → **Deploy** (fica com um worker
   de exemplo, vamos substituir o código a seguir).
4. **Edit code** → apaga tudo → cola todo o conteúdo de `worker.js` (este
   ficheiro, na mesma pasta) → **Deploy**.
5. **Settings** → **Variables and Secrets** → **Add**:
   - Nome: `RIOT_API_KEY`
   - Valor: a tua Production API Key da Riot (developer.riotgames.com)
   - Marca como **Encrypt**
   - **Save and deploy**
6. Copia o URL público do Worker — algo como:
   `https://arena-tracker-proxy.<o-teu-user>.workers.dev`

## Ligar a app ao Worker

Abre `electron.js`, procura a linha:

```js
const RIOT_PROXY_BASE_URL = "https://SUBSTITUI-PELO-TEU-WORKER.workers.dev";
```

e substitui pelo URL que copiaste no passo 6. Este URL **não é secreto**
(a chave real fica só no Worker) — pode ficar no código e ir para o
GitHub sem problema.

Depois disto: `npm run release` (ou `npm run dist`) já produz uma app que
funciona para qualquer amigo, sem `.env`, sem chave, sem configuração.

## Se algum dia precisares de trocar a chave

Como já tens uma Production API Key registada, não há renovação diária a
fazer — mas se algum dia precisares de trocar a chave (ex: por segurança):

1. Ir a developer.riotgames.com, copiar a chave nova.
2. No Worker: **Settings** → **Variables and Secrets** → editar
   `RIOT_API_KEY` com o valor novo → **Save and deploy**.

Isto atualiza instantaneamente TODOS os amigos que já têm a app instalada
— não precisas de lhes enviar nada nem eles precisam de fazer nada.
