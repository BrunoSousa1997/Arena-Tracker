const { app, BrowserWindow, screen, Menu, globalShortcut, ipcMain } = require("electron");
const path = require("path");
const Store = require("electron-store");
const { setWindow, getWindow } = require("./windowState");

const store = new Store();

Menu.setApplicationMenu(null);

function createWindow() {
  console.log("Electron main process iniciou");
  const savedBounds = store.get("windowBounds");

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
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
      preload: path.join(__dirname, "..", "preload.js"),
    },
  });

  setWindow(win);

  win.setAutoHideMenuBar(true);

  // 👇 AQUI
  win.once("ready-to-show", () => {
    win.show();
    win.maximize(); // <- abre maximized
  });
  console.log("PRELOAD PATH:", path.join(__dirname, "..", "preload.js"));
  win.setAutoHideMenuBar(true);

  if (process.env.ELECTRON_START_URL) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist/index.html"));
  }

  win.once("ready-to-show", () => {
    win.show();
  });

  win.on("close", () => {
    store.set("windowBounds", win.getBounds());
  });

  // Avisa a interface quando o modo full screen muda por qualquer via (F11,
  // Escape, ou o próprio SO) — não só quando pedido pelo botão nas
  // Definições — para o toggle lá mostrar sempre o estado real.
  win.on("enter-full-screen", () => {
    win.webContents.send("window:fullScreenChanged", true);
  });
  win.on("leave-full-screen", () => {
    win.webContents.send("window:fullScreenChanged", false);
  });

  // ================= IPC (BOTÕES WINDOW) =================
  // Registados aqui dentro (não ao nível do módulo) porque globalShortcut só
  // pode ser usado depois de a app estar "ready" — createWindow() só é
  // chamado a partir de app.whenReady() (ver electron.js).
  ipcMain.handle("window:minimize", () => getWindow().minimize());
  ipcMain.handle("window:maximize", () => {
    const w = getWindow();
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
  });
  ipcMain.handle("window:close", () => getWindow().close());
  ipcMain.handle("window:isMaximized", () => getWindow().isMaximized());

  // ================= RESOLUÇÃO / FULL SCREEN (ver Definições → Geral) =================
  // Área útil do ecrã onde a janela está mesmo agora (não sempre o "ecrã
  // principal" — o utilizador pode ter a app noutro monitor) — usada para
  // limitar as opções de resolução ao que o próprio ecrã suporta, e nunca
  // oferecer algo maior do que cabe.
  ipcMain.handle("window:getDisplayWorkArea", () => {
    const w = getWindow();
    const display = w ? screen.getDisplayMatching(w.getBounds()) : screen.getPrimaryDisplay();
    return display.workAreaSize;
  });

  ipcMain.handle("window:isFullScreen", () => getWindow().isFullScreen());

  // Tamanho atual da janela (não maximizado/full screen) — usado só para a
  // resolução aparecer pré-selecionada nas Definições, refletindo o estado
  // real em vez de ficar sempre em branco.
  ipcMain.handle("window:getSize", () => {
    const w = getWindow();
    const [width, height] = w.getSize();
    return { width, height, isMaximized: w.isMaximized(), isFullScreen: w.isFullScreen() };
  });

  ipcMain.handle("window:setFullScreen", (_event, value) => {
    getWindow().setFullScreen(!!value);
  });

  // Aplica uma resolução escolhida nas Definições — sai primeiro de full
  // screen/maximizado (senão setSize não teria efeito visível nenhum) e
  // centra a janela no ecrã onde ela já está, para não aparecer a meio de
  // dois monitores nem fora da área visível.
  ipcMain.handle("window:setResolution", (_event, { width, height }) => {
    const w = getWindow();
    if (w.isFullScreen()) w.setFullScreen(false);
    if (w.isMaximized()) w.unmaximize();
    w.setSize(width, height);
    w.center();
  });

  // fullscreen shortcuts
  globalShortcut.register("F11", () => {
    const w = getWindow();
    w.setFullScreen(!w.isFullScreen());
  });

  globalShortcut.register("Escape", () => {
    const w = getWindow();
    if (w.isFullScreen()) w.setFullScreen(false);
  });

  // Atalho global (funciona mesmo com o League em foco, ex: na seleção de
  // campeão da Arena) para trazer a app para a frente já na tab Coleção com
  // a busca pronta a usar — a forma mais rápida de confirmar se já há
  // vitória com um campeão sem teres de sair do League por completo.
  globalShortcut.register("Control+Shift+A", () => {
    const w = getWindow();
    if (!w) return;
    if (w.isMinimized()) w.restore();
    w.show();
    w.focus();
    w.webContents.send("quickcheck:open");
  });

  return win;
}

module.exports = { createWindow };
