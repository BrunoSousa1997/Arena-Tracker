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
// "sair mesmo". É baixado por qualquer encerramento REAL da app: o menu do
// tabuleiro / Definições (via quitApp), OU o "before-quit" que registamos em
// registerBackgroundHandlers — este último apanha os fechos que não passam
// por quitApp, com destaque para o quitAndInstall do auto-update (ver
// electron/updater.js). Sem essa rede, aplicar uma atualização em modo
// segundo plano ficava preso: o quitAndInstall pedia app.quit(), o handler de
// "close" via quitting=false e escondia a janela em vez de deixar sair, e a
// atualização nunca chegava a instalar.
let quitting = false;

// Atualização já descarregada à espera de ser aplicada — { version, install }.
// Em modo segundo plano o utilizador quase não abre a janela (onde vive o
// banner "Reiniciar agora"), por isso a bandeja passa a mostrar um item para
// aplicar à mão. Com a app ociosa o updater acaba por a aplicar sozinho (ver
// electron/updater.js); este item é para quem não quer esperar por isso.
let pendingUpdate = null;

// ================= RELANÇAMENTO APÓS UPDATE SILENCIOSO =================
// O updater só aplica a atualização sozinho com a app fora da vista — na
// bandeja ou minimizada (ver electron/updater.js) — mas o quitAndInstall
// relança-a sempre visível. Sem isto, uma atualização discreta acabava com
// uma janela a saltar para a frente do jogo, que é o contrário do que se
// queria. Guarda-se como a app estava para o arranque seguinte repor, e
// lê-se uma única vez (apagando), para um arranque normal mais tarde não
// nascer escondido por engano.
// A janela está escondida na bandeja, por oposição a minimizada? O updater
// precisa de distinguir as duas (ver awayState em electron/updater.js) e as
// APIs do Electron não chegam para isso: no Windows uma janela minimizada
// responde isVisible() === false na mesma, e uma janela escondida enquanto
// estava minimizada responde que sim às duas perguntas. Os eventos é que não
// são ambíguos — minimizar nunca emite "hide".
let windowHidden = false;

function isWindowHidden() {
  return windowHidden;
}

function setRelaunchState(state) {
  store.set("relaunchState", state);
}

function takeRelaunchState() {
  const state = store.get("relaunchState", null);
  if (state) store.delete("relaunchState");
  return state;
}

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

// (Re)constrói o menu e o tooltip da bandeja a partir das etiquetas e do
// estado atual (pendingUpdate). Separado de buildTray porque tanto uma troca
// de idioma como o aparecimento de uma atualização precisam de o refazer sem
// recriar o Tray. No-op se ainda não houver bandeja (modo segundo plano
// desligado) — nesse caso o banner na janela é que trata da atualização.
function applyTrayMenu(labels) {
  if (!tray) return;

  const items = [{ label: labels.open, click: showWindow }];

  if (pendingUpdate) {
    const label =
      (labels.update || "Restart to update") +
      (pendingUpdate.version ? ` (${pendingUpdate.version})` : "");
    items.push({ type: "separator" }, { label, click: () => pendingUpdate.install() });
  }

  items.push({ type: "separator" }, { label: labels.quit, click: quitApp });

  tray.setContextMenu(Menu.buildFromTemplate(items));
  tray.setToolTip(
    pendingUpdate ? `Arena Tracker — ${labels.update || "update ready"}` : "Arena Tracker"
  );
}

// O menu do tabuleiro é a ÚNICA forma de sair quando o modo em segundo plano
// está ligado (o X da janela passou a esconder) — por isso tem sempre de lá
// estar, e tem de ser um "sair" a sério, não outro "fechar".
function buildTray(labels) {
  if (tray) {
    applyTrayMenu(labels);
    return tray;
  }

  tray = new Tray(trayIcon());
  tray.on("click", showWindow);
  applyTrayMenu(labels);
  return tray;
}

// Chamado pelo updater (ver electron/updater.js) quando uma atualização
// termina de descarregar. Guarda-a e refaz o menu da bandeja para incluir o
// item de aplicar — a forma de um utilizador em segundo plano atualizar sem
// ter de abrir a janela. Harmless com o modo desligado (applyTrayMenu é no-op
// sem bandeja); se o modo for ligado depois, buildTray volta a incluir o item.
function setPendingUpdate(version, install) {
  pendingUpdate = { version, install };
  applyTrayMenu(currentLabels());
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
    update: store.get("trayLabels.update", "Restart to update"),
  };
}

// Chamado a partir de createWindow (ver electron/window.js), já com a janela
// criada. Devolve como a janela deve arrancar: escondida (arranque automático
// do Windows, ou relançamento depois de uma atualização aplicada com a app na
// bandeja) ou minimizada (relançamento com a app minimizada).
function initBackgroundMode(win) {
  syncTray(currentLabels());

  win.on("close", (event) => {
    if (quitting || !isBackgroundMode()) return;
    event.preventDefault();
    win.hide();
  });

  // Ver isWindowHidden. Em "show"/"hide" e não só no handler acima porque a
  // janela também se esconde e reaparece por outras vias (showWindow, a
  // bandeja, o atalho global).
  win.on("hide", () => {
    windowHidden = true;
  });
  win.on("show", () => {
    windowHidden = false;
  });

  const relaunch = takeRelaunchState();

  // Esconder exige o modo em segundo plano: sem bandeja, uma janela escondida
  // seria uma app a correr sem forma nenhuma de lá chegar.
  return {
    startHidden: (startedHidden() || relaunch === "hidden") && isBackgroundMode(),
    startMinimized: relaunch === "minimized",
  };
}

// A app só deve mesmo morrer quando todas as janelas fecham SE não estivermos
// em segundo plano — ver o "window-all-closed" em electron.js, que consulta
// isto. Com o modo ligado a janela nem chega a fechar (é escondida), mas isto
// é a rede de segurança para qualquer outro caminho.
function shouldQuitOnAllWindowsClosed() {
  return !isBackgroundMode();
}

function registerBackgroundHandlers() {
  // Rede de segurança para o "quitting": qualquer encerramento REAL da app
  // (incluindo o quitAndInstall do auto-update, que não passa por quitApp)
  // baixa a flag antes de as janelas receberem "close", para o handler de
  // close em modo segundo plano deixar a app sair em vez de a esconder. Em
  // modo segundo plano fechar a JANELA não dispara "before-quit" (é um close
  // de janela, não um app.quit), por isso isto não interfere com o esconder.
  app.on("before-quit", () => {
    quitting = true;
  });

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
      // Sem "openAsHidden": era só macOS e o Electron 44 removeu-o de vez.
      // No Windows quem trata disto é o argumento (ver startedHidden), que
      // é o mecanismo que esta app sempre usou de facto.
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
    store.set("trayLabels", {
      open: labels.open,
      quit: labels.quit,
      // A etiqueta de atualização pode não vir (versões antigas da interface);
      // mantém-se a que lá estava em vez de a apagar.
      update: labels.update || currentLabels().update,
    });
    // Refaz o menu para o idioma novo aparecer já, sem recriar o Tray nem
    // esperar por um reinício da app.
    applyTrayMenu(currentLabels());
  });
}

module.exports = {
  initBackgroundMode,
  registerBackgroundHandlers,
  shouldQuitOnAllWindowsClosed,
  setPendingUpdate,
  setRelaunchState,
  isWindowHidden,
};
