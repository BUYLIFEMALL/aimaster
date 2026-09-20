"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("blogAuto", {
  checkNaverSession: () => ipcRenderer.invoke("naver:checkSession"),
  inspectEditor: () => ipcRenderer.invoke("naver:inspectEditor"),
  autoFillPost: (payload) => ipcRenderer.invoke("naver:autoFillPost", payload),
  insertImage: () => ipcRenderer.invoke("naver:insertImage"),
  fillTags: (payload) => ipcRenderer.invoke("naver:fillTags", payload),
  selectCategory: (payload) => ipcRenderer.invoke("naver:selectCategory", payload),
  onNaverSessionStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("naver:sessionStatus", listener);
    return () => ipcRenderer.removeListener("naver:sessionStatus", listener);
  }
});
