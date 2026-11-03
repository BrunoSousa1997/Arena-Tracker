// Verificação da cache de ícones (electron/iconCache.js) a correr dentro do
// Electron de verdade.
//
// Existe pela mesma razão que o verify-platform.js: o lint e os testes não
// dizem nada sobre o que aqui pode partir. O protocolo at-img:// só existe
// dentro do Electron, o handler só é exercitado por um pedido verdadeiro, e
// "está em cache" só se prova cortando a rede e voltando a pedir.
//
// Correr com:  npm run verify:icons
//
// Usa um userData próprio e apaga-o no fim — não mexe na cache de ícones real
// de quem corre o script.
const { app, BrowserWindow, session } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const userData = path.join(os.tmpdir(), `at-icon-verify-${Date.now()}`);
app.setPath("userData", userData);

// No Windows o processo principal do Electron é uma app de janelas: lançado a
// partir de um pipe (um "npm run ... > ficheiro", a CI, ou um agente), o
// console.log não vai a sítio nenhum e o script parece pendurado sem dizer
// nada. Por isso tudo o que é dito aqui vai para o stdout E para um ficheiro,
// que é passado em --log=<caminho> ou sai ao lado do userData temporário.
const logFile =
  (process.argv.find((a) => a.startsWith("--log=")) || "").slice(6) ||
  path.join(os.tmpdir(), "at-icon-verify.log");
fs.writeFileSync(logFile, "");

function say(line) {
  console.log(line);
  fs.appendFileSync(logFile, `${line}\n`);
}

function die(label, err) {
  say(`FALHA ${label} — ${err?.stack || err}`);
  app.exit(1);
}

process.on("unhandledRejection", (err) => die("promessa sem dono", err));
process.on("uncaughtException", (err) => die("exceção", err));

// Sem janela nenhuma o Electron não se fecha sozinho: um pedido que nunca
// responde deixava o processo vivo para sempre, à espera de nada.
setTimeout(() => die("tempo esgotado (60s)", new Error("a verificação não acabou")), 60000);

const {
  registerIconScheme,
  registerIconCacheHandlers,
  prefetchIcons,
} = require("../electron/iconCache");

registerIconScheme();

const ITEMS = [3031, 6672, 3153, 3089, 3157, 3142];
const CHAMPS = ["Ahri", "Jhin"];
// Os augments não são identificados por um id mas por um caminho dentro da
// árvore de assets do Community Dragon — barras incluídas, e já com o ".png".
const AUGMENTS = [
  "assets/ux/cherry/augments/icons/adapt_small.png",
  "assets/ux/cherry/augments/icons/allforyou_small.png",
];

// Em profundidade, e não só o primeiro nível: os augments ficam em disco com o
// caminho deles todo ("augment/assets/ux/cherry/..."), por isso uma contagem
// só do topo dizia que o pré-aquecimento tinha trazido menos do que trouxe.
function cacheFiles(dir = path.join(userData, "icon-cache"), prefixo = "") {
  if (!fs.existsSync(dir)) return [];

  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const nome = prefixo ? `${prefixo}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...cacheFiles(path.join(dir, entry.name), nome));
    else if (entry.name.endsWith(".png")) out.push(nome);
  }
  return out;
}

// O session.fetch passa pelo nosso protocol.handle, igual ao que um
// <img src="at-img://..."> faz no renderer.
async function get(url) {
  const t = Date.now();
  const res = await session.defaultSession.fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    bytes: buf.length,
    ms: Date.now() - t,
    png: buf.subarray(1, 4).toString(),
  };
}

app.whenReady().then(async () => {
  registerIconCacheHandlers();

  let failures = 0;
  const check = (name, ok, detail) => {
    say(`${ok ? "OK   " : "FALHA"} ${name}${detail ? " — " + detail : ""}`);
    if (!ok) failures += 1;
  };

  // 1. Primeiro pedido: vai ao CDN, grava em disco, devolve um PNG.
  const cold = await get("at-img://item/3031.png");
  check("ícone a frio devolve PNG", cold.status === 200 && cold.png === "PNG", JSON.stringify(cold));
  check("gravou em disco", fs.existsSync(path.join(userData, "icon-cache", "item", "3031.png")));

  // 2. Segundo pedido ao mesmo URL: vem do disco.
  const warm = await get("at-img://item/3031.png");
  check(
    "ícone a quente vem do disco",
    warm.status === 200 && warm.bytes === cold.bytes,
    `frio ${cold.ms}ms / quente ${warm.ms}ms`
  );

  // 3. O ícone em cache é servido sem ir à rede — é o ponto do "funciona
  //    offline". A prova aqui é o tempo: 200 com um PNG completo em poucos
  //    milésimos não cabe numa ida ao CloudFront (a frio, acima, foram
  //    centenas). O enableNetworkEmulation do Chromium não serve para isto —
  //    não se aplica ao net.fetch do processo principal, que é o que a cache
  //    usa para descarregar.
  check(
    "ícone em cache servido sem ida à rede",
    warm.status === 200 && warm.png === "PNG" && warm.ms < 50,
    `${warm.ms}ms`
  );

  // E um id que não existe no CDN: 404 nosso, sem estourar, para a view o
  // poder esconder no onError.
  const missing = await get("at-img://item/9999991.png");
  check("ícone que o CDN não tem dá 404 (e não estoura)", missing.status === 404,
    `status ${missing.status}`);

  // 4. O kind e o nome do ficheiro vêm do renderer, portanto são input: nada
  //    de ".." a sair da pasta da cache nem de caminhos inventados no CDN.
  for (const bad of [
    "at-img://item/..%2F..%2Fmanifest.json",
    "at-img://item/3031.exe",
    "at-img://segredos/3031.png",
    "at-img://item/undefined.png",
    // Os augments são os únicos que aceitam barras no nome, por isso são os
    // únicos onde sair da pasta da cache seria sequer concebível.
    "at-img://augment/assets/../../../manifest.json",
    "at-img://augment/assets%2F..%2F..%2Fmanifest.json",
    "at-img://augment/assets/ux/.ssh/id_rsa.png",
    // E um caminho de uma só peça não é um caminho de augment nenhum.
    "at-img://augment/adapt_small.png",
  ]) {
    const res = await get(bad);
    check(`recusa ${bad}`, res.status === 404 || res.status === 400, `status ${res.status}`);
  }

  // 5. Pré-aquecimento: enche o disco com a lista que o renderer manda.
  const before = cacheFiles().length;
  const t0 = Date.now();
  const report = await prefetchIcons({
    item: ITEMS,
    champion: CHAMPS,
    spell: ["SummonerFlash"],
    augment: AUGMENTS,
  });
  const after = cacheFiles().length;
  check(
    "pré-aquecimento descarregou tudo",
    report.failed === 0 && after > before,
    `${before} -> ${after} ficheiros em ${Date.now() - t0}ms, ${JSON.stringify(report)}`
  );

  // 6. Correr outra vez, no mesmo patch, não volta à rede.
  const again = await prefetchIcons({
    item: ITEMS,
    champion: CHAMPS,
    spell: ["SummonerFlash"],
    augment: AUGMENTS,
  });
  check(
    "segundo pré-aquecimento não volta à rede",
    again.downloaded === 0 && again.revalidated === 0,
    JSON.stringify(again)
  );

  // 7. A build inteira de uma vez, como a linha do Histórico pede.
  const t1 = Date.now();
  const all = await Promise.all(ITEMS.map((id) => get(`at-img://item/${id}.png`)));
  check(
    "build inteira servida do disco",
    all.every((r) => r.status === 200 && r.png === "PNG"),
    `${ITEMS.length} ícones em ${Date.now() - t1}ms`
  );

  // 7b. E os augments, que são o outro lado da mesma linha do Histórico: a
  //     build de cada jogador e, ao lado dela, os augments de cada jogador.
  const comAugments = await Promise.all(AUGMENTS.map((p) => get(`at-img://augment/${p}`)));
  check(
    "augments servidos do disco, com o caminho e tudo",
    comAugments.every((r) => r.status === 200 && r.png === "PNG"),
    JSON.stringify(comAugments.map((r) => `${r.bytes}B em ${r.ms}ms`))
  );

  // 8. O que nenhum dos passos acima prova: um <img src="at-img://..."> numa
  //    página de verdade. O session.fetch acima fala com o handler direto; o
  //    renderer passa pelas regras de esquema do Chromium, e é aí que um
  //    at-img:// mal registado falharia em silêncio — com a app a mostrar
  //    quadrados vazios e nada nos logs.
  const win = new BrowserWindow({ show: false, width: 200, height: 200 });
  await win.loadURL(
    `data:text/html,${encodeURIComponent(
      '<img id="i" src="at-img://item/3031.png">' +
        '<img id="j" src="at-img://champion/Ahri.png">' +
        `<img id="k" src="at-img://augment/${AUGMENTS[0]}">`
    )}`
  );
  const loaded = await win.webContents.executeJavaScript(`
    Promise.all(["i", "j", "k"].map((id) => new Promise((resolve) => {
      const el = document.getElementById(id);
      const done = () => resolve({ id, w: el.naturalWidth, h: el.naturalHeight });
      if (el.complete) done();
      else { el.onload = done; el.onerror = done; }
    })))
  `);
  check(
    "<img> no renderer desenha os ícones",
    loaded.every((r) => r.w > 0 && r.h > 0),
    JSON.stringify(loaded)
  );
  win.destroy();

  say(`\n${failures ? `FALHOU: ${failures}` : "TUDO OK"}`);

  // O Electron ainda tem ficheiros seus abertos dentro deste userData, por
  // isso apagá-lo aqui dá EPERM no Windows. Fica o que der; é tudo dentro do
  // temp do sistema.
  try {
    fs.rmSync(userData, { recursive: true, force: true });
  } catch {
    say(`(a pasta temporária ficou para trás: ${userData})`);
  }

  app.exit(failures ? 1 : 0);
});
