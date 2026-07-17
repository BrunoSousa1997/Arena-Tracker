const { app, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const https = require("https");
const { getWindow } = require("./windowState");

const RELEASES_OWNER = "BrunoSousa1997";
const RELEASES_REPO = "Arena-Tracker";

// ================= AUTO UPDATE =================
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function sendUpdaterStatus(status, data) {
  console.log("[updater]", status, data || "");
  const win = getWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send("updater:status", { status, data });
  }
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
});

autoUpdater.on("error", (err) => {
  sendUpdaterStatus("error", { message: err?.message || String(err) });
});

ipcMain.handle("updater:check", () => {
  return autoUpdater.checkForUpdates().catch((err) => {
    sendUpdaterStatus("error", { message: err?.message || String(err) });
  });
});

ipcMain.handle("updater:install", () => {
  autoUpdater.quitAndInstall();
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

function checkForUpdatesOnStartup() {
  if (!process.env.ELECTRON_START_URL) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        sendUpdaterStatus("error", { message: err?.message || String(err) });
      });
    }, 2000);
  }
}

function initUpdater() {
  // Os listeners e IPC handlers acima já se registam quando este módulo é
  // "require"-ado — esta função existe só para o entry point (electron.js)
  // ter um sítio explícito onde disparar isso, em vez de confiar em
  // side-effects escondidos do require.
}

module.exports = { initUpdater, checkForUpdatesOnStartup };
