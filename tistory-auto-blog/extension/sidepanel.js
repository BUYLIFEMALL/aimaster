"use strict";

// 티스토리(원문) 입력기 사이드패널(v1.59 개편, 2026-10-10).
// 실제 입력은 작업기(background.js)가 한다 — 이 패널은 연결·블로그 이름 설정, 진행 상태 표시와 중지, 구조 분석(오류 진단)만 맡는다. 패널을 닫아도 작업은 계속된다.
// 웹에서 "티스토리 입력기로 보내기"를 누르면 작업기가 30분 안에 자동으로 가져가 발행 직전까지 입력한다(카테고리·태그·공개 범위 등은 웹에서 글마다 정한다, 마지막 저장·발행은 회원이 직접).
const STORAGE_KEY = "tistoryEditorInspectionSnapshots";
const TOKEN_KEY = "tistoryAutoBlogToken";
const BLOG_NAME_KEY = "tistoryBlogName";
const NOTIFY_KEY = "tistoryNotify";
const TASK_STATE_KEY = "tistoryTaskState";
const BASE = "https://tistory-auto-blog-pearl.vercel.app";
const $ = (id) => document.getElementById(id);
let snapshots = [];
const Core = self.TistoryCore;

function extensionVersion() {
  const manifest = chrome.runtime?.getManifest?.();
  return manifest?.version_name || (manifest?.version ? `v${manifest.version}` : "");
}

async function getToken() {
  return (await chrome.storage.local.get(TOKEN_KEY))[TOKEN_KEY] || "";
}

async function verifyToken(token) {
  if (!token) return { ok: false, error: "연동 토큰을 붙여넣어 주세요." };
  try {
    const response = await fetch(`${BASE}/api/extension/whoami`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => ({}));
    return response.ok
      ? { ok: true, email: body.email || "이메일 없음", latestVersion: body.latestVersion, downloadUrl: body.downloadUrl }
      : { ok: false, error: body.error || `연결 실패 (${response.status})` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// 새 버전 안내: 서버가 알려주는 최신 버전이 설치된 확장 버전보다 높을 때만 배너를 보여준다. 안내 주소는 이 사이트의 /downloads/ 아래만 허용한다.
const versionParts = (value) => { const m = /^v?(\d+)\.(\d+)/.exec(String(value || "")); return m ? [Number(m[1]), Number(m[2])] : null; };
function isNewerVersion(latest, current) {
  const a = versionParts(latest), b = versionParts(current);
  return Boolean(a && b && (a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])));
}
function renderUpdateBanner(result) {
  const current = extensionVersion();
  const link = result?.downloadUrl ? `${BASE}${result.downloadUrl}` : "";
  const outdated = Boolean(result?.ok && link.startsWith(`${BASE}/downloads/`) && isNewerVersion(result.latestVersion, current));
  $("updateBanner").hidden = !outdated;
  if (!outdated) return;
  $("updateBannerText").textContent = `설치된 확장 ${current} → 최신 ${result.latestVersion}. 최신 ZIP을 내려받아 같은 폴더에 덮어쓴 뒤 chrome://extensions에서 이 확장의 새로고침 버튼을 눌러 주세요.`;
  $("updateBannerLink").href = link;
  $("updateBannerLink").textContent = `최신 버전(${result.latestVersion}) ZIP 바로 받기`;
}

function renderConnection(result) {
  renderUpdateBanner(result);
  $("connectionStatus").textContent = result.ok ? `연결됨: ${result.email}` : result.error || "연결되지 않음";
}

async function restoreConnection() {
  $("extensionVersion").textContent = extensionVersion();
  const token = await getToken();
  if (token) $("token").value = token;
  renderConnection(token ? await verifyToken(token) : { ok: false, error: "연결되지 않음" });
}

function report() {
  return {
    tool: "tistory-auto-blog-extension",
    version: extensionVersion(),
    createdAt: new Date().toISOString(),
    notice: "읽기 전용 구조 조사 결과입니다. 제목·본문 실제 내용, 쿠키, 로그인 정보는 포함하지 않습니다.",
    snapshots,
  };
}

function render() {
  $("snapshotList").textContent = snapshots.length
    ? snapshots.map((item, index) => `${index + 1}. ${item.step} · ${item.frames.length}개 프레임`).join("\n")
    : "아직 분석한 화면이 없습니다.";
  $("result").value = snapshots.length ? JSON.stringify(report(), null, 2) : "";
}

async function findTistoryTab() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active?.id && /^https:\/\/[^/]*tistory\.com\//.test(active.url || "")) return active;
  const tabs = await chrome.tabs.query({ url: ["https://*.tistory.com/*"] });
  return tabs.find((tab) => /\/manage\/(newpost|post)/.test(tab.url || "")) || tabs[0] || null;
}

function collectStructure() {
  const tidy = (value, length = 80) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, length);
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  };
  const attributes = (element) => Object.fromEntries([...element.attributes]
    .filter((attribute) => /^(id|name|type|role|title|placeholder|for|contenteditable|tabindex|accept|multiple|capture)$/.test(attribute.name) || attribute.name.startsWith("aria-") || attribute.name.startsWith("data-"))
    .map((attribute) => [attribute.name, tidy(attribute.value)]));
  const holdsUserText = (element) => element.isContentEditable || /^(INPUT|TEXTAREA|BODY|HTML)$/.test(element.tagName)
    || Boolean(element.querySelector("[contenteditable], input, textarea, .CodeMirror, .cm-editor"));
  const describe = (element) => ({
    tag: element.tagName.toLowerCase(), attrs: attributes(element),
    classes: typeof element.className === "string" ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 10) : [],
    visible: visible(element), text: holdsUserText(element) ? "" : tidy(element.textContent, 50),
  });
  const select = (selector) => [...document.querySelectorAll(selector)]
    .sort((left, right) => Number(visible(right)) - Number(visible(left))).slice(0, 80).map(describe);
  const structuralAttributes = (element) => Object.fromEntries([...element.attributes]
    .filter((attribute) => /^(id|type|role|contenteditable|tabindex)$/.test(attribute.name))
    .map((attribute) => [attribute.name, tidy(attribute.value)]));
  const describeWithoutText = (element) => ({
    tag: element.tagName.toLowerCase(), attrs: structuralAttributes(element),
    classes: typeof element.className === "string" ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 10) : [],
    visible: visible(element), childCount: element.children.length,
  });
  const categoryList = document.querySelector("#category-list");
  const categoryOptions = categoryList
    ? [...categoryList.querySelectorAll("[role='option'], button, a, li, label, div")]
      .filter((element) => visible(element) && tidy(element.textContent))
      .slice(0, 80)
      .map(describe)
    : [];
  const tagInput = document.querySelector("#tagText");
  const tagRoot = tagInput?.closest(".editor_tag") || null;
  const tagAncestors = [];
  let tagContainer = tagInput?.parentElement || null;
  for (let depth = 0; tagContainer && depth < 3; depth += 1, tagContainer = tagContainer.parentElement) {
    tagAncestors.push(describeWithoutText(tagContainer));
  }
  const attachmentButtons = [...document.querySelectorAll("#mceu_0, #attach-layer-btn, [aria-label='첨부']")]
    .filter((element) => visible(element))
    .map(describeWithoutText);
  const attachmentMenus = [...document.querySelectorAll("[role='menu']")]
    .filter((menu) => visible(menu) && /사진|파일|슬라이드쇼/i.test(menu.textContent || ""))
    .map((menu) => ({
      menu: describeWithoutText(menu),
      items: [...menu.querySelectorAll("[role='menuitem'], button, a, div")]
        .filter((element) => visible(element) && tidy(element.textContent))
        .slice(0, 40)
        .map(describe),
    }));
  const mediaNodes = [...document.querySelectorAll("img, .mce-represent-image-btn, [data-mce-object], [data-mce-selected]")]
    .filter((element) => visible(element))
    .slice(0, 40)
    .map((element) => ({ ...describeWithoutText(element), parent: describeWithoutText(element.parentElement || element) }));
  return {
    url: location.origin + location.pathname,
    isTopFrame: window === window.top,
    editables: select("[contenteditable], textarea, input:not([type='hidden']), .CodeMirror, .cm-editor"),
    buttons: select("button, [role='button'], input[type='button'], input[type='submit']"),
    fileInputs: select("input[type='file']"),
    modeCandidates: select("button, [role='button'], li, a, span").filter((item) => /기본|마크다운|HTML|모드/i.test(item.text)),
    visibleLayers: select("[role='dialog'], [role='menu'], [role='listbox'], [class*='modal'], [class*='popup'], [class*='layer'], [class*='dropdown']").filter((item) => item.visible),
    categoryOptions,
    attachmentStructure: {
      toolbarButtons: attachmentButtons,
      menus: attachmentMenus,
      fileInputs: select("input[type='file']"),
      mediaNodes,
    },
    tagStructure: tagInput ? {
      input: describeWithoutText(tagInput),
      ancestorChain: tagAncestors,
      directChildren: tagRoot ? [...tagRoot.children].map(describeWithoutText) : [],
      redactedDescendants: tagRoot ? [...tagRoot.querySelectorAll("*")]
        .filter((element) => element !== tagInput)
        .filter((element) => /tag/i.test(typeof element.className === "string" ? element.className : ""))
        .slice(0, 30)
        .map(describeWithoutText) : [],
      confirmedTagLikeElementCount: tagAncestors.reduce((count, item) => count + (item.classes.some((className) => /tag/i.test(className)) ? 1 : 0), 0),
    } : null,
  };
}

$("inspect").addEventListener("click", async () => {
  $("inspect").disabled = true;
  $("status").textContent = "티스토리 화면 구조를 읽는 중...";
  try {
    const tab = await findTistoryTab();
    if (!tab?.id) throw new Error("티스토리 글쓰기 탭을 찾지 못했습니다. 내 블로그의 /manage/newpost 화면을 먼저 열어주세요.");
    const executed = await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, func: collectStructure });
    const frames = executed.filter((entry) => entry.result).map((entry) => ({ frameId: entry.frameId, result: entry.result }));
    snapshots.push({ step: $("step").selectedOptions[0].textContent.trim(), memo: $("memo").value.trim().slice(0, 120), takenAt: new Date().toISOString(), frames });
    await chrome.storage.local.set({ [STORAGE_KEY]: snapshots });
    render();
    $("status").textContent = `완료 · ${frames.length}개 프레임을 읽었습니다. 다음 상태도 분석해 주세요.`;
  } catch (error) {
    $("status").textContent = error instanceof Error ? error.message : String(error);
  } finally { $("inspect").disabled = false; }
});

$("copy").addEventListener("click", async () => {
  if (!snapshots.length) return ($("status").textContent = "먼저 화면을 하나 이상 분석해 주세요.");
  await navigator.clipboard.writeText(JSON.stringify(report(), null, 2));
  $("status").textContent = "결과를 복사했습니다. 이 대화에 붙여넣어 주세요.";
});
$("download").addEventListener("click", () => {
  if (!snapshots.length) return ($("status").textContent = "먼저 화면을 하나 이상 분석해 주세요.");
  const url = URL.createObjectURL(new Blob([JSON.stringify(report(), null, 2)], { type: "application/json" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `tistory-editor-inspection-${new Date().toISOString().slice(0, 10)}.json` });
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("status").textContent = "JSON 파일을 저장했습니다. 이 대화에 첨부해 주세요.";
});
$("clear").addEventListener("click", async () => {
  snapshots = []; await chrome.storage.local.remove(STORAGE_KEY); render();
  $("status").textContent = "수집 결과를 지웠습니다.";
});

$("link").addEventListener("click", async () => {
  const button = $("link");
  const token = $("token").value.trim();
  button.disabled = true;
  $("connectionStatus").textContent = "연결 정보를 확인하는 중...";
  try {
    const result = await verifyToken(token);
    if (!result.ok) return renderConnection(result);
    await chrome.storage.local.set({ [TOKEN_KEY]: token });
    renderConnection(result);
  } finally {
    button.disabled = false;
  }
});

chrome.storage.local.get(STORAGE_KEY).then((stored) => { snapshots = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : []; render(); });
restoreConnection();

// ---- 진행 상태 카드 ----
const STAGE_LABEL = { preparing: "준비 중", typing: "입력 중", image: "이미지 올리는 중", verifying: "확인 중", settings: "발행 설정 중", completed: "입력 완료", publish_ready: "발행 직전 준비 완료", failed: "실패" };
async function renderTask() {
  const stored = await chrome.storage.local.get([TASK_STATE_KEY, "tistoryActiveTask", "tistoryPendingResult"]);
  const state = stored[TASK_STATE_KEY];
  const running = Boolean(stored.tistoryActiveTask);
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
  const notes = [...(state?.warnings || []), ...(state?.reportNote ? [state.reportNote] : []), ...(stored.tistoryPendingResult ? ["서버에 보고할 결과가 보관 중입니다. 연결되면 자동으로 다시 보고합니다."] : [])];
  $("taskNotes").textContent = notes.join("\n");
  if (final && state?.outcome) chrome.runtime.sendMessage({ type: "ackBadge" }).catch(() => {});
}

// ---- 내 티스토리 블로그 이름 ----
async function loadBlogName() {
  const value = (await chrome.storage.local.get(BLOG_NAME_KEY))[BLOG_NAME_KEY] || "";
  $("blogName").value = value;
  $("blogNameStatus").textContent = value ? `저장됨: ${value}.tistory.com — 이 블로그의 글쓰기 화면에만 입력합니다.` : "내 블로그 주소의 이름을 입력하세요. (예: myblog.tistory.com → myblog)";
}
$("saveBlogName").addEventListener("click", async () => {
  const value = Core.normalizeBlogName($("blogName").value);
  if (!value) { $("blogNameStatus").textContent = "블로그 이름은 영문 소문자·숫자·- 로 된 주소의 앞부분입니다. (예: myblog.tistory.com → myblog)"; return; }
  await chrome.storage.local.set({ [BLOG_NAME_KEY]: value });
  $("blogName").value = value;
  $("blogNameStatus").textContent = `저장됨: ${value}.tistory.com — 이 블로그의 글쓰기 화면에만 입력합니다.`;
  chrome.runtime.sendMessage({ type: "pump" }).catch(() => {});
});

// ---- 완료 알림 설정(기본 켜짐) ----
chrome.storage.local.get(NOTIFY_KEY).then((stored) => { $("notifyToggle").checked = stored[NOTIFY_KEY] !== false; }).catch(() => {});
$("notifyToggle").addEventListener("change", () => chrome.storage.local.set({ [NOTIFY_KEY]: $("notifyToggle").checked }).catch(() => {}));

$("cancelTask").addEventListener("click", async () => {
  $("cancelTask").disabled = true;
  await chrome.runtime.sendMessage({ type: "cancel" }).catch(() => {});
  setTimeout(() => { $("cancelTask").disabled = false; }, 2000);
});

// 작업 상태가 바뀌면 진행 상태 카드를 갱신한다.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[TASK_STATE_KEY] || changes.tistoryActiveTask || changes.tistoryPendingResult) renderTask().catch(() => {});
});

loadBlogName().catch(() => {});
renderTask().catch(() => {});
chrome.runtime.sendMessage({ type: "status" }).catch(() => {});
