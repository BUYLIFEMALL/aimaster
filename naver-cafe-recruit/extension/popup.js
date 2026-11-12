const show = (s) => {
  document.getElementById("status").textContent = `초대: ${s.running ? "▶ 실행 중" : "■ 멈춤"} · ${s.message || ""}${s.done ? ` · 이번에 ${s.done}명 보냄` : ""}`;
  const c = s.collect || {};
  document.getElementById("collectStatus").textContent = c.message ? `명단: ${c.running ? "▶ 읽는 중" : "■ 멈춤"} · ${c.message}` : "";
};
const send = (type) => chrome.runtime.sendMessage({ type }, show);
document.getElementById("start").onclick = () => send("start");
document.getElementById("collect").onclick = () => send("collect");
document.getElementById("stop").onclick = () => send("stop");
send("status");
// 버전은 설치된 manifest 기준(2026-11-12: HTML에 고정된 v1.02가 남던 문제)
document.getElementById("ver").textContent = chrome.runtime.getManifest().version_name || "";
