// Verificação da cache dos dados estáticos (electron/staticData.js) a correr
// dentro do Electron de verdade.
//
// Existe pela mesma razão que o verify-icons.js: o que aqui interessa provar é
// comportamento de rede e de disco, e "funciona sem internet" só se sabe
// cortando a internet e voltando a pedir.
//
// Correr com:  npm run verify:static
//
// POR QUE SÃO DUAS FASES: o corte de rede é feito apontando as origens da
// Data Dragon e da Community Dragon para um endereço morto (as variáveis
// AT_DDRAGON_ORIGIN / AT_CDRAGON_ORIGIN, ver electron/dataDragon.js). São
// lidas quando o módulo carrega, portanto valem para o processo inteiro e não
// se podem ligar a meio: a fase "online" enche a cache, a fase "offline"
// arranca um processo novo já sem rede e lê o que a primeira deixou. As duas
// partilham a mesma pasta de userData, com um nome fixo (a fase online limpa-a
// ao começar).
//
// Antes disto tentou-se cortar a rede por dentro do Electron, que seria mais
// limpo. Não dá: o session.setProxy, o --proxy-server e o
// --host-resolver-rules foram todos testados contra o net.fetch do processo
// principal e os pedidos saem na mesma. A "prova" de que a app funcionava sem
// rede era falsa — e foi o teste do passo 1 da fase offline que a desmascarou,
// por isso ele fica lá para sempre.
const { app } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const PHASE = arg("phase", "online");
const userData = arg("userdata", path.join(os.tmpdir(), "at-static-verify"));
const logFile = arg("log", path.join(os.tmpdir(), "at-static-verify.log"));

if (PHASE !== "online" && PHASE !== "offline") {
  console.error(`fase desconhecida: ${PHASE}`);
  process.exit(2);
}

// 203.0.113.0/24 é a rede reservada pela RFC 5737 para documentação: não
// encaminha para sítio nenhum. É isto que faz a fase offline ser offline a
// sério — tem de ser posto ANTES de qualquer require dos módulos do electron/,
// que leem as origens ao carregar.
if (PHASE === "offline") {
  process.env.AT_DDRAGON_ORIGIN = "https://203.0.113.1";
  process.env.AT_CDRAGON_ORIGIN = "https://203.0.113.1";
}

app.setPath("userData", userData);

const CACHE = path.join(userData, "static-cache");
const EXPECTED = path.join(userData, "esperado.json");

// A fase online começa de zero; a offline vive do que a online deixou.
if (PHASE === "online") {
  fs.rmSync(userData, { recursive: true, force: true });
  fs.mkdirSync(userData, { recursive: true });
  fs.writeFileSync(logFile, "");
}

// No Windows o processo principal do Electron é uma app de janelas: lançado a
// partir de um pipe, o console.log não vai a sítio nenhum e o script parece
// pendurado sem dizer nada. Daí o ficheiro de log.
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
setTimeout(() => die("tempo esgotado (90s)", new Error("não acabou")), 90000);

// Cada caso quer um arranque limpo: o patch e o resultado ficam em memória nos
// módulos (de propósito — é uma vez por arranque da app), por isso para
// simular um segundo arranque é preciso voltar a carregá-los.
function freshLoad() {
  for (const key of Object.keys(require.cache)) {
    if (/electron[\\/](staticData|dataDragon)\.js$/.test(key)) delete require.cache[key];
  }
  return require("../electron/staticData").loadStaticData();
}

// Os nomes que a app mostra: sem isto a cache podia estar a guardar ficheiros
// perfeitamente válidos e vazios de conteúdo útil.
function names(data) {
  const parse = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };
  const item = parse(data.item)?.data;
  const champion = parse(data.champion)?.data;
  const summoner = parse(data.summoner)?.data;
  const augments = parse(data.augments);
  const list = Array.isArray(augments) ? augments : augments?.augments || [];
  return {
    item: item?.["3031"]?.name || null,
    champion: champion?.Ahri?.name || null,
    spell: summoner?.SummonerFlash?.name || null,
    augments: list.length || 0,
  };
}

let failures = 0;
const check = (name, ok, detail) => {
  say(`${ok ? "OK   " : "FALHA"} [${PHASE}] ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures += 1;
};

const allFrom = (source, want) => Object.values(source).every((s) => s === want);

async function online() {
  // 1. Primeiro arranque: tudo da rede e tudo gravado em disco.
  const first = await freshLoad();
  const n1 = names(first);
  check("primeiro arranque traz os quatro ficheiros da rede", allFrom(first.source, "network"),
    JSON.stringify(first.source));
  check("e traz nomes a sério",
    !!n1.item && !!n1.champion && !!n1.spell && n1.augments > 100, JSON.stringify(n1));
  check("gravou a pasta do patch e o last-patch",
    fs.existsSync(path.join(CACHE, first.patch, "item.json")) &&
      fs.readFileSync(path.join(CACHE, "last-patch"), "utf8").trim() === first.patch,
    `patch ${first.patch}`);

  // 2. Segundo arranque: já vem todo do disco, sem tocar na rede.
  const second = await freshLoad();
  check("segundo arranque não volta à rede", allFrom(second.source, "disk"),
    JSON.stringify(second.source));

  // 3. Patch novo: a pasta do patch anterior é apagada em vez de ficar a
  //    acumular ~2 MB de JSON por patch.
  const velho = path.join(CACHE, "0.0.1");
  fs.mkdirSync(velho, { recursive: true });
  fs.writeFileSync(path.join(velho, "item.json"), "{}");
  fs.writeFileSync(path.join(CACHE, "last-patch"), "0.0.1");
  const novo = await freshLoad();
  check("patch novo limpa a pasta do antigo",
    !fs.existsSync(velho) && fs.existsSync(path.join(CACHE, novo.patch, "item.json")),
    fs.readdirSync(CACHE).join(", "));

  // 4. Cache estragada por outra via (disco com problemas, alguém a mexer no
  //    ficheiro): é relida da rede em vez de deixar a app sem nomes até ao
  //    patch seguinte.
  fs.writeFileSync(path.join(CACHE, novo.patch, "item.json"), "isto não é JSON");
  const estragada = await freshLoad();
  check("cache estragada é descartada e relida da rede",
    names(estragada).item === n1.item && estragada.source.item === "network",
    `item: ${estragada.source.item}`);

  // 5. A ponta que nada disto acima cobre: o caminho real do renderer, pelo
  //    preload e pelo IPC. É por aqui que a app pede os dados (ver
  //    lib/staticData.js), e um handler mal registado ou um preload sem a
  //    função falhariam em silêncio, com a app a mostrar ids e nada nos logs.
  const { BrowserWindow } = require("electron");
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "..", "preload.js"),
    },
  });
  await win.loadURL("data:text/html,<title>verify</title>");
  const viaIpc = await win.webContents.executeJavaScript(`
    window.electron.getStaticData().then((d) => ({
      patch: d.patch,
      item: JSON.parse(d.item).data["3031"].name,
      temOsQuatro: ["champion", "summoner", "item", "augments"].every((k) => !!d[k]),
    }))
  `);
  check("o renderer recebe os dados pelo preload/IPC",
    viaIpc.patch === novo.patch && viaIpc.item === n1.item && viaIpc.temOsQuatro,
    JSON.stringify(viaIpc));
  win.destroy();

  // O que a fase offline vai confirmar que sobreviveu.
  fs.writeFileSync(EXPECTED, JSON.stringify({ patch: novo.patch, names: n1 }));
}

async function offline() {
  const expected = JSON.parse(fs.readFileSync(EXPECTED, "utf8"));

  // 1. Primeiro: confirmar que estamos MESMO sem rede. Se este passo passar a
  //    dar "ok", o resto desta fase não prova nada (foi o que aconteceu com a
  //    tentativa do proxy, ver o comentário no topo).
  let alcancavel;
  try {
    const { net } = require("electron");
    const { DDRAGON_ORIGIN } = require("../electron/dataDragon");
    const res = await net.fetch(`${DDRAGON_ORIGIN}/api/versions.json`, {
      signal: AbortSignal.timeout(6000),
    });
    alcancavel = res.ok;
  } catch {
    alcancavel = false;
  }
  check("a rede está mesmo cortada", !alcancavel,
    alcancavel ? "a origem respondeu!" : "origem inalcançável");

  // 2. O ponto de tudo isto: a app abre com os nomes da última cópia boa, e
  //    com o patch tirado do last-patch (o versions.json também não responde).
  const got = await freshLoad();
  const n = names(got);
  check("sem rede: o patch vem do disco", got.patch === expected.patch,
    `${got.patch} (esperado ${expected.patch})`);
  check("sem rede: os quatro ficheiros vêm do disco", allFrom(got.source, "disk"),
    JSON.stringify(got.source));
  check("sem rede: os nomes continuam lá",
    n.item === expected.names.item &&
      n.champion === expected.names.champion &&
      n.spell === expected.names.spell &&
      n.augments === expected.names.augments,
    JSON.stringify(n));

  // 3. Sem rede e sem nada em disco (a primeira vez de sempre, offline): a app
  //    não pode estourar — fica sem nomes e mostra os ids, como fazia antes.
  fs.rmSync(CACHE, { recursive: true, force: true });
  const virgem = await freshLoad();
  check("sem rede e sem cache: devolve vazio em vez de estourar",
    virgem.patch === null && allFrom(virgem.source, null),
    JSON.stringify({ patch: virgem.patch, ...virgem.source }));
}

app.whenReady().then(async () => {
  require("../electron/staticData").registerStaticDataHandlers();
  await (PHASE === "online" ? online() : offline());

  if (PHASE === "offline") {
    say(`\n${failures ? `FALHOU: ${failures}` : "TUDO OK"}`);
    try {
      fs.rmSync(userData, { recursive: true, force: true });
    } catch {
      say(`(a pasta temporária ficou para trás: ${userData})`);
    }
  }

  app.exit(failures ? 1 : 0);
});
