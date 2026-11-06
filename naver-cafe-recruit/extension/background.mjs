// 네이버 카페 회원 모집 자동화 — 확장(모드 B 「아는 사람」 초대).
// 회원이 직접 로그인한 브라우저에서, 회원이 열어 둔 내 카페 탭으로, 웹에서 승인한 사람에게만 초대한다.
// 서버는 네이버에 접속하지 않는다: 확장이 「다음 대상」을 묻고(next_target) 화면에서 본 결과만 적는다(sent_mark).
// 속도: 사람 간격 60~120초(크롬 알람) · 하루 상한·시간대·이미 보낸 사람은 서버가 거른다.
// 멈춤: 로그인 풀림·보안문자·제한 문구·모르는 화면·결과 불확실 → 멈추고 알림(우회·자동 재시도 없음).
import { findInvite, newLines, classify, isBlocked } from "./invite.mjs";

const BASE = "https://naver-cafe-recruit.buylife.xyz";
const ALARM = "cafe-invite-step";
const get = async () => (await chrome.storage.local.get("run")).run ?? { running: false, message: "꺼짐" };
const set = (run) => chrome.storage.local.set({ run });

async function api(operation, payload) {
  const res = await fetch(`${BASE}/api/recruit/extension`, {
    method: "POST", credentials: "include", headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation, payload }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `서버 응답 ${res.status}`);
  return body.data;
}

const WAIT_TEXT = {
  outside_window: "지금은 설정한 동작 시간대 밖입니다.",
  daily_cap: "오늘 초대 상한에 닿았습니다.",
  limited_today: "오늘 네이버 제한 안내가 있어 더 보내지 않습니다.",
};

async function stop(message) {
  await chrome.alarms.clear(ALARM);
  await set({ ...(await get()), running: false, message });
}

// ── 페이지 안에서 도는 함수(chrome.scripting) ──────────────────────────────
function readLinks() {
  const hrefs = [...document.querySelectorAll("a[href]")].map((a) => a.href);
  return { hrefs, title: document.title, text: (document.body?.innerText || "").slice(0, 20000) };
}

// 초대 틀(CafeInvite.nhn) 안에서만 동작한다. 그 밖의 틀은 { here:false }.
async function inviteInFrame(naverId) {
  if (!/CafeInvite\.nhn/i.test(location.href)) return { here: false };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = (a, b) => a + Math.random() * (b - a);
  const byText = (label) => [...document.querySelectorAll("button, a, [role=button]")].find((el) => (el.textContent || "").trim() === label && el.offsetParent !== null);
  // 알림창 문구를 모은다(초대 결과가 알림창으로 오는 옛 화면 대비). 「초대하시겠습니까?」 확인창은 회원이 시작한 초대이므로 확인.
  window.__ncrMsgs = [];
  window.alert = (m) => { window.__ncrMsgs.push(String(m)); };
  window.confirm = (m) => { window.__ncrMsgs.push(String(m)); return true; };

  const idTab = byText("아이디");
  if (!idTab) return { here: true, error: "「아이디」 버튼을 찾지 못했습니다." };
  idTab.click();
  await sleep(jitter(900, 1500));
  const input = document.querySelector("input._naverIdList");
  if (!input) return { here: true, error: "아이디 입력 칸을 찾지 못했습니다." };
  input.focus();
  input.value = "";
  for (const ch of naverId) { // 사람처럼 한 글자씩
    input.value += ch;
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: ch, inputType: "insertText" }));
    await sleep(jitter(90, 220));
  }
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await sleep(jitter(700, 1300));
  const send = byText("초대하기");
  if (!send) return { here: true, error: "「초대하기」 버튼을 찾지 못했습니다." };
  const before = document.body.innerText;
  send.click();
  await sleep(3500);
  return { here: true, clicked: true, msgs: window.__ncrMsgs, before, after: document.body.innerText };
}

// ── 실행 흐름 ───────────────────────────────────────────────────────────
export async function start() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.url || !/^https:\/\/cafe\.naver\.com\//.test(tab.url)) return set({ running: false, message: "초대할 내 카페 화면(cafe.naver.com)을 연 상태에서 눌러 주세요." });
  let page;
  try { [{ result: page }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readLinks }); }
  catch { return set({ running: false, message: "이 화면을 읽지 못했습니다. 카페 첫 화면에서 다시 눌러 주세요." }); }
  if (isBlocked(page.text, tab.url)) return set({ running: false, message: "네이버 로그인·확인이 필요합니다. 직접 로그인한 뒤 다시 눌러 주세요." });
  const invite = findInvite(page.hrefs);
  if (!invite) return set({ running: false, message: "이 카페에서 「초대」 메뉴를 찾지 못했습니다. 초대 메뉴가 보이는 카페에서 눌러 주세요." });
  await set({ running: true, tabId: tab.id, cafeId: invite.cafeId, inviteHref: invite.href, cafeName: page.title.slice(0, 60), done: 0, message: "초대 준비 중" });
  await chrome.alarms.create(ALARM, { delayInMinutes: 0.05 });
}

async function step() {
  const s = await get();
  if (!s.running) return;
  try {
    // 작업 탭이 그 창 맨 앞에 없거나 창이 최소화면 끄지 않고 잠시 멈춤 — 숨은 탭에서 조작하지 않는다.
    const tab = await chrome.tabs.get(s.tabId).catch(() => null);
    if (!tab) return stop("작업 탭이 없어 멈췄습니다.");
    const win = await chrome.windows.get(tab.windowId).catch(() => null);
    if (!tab.active || !win || win.state === "minimized") {
      await set({ ...s, message: "잠시 멈춤 — 카페 탭을 앞에 두면 이어갑니다" });
      return chrome.alarms.create(ALARM, { delayInMinutes: 1 });
    }
    const next = await api("next_target", { cafe_id: s.cafeId });
    if (next.phase === "waiting") return stop(`${WAIT_TEXT[next.reason] || "지금은 보낼 수 없습니다."} (오늘 ${next.used}/${next.cap})`);
    if (next.phase !== "invite") return stop(`승인한 사람에게 모두 보냈습니다. (오늘 ${next.used}/${next.cap})`);

    await set({ ...s, message: `초대 중: ${next.naver_id}` });
    await chrome.tabs.update(s.tabId, { url: s.inviteHref });
    await new Promise((r) => setTimeout(r, 6000)); // 화면과 초대 틀이 다 그려질 때까지
    const now = await chrome.tabs.get(s.tabId);
    const [{ result: top }] = await chrome.scripting.executeScript({ target: { tabId: s.tabId }, func: readLinks });
    if (isBlocked(top.text, now.url)) return stop("네이버가 로그인·확인을 요청해 멈췄습니다. 직접 로그인한 뒤 다시 시작해 주세요. 우회하지 않습니다.");

    const results = await chrome.scripting.executeScript({ target: { tabId: s.tabId, allFrames: true }, world: "MAIN", func: inviteInFrame, args: [next.naver_id] });
    const r = results.map((x) => x.result).find((x) => x?.here);
    if (!r) return stop("초대 화면을 찾지 못해 멈췄습니다(네이버 화면이 바뀌었을 수 있습니다). 보내지 않았습니다.");
    if (!r.clicked) return stop(`${r.error} 보내지 않았고 멈췄습니다.`);

    const verdict = classify([...(r.msgs || []), ...newLines(r.before, r.after)]);
    const result = verdict.result === "uncertain" ? "failed" : verdict.result;
    const mark = await api("sent_mark", { cafe_id: s.cafeId, naver_id: next.naver_id, result, detail: verdict.detail });
    const done = (s.done || 0) + (result === "sent" ? 1 : 0);
    if (verdict.result === "limited") return stop(`네이버 제한 안내가 떠 오늘은 멈췄습니다: ${verdict.detail}`);
    if (verdict.result === "uncertain") {
      await set({ ...(await get()), done });
      return stop(`${next.naver_id} 초대 결과를 확인하지 못해 멈췄습니다. 다시 보내지 않습니다. 「보낸 결과」와 네이버 화면을 확인해 주세요.`);
    }
    await set({ ...(await get()), done, message: `${result === "sent" ? "보냄" : "건너뜀"}: ${next.naver_id} · 오늘 ${mark.used}/${mark.cap} · 다음 초대 대기` });
    await chrome.alarms.create(ALARM, { delayInMinutes: 1 + Math.random() }); // 60~120초
  } catch (e) {
    return stop(`멈췄습니다: ${e.message}`);
  }
}

chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) step(); });
chrome.tabs.onRemoved.addListener(async (id) => { const s = await get(); if (s.running && s.tabId === id) stop("카페 탭을 닫아 멈췄습니다."); });
chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  (async () => {
    if (msg?.type === "start") await start();
    if (msg?.type === "stop") await stop("회원님이 멈췄습니다.");
    send(await get());
  })();
  return true;
});
