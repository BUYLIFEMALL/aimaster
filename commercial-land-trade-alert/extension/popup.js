import { isWatchableUrl } from "./lib/listing.js";

const WEB = "https://commercial-land-trade-alert.buylife.xyz";
const NAVER = "https://new.land.naver.com/offices?ms=37.5006,127.0364,16&a=SG&e=RETAIL";
const $ = (id) => document.getElementById(id);
const myVersion = chrome.runtime.getManifest().version_name || "";
$("ver").textContent = myVersion;
const send = (type, extra = {}) => chrome.runtime.sendMessage({ type, ...extra });
const say = (text, err = false) => { $("msg").textContent = text; $("msg").className = err ? "err" : ""; };
const kst = (iso) => (iso ? new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "");

let activeUrl = "";
let activeTitle = "";
chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => {
  activeUrl = t?.url || "";
  activeTitle = t?.title || "";
  $("add").hidden = !isWatchableUrl(activeUrl);
});

function stateText(s) {
  if (!s.connected) return ["⚠ 웹과 연결이 필요해요. 「받는 곳 연결」에서 「바로 연결」을 눌러 주세요.", ""];
  if (s.targetCount === 0) return ["⚠ 네이버 지도에서 지역과 필터를 고른 뒤 「이 화면 감시」를 눌러 주세요.", ""];
  const last = s.lastResult ? ` · 마지막 ${kst(s.lastResult.at)}` : "";
  const next = s.schedule?.enabled && s.nextDueAt ? ` · 다음 ${kst(s.nextDueAt)}쯤` : s.schedule?.enabled ? "" : " · 예약 꺼짐";
  return [`✅ ${s.targetCount ?? 0}곳 감시${last}${next}\n${s.email || ""} · 오늘 ${s.pagesToday}/${s.maxPages}페이지`, "ok"];
}

async function refresh() {
  const s = await send("state").catch(() => null);
  if (!s) return;
  $("consentBox").hidden = s.consent;
  $("stopped").hidden = !s.stoppedToday;
  const [text, cls] = stateText(s);
  $("state").textContent = text;
  $("state").style.whiteSpace = "pre-line";
  $("state").className = `note ${cls}`;
  $("collect").disabled = !!s.running || !s.connected;
  $("collect").textContent = s.running ? `수집 중… ${s.running.done}/${s.running.total || "?"}곳 (팝업을 닫아도 계속돼요)` : "🔍 지금 수집";
  $("log").textContent = (s.recent || [])
    .map((line) => {
      const i = line.indexOf(" ");
      const t = new Date(line.slice(0, i));
      return Number.isNaN(t.getTime()) ? line : `[${t.toLocaleTimeString("ko-KR", { hour12: false })}] ${line.slice(i + 1)}`;
    })
    .reverse()
    .join("\n") || "아직 기록이 없어요.";
}

$("consent").onchange = async (e) => { if (e.target.checked) { await send("consent"); refresh(); } };
$("collect").onclick = async () => {
  const r = await send("collectNow");
  say(r?.ok ? "수집을 시작했어요. 화면마다 1분쯤 걸려요." : r?.error || "시작하지 못했어요.", !r?.ok);
  refresh();
};
$("add").onclick = async () => {
  const r = await send("addView", { url: activeUrl, name: activeTitle.replace(/\s*[:|-]\s*네이버.*$/, "").trim() });
  say(r?.ok ? `감시에 넣었어요 (${r.count}/10). 이름과 조건은 웹에서 바꿀 수 있어요.` : r?.error || "추가하지 못했어요.", !r?.ok);
  refresh();
};
$("openNaver").onclick = () => chrome.tabs.create({ url: NAVER });
$("watch").onclick = () => chrome.tabs.create({ url: `${WEB}/watch` });
$("settings").onclick = () => chrome.tabs.create({ url: `${WEB}/settings` });

refresh();
send("refreshSettings").then(refresh).catch(() => {});
setInterval(refresh, 2000);
