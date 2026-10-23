"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("blogAuto", {
  getAimasterStatus: () => ipcRenderer.invoke("aimaster:getStatus"),
  setAimasterToken: (token) => ipcRenderer.invoke("aimaster:setToken", token),
  clearAimasterToken: () => ipcRenderer.invoke("aimaster:clearToken"),
  generateDraft: (payload) => ipcRenderer.invoke("aimaster:generateDraft", payload),
  checkNaverSession: () => ipcRenderer.invoke("naver:checkSession"),
  inspectEditor: () => ipcRenderer.invoke("naver:inspectEditor"),
  runDraftStep: (payload) => ipcRenderer.invoke("naver:runDraftStep", payload),
  runPublishSettingsStep: (payload) => ipcRenderer.invoke("naver:runPublishSettingsStep", payload),
  onNaverSessionStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("naver:sessionStatus", listener);
    return () => ipcRenderer.removeListener("naver:sessionStatus", listener);
  }
});
