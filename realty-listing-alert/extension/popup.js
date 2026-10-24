import { complexNoFromUrl, isGenericName } from "./lib/listing.js";

// 팝업 — 상태 보기·지금 수집·이 단지 추가·최근 결과. 수집은 백그라운드가 하므로 팝업을 닫아도 계속된다.
const WEB = "https://realty-listing-alert.buylife.xyz";
const $ = (id) => document.getElementById(id);
const myVersion = chrome.runtime.getManifest().version_name || "";
$("ver").textContent = myVersion;

const send = (type, extra = {}) => chrome.runtime.sendMessage({ type, ...extra });
const say = (text, err = false) => { $("msg").textContent = text; $("msg").className = err ? "msg err" : "msg"; };
const kstTime = (iso) => (iso ? new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "");
const intervalText = (m) => (m < 60 ? `${m}분` : `${m / 60}시간`);
const RESULT = { ok: "✅", blocked: "⛔ 멈춤", rule_mismatch: "⚠ 규칙 확인", error: "⚠ 오류" };
// 비교: v1.03 < v1.10
const older = (a, b) => {
  const p = (v) => String(v || "").replace(/^v/, "").split(".").map(Number);
  const [x1, x2] = p(a), [y1, y2] = p(b);
  return x1 < y1 || (x1 === y1 && x2 < y2);
};

let activeTab = null;
chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => {
  activeTab = t || null;
  const no = complexNoFromUrl(t?.url);
  // 단지 화면일 때만 「이 단지 감시 추가」를 보여 준다(UX 리뉴얼 D)
  $("add").hidden = !no;
  if (no) $("addSub").textContent = `지금 보고 있는 단지를 감시 대상에 넣어요`;
  else if (/land\.naver\.com/.test(String(t?.url || ""))) {
    $("addHint").hidden = false;
    $("addHint").textContent = "👆 지도나 목록에서 단지를 눌러 매물 목록을 열면, 화면 오른쪽 아래에 초록 「➕ 매물 알림에 추가」 버튼이 떠요.";
  }
});

const WEB_PATH = { settings: "/settings", delivery: "/delivery", targets: "/targets", schedule: "/schedule" };
let goPath = null;
$("stateGo").onclick = () => goPath && chrome.tabs.create({ url: WEB + goPath });

/** 한 줄 상태: 빠진 것이 있으면 가장 먼저 할 일 하나와 바로가기, 다 됐으면 준비 완료 요약 */
function stateLine(s) {
  if (!s.connected) return ["todo", "⚠ 웹과 연결이 필요해요", "🔗 연결하기", "settings"];
  if (s.telegramLinked === false) return ["todo", "⚠ 텔레그램을 연결해야 알림을 받아요", "📨 연결하기", "delivery"];
  if (s.telegramFailed) return ["todo", "⚠ 지난 알림 보내기에 실패했어요 — 텔레그램 연결을 확인해 주세요", "📨 확인", "delivery"];
  if (s.targetCount === 0) return ["todo", "⚠ 감시할 단지를 추가해 주세요", "🎯 추가하기", "targets"];
  if (s.schedule && !s.schedule.enabled) return ["todo", `✅ ${s.targetCount}곳 감시 준비 · 예약은 꺼져 있어요`, "⏰ 예약 켜기", "schedule"];
  const lr = s.lastResult;
  const last = lr ? ` · 마지막 ${kstTime(lr.at)} ${RESULT[lr.result] || ""}` : "";
  const every = s.schedule ? ` · ${intervalText(s.schedule.intervalMinutes)}마다` : "";
  return ["ok", `✅ 준비 완료 · ${s.targetCount ?? 0}곳 감시 중${every}${last}`, null, null];
}

/** 연결된 계정을 상태 줄 아래에 작게 보여 준다(웹 로그인 계정과 다르면 혼동하므로) */
function accountText(s) {
  if (!s.connected) return "";
  const who = s.connectedEmail ? `🔗 연결 계정: ${s.connectedEmail}` : "🔗 웹과 연결됨";
  // 오늘 읽은 양(하루 300페이지 상한) · 다음 예정 시각
  const next = s.nextDueAt && s.schedule?.enabled ? ` · 다음 수집 ${kstTime(s.nextDueAt)}쯤` : "";
  return `${who} · 오늘 ${s.pagesToday ?? 0}/300페이지${next}`;
}

async function refresh() {
  const s = await send("state").catch(() => null);
  if (!s) return;
  $("consentBox").hidden = s.consent;
  $("stopped").hidden = !s.stoppedToday;
  $("limited").hidden = !s.limitToday;

  const [kind, text, goLabel, path] = stateLine(s);
  $("stateLine").className = `state-line ${kind}`;
  $("stateText").textContent = text;
  $("account").textContent = accountText(s);
  goPath = path ? WEB_PATH[path] : null;
  $("stateGo").hidden = !goLabel;
  if (goLabel) $("stateGo").textContent = goLabel;

  if (s.latestVersion && older(myVersion, s.latestVersion)) {
    $("update").hidden = false;
    $("update").textContent = `🆕 새 버전 ${s.latestVersion}이 있어요. 웹 대시보드에서 확장을 다시 받아 덮어쓰고 새로고침해 주세요.`;
  }

  const run = s.running;
  $("collect").disabled = !!run || !s.connected;
  $("progress").hidden = !run;
  if (run) {
    $("collectSub").textContent = `수집 중… ${run.done}/${run.total || "?"}곳 (팝업을 닫아도 계속돼요)`;
    $("bar").style.width = run.total ? `${Math.round((run.done / run.total) * 100)}%` : "8%";
  } else {
    $("collectSub").textContent = s.targetCount != null ? `켜진 감시 대상 ${s.targetCount}곳을 지금 한 번 살펴봐요` : "켜진 감시 대상을 지금 한 번 살펴봐요";
  }

  $("log").textContent = (s.recent || [])
    .map((line) => {
      const i = line.indexOf(" ");
      const t = new Date(line.slice(0, i));
      return Number.isNaN(t.getTime()) ? line : `[${t.toLocaleTimeString("ko-KR", { hour12: false })}] ${line.slice(i + 1)}`;
    })
    .reverse()
    .join("\n") || "아직 기록이 없어요.";
}

$("consent").onchange = async (e) => {
  if (!e.target.checked) return;
  await send("consent");
  refresh();
};

$("collect").onclick = async () => {
  const r = await send("collectNow");
  if (r?.ok) say("🔍 수집을 시작했어요. 단지마다 30초~1분쯤 걸려요.");
  else say(r?.error || "시작하지 못했어요.", true);
  refresh();
};

$("add").onclick = async () => {
  const name = (activeTab?.title || "").replace(/\s*[:|-]\s*네이버\s*부동산.*$/, "").trim();
  const r = await send("addComplex", { tabUrl: activeTab?.url, name: isGenericName(name) ? "" : name });
  if (r?.ok) say(`➕ 감시 대상에 넣었어요 (${r.count}/10). 웹 🎯 감시 대상에서 조건을 바꿀 수 있어요.`);
  else say(r?.error || "추가하지 못했어요.", true);
  send("refreshSettings").catch(() => {});
};

$("results").onclick = () => send("openResults");
// 네이버 부동산 바로가기(2026-10-25 주인님 요청) — 회원 브라우저에서 새 탭으로만 연다(서버는 네이버에 요청하지 않음).
$("openNaver").onclick = () => chrome.tabs.create({ url: "https://new.land.naver.com/" });
document.querySelectorAll(".link[data-path]").forEach((b) => (b.onclick = () => chrome.tabs.create({ url: WEB + b.dataset.path })));

refresh();
send("refreshSettings").then(refresh).catch(() => {});
setInterval(refresh, 2000);
