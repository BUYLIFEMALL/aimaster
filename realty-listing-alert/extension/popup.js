document.getElementById("ver").textContent = chrome.runtime.getManifest().version_name || "";
const log = (t) => (document.getElementById("log").textContent = t);
async function send(type, extra = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const r = await chrome.runtime.sendMessage({ type, tabId: tab?.id, tabUrl: tab?.url, ...extra });
  if (r && r.ok === false && r.error) log(`⚠ ${r.error}`);
}
document.getElementById("capture").onclick = () => { log("① 시작합니다… (약 1분, 팝업을 닫아도 계속됩니다)"); send("capture"); };
document.getElementById("direct").onclick = () => { log("② 시작합니다… (약 20초)"); send("direct"); };
document.getElementById("alarm").onclick = () => { log("③ 시작했습니다. 크롬 창을 최소화하고 5분 기다려 주세요."); send("alarm"); };
document.getElementById("tg").onclick = () => send("telegram", { token: document.getElementById("tok").value.trim(), chat: document.getElementById("chat").value.trim() });
document.getElementById("save").onclick = () => send("save");

// 사람이 읽기 쉬운 줄로 보여 준다(시각은 한국 시간 시:분:초). 기록은 확장 안에 바로 저장되므로 팝업을 닫아도 계속된다.
const kst = (line) => {
  const i = line.indexOf(" ");
  const t = new Date(line.slice(0, i));
  return Number.isNaN(t.getTime()) ? line : `[${t.toLocaleTimeString("ko-KR", { hour12: false })}] ${line.slice(i + 1)}`;
};
const refresh = () => chrome.runtime.sendMessage({ type: "summary" }).then((r) => {
  const c = r?.capture;
  const first = c
    ? (c.running ? "진행 중…" : `끝 · 매물 목록 응답 ${c.articlePages}개${c.blocked ? " · 확인 화면 멈춤" : ""}${c.error ? " · 오류 있음" : ""}`)
    : "아직 안 함";
  const lines = [
    `① 응답 읽기: ${first}`,
    `② 직접 부르기: ${r?.direct ? "끝" : "아직 안 함"}`,
    `③ 예약 타이머: ${r?.alarmFires ?? 0}회 울림 (5회면 끝)`,
    "",
    "최근 기록",
    ...((r?.recent || []).map(kst)),
  ];
  log(lines.join("\n"));
}).catch(() => {});
refresh();
setInterval(refresh, 2000);
