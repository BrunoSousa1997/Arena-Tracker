const { app, BrowserWindow, screen, Menu, globalShortcut, ipcMain } = require("electron");
const path = require("path");
const Store = require("electron-store");
const { setWindow, getWindow } = require("./windowState");
const { initBackgroundMode } = require("./background");

const store = new Store();

Menu.setApplicationMenu(null);

// Entrar/sair de ecrã inteiro, sempre por aqui (botão nas Definições, F11 e
// Escape) para o comportamento ser o mesmo por qualquer via.
//
// O setFullScreen sozinho não chegava no Windows: numa janela sem frame
// ("frame: false", ver createWindow) ele redimensiona a janela para o ecrã
// todo mas ela continua a ser, para o shell, uma janela normal — a barra de
// tarefas fica por cima e o resultado é exatamente o "window mode esticado"
// em vez de ecrã inteiro a sério. O toque de alwaysOnTop no nível
// "screen-saver" seguido de o desligar logo levanta a janela acima da barra
// de tarefas uma única vez, sem a deixar presa por cima de tudo o resto (o
// que impediria alt-tab para o League, ou para o que fosse).
function applyFullScreen(win, value) {
  if (!win || win.isDestroyed()) return;

  win.setFullScreen(!!value);

  if (value && process.platform === "win32") {
    win.setAlwaysOnTop(true, "screen-saver");
    win.setAlwaysOnTop(false);
  }
}

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
      // Sem isto o modo em segundo plano seria inútil: o Chromium estrangula
      // os temporizadores de uma janela escondida, e é em temporizadores do
      // renderer que vive a sincronização automática pós-jogo (ver
      // scheduleAutoSync em useLiveGame.js). Escondida na bandeja, a app tem
      // de continuar a cumprir os agendamentos ao segundo certo.
      backgroundThrottling: false,
    },
  });

  setWindow(win);

  win.setAutoHideMenuBar(true);

  // Arranca escondida quando foi o arranque automático do Windows a abrir a
  // app (ver electron/background.js) — nesse caso só o ícone na bandeja
  // aparece, que é precisamente o objetivo.
  const startHidden = initBackgroundMode(win);

  console.log("PRELOAD PATH:", path.join(__dirname, "..", "preload.js"));

  if (process.env.ELECTRON_START_URL) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist/index.html"));
  }

  // Repõe o modo de ecrã em que a app foi fechada.
  //
  // Isto abria SEMPRE maximizado, incondicionalmente — o que tornava inútil
  // tanto a escolha de resolução nas Definições (era logo tapada pelo
  // maximize no arranque seguinte) como o ecrã inteiro (voltava a janela).
  // As medidas até já eram gravadas; o que faltava era não passar por cima
  // delas. Sem nada guardado — primeiro arranque — mantém-se o maximizado de
  // sempre, para quem nunca mexeu nisto não notar diferença nenhuma.
  win.once("ready-to-show", () => {
    if (startHidden) return;
    win.show();

    const mode = store.get("displayMode", "maximized");
    if (mode === "fullscreen") applyFullScreen(win, true);
    else if (mode === "maximized") win.maximize();
    // "windowed" não faz nada: a janela já nasceu com os savedBounds acima.
  });

  // "close" e não "closed": em modo segundo plano o fecho é cancelado (a
  // janela só se esconde, ver initBackgroundMode) e este handler continua a
  // correr — guardar as medidas aí não faz mal nenhum, e assim a posição
  // fica sempre registada mesmo que a app só saia bem mais tarde pela bandeja.
  win.on("close", () => {
    store.set(
      "displayMode",
      win.isFullScreen() ? "fullscreen" : win.isMaximized() ? "maximized" : "windowed"
    );

    // Só vale a pena guardar as medidas quando elas são as "de verdade" —
    // maximizada ou em ecrã inteiro, getBounds() devolve o tamanho do ecrã, e
    // gravá-lo faria a resolução escolhida perder-se na mesma, agora por
    // outra via.
    if (!win.isFullScreen() && !win.isMaximized() && !win.isMinimized()) {
      store.set("windowBounds", win.getBounds());
    }
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
    applyFullScreen(getWindow(), value);
  });

  // Aplica uma resolução escolhida nas Definições — sai primeiro de full
  // screen/maximizado (senão setSize não teria efeito visível nenhum) e
  // centra a janela no ecrã onde ela já está, para não aparecer a meio de
  // dois monitores nem fora da área visível.
  ipcMain.handle("window:setResolution", (_event, { width, height }) => {
    const w = getWindow();
    if (w.isFullScreen()) applyFullScreen(w, false);
    if (w.isMaximized()) w.unmaximize();
    w.setSize(width, height);
    w.center();
  });

  // fullscreen shortcuts
  globalShortcut.register("F11", () => {
    const w = getWindow();
    applyFullScreen(w, !w.isFullScreen());
  });

  globalShortcut.register("Escape", () => {
    const w = getWindow();
    if (w.isFullScreen()) applyFullScreen(w, false);
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
