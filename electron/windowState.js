// Referência partilhada à janela principal — vários módulos (updater.js,
// liveGame.js, window.js) precisam de enviar mensagens IPC para a interface
// ou de saber se a janela ainda existe, sem cada um ter a sua própria cópia
// (desatualizada) da referência.
let win = null;

function setWindow(w) {
  win = w;
}

function getWindow() {
  return win;
}

module.exports = { setWindow, getWindow };
