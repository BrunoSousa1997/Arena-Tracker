const { app, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const { getWindow } = require("./windowState");

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
  sendUpdaterStatus("downloaded", { version: info?.version });
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
