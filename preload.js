const { contextBridge, ipcRenderer } = require("electron");

console.log("PRELOAD LOADED");

contextBridge.exposeInMainWorld("electron", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close"),
   isMaximized: () => ipcRenderer.invoke("window:isMaximized"),

  getDisplayWorkArea: () => ipcRenderer.invoke("window:getDisplayWorkArea"),
  getSize: () => ipcRenderer.invoke("window:getSize"),
  isFullScreen: () => ipcRenderer.invoke("window:isFullScreen"),
  setFullScreen: (value) => ipcRenderer.invoke("window:setFullScreen", value),
  setResolution: (size) => ipcRenderer.invoke("window:setResolution", size),
  onFullScreenChanged: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on("window:fullScreenChanged", listener);
    return () => ipcRenderer.removeListener("window:fullScreenChanged", listener);
  },

  // Modo em segundo plano / arranque com o Windows — ver electron/background.js.
  quitApp: () => ipcRenderer.invoke("app:quit"),

  // Sobreposição no jogo — ver electron/overlay.js.
  isOverlayEnabled: () => ipcRenderer.invoke("overlay:isEnabled"),
  setOverlayEnabled: (value) => ipcRenderer.invoke("overlay:setEnabled", value),
  getOverlayDuration: () => ipcRenderer.invoke("overlay:getDuration"),
  setOverlayDuration: (value) => ipcRenderer.invoke("overlay:setDuration", value),
  updateOverlay: (data) => ipcRenderer.invoke("overlay:update", data),
  notifyOverlayReady: () => ipcRenderer.invoke("overlay:ready"),
  onOverlayData: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("overlay:data", listener);
    return () => ipcRenderer.removeListener("overlay:data", listener);
  },
  getBackgroundSettings: () => ipcRenderer.invoke("background:getSettings"),
  setBackgroundMode: (value) => ipcRenderer.invoke("background:setBackgroundMode", value),
  setAutoLaunch: (value) => ipcRenderer.invoke("background:setAutoLaunch", value),
  setTrayLabels: (labels) => ipcRenderer.invoke("background:setTrayLabels", labels),

  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  checkForUpdates: () => ipcRenderer.invoke("updater:check"),
  installUpdate: () => ipcRenderer.invoke("updater:install"),
  getReleaseHistory: () => ipcRenderer.invoke("updater:history"),
  // Trava o reinício automático do auto-update enquanto houver partidas por
  // sincronizar (ver electron/updater.js).
  setSyncPending: (pending) => ipcRenderer.invoke("updater:syncPending", pending),
  onUpdaterStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("updater:status", listener);
    return () => ipcRenderer.removeListener("updater:status", listener);
  },

  // Exportar dados (ver electron/exportData.js) — o dialog de "guardar como"
  // e a escrita ficam do lado do processo principal.
  exportData: (payload) => ipcRenderer.invoke("export:save", payload),
  revealExport: (filePath) => ipcRenderer.invoke("export:reveal", filePath),

  onMatchResult: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("livegame:matchResult", listener);
    return () => ipcRenderer.removeListener("livegame:matchResult", listener);
  },

  onActiveChampion: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("livegame:activeChampion", listener);
    return () => ipcRenderer.removeListener("livegame:activeChampion", listener);
  },

  onLiveStats: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("livegame:liveStats", listener);
    return () => ipcRenderer.removeListener("livegame:liveStats", listener);
  },

  onSessionEnded: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("livegame:sessionEnded", listener);
    return () => ipcRenderer.removeListener("livegame:sessionEnded", listener);
  },

  onQuickCheckOpen: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("quickcheck:open", listener);
    return () => ipcRenderer.removeListener("quickcheck:open", listener);
  },

  // Enche a cache de ícones em disco em segundo plano — ver electron/iconCache.js.
  prefetchIcons: (payload) => ipcRenderer.invoke("icons:prefetch", payload),

  // Nomes de campeões/itens/augments e o patch, da cache em disco quando a
  // rede não responde — ver electron/staticData.js.
  getStaticData: () => ipcRenderer.invoke("staticdata:get"),

  listMatchIds: (payload) => ipcRenderer.invoke("riotapi:listMatchIds", payload),
  fetchMatchDetails: (payload) => ipcRenderer.invoke("riotapi:fetchMatchDetails", payload),
  backfillMatchDetails: (payload) => ipcRenderer.invoke("riotapi:backfillMatchDetails", payload),
  canaryCheck: (payload) => ipcRenderer.invoke("riotapi:canaryCheck", payload),
});
