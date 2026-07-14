require("dotenv").config();

const { app, BrowserWindow } = require("electron");
const { createWindow } = require("./electron/window");
const { initUpdater, checkForUpdatesOnStartup } = require("./electron/updater");
const { startLiveGameWatcher } = require("./electron/liveGame");
const { registerRiotApiHandlers } = require("./electron/riotApi");

// Ponto de entrada — cada módulo em ./electron trata só da sua área
// (janela, auto-update, deteção ao vivo, cliente da Riot API) e regista os
// próprios listeners/IPC handlers quando é "require"-ado.
initUpdater();
registerRiotApiHandlers();

app.whenReady().then(() => {
  console.log("APP READY");
  createWindow();
  startLiveGameWatcher();
  checkForUpdatesOnStartup();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
