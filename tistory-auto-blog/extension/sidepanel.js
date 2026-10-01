"use strict";

// 실제 티스토리 DOM을 조사하기 전 자동 입력을 금지한다. 이 코드는 읽기 전용이다.
const STORAGE_KEY = "tistoryEditorInspectionSnapshots";
const TOKEN_KEY = "tistoryAutoBlogToken";
const BASE = "https://tistory-auto-blog-pearl.vercel.app";
const $ = (id) => document.getElementById(id);
let snapshots = [];

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
      ? { ok: true, email: body.email || "이메일 없음", latestVersion: body.latestVersion }
      : { ok: false, error: body.error || `연결 실패 (${response.status})` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function renderConnection(result) {
  $("connectionStatus").textContent = result.ok
    ? `연결됨: ${result.email}${result.latestVersion && result.latestVersion !== extensionVersion() ? ` · 최신 확장 ${result.latestVersion} 필요` : ""}`
    : result.error || "연결되지 않음";
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
    .filter((attribute) => /^(id|name|type|role|title|placeholder|for|contenteditable|tabindex)$/.test(attribute.name) || attribute.name.startsWith("aria-") || attribute.name.startsWith("data-"))
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
  const describeWithoutText = (element) => ({
    tag: element.tagName.toLowerCase(), attrs: attributes(element),
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
  const tagAncestors = [];
  let tagContainer = tagInput?.parentElement || null;
  for (let depth = 0; tagContainer && depth < 3; depth += 1, tagContainer = tagContainer.parentElement) {
    tagAncestors.push(describeWithoutText(tagContainer));
  }
  return {
    url: location.origin + location.pathname,
    isTopFrame: window === window.top,
    editables: select("[contenteditable], textarea, input:not([type='hidden']), .CodeMirror, .cm-editor"),
    buttons: select("button, [role='button'], input[type='button'], input[type='submit']"),
    fileInputs: select("input[type='file']"),
    modeCandidates: select("button, [role='button'], li, a, span").filter((item) => /기본|마크다운|HTML|모드/i.test(item.text)),
    visibleLayers: select("[role='dialog'], [role='menu'], [role='listbox'], [class*='modal'], [class*='popup'], [class*='layer'], [class*='dropdown']").filter((item) => item.visible),
    categoryOptions,
    tagStructure: tagInput ? {
      input: describeWithoutText(tagInput),
      ancestorChain: tagAncestors,
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
