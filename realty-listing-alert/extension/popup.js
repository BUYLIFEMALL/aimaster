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
  const m = String(t?.url || "").match(/new\.land\.naver\.com\/complexes\/(\d+)/);
  $("add").disabled = !m;
  $("addSub").textContent = m ? `지금 보고 있는 단지(번호 ${m[1]})를 감시 대상에 넣어요` : "네이버 부동산 단지 화면에서 눌러 주세요";
});

function setBox(box, ok) {
  $(box).classList.remove("ok", "no");
  $(box).classList.add(ok ? "ok" : "no");
}

async function refresh() {
  const s = await send("state").catch(() => null);
  if (!s) return;
  setBox("connBox", s.connected);
  $("conn").textContent = s.connected ? "연결됨 ✅" : "연결 전 ⚠";
  $("consentBox").hidden = s.consent;
  $("stopped").hidden = !s.stoppedToday;

  if (s.schedule) {
    setBox("schedBox", s.schedule.enabled);
    const hours = s.schedule.startHour != null && s.schedule.endHour != null ? ` · ${s.schedule.startHour}~${s.schedule.endHour}시` : "";
    $("sched").textContent = s.schedule.enabled ? `켜짐 · ${intervalText(s.schedule.intervalMinutes)}마다${hours}` : "꺼짐";
  } else $("sched").textContent = "웹 설정 받기 전";

  if (s.telegramLinked !== null) {
    setBox("tgBox", s.telegramLinked && !s.telegramFailed);
    $("tg").textContent = !s.telegramLinked ? "연결 전 ⚠" : s.telegramFailed ? "지난번 실패 ⚠" : "연결됨 ✅";
  }

  const lr = s.lastResult;
  $("last").textContent = lr ? `${kstTime(lr.at)} ${RESULT[lr.result] || ""}` : "아직 없음";

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
  const r = await send("addComplex", { tabUrl: activeTab?.url, name: name && !/네이버\s*부동산/.test(name) ? name : "" });
  if (r?.ok) say(`➕ 감시 대상에 넣었어요 (${r.count}/10). 웹 🎯 감시 대상에서 조건을 바꿀 수 있어요.`);
  else say(r?.error || "추가하지 못했어요.", true);
  send("refreshSettings").catch(() => {});
};

$("results").onclick = () => send("openResults");
// 네이버 부동산 바로가기(2026-10-25 주인님 요청) — 회원 브라우저에서 새 탭으로만 연다(서버는 네이버에 요청하지 않음).
$("openNaver").onclick = () => chrome.tabs.create({ url: "https://new.land.naver.com/" });
document.querySelectorAll(".link").forEach((b) => (b.onclick = () => chrome.tabs.create({ url: WEB + b.dataset.path })));

refresh();
send("refreshSettings").then(refresh).catch(() => {});
setInterval(refresh, 2000);
