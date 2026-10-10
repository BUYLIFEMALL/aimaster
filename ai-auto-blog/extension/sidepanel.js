"use strict";

// BLOG(원문)생성 자동화 → 네이버 블로그 입력 확장 사이드패널(v1.41 개편, 2026-10-10).
// 실제 입력은 작업기(background.js)가 한다 — 이 패널은 연결·블로그 ID 설정, 진행 상태 표시와 중지,
// 카테고리 설정, 구조 분석만 맡는다. 패널을 닫아도 작업은 계속된다.
// 웹에서 "네이버 입력기로 보내기"를 누르면 작업기가 30분 안에 자동으로 가져가 발행 직전까지 입력한다(마지막 발행은 회원이 직접).

const BASE = "https://ai-auto-blog-one.vercel.app";
const KEY = "aiAutoBlogToken";
const BLOG_ID_KEY = "aiAutoBlogBlogId";
const NOTIFY_KEY = "aiAutoBlogNotify";
const IMAGE_AI_KEY = "aiAutoBlogImageAi";
const PUBLISH_SETTINGS_KEY = "aiAutoBlogPublishSettings";
const TASK_STATE_KEY = "blogTaskState";
const $ = (id) => document.getElementById(id);
const Core = self.BlogCore;

function renderExtensionVersion() {
  const manifest = chrome.runtime?.getManifest?.();
  const version = manifest?.version_name || (manifest?.version ? `v${manifest.version}` : "");
  if (version) $("extensionVersion").textContent = version;
}

async function getToken() { return (await chrome.storage.local.get(KEY))[KEY] || ""; }

async function api(path, options = {}) {
  const token = await getToken();
  if (!token) throw new Error("먼저 BLOG 연동 토큰으로 연결해주세요.");
  const response = await fetch(`${BASE}${path}`, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` }, cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `요청 실패 (${response.status})`);
  return result;
}

async function verify(token) {
  if (!token) return { ok: false, error: "토큰을 입력하세요." };
  try {
    const response = await fetch(`${BASE}/api/extension/whoami`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    return response.ok ? { ok: true, email: body.email, isAdmin: body.isAdmin === true, latestVersion: body.latestVersion, downloadUrl: body.downloadUrl } : { ok: false, error: body.error || `연결 실패 (${response.status})` };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
}

// 프로그램을 업데이트할 때마다 확장도 같은 버전으로 올라간다(빌드 때 자동 동기화). 설치된 확장이 예전 버전이면 안내한다.
function renderUpdateBanner(latestVersion, downloadUrl) {
  const current = chrome.runtime?.getManifest?.()?.version_name || "";
  const outdated = Boolean(latestVersion && current && latestVersion !== current);
  $("updateBanner").hidden = !outdated;
  if (!outdated) return;
  $("updateBannerText").textContent = `설치된 확장 ${current} → 최신 ${latestVersion}. 최신 ZIP을 내려받아 같은 폴더에 덮어쓴 뒤 chrome://extensions에서 이 확장의 새로고침 버튼을 눌러 주세요.`;
  if (downloadUrl) $("updateBannerLink").href = `${BASE}${downloadUrl}`;
  $("updateBannerLink").textContent = `최신 버전(${latestVersion}) ZIP 바로 받기`;
}

async function renderStatus() {
  const token = await getToken();
  const result = await verify(token);
  $("status").textContent = result.ok ? `연결됨: ${result.email}` : token ? `오류: ${result.error}` : "연결되지 않음";
  if (result.ok) renderUpdateBanner(result.latestVersion, result.downloadUrl);
  // 관리자 계정으로 연결된 경우에만 구조 분석 도구를 보여 준다(연결이 안 되었거나 일반 회원이면 숨김).
  $("inspectCard").hidden = !(result.ok && result.isAdmin);
}

// ---- 진행 상태 카드 ----
const STAGE_LABEL = { preparing: "준비 중", typing: "입력 중", image: "이미지 올리는 중", verifying: "확인 중", settings: "발행 설정 중", completed: "입력 완료", publish_ready: "발행 직전 준비 완료", failed: "실패" };
async function renderTask() {
  const stored = await chrome.storage.local.get(["blogTaskState", "blogActiveTask", "blogPendingResult"]);
  const state = stored.blogTaskState;
  const running = Boolean(stored.blogActiveTask);
  $("taskCard").hidden = !state && !running;
  if (!state && !running) return;
  const final = Boolean(state?.final);
  const stage = state?.stage || "";
  $("taskTitle").textContent = state?.title ? `${state.title}` : "작업";
  $("taskStage").textContent = running && !final ? (STAGE_LABEL[stage] || "진행 중") : STAGE_LABEL[stage] || (state?.outcome === "cancelled" ? "중지됨" : "");
  $("taskMessage").textContent = state?.message || "";
  const total = Number(state?.totalChars) || 0;
  const typed = Math.min(Number(state?.typedChars) || 0, total);
  $("taskProgress").hidden = !(running && !final && total > 0);
  $("taskProgress").max = Math.max(total, 1);
  $("taskProgress").value = typed;
  $("cancelTask").hidden = !(running && !final);
  $("taskCard").dataset.outcome = final ? state.outcome || "" : "running";
  const notes = [...(state?.warnings || []), ...(state?.reportNote ? [state.reportNote] : []), ...(stored.blogPendingResult ? ["서버에 보고할 결과가 보관 중입니다. 연결되면 자동으로 다시 보고합니다."] : [])];
  $("taskNotes").textContent = notes.join("\n");
  if (final && state?.outcome) chrome.runtime.sendMessage({ type: "ackBadge" }).catch(() => {});
}

// ---- 블로그 ID ----
async function loadBlogId() {
  const value = (await chrome.storage.local.get(BLOG_ID_KEY))[BLOG_ID_KEY] || "";
  $("blogId").value = value;
  $("blogIdStatus").textContent = value ? `저장됨: ${value} — 이 블로그의 글쓰기 화면에만 입력합니다.` : "내 네이버 블로그 주소의 아이디를 입력하세요. (예: blog.naver.com/내아이디)";
}
$("saveBlogId").addEventListener("click", async () => {
  const value = $("blogId").value.trim().replace(/^https?:\/\/blog\.naver\.com\//i, "").split(/[/?#]/)[0];
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(value)) { $("blogIdStatus").textContent = "블로그 ID는 영문·숫자·_·- 2~40자로 입력하세요."; return; }
  await chrome.storage.local.set({ [BLOG_ID_KEY]: value });
  $("blogId").value = value;
  $("blogIdStatus").textContent = `저장됨: ${value} — 이 블로그의 글쓰기 화면에만 입력합니다.`;
  chrome.runtime.sendMessage({ type: "pump" }).catch(() => {});
});

// ---- 완료 알림 설정(기본 켜짐) ----
chrome.storage.local.get(NOTIFY_KEY).then((stored) => { $("notifyToggle").checked = stored[NOTIFY_KEY] !== false; }).catch(() => {});
$("notifyToggle").addEventListener("change", () => chrome.storage.local.set({ [NOTIFY_KEY]: $("notifyToggle").checked }).catch(() => {}));
// 이미지에 "AI 활용" 표시 자동 켜기: 기본 꺼짐(true로 저장한 회원만 켠다)
chrome.storage.local.get(IMAGE_AI_KEY).then((stored) => { $("imageAiToggle").checked = stored[IMAGE_AI_KEY] === true; }).catch(() => {});
$("imageAiToggle").addEventListener("change", () => chrome.storage.local.set({ [IMAGE_AI_KEY]: $("imageAiToggle").checked }).catch(() => {}));

$("cancelTask").addEventListener("click", async () => {
  $("cancelTask").disabled = true;
  await chrome.runtime.sendMessage({ type: "cancel" }).catch(() => {});
  setTimeout(() => { $("cancelTask").disabled = false; }, 2000);
});

$("link").addEventListener("click", async () => {
  const token = $("token").value.trim();
  $("link").disabled = true;
  const result = await verify(token);
  if (result.ok) { await chrome.storage.local.set({ [KEY]: token }); $("token").value = ""; }
  $("link").disabled = false;
  $("status").textContent = result.ok ? `연결됨: ${result.email}` : `오류: ${result.error}`;
  if (result.ok) renderUpdateBanner(result.latestVersion, result.downloadUrl);
  $("inspectCard").hidden = !(result.ok && result.isAdmin);
  if (result.ok) chrome.runtime.sendMessage({ type: "pump" }).catch(() => {});
});

// ---- 카테고리 ----
$("savePublishSettings").addEventListener("click", async () => {
  await chrome.storage.local.set({ [PUBLISH_SETTINGS_KEY]: { category: $("publishCategory").value.trim(), tags: "" } });
  $("publishStatus").textContent = "카테고리를 저장했습니다. 다음 자동 입력부터 적용됩니다.";
});

$("fillPublishInfo").addEventListener("click", async () => {
  $("fillPublishInfo").disabled = true;
  $("publishStatus").textContent = "네이버 설정창에 카테고리를 입력하는 중...";
  try {
    await chrome.storage.local.set({ [PUBLISH_SETTINGS_KEY]: { category: $("publishCategory").value.trim(), tags: "" } });
    const response = await chrome.runtime.sendMessage({ type: "reapplySettings" });
    $("publishStatus").textContent = response?.error ? Core.formatBrowserError(new Error(response.error), "카테고리 입력") : "카테고리 입력 완료. 내용을 확인한 뒤 네이버의 마지막 발행 버튼을 직접 누르세요.";
  } catch (error) {
    $("publishStatus").textContent = Core.formatBrowserError(error, "카테고리 입력");
  } finally { $("fillPublishInfo").disabled = false; }
});

// ---- 구조 분석(오류 보고용) ----
async function findNaverTab() {
  const tabs = await chrome.tabs.query({ url: ["https://blog.naver.com/*", "https://m.blog.naver.com/*"] });
  return tabs.find((candidate) => candidate.active) || tabs[0] || null;
}
$("inspect").addEventListener("click", async () => {
  $("inspect").disabled = true;
  $("inspectStatus").textContent = "분석 중...";
  try {
    const tab = await findNaverTab();
    if (!tab?.id) throw new Error("네이버 블로그 탭을 찾지 못했습니다.");
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => {
        const describe = (element) => ({
          tag: element.tagName, id: element.id || null,
          classes: typeof element.className === "string" ? element.className.trim().split(/\s+/).slice(0, 8) : null,
          contentEditable: element.isContentEditable || null, text: (element.textContent || "").trim().slice(0, 80),
        });
        return {
          url: location.href,
          titleCandidates: [...document.querySelectorAll('[class*="se-title"], .se-documentTitle')].slice(0, 20).map(describe),
          paragraphCandidates: [...document.querySelectorAll(".se-text-paragraph, .se-component-content")].slice(0, 30).map(describe),
          contentEditableEls: [...document.querySelectorAll('[contenteditable="true"]')].slice(0, 20).map(describe),
          publishButtons: [...document.querySelectorAll("button, a, [role='button']")].filter((element) => /발행|저장|카테고리|태그/.test(element.textContent || "")).slice(0, 40).map(describe),
          imageButtons: [...document.querySelectorAll("button, [role='button']")].filter((element) => /사진|이미지|image|photo/i.test(`${element.getAttribute("aria-label") || ""} ${element.className || ""} ${element.textContent || ""}`)).slice(0, 20).map(describe),
          fileInputs: [...document.querySelectorAll('input[type="file"]')].slice(0, 10).map(describe),
        };
      },
    });
    $("inspectResult").value = JSON.stringify(results.map((entry) => ({ frameId: entry.frameId, result: entry.result })), null, 2);
    $("inspectStatus").textContent = `분석 완료 (${results.length}개 프레임). 결과를 복사해 전달해주세요.`;
  } catch (error) {
    $("inspectStatus").textContent = Core.formatBrowserError(error, "구조 분석");
  } finally { $("inspect").disabled = false; }
});

chrome.storage.local.get(PUBLISH_SETTINGS_KEY).then((stored) => {
  const settings = stored[PUBLISH_SETTINGS_KEY] || {};
  $("publishCategory").value = settings.category || "";
}).catch(() => {});

// 작업 상태가 바뀌면 진행 상태 카드를 갱신한다.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[TASK_STATE_KEY] || changes.blogActiveTask || changes.blogPendingResult) {
    renderTask().catch(() => {});
  }
});

renderExtensionVersion();
loadBlogId().catch(() => {});
renderTask().catch(() => {});
renderStatus().catch(() => {});
chrome.runtime.sendMessage({ type: "status" }).catch(() => {});
