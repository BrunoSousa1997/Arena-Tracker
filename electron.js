const { app, BrowserWindow } = require("electron");
const path = require("path");

// auto updater
const { autoUpdater } = require("electron-updater");

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  if (process.env.ELECTRON_START_URL) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, "dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  // 🔄 CHECK UPDATES
  autoUpdater.checkForUpdatesAndNotify();
});

// 📥 eventos de update
autoUpdater.on("update-available", () => {
  win.webContents.send("update-message", "Update disponível...");
});

autoUpdater.on("update-downloaded", () => {
  win.webContents.send("update-message", "Update pronto. A reiniciar...");
  autoUpdater.quitAndInstall();
});