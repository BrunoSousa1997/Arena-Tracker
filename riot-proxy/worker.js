// Cloudflare Worker — proxy para a Riot API.
//
// Objetivo: nenhuma instalação do Arena Tracker (nem a tua, nem a dos teus
// amigos) precisa de ter a RIOT_API_KEY guardada localmente num .env. Todos
// os pedidos à Riot passam por aqui; a chave só existe neste Worker (uma
// variável de ambiente "encriptada" no dashboard da Cloudflare) — nunca
// aparece no código nem é enviada para o GitHub.
//
// Se um dia precisares de trocar a chave, só precisas de a atualizar
// aqui — fica logo a funcionar para todos os amigos que já têm a app
// instalada, sem lhes enviares nada.
//
// Ver riot-proxy/INSTRUCOES.md para o passo a passo do deploy.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Espera pedidos no formato /proxy/<host-da-riot>/<resto-do-caminho>
    // ex: /proxy/europe.api.riotgames.com/lol/match/v5/matches/EUW1_123
    const match = url.pathname.match(/^\/proxy\/([^/]+)(\/.*)$/);
    if (!match) {
      return new Response("Not found", { status: 404 });
    }

    const [, host, riotPath] = match;

    // Nunca deixar isto ser usado como proxy aberto para outro site
    // qualquer — só hosts *.api.riotgames.com são aceites.
    if (!/^[a-z0-9-]+\.api\.riotgames\.com$/.test(host)) {
      return new Response("Host não permitido", { status: 400 });
    }

    if (!env.RIOT_API_KEY) {
      return new Response("RIOT_API_KEY não configurada neste Worker", { status: 500 });
    }

    const riotUrl = `https://${host}${riotPath}${url.search}`;

    const riotRes = await fetch(riotUrl, {
      headers: { "X-Riot-Token": env.RIOT_API_KEY },
    });

    const headers = new Headers();
    headers.set("content-type", riotRes.headers.get("content-type") || "application/json");
    const retryAfter = riotRes.headers.get("retry-after");
    if (retryAfter) headers.set("retry-after", retryAfter);

    return new Response(riotRes.body, {
      status: riotRes.status,
      headers,
    });
  },
};
