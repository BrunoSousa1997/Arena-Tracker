const { contextBridge, ipcRenderer } = require("electron");

console.log("PRELOAD LOADED");

contextBridge.exposeInMainWorld("electron", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close"),
   isMaximized: () => ipcRenderer.invoke("window:isMaximized"),

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

  onQuickCheckOpen: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("quickcheck:open", listener);
    return () => ipcRenderer.removeListener("quickcheck:open", listener);
  },

  exportFile: (payload) => ipcRenderer.invoke("export:saveFile", payload),
  importRiotHistory: (payload) => ipcRenderer.invoke("riotapi:importHistory", payload),
  backfillMatchDetails: (payload) => ipcRenderer.invoke("riotapi:backfillMatchDetails", payload),
});