require("dotenv").config();

const { app, BrowserWindow } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  if (process.env.ELECTRON_START_URL) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, "dist/index.html"));
  }
}
console.log("GH_TOKEN:", process.env.GH_TOKEN);
// 🔥 FORÇA DOWNLOAD AUTOMÁTICO
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// 🔥 LOGS IMPORTANTES (DEBUG)
autoUpdater.logger = console;

app.whenReady().then(() => {
  createWindow();

  if (!process.env.ELECTRON_START_URL) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 2000);
  }
});

// ================= EVENTS =================

autoUpdater.on("update-available", () => {
  if (win) {
    win.webContents.send("update-message", "Update disponível...");
  }
});

autoUpdater.on("update-not-available", () => {
  console.log("Sem updates");
});

autoUpdater.on("error", (err) => {
  console.error("Updater error:", err);
  if (win) {
    win.webContents.send("update-message", "Erro no update");
  }
});

autoUpdater.on("download-progress", (progress) => {
  if (win) {
    win.webContents.send(
      "update-progress",
      Math.round(progress.percent)
    );
  }
});

autoUpdater.on("update-downloaded", () => {
  if (win) {
    win.webContents.send("update-message", "A instalar update...");
  }

  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 1000);
});