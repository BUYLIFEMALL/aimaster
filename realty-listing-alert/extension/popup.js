const log = (t) => (document.getElementById("log").textContent = t);
async function send(type, extra = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const r = await chrome.runtime.sendMessage({ type, tabId: tab?.id, tabUrl: tab?.url, ...extra });
  log(JSON.stringify(r, null, 1));
}
document.getElementById("capture").onclick = () => { log("기록 중… (최대 약 70초, 창을 닫지 마세요)"); send("capture"); };
document.getElementById("direct").onclick = () => send("direct");
document.getElementById("alarm").onclick = () => send("alarm");
document.getElementById("tg").onclick = () => send("telegram", { token: document.getElementById("tok").value.trim(), chat: document.getElementById("chat").value.trim() });
document.getElementById("save").onclick = () => send("save");
chrome.runtime.sendMessage({ type: "summary" }).then((r) => log(JSON.stringify(r, null, 1)));
