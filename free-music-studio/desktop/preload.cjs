// 상태 창 ↔ 껍데기 연결(창에는 이 두 가지만 열어 둔다)
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("engine", {
  onState: (cb) => ipcRenderer.on("state", (_e, s) => cb(s)),
  action: (name, value) => ipcRenderer.invoke("action", name, value),
});
