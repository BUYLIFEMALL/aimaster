const show = (s) => { document.getElementById("status").textContent = `${s.running ? "▶ 실행 중" : "■ 멈춤"} · ${s.message || ""}${s.done ? ` · 오늘 ${s.done}곳` : ""}`; };
const send = (type) => chrome.runtime.sendMessage({ type }, show);
document.getElementById("start").onclick = () => send("start");
document.getElementById("stop").onclick = () => send("stop");
send("status");
