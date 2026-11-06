// 네이버 카페 회원 모집 자동화 — 확장(모드 B 「아는 사람」 초대 + 모드 A-1 게시판 작성자 명단).
// 회원이 직접 로그인한 브라우저에서, 회원이 열어 둔 내 카페 탭으로, 웹에서 승인한 사람에게만 초대한다.
// 서버는 네이버에 접속하지 않는다: 확장이 「다음 대상」을 묻고(next_target) 화면에서 본 결과만 적는다(sent_mark).
// 속도: 사람 간격 60~120초(크롬 알람) · 하루 상한·시간대·이미 보낸 사람은 서버가 거른다.
// 멈춤: 로그인 풀림·보안문자·제한 문구·모르는 화면·결과 불확실 → 멈추고 알림(우회·자동 재시도 없음).
import { findInvite, newLines, classify, isBlocked } from "./invite.mjs";
import { boardFromUrl, parseGrade, cleanRows, cafeNameFromTitle } from "./roster.mjs";

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
  // 401 = 우리 프로그램(buylife.xyz) 로그인 풀림 — 네이버 로그인과 헷갈리지 않게 따로 알린다(2026-11-06 맥미니 2회차).
  if (res.status === 401) throw new Error("프로그램(naver-cafe-recruit.buylife.xyz) 로그인이 풀렸습니다. 프로그램에 다시 로그인한 뒤 시작해 주세요.");
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
  // PC 카페 첫 화면의 「초대」 메뉴는 href="#" + onclick="inviteMember()…" (링크 주소 없음). 카페 번호는 틀 주소(MyCafeIntro.nhn?clubid=)에서.
  const menu = document.querySelector('a.link_invite, a[onclick*="inviteMember"]');
  const frameSrcs = [...document.querySelectorAll("iframe[src]")].map((f) => f.src);
  const cafeId = /clubid=(\d{1,15})/i.exec(menu?.getAttribute("onclick") || "")?.[1] || null;
  return { hrefs, frameSrcs, inviteMenu: !!menu, cafeId, title: document.title, text: (document.body?.innerText || "").slice(0, 20000) };
}

// 카페 첫 화면(위쪽 문서)에서 「초대」 메뉴를 사람처럼 눌러 카페 틀을 초대 화면으로 옮긴다. MAIN world.
function openInviteMenu(framePath) {
  const a = document.querySelector('a.link_invite, a[onclick*="inviteMember"]');
  if (a) { a.click(); return "click"; }
  if (typeof moveIframePage === "function") { moveIframePage(framePath); return "move"; } // eslint-disable-line no-undef
  return null;
}

// 초대 틀(CafeInviteCheck.nhn → CafeInvite.nhn) 안에서만 동작한다. 그 밖의 틀은 { here:false }.
// 바깥 문서 주소(?iframe_url_utf8=…CafeInvite.nhn…)에도 같은 글자가 들어가므로 맨 위 창은 건너뛰고 경로로만 판별한다(2026-11-06 맥미니 2회차).
async function inviteInFrame(naverId) {
  if (window.top === window || !/\/CafeInvite(Check)?\.nhn$/i.test(location.pathname)) return { here: false };
  const seen = () => (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 160); // 못 찾았을 때 기록용(판정 규칙 보정)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = (a, b) => a + Math.random() * (b - a);
  const byText = (label) => [...document.querySelectorAll("button, a, [role=button]")].find((el) => (el.textContent || "").trim() === label && el.offsetParent !== null);
  // 알림창 문구를 모은다(초대 결과가 알림창으로 오는 옛 화면 대비). 「초대하시겠습니까?」 확인창은 회원이 시작한 초대이므로 확인.
  window.__ncrMsgs = [];
  window.alert = (m) => { window.__ncrMsgs.push(String(m)); };
  window.confirm = (m) => { window.__ncrMsgs.push(String(m)); return true; };

  const visible = (sel) => [...document.querySelectorAll(sel)].find((el) => el.offsetParent !== null);
  // 실측 구조(INVITE_TEST_20261106 §2회차): 탭 li.invite_type_list_id > a, 입력 input._naverIdList, 버튼 btn_input_add(아이디 추가)·btn_invite(초대하기).
  const idTab = visible("li.invite_type_list_id a") || byText("아이디");
  if (!idTab) return { here: true, error: `「아이디」 버튼을 찾지 못했습니다. (틀 ${location.pathname} · 화면: ${seen()})` };
  idTab.click();
  await sleep(jitter(900, 1500));
  const input = visible("input._naverIdList") || document.querySelector("input._naverIdList");
  if (!input) return { here: true, error: `아이디 입력 칸을 찾지 못했습니다. (화면: ${seen()})` };
  input.focus();
  input.value = "";
  for (const ch of naverId) { // 사람처럼 한 글자씩
    input.value += ch;
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: ch, inputType: "insertText" }));
    await sleep(jitter(90, 220));
  }
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await sleep(jitter(700, 1300));
  // 「아이디 추가」가 있으면 눌러 목록에 올린 뒤 보낸다(입력만 하고 바로 「초대하기」를 누르면 빈 목록일 수 있음).
  const add = visible("button.btn_input_add") || byText("아이디 추가");
  if (add) { add.click(); await sleep(jitter(800, 1400)); }
  const send = visible("button.btn_invite") || byText("초대하기");
  if (!send) return { here: true, error: `「초대하기」 버튼을 찾지 못했습니다. (화면: ${seen()})` };
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
  const invite = findInvite(page.hrefs, page);
  if (!invite) return set({ running: false, message: "이 카페에서 「초대」 메뉴를 찾지 못했습니다. 초대 메뉴가 보이는 카페 첫 화면에서 눌러 주세요." });
  await set({ running: true, tabId: tab.id, cafeId: invite.cafeId, inviteHow: invite.how, inviteHref: invite.href, framePath: invite.framePath, cafeHome: tab.url, cafeName: page.title.slice(0, 60), done: 0, message: "초대 준비 중" });
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
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    if (s.inviteHow === "menu") {
      // 메뉴형: 카페 첫 화면으로 돌아간 뒤(사람마다 새 초대 화면) 「초대」 메뉴를 눌러 카페 틀을 초대 화면으로 옮긴다.
      const cur = await chrome.tabs.get(s.tabId);
      if (cur.url !== s.cafeHome) { await chrome.tabs.update(s.tabId, { url: s.cafeHome }); await sleep(5000); }
      const [{ result: opened }] = await chrome.scripting.executeScript({ target: { tabId: s.tabId }, world: "MAIN", func: openInviteMenu, args: [s.framePath] });
      if (!opened) return stop("카페 첫 화면에서 「초대」 메뉴를 누르지 못해 멈췄습니다. 보내지 않았습니다.");
    } else {
      await chrome.tabs.update(s.tabId, { url: s.inviteHref });
    }
    await sleep(6000); // 화면과 초대 틀이 다 그려질 때까지
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

// ── 모드 A-1: 게시판 작성자 명단 모으기(닉네임·등급만) ─────────────────────
// 회원이 연 게시판 목록 화면에서 시작 → 한 페이지씩 읽어 보내고 30~45초 뒤 다음 페이지(최대 10페이지).
const COLLECT = "cafe-collect-step";
const MAX_PAGES = 10;
const getC = async () => (await chrome.storage.local.get("collect")).collect ?? { running: false, message: "" };
const setC = (collect) => chrome.storage.local.set({ collect });
async function stopC(message) { await chrome.alarms.clear(COLLECT); await setC({ ...(await getC()), running: false, message }); }

function readWriters() {
  const out = { url: location.href, title: document.title, text: (document.body?.innerText || "").slice(0, 8000), rows: [] };
  const push = (nickEl, root) => {
    const tr = root.closest("tr, li");
    const notice = !!tr && (/notice/i.test(tr.className) || !!tr.querySelector("[class*=notice], [class*=Notice]"));
    const grade = root.querySelector("[class*=LevelIcon] .blind, [class*=level] .blind");
    out.rows.push({ nickname: nickEl.textContent || "", member_grade: grade ? grade.textContent : "", notice });
  };
  for (const w of document.querySelectorAll(".ArticleBoardWriterInfo")) { const n = w.querySelector(".nickname"); if (n) push(n, w); } // 새 구조
  if (!out.rows.length) for (const td of document.querySelectorAll("td.p-nick, td.td_name")) { const n = td.querySelector("a, .m-tcol-c"); if (n) push(n, td); } // 옛 구조
  const active = document.querySelector("[class*=agination] [aria-current='page'], [class*=agination] .on, .prev-next .on");
  out.page = active ? Number(active.textContent.trim()) || 1 : 1;
  return out;
}
function goToPage(target) {
  for (const box of document.querySelectorAll("[class*=agination], .prev-next")) {
    const el = [...box.querySelectorAll("a, button")].find((e) => e.textContent.trim() === String(target));
    if (el) { el.click(); return true; }
  }
  return false;
}

async function readBoard(tabId) {
  const frames = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: readWriters });
  return frames.map((f) => ({ ...f.result, frameId: f.frameId })).sort((a, b) => b.rows.length - a.rows.length)[0];
}

export async function startCollect() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.url || !/^https:\/\/cafe\.naver\.com\//.test(tab.url)) return setC({ running: false, message: "명단을 모을 카페 게시판 목록 화면을 연 상태에서 눌러 주세요." });
  await setC({ running: true, tabId: tab.id, pages: 0, total: 0, cafeName: cafeNameFromTitle(tab.title), message: "명단 읽는 중" });
  await chrome.alarms.create(COLLECT, { delayInMinutes: 0.02 });
}

async function collectStep() {
  const c = await getC();
  if (!c.running) return;
  try {
    const tab = await chrome.tabs.get(c.tabId).catch(() => null);
    if (!tab) return stopC("카페 탭을 닫아 멈췄습니다.");
    const win = await chrome.windows.get(tab.windowId).catch(() => null);
    if (!tab.active || !win || win.state === "minimized") { await setC({ ...c, message: "잠시 멈춤 — 카페 탭을 앞에 두면 이어갑니다" }); return chrome.alarms.create(COLLECT, { delayInMinutes: 1 }); }
    const page = await readBoard(c.tabId);
    if (!page || isBlocked(page.text, tab.url)) return stopC("네이버가 로그인·확인을 요청해 멈췄습니다. 우회하지 않습니다.");
    const board = boardFromUrl(page.url) || boardFromUrl(tab.url);
    const rows = cleanRows(page.rows.map((r) => ({ ...r, member_grade: parseGrade(r.member_grade) })));
    if (!board || !rows.length) return stopC(c.pages ? `모두 읽었습니다. ${c.pages}페이지 · ${c.total}명` : "이 화면에서 글쓴이 칸을 찾지 못했습니다. 게시판 목록 화면(글 목록)에서 눌러 주세요.");
    const r = await api("members_add", { cafe_id: board.cafeId, board_id: board.boardId, cafe_name: c.cafeName, rows });
    if (r.ok === false) return stopC(`오늘 명단 상한(${r.cap}명)에 닿아 멈췄습니다.`);
    const pages = c.pages + 1, total = c.total + r.added + r.updated;
    if (pages >= MAX_PAGES) return stopC(`${pages}페이지까지 읽었습니다 · 이번에 ${total}명(새로 ${r.added}명 포함)`);
    const [{ result: moved }] = await chrome.scripting.executeScript({ target: { tabId: c.tabId, frameIds: [page.frameId] }, func: goToPage, args: [page.page + 1] });
    if (!moved) return stopC(`마지막 페이지까지 읽었습니다 · ${pages}페이지 · ${total}명`);
    await setC({ ...c, pages, total, message: `${pages}페이지 읽음 · ${total}명 · 다음 페이지 대기` });
    await chrome.alarms.create(COLLECT, { delayInMinutes: 0.5 + Math.random() * 0.25 }); // 30~45초
  } catch (e) {
    return stopC(`멈췄습니다: ${e.message}`);
  }
}

chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) step(); if (a.name === COLLECT) collectStep(); });
chrome.tabs.onRemoved.addListener(async (id) => {
  const s = await get(); if (s.running && s.tabId === id) stop("카페 탭을 닫아 멈췄습니다.");
  const c = await getC(); if (c.running && c.tabId === id) stopC("카페 탭을 닫아 멈췄습니다.");
});
chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  (async () => {
    if (msg?.type === "start") await start();
    if (msg?.type === "stop") { await stop("회원님이 멈췄습니다."); await stopC("회원님이 멈췄습니다."); }
    if (msg?.type === "collect") await startCollect();
    send({ ...(await get()), collect: await getC() });
  })();
  return true;
});
