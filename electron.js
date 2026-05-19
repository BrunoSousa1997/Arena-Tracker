require("dotenv").config();

const {
  app,
  BrowserWindow,
  screen,
  Menu,
  globalShortcut,
  ipcMain,
} = require("electron");

const path = require("path");
const { autoUpdater } = require("electron-updater");
const Store = require("electron-store");

const store = new Store();

Menu.setApplicationMenu(null);

let win;

function createWindow() {
  console.log("Electron main process iniciou");
  const savedBounds = store.get("windowBounds");

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    x: savedBounds?.x,
    y: savedBounds?.y,
    width: savedBounds?.width || width,
    height: savedBounds?.height || height,

    minWidth: 900,
    minHeight: 600,

    frame: false,
    show: false,
    backgroundColor: "#0b0f1a",

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.setAutoHideMenuBar(true);

  // 👇 AQUI
  win.once("ready-to-show", () => {
    win.show();
    win.maximize(); // <- abre maximized
  });
  console.log("PRELOAD PATH:", path.join(__dirname, "preload.js"));
  win.setAutoHideMenuBar(true);

  if (process.env.ELECTRON_START_URL) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, "dist/index.html"));
  }

  win.once("ready-to-show", () => {
    win.show();
  });

  win.on("close", () => {
    store.set("windowBounds", win.getBounds());
  });

  // ================= IPC (BOTÕES WINDOW) =================
  ipcMain.handle("window:minimize", () => win.minimize());
  ipcMain.handle("window:maximize", () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.handle("window:close", () => win.close());
  ipcMain.handle("window:isMaximized", () => win.isMaximized());
  // fullscreen shortcuts
  globalShortcut.register("F11", () => {
    win.setFullScreen(!win.isFullScreen());
  });

  globalShortcut.register("Escape", () => {
    if (win.isFullScreen()) win.setFullScreen(false);
  });
}

app.whenReady().then(() => {
  console.log("APP READY");
  createWindow();
  if (!process.env.ELECTRON_START_URL) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 2000);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});