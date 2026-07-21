const path = require("path");
const fs = require("fs");
const { app, Tray, Menu, ipcMain, nativeImage } = require("electron");
const Store = require("electron-store");
const { getWindow } = require("./windowState");

// ================= MODO EM SEGUNDO PLANO =================
// A app só faz o que interessa (detetar partidas pela Live Client Data e
// sincronizar a seguir, ver electron/liveGame.js e useLiveGame.js) enquanto
// estiver a correr — mas manter uma janela aberta a tarde toda só para isso é
// peso e espaço no ecrã sem retorno nenhum. Com o modo em segundo plano
// ligado, fechar a janela esconde-a em vez de sair: o processo continua vivo,
// a poll da Live Client Data continua a correr, e a app só volta a desenhar
// alguma coisa quando se a reabre pelo ícone no tabuleiro do sistema.
//
// Duas definições independentes (ver Settings.jsx):
//  - "backgroundMode": fechar a janela esconde em vez de sair;
//  - "autoLaunch": arrancar com o Windows, já escondido.
// A segunda sem a primeira não faria sentido nenhum (arrancava uma janela ao
// ligar o PC), por isso ligar o arranque automático liga também o modo em
// segundo plano — ver o handler "background:setAutoLaunch".

const store = new Store();

// Passada ao próprio executável no arranque automático (ver
// setLoginItemSettings) para o processo saber que foi o Windows a abri-lo, e
// não uma pessoa — nesse caso não se mostra janela nenhuma.
const HIDDEN_FLAG = "--hidden";

let tray = null;
// Distingue "fechar a janela" (que em modo segundo plano só esconde) de
// "sair mesmo" (menu do tabuleiro, ou app.quit() de outro sítio qualquer).
// Sem isto o handler de "close" escondia a janela também durante o encerramento
// e a app nunca chegava a sair.
let quitting = false;

function isBackgroundMode() {
  return store.get("backgroundMode", false);
}

function isAutoLaunch() {
  // A verdade está no próprio SO (o utilizador pode ter desligado o arranque
  // no Gestor de Tarefas do Windows sem a app saber), não no que guardámos.
  return app.getLoginItemSettings({ args: [HIDDEN_FLAG] }).openAtLogin;
}

// Foi o arranque automático do sistema a abrir isto? "wasOpenedAtLogin" só é
// preenchido no macOS, por isso no Windows a marca é o argumento que nós
// próprios registámos em setLoginItemSettings.
function startedHidden() {
  return (
    process.argv.includes(HIDDEN_FLAG) ||
    app.getLoginItemSettings({ args: [HIDDEN_FLAG] }).wasOpenedAtLogin
  );
}

function trayIcon() {
  // Em desenvolvimento o ícone está em public/; num build empacotado o Vite
  // já o copiou para dist/ (public/ não entra no "files" do electron-builder,
  // ver package.json). Um ícone vazio ainda dá um Tray utilizável (fica só
  // sem imagem), por isso nunca vale a pena falhar por causa disto.
  const candidates = [
    path.join(__dirname, "..", "dist", "logo.ico"),
    path.join(__dirname, "..", "public", "logo.ico"),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  return found ? nativeImage.createFromPath(found) : nativeImage.createEmpty();
}

// Sair a sério, ao contrário do X da janela (que em modo segundo plano só
// esconde). É esta a única via que baixa o "quitting", e por isso tem de ser
// usada por TUDO o que queira mesmo fechar a app: o menu da bandeja e o botão
// nas Definições. Chamar app.quit() diretamente não chegava — o handler de
// "close" cancelaria o fecho da janela e a app ficava viva e sem janela.
function quitApp() {
  quitting = true;
  app.quit();
}

function showWindow() {
  const win = getWindow();
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

// O menu do tabuleiro é a ÚNICA forma de sair quando o modo em segundo plano
// está ligado (o X da janela passou a esconder) — por isso tem sempre de lá
// estar, e tem de ser um "sair" a sério, não outro "fechar".
function buildTray(labels) {
  if (tray) return tray;

  tray = new Tray(trayIcon());
  tray.setToolTip("Arena Tracker");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: labels.open, click: showWindow },
      { type: "separator" },
      { label: labels.quit, click: quitApp },
    ])
  );
  tray.on("click", showWindow);
  return tray;
}

function destroyTray() {
  if (!tray) return;
  tray.destroy();
  tray = null;
}

// Sem tabuleiro não há forma de reabrir nem de sair — por isso ele existe
// exatamente enquanto o modo em segundo plano estiver ligado, e desaparece
// assim que se desliga.
function syncTray(labels) {
  if (isBackgroundMode()) buildTray(labels);
  else destroyTray();
}

// Etiquetas do menu do tabuleiro — vêm da interface (ver i18n.js) para
// seguirem o idioma escolhido, em vez de ficarem presas a um só. Guardadas
// para o menu se poder reconstruir mais tarde (ex: ao ligar o modo em segundo
// plano) sem a interface ter de as reenviar.
function currentLabels() {
  return {
    open: store.get("trayLabels.open", "Open Arena Tracker"),
    quit: store.get("trayLabels.quit", "Quit"),
  };
}

// Chamado a partir de createWindow (ver electron/window.js), já com a janela
// criada. Devolve se a janela deve arrancar escondida.
function initBackgroundMode(win) {
  syncTray(currentLabels());

  win.on("close", (event) => {
    if (quitting || !isBackgroundMode()) return;
    event.preventDefault();
    win.hide();
  });

  return startedHidden() && isBackgroundMode();
}

// A app só deve mesmo morrer quando todas as janelas fecham SE não estivermos
// em segundo plano — ver o "window-all-closed" em electron.js, que consulta
// isto. Com o modo ligado a janela nem chega a fechar (é escondida), mas isto
// é a rede de segurança para qualquer outro caminho.
function shouldQuitOnAllWindowsClosed() {
  return !isBackgroundMode();
}

function registerBackgroundHandlers() {
  // Fechar a app a partir da interface (Definições → Sair da aplicação).
  // Existe sobretudo por causa do modo em segundo plano: com ele ligado, o X
  // da janela deixa de fechar seja o que for, e sem isto a única forma de
  // sair mesmo seria pelo menu da bandeja.
  ipcMain.handle("app:quit", quitApp);

  ipcMain.handle("background:getSettings", () => ({
    backgroundMode: isBackgroundMode(),
    autoLaunch: isAutoLaunch(),
  }));

  ipcMain.handle("background:setBackgroundMode", (_event, value) => {
    store.set("backgroundMode", !!value);

    // Desligar o modo em segundo plano tem de desligar também o arranque
    // automático: sem ele, arrancar com o Windows abriria a janela toda a vez
    // que se ligasse o PC, que é o oposto do que quem o ativou queria.
    if (!value && isAutoLaunch()) {
      app.setLoginItemSettings({ openAtLogin: false, args: [HIDDEN_FLAG] });
    }

    syncTray(currentLabels());
    return { backgroundMode: isBackgroundMode(), autoLaunch: isAutoLaunch() };
  });

  ipcMain.handle("background:setAutoLaunch", (_event, value) => {
    app.setLoginItemSettings({
      openAtLogin: !!value,
      // "openAsHidden" é só macOS; no Windows quem trata disto é o argumento
      // (ver startedHidden).
      openAsHidden: !!value,
      args: [HIDDEN_FLAG],
    });

    // Ligar o arranque automático implica o modo em segundo plano (ver nota
    // no topo do ficheiro).
    if (value && !isBackgroundMode()) {
      store.set("backgroundMode", true);
      syncTray(currentLabels());
    }

    return { backgroundMode: isBackgroundMode(), autoLaunch: isAutoLaunch() };
  });

  ipcMain.handle("background:setTrayLabels", (_event, labels) => {
    if (!labels?.open || !labels?.quit) return;
    store.set("trayLabels", { open: labels.open, quit: labels.quit });
    // Reconstrói para o idioma novo aparecer já no menu, sem esperar por um
    // reinício da app.
    if (tray) {
      destroyTray();
      syncTray(labels);
    }
  });
}

module.exports = {
  initBackgroundMode,
  registerBackgroundHandlers,
  shouldQuitOnAllWindowsClosed,
};
