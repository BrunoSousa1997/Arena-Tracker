const path = require("path");
const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require("electron");
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
//
// COMPORTAMENTO: por omissão isto é um FLASH, não um painel permanente —
// acende no arranque da partida e no resultado final, e esconde-se sozinho
// passados uns segundos (ver DEFAULT_DURATION_SEC e updateOverlay). Um atalho
// global (ver TOGGLE_SHORTCUT) acende-a/esconde-a à ordem a meio do jogo. A
// duração é configurável nas Definições; 0 volta ao painel sempre visível.

const store = new Store();

const WIDTH = 360;
const HEIGHT = 112;
// Distância ao topo do ecrã, em fração da altura — a zona morta por cima da
// barra de vida/minimapa, onde não tapa nada de útil durante a partida.
const TOP_RATIO = 0.045;

// Quantos segundos a sobreposição fica no ecrã depois de aparecer, antes de
// se esconder sozinha. O objetivo é ser um flash de informação (início da
// partida / resultado), não um painel permanente por cima do jogo — ver
// updateOverlay. Configurável nas Definições; 0 = fica sempre visível
// (comportamento antigo, para quem o prefere).
const DEFAULT_DURATION_SEC = 12;

// Atalho global para trazer a sobreposição de volta (ou escondê-la) à ordem,
// já a meio do jogo, mesmo depois de ela se ter escondido sozinha. É a única
// forma de interagir com ela: a janela é atravessável ao rato de propósito
// (ver setIgnoreMouseEvents), por isso não há nada lá para clicar.
const TOGGLE_SHORTCUT = "Alt+O";

let overlayWin = null;
// Timer do auto-esconder (ver scheduleHide). Guardado para se poder cancelar
// quando uma fase nova o substitui ou quando a partida acaba de vez.
let hideTimer = null;
// Assinatura da última "fase" mostrada — início da partida vs. resultado
// final. É isto que distingue um cartão que MERECE reaparecer (mudou de fase)
// de uma simples atualização de KDA de 3 em 3s, que não deve voltar a acender
// a sobreposição depois de ela já se ter escondido. null quando não há
// partida (reposto sempre que chega updateOverlay(null)).
let lastPhaseKey = null;
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

// Duração em milissegundos do auto-esconder. 0 (ou negativo) = nunca esconder.
function hideDelayMs() {
  const sec = store.get("overlayDurationSec", DEFAULT_DURATION_SEC);
  return Number.isFinite(sec) && sec > 0 ? sec * 1000 : 0;
}

// A fase de um cartão: só interessa se é o arranque da partida ou o resultado
// final — o KDA que muda no meio NÃO é uma fase nova. O campeão entra na
// chave para dois jogos seguidos (mesmo campeão) não colapsarem no mesmo, e
// para o cartão reaparecer a cada partida nova.
function phaseKey(data) {
  if (!data) return null;
  return `${data.championName || "?"}|${data.gameEnded ? "end" : "live"}`;
}

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

// Esconde a sobreposição passado o tempo configurado. Não a destrói: fica
// pronta a reaparecer sem o custo de recriar a janela (fase nova ou atalho).
function scheduleHide() {
  clearHideTimer();
  const delay = hideDelayMs();
  if (delay <= 0) return; // 0 = fica sempre visível
  hideTimer = setTimeout(() => {
    hideTimer = null;
    if (overlayWin && !overlayWin.isDestroyed()) overlayWin.hide();
  }, delay);
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
// definição ligada E com uma partida a decorrer. Esconder (em vez de a deixar
// vazia) garante que não fica um retângulo invisível a apanhar nada por cima
// do jogo depois da partida acabar.
//
// A visibilidade segue as FASES da partida (ver phaseKey), não cada
// atualização: um cartão novo (arranque da partida, resultado final) acende a
// sobreposição e arranca o auto-esconder; uma atualização de KDA no meio só
// refresca o conteúdo — se a sobreposição já se escondeu, fica escondida (é
// esse o objetivo: um flash de segundos, não um painel permanente). Trazê-la
// de volta a meio do jogo faz-se pelo atalho global (ver toggleOverlay).
function updateOverlay(data) {
  lastPayload = data;

  if (!isEnabled() || !data) {
    clearHideTimer();
    lastPhaseKey = null;
    if (overlayWin && !overlayWin.isDestroyed()) overlayWin.hide();
    return;
  }

  const win = createOverlay();
  sendToOverlay(data);

  const key = phaseKey(data);
  if (key !== lastPhaseKey) {
    // Fase nova — vale a pena mostrar (ou voltar a mostrar).
    lastPhaseKey = key;
    // showInactive e não show: "show" traria a janela para a frente e tirava
    // o foco ao jogo.
    if (!win.isVisible()) win.showInactive();
    scheduleHide();
  }
  // Mesma fase (só o KDA mudou): conteúdo já foi reenviado acima; não se toca
  // na visibilidade nem no timer, para o auto-esconder não ser adiado para
  // sempre pelo poll de 3 em 3s.
}

// Alterna a sobreposição à ordem (atalho global). Escondida -> aparece com o
// último cartão e recomeça o auto-esconder; visível -> esconde já e cancela o
// timer. Sem partida ativa ou com a definição desligada, não faz nada.
function toggleOverlay() {
  if (!isEnabled() || !lastPayload) return;

  if (overlayWin && !overlayWin.isDestroyed() && overlayWin.isVisible()) {
    clearHideTimer();
    overlayWin.hide();
    return;
  }

  const win = createOverlay();
  sendToOverlay(lastPayload);
  if (!win.isVisible()) win.showInactive();
  scheduleHide();
}

function destroyOverlay() {
  clearHideTimer();
  lastPhaseKey = null;
  if (overlayWin && !overlayWin.isDestroyed()) overlayWin.destroy();
  overlayWin = null;
}

function registerOverlayHandlers() {
  ipcMain.handle("overlay:isEnabled", () => isEnabled());

  // Duração do auto-esconder (segundos), lida/escrita nas Definições. 0 = fica
  // sempre visível (comportamento antigo).
  ipcMain.handle("overlay:getDuration", () =>
    store.get("overlayDurationSec", DEFAULT_DURATION_SEC)
  );
  ipcMain.handle("overlay:setDuration", (_event, value) => {
    const sec = Math.max(0, Math.min(60, Math.round(Number(value) || 0)));
    store.set("overlayDurationSec", sec);
    return sec;
  });

  // Atalho global para acender/esconder a sobreposição a meio do jogo. É de
  // registo único (esta função corre uma vez, no arranque) — se falhar
  // (atalho já tomado por outra app), degrada em silêncio: perde-se o atalho,
  // não o auto-esconder, que é o essencial.
  if (!globalShortcut.isRegistered(TOGGLE_SHORTCUT)) {
    globalShortcut.register(TOGGLE_SHORTCUT, toggleOverlay);
  }

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
  // janela principal morrer por alguma razão. O atalho global também tem de
  // ser libertado, senão fica registado no sistema depois de a app sair.
  app.on("before-quit", () => {
    globalShortcut.unregister(TOGGLE_SHORTCUT);
    destroyOverlay();
  });
}

module.exports = { registerOverlayHandlers, destroyOverlay };
