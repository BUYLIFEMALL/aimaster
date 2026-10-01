"use strict";

const BASE = "https://naver-blog-seo-studio.vercel.app";
const KEY = "seoStudioToken";
const PUBLISH_SETTINGS_KEY = "seoStudioPublishSettings";
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
let webDrafts = [];
let activeWebDraftId = "";
let activeWebDraftTags = [];
let activeWebDraftContentImages = [];
let activeWebDraftBlocks = [];
let activeWebDraftTitle = "";
let activeWebDraftBody = "";
let activeWebDraftCoverDataUrl = "";

function resetActiveWebDraft() {
  activeWebDraftId = "";
  activeWebDraftTags = [];
  activeWebDraftContentImages = [];
  activeWebDraftBlocks = [];
  activeWebDraftTitle = "";
  activeWebDraftBody = "";
  activeWebDraftCoverDataUrl = "";
  $("webDraftTagSuggestion").hidden = true;
  $("webDraftTagList").textContent = "";
}

function renderExtensionVersion() {
  const target = $("extensionVersion");
  const manifest = typeof chrome !== "undefined" ? chrome.runtime?.getManifest?.() : null;
  const version = manifest?.version_name || (manifest?.version ? `v${manifest.version}` : "");
  if (target && version) target.textContent = version;
}

function getWebDraftTags(draft) {
  const rawKeywords = Array.isArray(draft.keywords) ? draft.keywords : String(draft.keywords || "").split(",");
  return [...new Set(rawKeywords.map((tag) => String(tag).trim().replace(/^#+/, "")).filter((tag) => tag.length >= 2))].slice(0, 10);
}

function formatWebDraftLabel(draft) {
  const date = draft.extension_handoff_at ? new Date(draft.extension_handoff_at).toLocaleDateString("ko-KR") : "";
  const imageSummary = draft.image_summary || {};
  const imageCount = (imageSummary.cover ? 1 : 0) + Number(imageSummary.contentCount || 0);
  return `${draft.title || "제목 없는 초안"}${date ? ` · ${date}` : ""} · 이미지 ${imageCount}장`;
}

async function refreshWebDrafts() {
  // A refreshed list must never leave a previously previewed draft as the
  // implicit input target. The user needs to select the current content.
  resetActiveWebDraft();
  clearWebDraftPreview();
  const token = await getToken();
  if (!token) throw new Error("먼저 SEO Studio 연결 토큰을 입력해주세요.");
  const status = $("webDraftStatus");
  status.textContent = "웹 초안을 불러오는 중...";
  const response = await fetch(`${BASE}/api/extension/drafts/library`, { headers: { Authorization: `Bearer ${token}` } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `웹 초안 조회 실패 (${response.status})`);
  webDrafts = Array.isArray(result.drafts) ? result.drafts : [];
  const select = $("webDraftList");
  select.textContent = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = webDrafts.length ? "미리볼 콘텐츠를 선택하세요." : "전송된 콘텐츠가 없습니다.";
  select.append(placeholder);
  for (const draft of webDrafts) {
    const option = document.createElement("option");
    option.value = draft.id;
    option.textContent = formatWebDraftLabel(draft);
    select.append(option);
  }
  status.textContent = webDrafts.length ? `전송된 콘텐츠 ${webDrafts.length}개를 불러왔습니다. 목록에서 콘텐츠를 선택하면 바로 불러옵니다.` : "전송된 콘텐츠가 없습니다. 웹에서 콘텐츠를 만든 뒤 확장으로 전송하세요.";
  $("generateStatus").textContent = "대기 중 · 목록에서 콘텐츠를 선택하면 미리보기와 입력 준비가 자동으로 완료됩니다.";
}

function clearWebDraftPreview() {
  $("webDraftPreview").hidden = true;
  $("webDraftPreviewTitle").textContent = "";
  $("webDraftPreviewBody").value = "";
  $("webDraftImagePreview").hidden = true;
  $("webDraftCoverImage").removeAttribute("src");
  $("webDraftContentImagePreview").hidden = true;
  $("webDraftContentImageList").textContent = "";
}

function renderWebDraftPreview(draft, storedImageLoaded) {
  $("webDraftPreview").hidden = false;
  $("webDraftPreviewTitle").textContent = draft.title || "제목 없는 초안";
  $("webDraftPreviewBody").value = draft.body || "본문이 없습니다.";
  $("webDraftImagePreview").hidden = !storedImageLoaded || !activeWebDraftCoverDataUrl;
  if (storedImageLoaded && activeWebDraftCoverDataUrl) $("webDraftCoverImage").src = activeWebDraftCoverDataUrl;
  const imageList = $("webDraftContentImageList");
  imageList.textContent = "";
  for (const image of activeWebDraftContentImages) {
    const item = document.createElement("figure");
    const imageElement = document.createElement("img");
    const caption = document.createElement("figcaption");
    imageElement.src = image.dataUrl;
    imageElement.alt = image.sentence || "불러온 본문 이미지";
    caption.textContent = image.sentence || "본문 이미지";
    item.append(imageElement, caption);
    imageList.append(item);
  }
  $("webDraftContentImagePreview").hidden = activeWebDraftContentImages.length === 0;
}

async function loadSelectedWebDraft() {
  const draft = webDrafts.find((item) => item.id === $("webDraftList").value);
  if (!draft) throw new Error("미리볼 콘텐츠를 먼저 선택해주세요.");
  clearWebDraftPreview();
  activeWebDraftContentImages = [];
  activeWebDraftBlocks = [];
  activeWebDraftId = draft.id;
  activeWebDraftTitle = draft.title || "";
  activeWebDraftBody = draft.body || "";
  activeWebDraftCoverDataUrl = "";
  activeWebDraftTags = getWebDraftTags(draft);
  $("webDraftTagSuggestion").hidden = activeWebDraftTags.length === 0;
  $("webDraftTagList").textContent = activeWebDraftTags.length ? activeWebDraftTags.map((tag) => `#${tag}`).join(" ") : "";
  const token = await getToken();
  let storedImageLoaded = false;
  try {
    storedImageLoaded = await loadStoredWebDraftImage(draft, token);
  } catch (error) {
    console.warn("저장된 대표 이미지 불러오기 실패", error);
  }
  try {
    activeWebDraftContentImages = await loadStoredWebDraftContentImages(draft, token);
  } catch (error) {
    console.warn("저장된 본문 이미지 불러오기 실패", error);
    activeWebDraftContentImages = [];
  }
  activeWebDraftBlocks = Array.isArray(draft.content_blocks) ? draft.content_blocks.filter((block) => {
    if (!block || typeof block !== "object") return false;
    return (block.type === "text" && typeof block.text === "string")
      || (block.type === "image" && ["cover", "content-1", "content-2", "content-3"].includes(block.slot));
  }) : [];
  renderWebDraftPreview(draft, storedImageLoaded);
  const response = await fetch(`${BASE}/api/extension/drafts/library/${encodeURIComponent(draft.id)}/claim`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `초안 불러오기 기록 실패 (${response.status})`);
  const imageSummary = draft.image_summary || {};
  const imageCount = (imageSummary.cover ? 1 : 0) + Number(imageSummary.contentCount || 0);
  $("webDraftStatus").textContent = storedImageLoaded
    ? `콘텐츠와 저장된 대표 이미지${activeWebDraftContentImages.length ? `·본문 이미지 ${activeWebDraftContentImages.length}장` : ""}를 불러왔습니다. 미리보기에서 확인한 뒤 네이버 글쓰기 화면에 입력하세요.`
    : imageCount === 0
      ? "이 콘텐츠에는 저장된 이미지가 없습니다. 웹에서 대표 이미지와 본문 이미지를 생성한 뒤 다시 전송해주세요."
      : `이미지 ${imageCount}장을 불러오지 못했습니다. 확장 프로그램을 최신 버전으로 업데이트한 뒤 다시 시도해주세요.`;
}

async function reportWebDraftInputResult(status, details = {}) {
  if (!activeWebDraftId) return;
  const token = await getToken();
  if (!token) return;
  const response = await fetch(`${BASE}/api/extension/drafts/library/${encodeURIComponent(activeWebDraftId)}/input-result`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status, error: details.error || "", paragraphCount: details.paragraphCount || 0 }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || `입력 결과 기록 실패 (${response.status})`);
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("저장된 대표 이미지 데이터를 읽지 못했습니다."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("저장된 대표 이미지 형식이 올바르지 않습니다."));
    reader.readAsDataURL(blob);
  });
}

async function loadStoredWebDraftImage(draft, token) {
  if (!draft.image_path) return false;
  const response = await fetch(`${BASE}/api/extension/drafts/library/${encodeURIComponent(draft.id)}/image`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || `저장된 대표 이미지 조회 실패 (${response.status})`);
  }
  const dataUrl = await blobToDataUrl(await response.blob());
  activeWebDraftCoverDataUrl = dataUrl;
  return true;
}

async function loadStoredWebDraftContentImages(draft, token) {
  const items = Array.isArray(draft.content_images) ? draft.content_images : [];
  const loaded = [];
  for (const item of items) {
    if (!item?.slot || !item?.sentence) continue;
    const response = await fetch(`${BASE}/api/extension/drafts/library/${encodeURIComponent(draft.id)}/image?slot=${encodeURIComponent(item.slot)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`${item.slot} 본문 이미지 조회에 실패했습니다.`);
    loaded.push({ slot: item.slot, sentence: item.sentence, dataUrl: await blobToDataUrl(await response.blob()) });
  }
  return loaded;
}

async function typeBodyWithMatchedImages(tabId, body, images) {
  let cursor = 0;
  for (const image of images) {
    const position = body.indexOf(image.sentence, cursor);
    if (position < 0) continue;
    const before = body.slice(cursor, position);
    if (before) {
      await chrome.debugger.attach({ tabId }, "1.3");
      try { await debuggerCommand(tabId, "Input.setIgnoreInputEvents", { ignore: false }); await typeWithDebugger(tabId, before); }
      finally { await chrome.debugger.detach({ tabId }); }
    }
    await insertImageIntoNaverEditor(tabId, image.dataUrl);
    const bodyFocus = await focusNaverEditor(tabId, "body");
    if (!bodyFocus.ok) throw new Error("본문 이미지 뒤 입력 위치를 찾지 못했습니다.");
    await chrome.debugger.attach({ tabId }, "1.3");
    try { await debuggerCommand(tabId, "Input.setIgnoreInputEvents", { ignore: false }); await typeWithDebugger(tabId, image.sentence); }
    finally { await chrome.debugger.detach({ tabId }); }
    cursor = position + image.sentence.length;
  }
  const rest = body.slice(cursor);
  if (rest) {
    await chrome.debugger.attach({ tabId }, "1.3");
    try { await debuggerCommand(tabId, "Input.setIgnoreInputEvents", { ignore: false }); await typeWithDebugger(tabId, rest); }
    finally { await chrome.debugger.detach({ tabId }); }
  }
}

async function typeContentBlocks(tabId, blocks, coverDataUrl, contentImages) {
  const contentImageBySlot = new Map(contentImages.map((image) => [image.slot, image.dataUrl]));
  for (const block of blocks) {
    if (block.type === "image") {
      const dataUrl = block.slot === "cover" ? coverDataUrl : contentImageBySlot.get(block.slot);
      if (!dataUrl) continue;
      await insertImageIntoNaverEditor(tabId, dataUrl);
      const focus = await focusNaverEditor(tabId, "body");
      if (!focus.ok) throw new Error("이미지 다음 본문 입력 위치를 찾지 못했습니다.");
      continue;
    }
    if (!block.text) continue;
    await chrome.debugger.attach({ tabId }, "1.3");
    try {
      await debuggerCommand(tabId, "Input.setIgnoreInputEvents", { ignore: false });
      await typeWithDebugger(tabId, block.text);
    } finally { await chrome.debugger.detach({ tabId }); }
  }
}

async function getToken() { return (await chrome.storage.local.get(KEY))[KEY] || ""; }

async function getNaverBlogTab() {
  const tabs = await chrome.tabs.query({ url: ["https://blog.naver.com/*", "https://m.blog.naver.com/*"] });
  return tabs.find((candidate) => candidate.active) || tabs[0] || null;
}

async function findPublishSettingsFrame(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => {
      const input = document.querySelector("#tag-input");
      const visible = Boolean(input && input.getClientRects().length && getComputedStyle(input).visibility !== "hidden");
      return { ready: visible };
    },
  });
  return results.find((entry) => entry.result?.ready)?.frameId ?? null;
}

async function openNaverPublishSettings(tabId) {
  const alreadyOpen = await findPublishSettingsFrame(tabId);
  if (alreadyOpen !== null) return alreadyOpen;

  const candidates = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => {
      const isVisible = (element) => Boolean(element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
      const normalizedText = (element) => (element.textContent || "").replace(/\s+/g, " ").trim();
      return [...document.querySelectorAll("button, [role='button']")]
        .filter((element) => isVisible(element))
        .filter((element) => normalizedText(element) === "발행")
        .filter((element) => !element.closest("[role='dialog'], [aria-modal='true']"))
        .map((element) => ({ tag: element.tagName, classes: typeof element.className === "string" ? element.className : "", text: normalizedText(element) }));
    },
  });
  const matchingFrames = candidates.filter((entry) => Array.isArray(entry.result) && entry.result.length > 0);
  const candidateCount = matchingFrames.reduce((count, entry) => count + entry.result.length, 0);
  if (candidateCount !== 1 || matchingFrames.length !== 1) {
    throw new Error("발행 설정을 여는 첫 발행 버튼을 하나로 확인하지 못했습니다. 구조 분석을 실행한 뒤 결과를 확인해주세요.");
  }

  const frameId = matchingFrames[0].frameId;
  const clicked = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    func: () => {
      const isVisible = (element) => Boolean(element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
      const normalizedText = (element) => (element.textContent || "").replace(/\s+/g, " ").trim();
      const buttons = [...document.querySelectorAll("button, [role='button']")]
        .filter((element) => isVisible(element))
        .filter((element) => normalizedText(element) === "발행")
        .filter((element) => !element.closest("[role='dialog'], [aria-modal='true']"));
      if (buttons.length !== 1) return false;
      buttons[0].click();
      return true;
    },
  });
  if (!clicked.some((entry) => entry.result === true)) throw new Error("발행 설정 버튼을 누르지 못했습니다.");

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await sleep(250);
    const settingsFrame = await findPublishSettingsFrame(tabId);
    if (settingsFrame !== null) return settingsFrame;
  }
  throw new Error("발행 설정창이 열렸는지 확인하지 못했습니다. 마지막 발행 버튼은 자동으로 누르지 않았습니다.");
}

async function fillPublishInfoIntoNaver() {
  const category = $("publishCategory").value.trim();
  const tags = [...new Set($("publishTags").value.split(",").map((tag) => tag.trim().replace(/^#+/, "")).filter(Boolean))];
  if (!category && !tags.length) throw new Error("태그 또는 카테고리를 입력해주세요.");
  if (tags.length > 30) throw new Error("태그는 최대 30개까지 입력해주세요.");
  const tab = await getNaverBlogTab();
  if (!tab?.id) throw new Error("네이버 블로그 글쓰기 탭을 찾지 못했습니다.");
  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tab.id, { active: true });
  const settingsFrameId = await openNaverPublishSettings(tab.id);
  const target = { tabId: tab.id, frameIds: [settingsFrameId] };
  if (tags.length) {
    await chrome.debugger.attach({ tabId: tab.id }, "1.3");
    try {
      for (const tag of tags) {
        const focused = await chrome.scripting.executeScript({
          target,
          func: () => {
            const input = document.querySelector("#tag-input");
            if (!input || !input.getClientRects().length) return false;
            if (input.value.trim()) throw new Error("태그 입력란에 미완성 값이 있습니다. 확인 후 다시 실행해주세요.");
            input.focus();
            return document.activeElement === input;
          },
        });
        if (!focused.some((entry) => entry.result === true)) throw new Error("태그 입력란의 포커스를 확인하지 못했습니다.");
        await debuggerCommand(tab.id, "Input.insertText", { text: tag });
        await debuggerCommand(tab.id, "Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
        await debuggerCommand(tab.id, "Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
        await sleep(300);
        const accepted = await chrome.scripting.executeScript({
          target,
          func: () => document.querySelector("#tag-input")?.value === "",
        });
        if (!accepted.some((entry) => entry.result === true)) throw new Error("태그가 처리되지 않았습니다. 네이버 설정창의 안내를 확인해주세요.");
      }
    } finally {
      await chrome.debugger.detach({ tabId: tab.id });
    }
  }
  if (category) {
    const opened = await chrome.scripting.executeScript({
      target,
      func: () => {
        const trigger = document.querySelector(".selectbox_button__IxraO");
        if (!trigger || !trigger.getClientRects().length) return false;
        const layer = document.querySelector(".option_list_layer__o54Wx");
        if (!layer?.getClientRects().length) trigger.click();
        return true;
      },
    });
    if (!opened.some((entry) => entry.result === true)) throw new Error("발행 카테고리 선택 버튼을 찾지 못했습니다.");
    await sleep(400);
    const selection = await chrome.scripting.executeScript({
      target, args: [category],
      func: (name) => {
        const items = [...document.querySelectorAll(".option_list_layer__o54Wx .item__dTdzo")].filter((el) => el.getClientRects().length);
        const normalize = (text) => text.trim().replace(/^[●◆★▶\\s]+/, "");
        const exact = items.filter((el) => normalize(el.textContent || "") === name);
        const candidates = exact.length ? exact : items.filter((el) => (el.textContent || "").includes(name));
        if (candidates.length !== 1) return { ok: false, count: candidates.length };
        candidates[0].click();
        return { ok: true, text: normalize(candidates[0].textContent || "") };
      },
    });
    const selected = selection[0]?.result;
    if (!selected?.ok) throw new Error(selected?.count > 1 ? "카테고리 이름이 여러 항목과 일치합니다. 전체 이름을 입력해주세요." : "요청한 카테고리를 찾지 못했습니다.");
    await sleep(300);
    const checked = await chrome.scripting.executeScript({
      target, args: [selected.text],
      func: (name) => (document.querySelector(".selectbox_button__IxraO")?.textContent || "").includes(name),
    });
    if (!checked.some((entry) => entry.result === true)) throw new Error("카테고리 선택 결과를 확인하지 못했습니다.");
  }
}

async function preparePublishSettingsAfterContentInput(paragraphCount, inputSummary) {
  await reportWebDraftInputResult("completed", { paragraphCount }).catch(() => {});
  const category = $("publishCategory").value.trim();
  const tags = $("publishTags").value.trim();
  if (!category && !tags) {
    $("generateStatus").textContent = `${inputSummary} 카테고리·태그가 저장되지 않아 발행 설정은 자동으로 열지 않았습니다.`;
    $("publishStatus").textContent = "카테고리·태그를 저장하면 다음 콘텐츠 입력부터 자동으로 설정합니다.";
    return true;
  }

  $("generateStatus").textContent = `${inputSummary} 발행 설정을 열고 카테고리·태그를 자동 입력하는 중...`;
  $("publishStatus").textContent = "콘텐츠 입력 완료 · 카테고리·태그 자동 입력 중...";
  try {
    await fillPublishInfoIntoNaver();
    await chrome.storage.local.set({ [PUBLISH_SETTINGS_KEY]: { category, tags } });
    await reportWebDraftInputResult("publish_ready", { paragraphCount }).catch(() => {});
    $("generateStatus").textContent = "콘텐츠·이미지·카테고리·태그 입력 완료. 네이버 마지막 발행 버튼만 직접 누르세요.";
    $("publishStatus").textContent = "카테고리·태그 자동 입력 완료. 마지막 발행 버튼은 직접 누르세요.";
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    $("generateStatus").textContent = `${inputSummary} 카테고리·태그 자동 입력에 실패했습니다. 아래 설정 버튼으로 다시 시도하세요.`;
    $("publishStatus").textContent = `자동 입력 실패: ${reason}`;
  }
  return true;
}

async function verify(token) {
  if (!token) return { ok: false, error: "토큰을 입력하세요." };
  try {
    const response = await fetch(`${BASE}/api/extension/whoami`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json().catch(() => ({}));
    return response.ok ? { ok: true, email: body.email } : { ok: false, error: body.error || `연결 실패 (${response.status})` };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
}

const plainText = (value) => String(value || "")
  .replace(/\\n/g, "\n")
  .replace(/\r\n/g, "\n")
  .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
  .replace(/`([^`]+)`/g, "$1")
  .replace(/^#{1,6}\s+/gm, "")
  .replace(/^\s*[-*]\s+/gm, "")
  .trim();

function formatBrowserError(error, context = "작업") {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/already attached|another debugger|Another debugger/i.test(message)) {
    return `${context} 실패: 다른 디버거가 네이버 탭에 연결되어 있습니다. DevTools와 다른 자동화 확장을 닫고 다시 시도하세요.`;
  }
  if (/Cannot access contents of url|Receiving end does not exist|host permission/i.test(message)) {
    return `${context} 실패: 네이버 페이지 접근 권한이 없습니다. 확장을 새로고침한 뒤 네이버 글쓰기 탭에서 다시 시도하세요.`;
  }
  if (/No tab with id|tab was closed|target closed/i.test(message)) {
    return `${context} 실패: 네이버 글쓰기 탭이 닫혔거나 이동했습니다. 글쓰기 화면을 다시 연 뒤 시도하세요.`;
  }
  if (/debugger.*attach|debugger.*permission|permission denied/i.test(message)) {
    return `${context} 실패: Chrome 디버거 권한이 거부되었습니다. 확장을 다시 로드하고 권한을 허용하세요.`;
  }
  if (/Extension context invalidated|context invalidated/i.test(message)) {
    return `${context} 실패: 확장이 업데이트되어 연결이 끊겼습니다. Chrome 확장 관리 화면에서 확장을 새로고침하세요.`;
  }
  return `${context} 실패: ${message || "알 수 없는 오류"}`;
}

async function debuggerCommand(tabId, method, params = {}) {
  return chrome.debugger.sendCommand({ tabId }, method, params);
}

async function insertImageIntoNaverEditor(tabId, dataUrl) {
  // Suppress the native Windows file chooser BEFORE clicking the photo button.
  // Assigning input.files alone does not close an already-open native dialog.
  await chrome.debugger.attach({ tabId }, "1.3");
  try {
    await debuggerCommand(tabId, "Page.setInterceptFileChooserDialog", { enabled: true });
    await guardNaverFileChooser(tabId, true);
    return await uploadNaverImage(tabId, dataUrl);
  } finally {
    try {
      try { await guardNaverFileChooser(tabId, false); }
      finally { await debuggerCommand(tabId, "Page.setInterceptFileChooserDialog", { enabled: false }); }
    }
    finally { await chrome.debugger.detach({ tabId }); }
  }
}

async function guardNaverFileChooser(tabId, enabled) {
  return chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    world: "MAIN",
    args: [enabled],
    func: (install) => {
      const key = Symbol.for("aimaster.seo.fileChooserGuard");
      window[key]?.();
      if (!install) return;
      // Cancel only the native file-picker default action, not Naver's
      // photo-button handler, input creation, or subsequent change event.
      const onClick = (event) => {
        if (event.composedPath().some((node) => node instanceof HTMLInputElement && node.type === "file")) {
          event.preventDefault();
        }
      };
      window.addEventListener("click", onClick, true);
      const original = HTMLInputElement.prototype.showPicker;
      const guarded = function (...args) {
        if (this.type !== "file") return original.apply(this, args);
      };
      if (original) HTMLInputElement.prototype.showPicker = guarded;
      const cleanup = () => {
        window.removeEventListener("click", onClick, true);
        if (original && HTMLInputElement.prototype.showPicker === guarded) {
          HTMLInputElement.prototype.showPicker = original;
        }
        clearTimeout(timer);
        delete window[key];
      };
      const timer = setTimeout(cleanup, 20000);
      window[key] = cleanup;
    },
  });
}

async function uploadNaverImage(tabId, dataUrl) {
  const [header, encoded] = String(dataUrl || "").split(",", 2);
  if (!encoded || !header.startsWith("data:image/")) throw new Error("유효한 이미지 데이터가 없습니다.");
  const buttonResults = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => {
      const exactButtons = [...document.querySelectorAll("button.se-image-toolbar-button, button.se-insert-menu-button-image")];
      const candidates = [...exactButtons, ...[...document.querySelectorAll("button, [role='button'], a, [class*='image'], [class*='photo']")].filter((element) => !exactButtons.includes(element))];
      const imageButton = candidates.find((element) => {
        if (element.matches("img, input, [aria-hidden='true']")) return false;
        const label = `${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""} ${element.className || ""} ${element.textContent || ""}`;
        return /사진|이미지|image|photo/i.test(label);
      });
      if (!imageButton) return { clicked: false };
      imageButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
      imageButton.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
      imageButton.click();
      return { clicked: true, label: `${imageButton.getAttribute("aria-label") || imageButton.getAttribute("title") || imageButton.textContent || "image button"}`.trim().slice(0, 80) };
    },
  });
  const clickedButton = buttonResults.find((entry) => entry.result?.clicked)?.result;
  if (!clickedButton) throw new Error("네이버 이미지 버튼을 찾지 못했습니다. 글쓰기 화면의 이미지 도구를 먼저 열어주세요.");
  // 네이버는 이미지 도구를 누른 뒤 파일 input을 동적으로 생성하므로 충분히 기다린다.
  await sleep(2500);
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    args: [{ header, encoded }],
    func: ({ header: dataHeader, encoded: data }) => {
      const mimeType = dataHeader.slice(5, dataHeader.indexOf(";")) || "image/png";
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const file = new File([bytes], "naver-blog-seo-studio-image.png", { type: mimeType });
      const inputs = [...document.querySelectorAll('input[type="file"]')];
      if (inputs.length === 0) return { ok: false, reason: "file input not found" };
      try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        const input = inputs[inputs.length - 1];
        input.files = transfer.files;
        if (input.files.length !== 1) return { ok: false, reason: "file input assignment produced no file" };
        input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        return { ok: true, inputCount: inputs.length, fileName: input.files[0].name };
      } catch (error) {
        return { ok: false, reason: error instanceof Error ? error.message : "file input assignment failed" };
      }
    },
  });
  const result = results.find((entry) => entry.result?.ok)?.result;
  if (!result?.ok) throw new Error(`네이버 이미지 업로드 input 처리 실패: ${result?.reason || "input not found"}`);
  // 파일 input에 들어간 뒤 네이버가 업로드/미리보기를 반영할 시간을 주고 실제 이미지 DOM을 확인한다.
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const imageState = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        const editorImages = [...document.querySelectorAll(".se-component-image img, .se-image-resource, img[src^='blob:']")];
        return { count: editorImages.length };
      },
    });
    if (imageState.some((entry) => (entry.result?.count ?? 0) > 0)) {
      return { ...result, inserted: true };
    }
    await sleep(500);
  }
  throw new Error("이미지 파일은 선택됐지만 네이버 편집기 반영을 확인하지 못했습니다. 이미지 도구를 다시 연 뒤 재시도하세요.");
}

async function typeWithDebugger(tabId, value) {
  const text = plainText(value);
  let typed = 0;
  const startedAt = Date.now();
  for (const character of text) {
    if (character === "\n") {
      await debuggerCommand(tabId, "Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
      await debuggerCommand(tabId, "Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    } else {
      await debuggerCommand(tabId, "Input.insertText", { text: character });
    }
    typed += 1;
    if (typed === 1 || typed % 25 === 0 || typed === text.length) {
      const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      $("generateStatus").textContent = `네이버 편집기 입력 중... ${typed}/${text.length}자 · ${elapsed}초`;
    }
    await sleep(randomDelay(24, 52));
    if (Math.random() < 0.03) await sleep(randomDelay(110, 220));
  }
}

async function focusNaverEditor(tabId, kind, placement = "end") {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    args: [{ kind, placement }],
    func: ({ kind: editorKind, placement: cursorPlacement }) => {
      const isImageOwned = (element) => Boolean(element.closest(
        ".se-documentTitle, .se-image, .se-component-image, .se-section-image, .se-module-image, .se-component-content-fit"
      ));
      const bodyCandidates = [...document.querySelectorAll(".se-text-paragraph")].filter((element) => !isImageOwned(element));
      // Naver creates an empty paragraph after an image. Prefer that paragraph so
      // typing resumes after the image instead of entering the image caption.
      const lastImage = [...document.querySelectorAll(".se-component.se-image, .se-section-image")].at(-1);
      const afterImage = lastImage
        ? bodyCandidates.filter((element) => Boolean(lastImage.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING))
        : bodyCandidates;
      const bodyPool = afterImage.length ? afterImage : bodyCandidates;
      const emptyBody = bodyPool.find((element) => !(element.innerText || element.textContent || "").trim());
      const container = editorKind === "title"
        ? document.querySelector(".se-title-text")
        : (cursorPlacement === "start" ? bodyPool[0] : (emptyBody || bodyPool.at(-1)));
      if (!container) return { ok: false };
      const findEditable = (element) => element?.isContentEditable
        ? element
        : element?.querySelector('[contenteditable="true"]')
          || element?.closest('[contenteditable="true"]');
      const simulateClick = (element) => {
        const rect = element.getBoundingClientRect();
        const mouse = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
        element.dispatchEvent(new MouseEvent("mousedown", mouse));
        element.dispatchEvent(new MouseEvent("mouseup", mouse));
        element.dispatchEvent(new MouseEvent("click", mouse));
      };
      const resolveActiveEditable = () => {
        let active = document.activeElement;
        let depth = 0;
        while (active && active.tagName === "IFRAME" && depth < 5) {
          let innerDocument;
          try { innerDocument = active.contentDocument; } catch { break; }
          if (!innerDocument) break;
          active = innerDocument.activeElement || innerDocument.body;
          depth += 1;
        }
        return active?.isContentEditable ? active : null;
      };
      container.scrollIntoView({ block: "center", inline: "nearest" });
      simulateClick(container);
      container.focus();
      const editable = findEditable(container) || resolveActiveEditable();
      if (!editable) return { ok: false, reason: "contenteditable target not found", container: container.className || container.tagName };
      editable.focus();
      const range = editable.ownerDocument.createRange();
      range.selectNodeContents(container.isContentEditable ? editable : container);
      range.collapse(cursorPlacement === "start");
      const selection = editable.ownerDocument.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return {
        ok: true,
        kind: editorKind,
        frame: location.href,
        editableTag: editable.tagName,
        editableClass: editable.className || null,
      };
    },
  });
  return results.find((entry) => entry.result?.ok)?.result || { ok: false };
}

async function verifyNaverEditorContent(tabId, expectedTitle, expectedBody) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    args: [{ expectedTitle, expectedBody }],
    func: ({ expectedTitle: titleValue, expectedBody: bodyValue }) => {
      const normalize = (value) => String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
      const titleElement = document.querySelector(".se-title-text");
      const bodyParagraphs = [...document.querySelectorAll(".se-text-paragraph")].filter((element) => !element.closest(".se-documentTitle, .se-image, .se-component-image, .se-section-image, .se-module-image"));
      if (!titleElement && bodyParagraphs.length === 0) return { ok: false };
      const actualTitle = titleElement?.innerText || titleElement?.textContent || "";
      const actualBody = bodyParagraphs.map((paragraph) => paragraph.innerText || paragraph.textContent || "").join("\n");
      const expectedTitleText = normalize(titleValue);
      const expectedBodyText = normalize(bodyValue);
      const actualTitleText = normalize(actualTitle);
      const actualBodyText = normalize(actualBody);
      const expectedParagraphs = String(bodyValue || "").replace(/\\n/g, "\n").split(/\n+/).map(normalize).filter(Boolean);
      const titleMatched = !expectedTitleText || actualTitleText.includes(expectedTitleText);
      const bodyMatched = !expectedBodyText || expectedParagraphs.every((paragraph) => actualBodyText.includes(paragraph));
      return {
        ok: titleMatched && bodyMatched,
        titleMatched,
        bodyMatched,
        actualTitle: actualTitleText.slice(0, 120),
        actualBody: actualBodyText.slice(0, 240),
        actualParagraphCount: bodyParagraphs.map((paragraph) => normalize(paragraph.innerText || paragraph.textContent || "")).filter(Boolean).length,
        expectedParagraphCount: expectedParagraphs.length,
        frame: location.href,
      };
    },
      });
      return results.find((entry) => entry.result?.titleMatched || entry.result?.bodyMatched || entry.result?.ok)?.result || { ok: false };
    } catch (error) {
      lastError = error;
      if (attempt < 4) await sleep(350 + attempt * 250);
    }
  }
  throw lastError || new Error("editor verification unavailable");
}

async function renderStatus() {
  const token = await getToken();
  const result = await verify(token);
  $("status").textContent = result.ok ? `연결됨: ${result.email}` : token ? `오류: ${result.error}` : "연결되지 않음";
}

$("link").addEventListener("click", async () => {
  const token = $("token").value.trim();
  $("link").disabled = true;
  const result = await verify(token);
  if (result.ok) { await chrome.storage.local.set({ [KEY]: token }); $("token").value = ""; }
  $("link").disabled = false;
  $("status").textContent = result.ok ? `연결됨: ${result.email}` : `오류: ${result.error}`;
});

async function fillDraftIntoNaver() {
  $("generateStatus").textContent = "네이버 편집기에 실제 키보드 입력 중...";
  let attachedTabId = null;
  try {
    const title = activeWebDraftTitle;
    const body = activeWebDraftBody;
    const imageDataUrl = activeWebDraftCoverDataUrl;
    if (!activeWebDraftId || !title || !body) return ($("generateStatus").textContent = "웹에서 전송한 콘텐츠를 먼저 불러오세요.");
    const tabs = await chrome.tabs.query({ url: ["https://blog.naver.com/*", "https://m.blog.naver.com/*"] });
    const tab = tabs.find((candidate) => candidate.active) || tabs[0];
    if (!tab?.id || !/^https:\/\/(blog|m\.blog)\.naver\.com/.test(tab.url || "")) return ($("generateStatus").textContent = "네이버 블로그 글쓰기 화면을 먼저 열어주세요.");
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id, { active: true });
    await sleep(350);
    const titleFocus = await focusNaverEditor(tab.id, "title");
    if (!titleFocus.ok) return ($("generateStatus").textContent = "제목 입력 요소를 찾지 못했습니다. 네이버 글쓰기 화면을 새로 연 뒤 다시 시도하세요.");
    await reportWebDraftInputResult("in_progress").catch(() => {});
    if (attachedTabId === null) {
      await chrome.debugger.attach({ tabId: tab.id }, "1.3");
      attachedTabId = tab.id;
      await debuggerCommand(tab.id, "Input.setIgnoreInputEvents", { ignore: false });
    }
    await typeWithDebugger(tab.id, title);
    await sleep(randomDelay(350, 550));
    if (activeWebDraftBlocks.length) {
      await chrome.debugger.detach({ tabId: tab.id });
      attachedTabId = null;
      const initialBodyFocus = await focusNaverEditor(tab.id, "body");
      if (!initialBodyFocus.ok) throw new Error("본문 입력 위치를 찾지 못했습니다.");
      $("generateStatus").textContent = "편집한 텍스트·이미지 블록 순서대로 입력 중...";
      await typeContentBlocks(tab.id, activeWebDraftBlocks, imageDataUrl, activeWebDraftContentImages);
      const expectedBody = activeWebDraftBlocks.filter((block) => block.type === "text").map((block) => block.text.trim()).filter(Boolean).join("\n\n") || body;
      const verification = await verifyNaverEditorContent(tab.id, title, expectedBody);
      if (!verification.ok) {
        const details = verification.titleMatched === false ? "제목 확인 실패" : "본문 확인 실패";
        await reportWebDraftInputResult("failed", { error: details }).catch(() => {});
        throw new Error(`${details}. 구조 분석을 실행한 뒤 다시 시도해주세요.`);
      }
      return preparePublishSettingsAfterContentInput(
        verification.actualParagraphCount || 0,
        `제목·편집한 콘텐츠 블록 ${activeWebDraftBlocks.length}개 입력 완료.`,
      );
    }
    if (activeWebDraftContentImages.length) {
      // 본문 전체를 먼저 넣은 뒤 이미지를 끼워 넣지 않습니다. 핵심 문장 직전에
      // 실제 이미지 업로드를 완료해 문장-이미지 매핑 순서를 보존합니다.
      await chrome.debugger.detach({ tabId: tab.id });
      attachedTabId = null;
      const initialBodyFocus = await focusNaverEditor(tab.id, "body");
      if (!initialBodyFocus.ok) throw new Error("본문 입력 위치를 찾지 못했습니다.");
      if (imageDataUrl) {
        $("generateStatus").textContent = "제목 입력 완료 · 대표 이미지 삽입 중...";
        await insertImageIntoNaverEditor(tab.id, imageDataUrl);
        const afterCoverFocus = await focusNaverEditor(tab.id, "body");
        if (!afterCoverFocus.ok) throw new Error("대표 이미지 뒤 본문 입력 위치를 찾지 못했습니다.");
      }
      $("generateStatus").textContent = "본문 핵심 문장 위치에 이미지 2장을 삽입하며 입력 중...";
      await typeBodyWithMatchedImages(tab.id, body, activeWebDraftContentImages);
      const verification = await verifyNaverEditorContent(tab.id, title, body);
      if (!verification.ok) {
        const details = verification.titleMatched === false ? "제목 확인 실패" : "본문 확인 실패";
        await reportWebDraftInputResult("failed", { error: details }).catch(() => {});
        throw new Error(`${details}. 구조 분석을 실행해 주세요.`);
      }
      return preparePublishSettingsAfterContentInput(
        verification.actualParagraphCount || 0,
        `제목·대표 이미지·본문 문장 매칭 이미지 ${activeWebDraftContentImages.length}장·본문 입력 완료.`,
      );
    }
    if (imageDataUrl) {
      // Enter the body while the normal editor caret is reliable. The image
      // is inserted at the beginning of this paragraph in the next step.
      await chrome.debugger.detach({ tabId: tab.id });
      attachedTabId = null;
      const preImageBody = await focusNaverEditor(tab.id, "body");
      if (!preImageBody.ok) throw new Error("본문 입력 위치를 찾지 못했습니다.");
      await chrome.debugger.attach({ tabId: tab.id }, "1.3");
      attachedTabId = tab.id;
      await debuggerCommand(tab.id, "Input.setIgnoreInputEvents", { ignore: false });
      await typeWithDebugger(tab.id, body);
      await chrome.debugger.detach({ tabId: tab.id });
      attachedTabId = null;
    }
    if (imageDataUrl) {
      if (attachedTabId !== null) await chrome.debugger.detach({ tabId: tab.id });
      attachedTabId = null;
      const bodyAnchor = await focusNaverEditor(tab.id, "body", "start");
      if (!bodyAnchor.ok) throw new Error("이미지 삽입 위치를 찾지 못했습니다.");
      $("generateStatus").textContent = "제목 입력 완료 · 이미지 삽입 중...";
      await insertImageIntoNaverEditor(tab.id, imageDataUrl);
    }
    const bodyFocus = imageDataUrl ? { ok: true } : await focusNaverEditor(tab.id, "body");
    if (!bodyFocus.ok) return ($("generateStatus").textContent = "본문 문단 입력 요소를 찾지 못했습니다. 네이버 글쓰기 본문을 클릭한 뒤 다시 시도하세요.");
    if (!imageDataUrl && attachedTabId === null) {
      await chrome.debugger.attach({ tabId: tab.id }, "1.3");
      attachedTabId = tab.id;
      await debuggerCommand(tab.id, "Input.setIgnoreInputEvents", { ignore: false });
    }
    $("generateStatus").textContent = imageDataUrl ? "이미지 삽입 완료 · 본문 입력 중..." : "본문 입력 중...";
    if (!imageDataUrl) await typeWithDebugger(tab.id, body);
    const verification = await verifyNaverEditorContent(tab.id, title, body);
    if (!verification.ok) {
      const details = [
        verification.titleMatched === false ? "제목 확인 실패" : null,
        verification.bodyMatched === false ? `본문 확인 실패 (${verification.actualParagraphCount || 0}/${verification.expectedParagraphCount || 0}문단)` : null,
      ].filter(Boolean).join(", ");
      $("generateStatus").textContent = `입력 결과 확인 실패: ${details || "실제 편집기 내용을 읽지 못했습니다."} 구조 분석을 실행해 주세요.`;
      await reportWebDraftInputResult("failed", { error: details || "입력 결과 확인에 실패했습니다." }).catch(() => {});
      return;
    }
    if (attachedTabId !== null) {
      await chrome.debugger.detach({ tabId: attachedTabId });
      attachedTabId = null;
    }
    return preparePublishSettingsAfterContentInput(
      verification.actualParagraphCount || 0,
      "네이버 편집기 입력 및 결과 확인 완료.",
    );
  } catch (error) {
    $("generateStatus").textContent = formatBrowserError(error, "네이버 편집기 입력");
    await reportWebDraftInputResult("failed", { error: error instanceof Error ? error.message : String(error) }).catch(() => {});
  } finally {
    if (attachedTabId !== null) {
      try { await chrome.debugger.detach({ tabId: attachedTabId }); } catch { /* tab may have navigated */ }
    }
  }
}

$("fill").addEventListener("click", fillDraftIntoNaver);

$("refreshWebDrafts").addEventListener("click", () => {
  refreshWebDrafts().catch((error) => {
    $("webDraftStatus").textContent = `전송된 콘텐츠 조회 실패: ${error instanceof Error ? error.message : String(error)}`;
  });
});

$("loadWebDraft").addEventListener("click", () => {
  loadSelectedWebDraft().catch((error) => {
    $("webDraftStatus").textContent = `콘텐츠 미리보기 실패: ${error instanceof Error ? error.message : String(error)}`;
  });
});

$("webDraftList").addEventListener("change", () => {
  if (!$("webDraftList").value) {
    resetActiveWebDraft();
    clearWebDraftPreview();
    $("generateStatus").textContent = "대기 중 · 입력할 콘텐츠를 목록에서 선택하세요.";
    return;
  }
  $("webDraftStatus").textContent = "선택한 콘텐츠와 이미지를 불러오는 중...";
  loadSelectedWebDraft().catch((error) => {
    resetActiveWebDraft();
    clearWebDraftPreview();
    $("webDraftStatus").textContent = `콘텐츠 자동 불러오기 실패: ${error instanceof Error ? error.message : String(error)}`;
  });
});

$("applyWebDraftTags").addEventListener("click", () => {
  if (!activeWebDraftTags.length) return ($("webDraftStatus").textContent = "먼저 콘텐츠를 불러오세요.");
  $("publishTags").value = activeWebDraftTags.join(", ");
  $("webDraftStatus").textContent = "추천 태그를 적용했습니다. 필요하면 수정한 뒤 카테고리·태그 입력을 실행하세요.";
});

$("inspect").addEventListener("click", async () => {
  $("inspect").disabled = true;
  $("inspectStatus").textContent = "분석 중...";
  try {
    const tabs = await chrome.tabs.query({ url: ["https://blog.naver.com/*", "https://m.blog.naver.com/*"] });
    const tab = tabs.find((candidate) => candidate.active) || tabs[0];
    if (!tab?.id) throw new Error("네이버 블로그 탭을 찾지 못했습니다.");
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id, { active: true });
    await sleep(250);
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => {
        const describe = (element) => ({
          tag: element.tagName,
          id: element.id || null,
          classes: typeof element.className === "string" ? element.className.trim().split(/\s+/).slice(0, 8) : null,
          contentEditable: element.isContentEditable || null,
          inputType: element.getAttribute("type") || null,
          placeholder: element.getAttribute("placeholder") || null,
          text: (element.textContent || "").trim().slice(0, 80),
        });
        return {
          url: location.href,
          title: document.title,
          titleCandidates: [...document.querySelectorAll('[class*="se-title"], .se-documentTitle')].slice(0, 20).map(describe),
          paragraphCandidates: [...document.querySelectorAll('.se-text-paragraph, .se-component-content, [class*="text-paragraph"]')].slice(0, 30).map(describe),
          contentEditableEls: [...document.querySelectorAll('[contenteditable="true"]')].slice(0, 20).map(describe),
          keywordButtons: [...document.querySelectorAll("button, a, [role='button']")].filter((element) => /발행|저장|카테고리|태그|확인/.test(element.textContent || "")).slice(0, 40).map(describe),
          imageButtons: [...document.querySelectorAll("button, a, [role='button'], [class*='image'], [class*='photo']")].filter((element) => {
            if (element.matches("img, input, [aria-hidden='true']")) return false;
            return /사진|이미지|image|photo/i.test(`${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""} ${element.className || ""} ${element.textContent || ""}`);
          }).slice(0, 40).map(describe),
          fileInputs: [...document.querySelectorAll('input[type="file"]')].slice(0, 20).map(describe),
        };
      },
    });
    const combined = results.map((entry) => ({ frameId: entry.frameId, result: entry.result }));
    $("inspectResult").value = JSON.stringify(combined, null, 2);
    $("inspectStatus").textContent = `분석 완료 (${combined.length}개 프레임). 결과를 복사해 전달해주세요.`;
  } catch (error) {
    $("inspectStatus").textContent = formatBrowserError(error, "구조 분석");
  } finally {
    $("inspect").disabled = false;
  }
});

$("savePublishSettings").addEventListener("click", async () => {
  const settings = { category: $("publishCategory").value.trim(), tags: $("publishTags").value.trim() };
  await chrome.storage.local.set({ [PUBLISH_SETTINGS_KEY]: settings });
  $("publishStatus").textContent = "카테고리·태그를 저장했습니다.";
});

$("fillPublishInfo").addEventListener("click", async () => {
  $("fillPublishInfo").disabled = true;
  $("publishStatus").textContent = "네이버 설정창에 카테고리·태그를 입력하는 중...";
  try {
    await fillPublishInfoIntoNaver();
    await chrome.storage.local.set({ [PUBLISH_SETTINGS_KEY]: { category: $("publishCategory").value.trim(), tags: $("publishTags").value.trim() } });
    await reportWebDraftInputResult("publish_ready").catch(() => {});
    $("publishStatus").textContent = "카테고리·태그 입력 완료. 내용을 확인한 뒤 네이버 마지막 발행 버튼을 직접 누르세요.";
  } catch (error) {
    $("publishStatus").textContent = formatBrowserError(error, "카테고리·태그 입력");
  } finally {
    $("fillPublishInfo").disabled = false;
  }
});

chrome.storage.local.get(PUBLISH_SETTINGS_KEY).then((stored) => {
  const settings = stored[PUBLISH_SETTINGS_KEY] || {};
  $("publishCategory").value = settings.category || "";
  $("publishTags").value = settings.tags || "";
}).catch(() => {});

renderExtensionVersion();
renderStatus();
