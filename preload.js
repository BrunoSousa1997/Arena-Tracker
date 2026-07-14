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

  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  checkForUpdates: () => ipcRenderer.invoke("updater:check"),
  installUpdate: () => ipcRenderer.invoke("updater:install"),
  onUpdaterStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("updater:status", listener);
    return () => ipcRenderer.removeListener("updater:status", listener);
  },

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

  onQuickCheckOpen: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("quickcheck:open", listener);
    return () => ipcRenderer.removeListener("quickcheck:open", listener);
  },

  listMatchIds: (payload) => ipcRenderer.invoke("riotapi:listMatchIds", payload),
  fetchMatchDetails: (payload) => ipcRenderer.invoke("riotapi:fetchMatchDetails", payload),
  backfillMatchDetails: (payload) => ipcRenderer.invoke("riotapi:backfillMatchDetails", payload),
  canaryCheck: (payload) => ipcRenderer.invoke("riotapi:canaryCheck", payload),
});
