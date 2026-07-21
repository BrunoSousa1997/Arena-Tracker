require("dotenv").config();

const { app, BrowserWindow } = require("electron");
const { createWindow } = require("./electron/window");
const { initUpdater, checkForUpdatesOnStartup } = require("./electron/updater");
const { startLiveGameWatcher } = require("./electron/liveGame");
const { registerRiotApiHandlers } = require("./electron/riotApi");
const {
  registerBackgroundHandlers,
  shouldQuitOnAllWindowsClosed,
} = require("./electron/background");
const { registerOverlayHandlers } = require("./electron/overlay");

// Ponto de entrada — cada módulo em ./electron trata só da sua área
// (janela, auto-update, deteção ao vivo, cliente da Riot API) e regista os
// próprios listeners/IPC handlers quando é "require"-ado.
initUpdater();
registerRiotApiHandlers();

// Uma segunda instância não deve abrir uma segunda janela — sobretudo com o
// modo em segundo plano ligado, em que clicar no atalho com a app já a correr
// escondida é a forma natural de a querer trazer de volta. Sem isto, arrancava
// outro processo a competir pela mesma Live Client Data e pelos mesmos
// pedidos à Riot API.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
}

app.whenReady().then(() => {
  console.log("APP READY");
  registerBackgroundHandlers();
  registerOverlayHandlers();
  createWindow();
  startLiveGameWatcher();
  checkForUpdatesOnStartup();
});

app.on("window-all-closed", () => {
  // Em modo segundo plano a app fica viva sem janela nenhuma, à espera na
  // bandeja — ver electron/background.js.
  if (process.platform !== "darwin" && shouldQuitOnAllWindowsClosed()) app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
