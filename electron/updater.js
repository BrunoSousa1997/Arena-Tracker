const { app, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const https = require("https");
const { getWindow } = require("./windowState");
const { isGameActive } = require("./liveGame");

const RELEASES_OWNER = "BrunoSousa1997";
const RELEASES_REPO = "Arena-Tracker";

// ================= AUTO UPDATE =================
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// De quanto em quanto tempo se volta a perguntar ao GitHub se há versão nova.
// Só verificar no arranque não chegava: com o modo em segundo plano a app
// fica ligada dias seguidos (é esse o objetivo dele), e nesse tempo nunca
// chegava a saber que havia atualização — o aviso só aparecia ao fim de um
// reinício que podia nunca acontecer.
const CHECK_INTERVAL_MS = 3 * 60 * 60 * 1000;

// De três em três horas serve quem deixa a app ligada dias seguidos, e é
// lento de mais para quem volta à janela logo depois de sair uma versão: a
// atualização estava à distância de um pedido e a app só dava por ela horas
// depois — ou a um reinício, que é como se descobria na prática. Voltar à
// janela é o momento em que se olha para ela, por isso é aí que vale a pena
// perguntar outra vez. Com travão, senão cada alt-tab era um pedido novo.
const FOCUS_CHECK_MIN_GAP_MS = 20 * 60 * 1000;
let lastCheckAt = 0;

// Com a atualização já descarregada, de quanto em quanto tempo se vê se a app
// está num momento em que se pode reiniciar sem ninguém dar por isso.
const IDLE_POLL_MS = 5 * 60 * 1000;

// Versão já descarregada à espera de ser aplicada (null = não há nada).
let downloadedVersion = null;
let idleTimer = null;

// Há sincronizações automáticas por terminar? Vem da interface (ver
// scheduleAutoSync em useLiveGame.js), porque é lá que elas vivem: são
// temporizadores em memória, que um reinício deita fora. Aplicar a
// atualização a meio de um desses ciclos deixaria a partida acabada de jogar
// por sincronizar até alguém carregar no botão à mão.
let syncPending = false;

function sendUpdaterStatus(status, data) {
  console.log("[updater]", status, data || "");
  const win = getWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send("updater:status", { status, data });
  }
}

// Aplica a atualização já descarregada. (true, true) = instalar em silêncio
// (sem a janela do instalador NSIS a piscar) e relançar a app logo a seguir.
// O reinício é inevitável no desktop — substituir o .exe/.asar exige o
// processo fechar — mas assim fica o mais indolor possível: um relançamento
// rápido em vez de o utilizador ter de reabrir à mão. Partilhada pelo botão
// "Reiniciar agora" (banner) e pelo item da bandeja (ver electron/background.js).
function installUpdate() {
  autoUpdater.quitAndInstall(true, true);
}

// Onde está a app do ponto de vista de quem a usa: "hidden" (na bandeja, ou
// ainda sem janela), "minimized", ou null quando está à vista — e aí não se
// lhe toca, que é o que o banner "Reiniciar agora" existe para resolver.
function awayState() {
  const win = getWindow();
  if (!win || win.isDestroyed()) return "hidden";

  // Pela ordem certa: escondida na bandeja primeiro (ver isWindowHidden em
  // electron/background.js, que acompanha os eventos em vez de adivinhar),
  // depois minimizada, e isVisible() só como rede de segurança. Ao contrário,
  // a app relançava-se escondida na bandeja a quem a tinha simplesmente
  // minimizada na barra de tarefas — sumia do sítio onde a foram pôr.
  if (require("./background").isWindowHidden()) return "hidden";
  if (win.isMinimized()) return "minimized";
  if (!win.isVisible()) return "hidden";
  return null;
}

// O reinício é inevitável para aplicar uma atualização (o Windows não deixa
// substituir o .exe de um processo vivo), mas não tem de ser o utilizador a
// escolher o momento: faz-se quando ele não está a olhar. Fica de fora tudo
// o que um reinício estragaria — uma partida a decorrer (perdia-se a sessão
// ao vivo e o overlay) e sincronizações por terminar.
function installWhenIdle() {
  if (!downloadedVersion) return;
  if (isGameActive() || syncPending) return;

  const state = awayState();
  if (!state) return;

  clearInterval(idleTimer);
  idleTimer = null;
  console.log("[updater] app ociosa (" + state + ") — a aplicar " + downloadedVersion);

  // Para o arranque seguinte repor a app como ela estava (ver
  // setRelaunchState em electron/background.js): quem a tinha na bandeja não
  // deve receber uma janela na cara por causa de uma atualização.
  require("./background").setRelaunchState(state);
  installUpdate();
}

autoUpdater.on("checking-for-update", () => {
  sendUpdaterStatus("checking");
});

autoUpdater.on("update-available", (info) => {
  sendUpdaterStatus("available", { version: info?.version });
});

autoUpdater.on("update-not-available", () => {
  sendUpdaterStatus("not-available");
});

autoUpdater.on("download-progress", (progress) => {
  sendUpdaterStatus("downloading", { percent: progress?.percent || 0 });
});

autoUpdater.on("update-downloaded", (info) => {
  // electron-updater devolve string (release única) ou array de
  // {version, note} quando o utilizador salta várias versões de uma vez.
  const notes = Array.isArray(info?.releaseNotes)
    ? info.releaseNotes.map((n) => n?.note).filter(Boolean).join("\n\n")
    : typeof info?.releaseNotes === "string"
    ? info.releaseNotes
    : null;

  sendUpdaterStatus("downloaded", { version: info?.version, releaseNotes: notes });

  // Bandeja: dá a quem corre em segundo plano (e quase não abre a janela onde
  // vive o banner) um sítio para aplicar sem reabrir. Require tardio para não
  // criar dependência circular na carga dos módulos.
  require("./background").setPendingUpdate(info?.version, installUpdate);

  // A partir daqui a atualização aplica-se sozinha mal haja um momento bom
  // para isso; o banner e a bandeja ficam para quem não quiser esperar.
  downloadedVersion = info?.version || null;
  if (idleTimer) clearInterval(idleTimer);
  idleTimer = setInterval(installWhenIdle, IDLE_POLL_MS);
  installWhenIdle();
});

autoUpdater.on("error", (err) => {
  sendUpdaterStatus("error", { message: err?.message || String(err) });
});

ipcMain.handle("updater:check", () => checkNow());

// A interface avisa quando fica (ou deixa de ficar) com auto-syncs em aberto
// — ver syncPending acima.
ipcMain.handle("updater:syncPending", (_event, pending) => {
  syncPending = !!pending;
});

ipcMain.handle("updater:install", () => {
  installUpdate();
});

ipcMain.handle("app:getVersion", () => app.getVersion());

// ================= HISTÓRICO DE PATCHES =================
// Feed atom público do GitHub — dá as notas de todas as releases já em
// HTML pronto (o próprio GitHub converte o markdown do corpo da release),
// sem precisar de autenticação nem de um parser de markdown à parte.
function fetchReleasesAtom() {
  return new Promise((resolve, reject) => {
    https
      .get(
        `https://github.com/${RELEASES_OWNER}/${RELEASES_REPO}/releases.atom`,
        { headers: { "User-Agent": "arena-tracker-app" } },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            reject(new Error(`GitHub respondeu ${res.statusCode}`));
            return;
          }
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(data));
        }
      )
      .on("error", reject);
  });
}

function unescapeXmlEntities(str) {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseReleasesAtom(xml) {
  const releases = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let entryMatch;

  while ((entryMatch = entryRegex.exec(xml))) {
    const block = entryMatch[1];
    const version = /<title>([\s\S]*?)<\/title>/.exec(block)?.[1]?.trim();
    if (!version) continue;

    const publishedAt = /<updated>([\s\S]*?)<\/updated>/.exec(block)?.[1]?.trim() || null;
    const rawContent = /<content(?:\s+type="html")?>([\s\S]*?)<\/content>/.exec(block)?.[1] || "";
    const notesHtml = unescapeXmlEntities(rawContent).trim();

    releases.push({
      version,
      publishedAt,
      notesHtml: notesHtml === "No content." ? "" : notesHtml,
    });
  }

  return releases;
}

ipcMain.handle("updater:history", async () => {
  try {
    const xml = await fetchReleasesAtom();
    return { ok: true, releases: parseReleasesAtom(xml) };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

function checkNow() {
  lastCheckAt = Date.now();
  return autoUpdater.checkForUpdates().catch((err) => {
    sendUpdaterStatus("error", { message: err?.message || String(err) });
  });
}

function checkForUpdatesOnStartup() {
  // Em desenvolvimento não há app-update.yml nenhum para consultar.
  if (process.env.ELECTRON_START_URL) return;

  setTimeout(checkNow, 2000);

  // Ver CHECK_INTERVAL_MS. Com uma versão já descarregada não há nada a
  // procurar — o que falta é só o momento de a aplicar (ver installWhenIdle).
  setInterval(() => {
    if (!downloadedVersion) checkNow();
  }, CHECK_INTERVAL_MS);

  // Ver FOCUS_CHECK_MIN_GAP_MS.
  app.on("browser-window-focus", () => {
    if (downloadedVersion) return;
    if (Date.now() - lastCheckAt < FOCUS_CHECK_MIN_GAP_MS) return;
    checkNow();
  });
}

function initUpdater() {
  // Os listeners e IPC handlers acima já se registam quando este módulo é
  // "require"-ado — esta função existe só para o entry point (electron.js)
  // ter um sítio explícito onde disparar isso, em vez de confiar em
  // side-effects escondidos do require.
}

module.exports = { initUpdater, checkForUpdatesOnStartup };
