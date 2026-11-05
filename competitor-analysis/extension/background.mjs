// 제휴 타깃 스캔(v1.10 초안) — 회원 PC에서, 회원이 고른 매칭 채널의 공개 페이지를 하나씩 열어
// 화면에 보이는 글자에서 공개 이름·연락처를 읽어 회원 계정으로 보낸다. 서버는 네이버에 접속하지 않는다.
// 속도: 페이지마다 30~45초(크롬 알람 최소 30초) · 동작 시간대 09~22시 · 하루 상한은 서버가 정함.
// 멈춤: 보안문자·로그인 요구·제한 안내가 보이면 그날 중지(우회 없음, 자동 재시도 없음).
import { extractContacts, isBlocked } from "./extract.mjs";

const BASE = "https://competitor-analysis.buylife.xyz";
const ALARM = "partner-scan-step";
const get = async () => (await chrome.storage.local.get("scan")).scan ?? { running: false, queue: [], tabId: null, message: "꺼짐" };
const set = (scan) => chrome.storage.local.set({ scan });

async function api(op, payload = {}) {
  const res = await fetch(`${BASE}/api/partners/extension`, {
    method: "POST", credentials: "include", headers: { "content-type": "application/json" },
    body: JSON.stringify({ op, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `서버 응답 ${res.status}`);
  return data;
}

// 확장이 읽을 수 있는 주소(manifest host_permissions와 같게). 그 밖(업체 자체 홈페이지·오픈채팅 등)은 열지 않고 건너뛴다.
const READABLE = ["blog.naver.com", "m.blog.naver.com", "cafe.naver.com", "m.cafe.naver.com", "smartstore.naver.com", "m.place.naver.com", "map.naver.com"];
function readable(url) { try { const u = new URL(url); return u.protocol === "https:" && READABLE.includes(u.hostname); } catch { return false; } }

function inWindow() { const h = new Date().getHours(); return h >= 9 && h < 22; }
const nextDelayMin = () => 0.5 + Math.random() * 0.25; // 30~45초

async function stop(message) {
  await chrome.alarms.clear(ALARM);
  const s = await get();
  await set({ ...s, running: false, queue: [], message });
  try { await api("scan_stop"); } catch { /* 다음에 다시 대기 상태로 돌아감 */ }
}

export async function start() {
  if (!inWindow()) return set({ ...(await get()), running: false, message: "지금은 동작 시간대(09~22시) 밖입니다." });
  const win = await chrome.windows.getLastFocused();
  const tab = await chrome.tabs.create({ windowId: win.id, url: "about:blank", active: true });
  // 팝업에서 시작하면 원래 탭이 앞에 남는 경우가 있어 스캔 탭과 창을 확실히 앞으로(숨은 탭에서 읽지 않기 위해).
  await chrome.tabs.update(tab.id, { active: true }).catch(() => {});
  await chrome.windows.update(win.id, { focused: true }).catch(() => {});
  await set({ running: true, queue: [], tabId: tab.id, done: 0, message: "스캔 준비 중" });
  await chrome.alarms.create(ALARM, { delayInMinutes: 0.05 });
}

function readPage() {
  // 화면에 보이는 글자만(숨긴 요소·스크립트는 innerText에 안 나옴). 블로그는 본문 틀 안 글자도.
  const parts = [document.title, document.body ? document.body.innerText : ""];
  for (const f of document.querySelectorAll("iframe")) { try { parts.push(f.contentDocument?.body?.innerText || ""); } catch { /* 다른 출처 틀은 읽지 않음 */ } }
  return parts.join("\n").slice(0, 60000);
}

function publicIdFrom(url) {
  try { const u = new URL(url); return u.pathname.split("/").filter(Boolean)[0] || null; } catch { return null; }
}

async function step() {
  let s = await get();
  if (!s.running) return;
  if (!inWindow()) return stop("동작 시간대가 끝나 멈췄습니다. 내일 다시 시작하세요.");
  try {
    if (!s.queue.length) {
      const batch = await api("next_batch");
      if (!batch.items?.length) return stop(batch.reason === "daily_cap" ? "오늘 스캔 상한에 닿았습니다." : "스캔할 채널을 모두 마쳤습니다.");
      s = { ...s, queue: batch.items, collectEmail: !!batch.collectEmail };
    }
    // 스캔 탭이 그 창 맨 앞에 없거나 창이 최소화면 끄지 않고 잠시 멈춤(1분 뒤 다시 확인) — 숨은 탭에서 읽지 않는다.
    const tab = await chrome.tabs.get(s.tabId).catch(() => null);
    const win = tab ? await chrome.windows.get(tab.windowId).catch(() => null) : null;
    if (!tab || !tab.active || !win || win.state === "minimized") {
      if (!tab) return stop("스캔 탭이 없어 멈췄습니다.");
      await set({ ...s, message: "잠시 멈춤 — 스캔 탭을 앞에 두면 이어갑니다" });
      return chrome.alarms.create(ALARM, { delayInMinutes: 1 });
    }
    const [item, ...rest] = s.queue;
    await set({ ...s, queue: rest, message: `스캔 중: ${item.name}` });
    // 네이버 밖 주소는 열지 않고 건너뜀(한 곳 때문에 전체가 멈추지 않게).
    if (!readable(item.url)) {
      await api("scan_report", { id: item.id, status: "skipped" });
      return chrome.alarms.create(ALARM, { delayInMinutes: 0.05 });
    }
    await chrome.tabs.update(s.tabId, { url: item.url });
    await new Promise((r) => setTimeout(r, 6000)); // 페이지가 다 그려질 때까지
    let text = "";
    try {
      const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: s.tabId, allFrames: false }, func: readPage });
      text = String(result || "");
    } catch {
      // 그 페이지만 읽지 못함(이동·권한 등) → 건너뛰고 다음으로.
      await api("scan_report", { id: item.id, status: "skipped" });
      return chrome.alarms.create(ALARM, { delayInMinutes: nextDelayMin() });
    }
    if (isBlocked(text)) {
      await api("scan_report", { id: item.id, status: "stopped" });
      return stop("네이버가 확인(보안문자·제한)을 요청해 오늘 스캔을 멈췄습니다. 우회하지 않습니다.");
    }
    const c = extractContacts(text);
    const kw = String(item.keyword || "").replace(/\s+/g, "");
    // lib/partners/match.ts scoreProfile과 같은 규칙: 화면에 주제 3번 이상 +40, 1~2번 +10.
    const norm = (v) => v.toLowerCase().replace(/[\s·.,!?~\-_/()[\]"'#]+/g, "");
    const times = kw ? norm(text).split(norm(kw)).length - 1 : 0;
    const profileScore = times >= 3 ? 40 : times >= 1 ? 10 : 0;
    await api("scan_report", {
      id: item.id, display_name: (text.split("\n")[0] || item.name).slice(0, 100), public_id: publicIdFrom(item.url),
      mobile: c.mobile, landline: c.landline, emails: s.collectEmail ? c.emails : [], profile_match_score: profileScore,
    });
    const now = await get();
    await set({ ...now, done: (now.done || 0) + 1 });
    await chrome.alarms.create(ALARM, { delayInMinutes: nextDelayMin() });
  } catch (e) {
    return stop(`멈췄습니다: ${e.message}`);
  }
}

chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) step(); });
chrome.tabs.onRemoved.addListener(async (id) => { const s = await get(); if (s.running && s.tabId === id) stop("스캔 탭을 닫아 멈췄습니다."); });
chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  (async () => {
    if (msg?.type === "start") await start();
    if (msg?.type === "stop") await stop("회원님이 멈췄습니다.");
    send(await get());
  })();
  return true;
});
