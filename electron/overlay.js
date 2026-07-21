const path = require("path");
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const Store = require("electron-store");

// ================= SOBREPOSIÇÃO NO JOGO =================
// Uma segunda janela, sem moldura e transparente, sempre por cima, que mostra
// o mesmo que o banner da partida ao vivo — mas por cima do League, para se
// ver sem ter de sair do jogo. Nasceu do modo em segundo plano: com a janela
// principal escondida na bandeja, o banner existia mas não havia forma de
// olhar para ele.
//
// Quem calcula o conteúdo é o renderer principal (ver useLiveGame.js) e não
// esta janela: o "já tens vitória com este campeão" e a frase que o acompanha
// dependem do histórico na Supabase e dos campeões do Data Dragon, que estão
// todos lá carregados. Aqui só se recebe o resultado já pronto e se desenha.
//
// LIMITAÇÃO, que não é contornável por código: isto aparece por cima do jogo
// em "Sem margens"/"Janela", mas NÃO em ecrã inteiro exclusivo — nesse modo o
// Windows entrega o ecrã inteiro ao jogo e nenhuma janela normal lhe passa à
// frente. É a mesma limitação de qualquer overlay que não injete no processo
// do jogo (coisa que esta app não faz de propósito, ver a nota sobre a LCU em
// riotApi.js).

const store = new Store();

const WIDTH = 360;
const HEIGHT = 112;
// Distância ao topo do ecrã, em fração da altura — a zona morta por cima da
// barra de vida/minimapa, onde não tapa nada de útil durante a partida.
const TOP_RATIO = 0.045;

let overlayWin = null;
// Último cartão recebido do renderer principal.
//
// Guardá-lo é obrigatório, não é otimização: a janela é criada e alimentada no
// mesmo instante, mas nessa altura o seu renderer ainda está a carregar e
// ainda não registou o listener — o primeiro envio caía no vazio e a
// sobreposição aparecia em branco.
//
// A reposição é feita quando o renderer AVISA que está pronto (ver
// "overlay:ready"), e não no "did-finish-load" da janela: esse evento dispara
// quando o documento acaba de carregar, que ainda é antes de o React montar e
// subscrever o canal. Testado — com o did-finish-load o primeiro cartão
// continuava a perder-se; só o aviso do próprio renderer é de confiança.
let lastPayload = null;

function isEnabled() {
  return store.get("gameOverlay", false);
}

function createOverlay() {
  if (overlayWin && !overlayWin.isDestroyed()) return overlayWin;

  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;

  overlayWin = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: Math.round((sw - WIDTH) / 2),
    y: Math.round(sh * TOP_RATIO),

    frame: false,
    transparent: true,
    // Sem sombra: no Windows a sombra de uma janela transparente desenha um
    // retângulo cinzento à volta do conteúdo, que numa sobreposição se vê
    // como uma caixa suja por cima do jogo.
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    // Nunca rouba o foco ao jogo — clicar aqui por engano no meio de uma
    // luta seria imperdoável.
    focusable: false,
    skipTaskbar: true,
    show: false,

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "..", "preload.js"),
      backgroundThrottling: false,
    },
  });

  // Nível "screen-saver": é o único que fica acima de um jogo em modo sem
  // margens. Um "normal" ou "floating" ficaria por baixo.
  overlayWin.setAlwaysOnTop(true, "screen-saver");
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Totalmente atravessável ao rato: os cliques passam para o jogo como se
  // isto não existisse. É o que permite pô-la por cima da área jogável sem
  // nunca interferir — em troca, não há nada para arrastar nem clicar aqui.
  overlayWin.setIgnoreMouseEvents(true, { forward: true });

  if (process.env.ELECTRON_START_URL) {
    overlayWin.loadURL(`${process.env.ELECTRON_START_URL}#overlay`);
  } else {
    overlayWin.loadFile(path.join(__dirname, "..", "dist/index.html"), { hash: "overlay" });
  }

  overlayWin.on("closed", () => {
    overlayWin = null;
  });

  return overlayWin;
}

function sendToOverlay(data) {
  if (!overlayWin || overlayWin.isDestroyed()) return;
  overlayWin.webContents.send("overlay:data", data);
}

// Ponto único de decisão sobre a sobreposição estar no ecrã ou não: só com a
// definição ligada E com uma partida a decorrer. Fechá-la (em vez de a deixar
// vazia) garante que não fica um retângulo invisível a apanhar nada por cima
// do jogo depois da partida acabar.
function updateOverlay(data) {
  lastPayload = data;

  if (!isEnabled() || !data) {
    if (overlayWin && !overlayWin.isDestroyed()) overlayWin.hide();
    return;
  }

  const win = createOverlay();
  sendToOverlay(data);

  if (!win.isVisible()) {
    // showInactive e não show: "show" traria a janela para a frente e tirava
    // o foco ao jogo.
    win.showInactive();
  }
}

function destroyOverlay() {
  if (overlayWin && !overlayWin.isDestroyed()) overlayWin.destroy();
  overlayWin = null;
}

function registerOverlayHandlers() {
  ipcMain.handle("overlay:isEnabled", () => isEnabled());

  // O renderer da sobreposição já subscreveu o canal e pode receber dados.
  // Ver a nota em "lastPayload" para o porquê de isto existir.
  ipcMain.handle("overlay:ready", () => {
    if (lastPayload) sendToOverlay(lastPayload);
  });

  ipcMain.handle("overlay:setEnabled", (_event, value) => {
    store.set("gameOverlay", !!value);
    if (!value) destroyOverlay();
    return isEnabled();
  });

  // Chamado pelo renderer principal sempre que o estado da partida ao vivo
  // muda (ver useLiveGame.js). "null" = já não há partida.
  ipcMain.handle("overlay:update", (_event, data) => updateOverlay(data));

  // A sobreposição não deve sobreviver ao fecho da app nem ficar órfã se a
  // janela principal morrer por alguma razão.
  app.on("before-quit", destroyOverlay);
}

module.exports = { registerOverlayHandlers, destroyOverlay };
