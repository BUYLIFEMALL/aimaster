"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("blogAuto", {
  checkNaverSession: () => ipcRenderer.invoke("naver:checkSession"),
  onNaverSessionStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("naver:sessionStatus", listener);
    return () => ipcRenderer.removeListener("naver:sessionStatus", listener);
  }
});
