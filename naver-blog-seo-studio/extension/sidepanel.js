"use strict";

const BASE = "https://naver-blog-seo-studio.vercel.app";
const KEY = "seoStudioToken";
const PUBLISH_SETTINGS_KEY = "seoStudioPublishSettings";
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
let webDrafts = [];
let activeWebDraftId = "";

function formatWebDraftLabel(draft) {
  const date = draft.extension_handoff_at ? new Date(draft.extension_handoff_at).toLocaleDateString("ko-KR") : "";
  return `${draft.title || "제목 없는 초안"}${date ? ` · ${date}` : ""}`;
}

async function refreshWebDrafts() {
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
  placeholder.textContent = webDrafts.length ? "불러올 초안을 선택하세요." : "전송된 웹 초안이 없습니다.";
  select.append(placeholder);
  for (const draft of webDrafts) {
    const option = document.createElement("option");
    option.value = draft.id;
    option.textContent = formatWebDraftLabel(draft);
    select.append(option);
  }
  status.textContent = webDrafts.length ? `${webDrafts.length}개의 웹 초안을 불러왔습니다.` : "전송된 웹 초안이 없습니다. 대시보드에서 초안을 보내주세요.";
}

async function loadSelectedWebDraft() {
  const draft = webDrafts.find((item) => item.id === $("webDraftList").value);
  if (!draft) throw new Error("불러올 웹 초안을 먼저 선택해주세요.");
  $("topic").value = draft.topic || "";
  $("keywords").value = Array.isArray(draft.keywords) ? draft.keywords.join(", ") : "";
  $("title").value = draft.title || "";
  $("body").value = draft.body || "";
  clearGeneratedImage();
  activeWebDraftId = draft.id;
  const token = await getToken();
  const response = await fetch(`${BASE}/api/extension/drafts/library/${encodeURIComponent(draft.id)}/claim`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `초안 불러오기 기록 실패 (${response.status})`);
  $("webDraftStatus").textContent = "웹 초안을 불러왔습니다. 필요하면 대표 이미지를 생성한 뒤 네이버 편집기에 입력하세요.";
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

function clearGeneratedImage() {
  $("generatedImage").removeAttribute("src");
  $("downloadImage").removeAttribute("href");
  $("imagePreview").hidden = true;
}

function normalizeSeoText(value) {
  return plainText(value).replace(/\s+/g, " ").trim();
}

function getSeoKeywords(value) {
  return [...new Set(String(value || "").split(",").map((keyword) => keyword.trim()).filter(Boolean))].slice(0, 10);
}

function buildSeoChecklist({ title, body, keywords, hasImage, category, tags, factsConfirmed }) {
  const titleText = normalizeSeoText(title);
  const bodyText = normalizeSeoText(body);
  const paragraphs = plainText(body).split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const keywordList = getSeoKeywords(keywords);
  const corpus = `${titleText} ${bodyText}`.toLowerCase();
  const missingKeywords = keywordList.filter((keyword) => !corpus.includes(keyword.toLowerCase()));
  const tagList = getSeoKeywords(tags);
  return [
    { required: true, ok: titleText.length >= 15 && titleText.length <= 60, title: "제목 길이", detail: titleText ? `${titleText.length}자 · 권장 15~60자` : "제목을 입력해주세요." },
    { required: true, ok: keywordList.length > 0 && missingKeywords.length === 0, title: "핵심 키워드 반영", detail: !keywordList.length ? "핵심 키워드를 1개 이상 입력해주세요." : missingKeywords.length ? `본문 또는 제목에 없는 키워드: ${missingKeywords.join(", ")}` : `${keywordList.length}개 키워드가 제목 또는 본문에 반영됐습니다.` },
    { required: true, ok: paragraphs.length >= 4 && bodyText.length >= 500, title: "본문 구성", detail: `${paragraphs.length}문단 · ${bodyText.length}자${paragraphs.length < 4 || bodyText.length < 500 ? " · 4문단·500자 이상을 권장합니다." : ""}` },
    { required: false, ok: hasImage, title: "대표 이미지", detail: hasImage ? "대표 이미지가 준비됐습니다." : "권장 항목입니다. 나노바나나 이미지 생성을 이용할 수 있습니다." },
    { required: false, ok: Boolean(category.trim()), title: "카테고리", detail: category.trim() ? `선택 예정: ${category.trim()}` : "권장 항목입니다. 발행 정보에 카테고리를 입력하세요." },
    { required: false, ok: tagList.length >= 3 && tagList.length <= 10, title: "태그", detail: tagList.length ? `${tagList.length}개 입력됨 · 권장 3~10개` : "권장 항목입니다. 관련 태그를 입력하세요." },
    { required: true, ok: Boolean(factsConfirmed), title: "사실·최신 정보 확인", detail: factsConfirmed ? "직접 확인 완료로 표시했습니다." : "발행 전 정책·가격·연도·통계 등은 직접 확인해주세요." },
  ];
}

function renderSeoChecklist(checks) {
  const list = $("seoChecklist");
  list.textContent = "";
  for (const check of checks) {
    const item = document.createElement("li");
    item.className = check.ok ? "pass" : "warn";
    const icon = document.createElement("span");
    icon.className = "check-icon";
    icon.textContent = check.ok ? "✓" : "!";
    const copy = document.createElement("span");
    const heading = document.createElement("strong");
    heading.textContent = `${check.required ? "필수" : "권장"} · ${check.title}`;
    const detail = document.createElement("small");
    detail.textContent = check.detail;
    copy.append(heading, detail);
    item.append(icon, copy);
    list.append(item);
  }
}

async function runSeoReview() {
  const saved = (await chrome.storage.local.get(PUBLISH_SETTINGS_KEY))[PUBLISH_SETTINGS_KEY] || {};
  const checks = buildSeoChecklist({
    title: $("title").value,
    body: $("body").value,
    keywords: $("keywords").value,
    hasImage: Boolean($("generatedImage").src && $("generatedImage").src !== location.href),
    category: $("publishCategory").value.trim() || saved.category || "",
    tags: $("publishTags").value.trim() || saved.tags || "",
    factsConfirmed: $("factsConfirmed").checked,
  });
  renderSeoChecklist(checks);
  const required = checks.filter((check) => check.required);
  const recommended = checks.filter((check) => !check.required);
  const requiredPassed = required.filter((check) => check.ok).length;
  const recommendedPassed = recommended.filter((check) => check.ok).length;
  $("seoReviewSummary").textContent = requiredPassed === required.length
    ? `필수 ${requiredPassed}/${required.length} 통과 · 권장 ${recommendedPassed}/${recommended.length} 준비. 내용을 검토한 뒤 네이버 발행 버튼을 직접 누르세요.`
    : `필수 ${requiredPassed}/${required.length} 통과 · 미완료 항목을 확인한 뒤 다시 검토하세요.`;
  return checks;
}

async function getToken() { return (await chrome.storage.local.get(KEY))[KEY] || ""; }

async function getNaverBlogTab() {
  const tabs = await chrome.tabs.query({ url: ["https://blog.naver.com/*", "https://m.blog.naver.com/*"] });
  return tabs.find((candidate) => candidate.active) || tabs[0] || null;
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
  const prepared = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: () => {
      const input = document.querySelector("#tag-input");
      return { ready: Boolean(input && input.getClientRects().length && getComputedStyle(input).visibility !== "hidden") };
    },
  });
  const frame = prepared.find((entry) => entry.result?.ready);
  if (!frame) throw new Error("네이버에서 발행 버튼을 눌러 발행 설정창을 먼저 열어주세요.");
  const target = { tabId: tab.id, frameIds: [frame.frameId] };
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
    await sleep(randomDelay(45, 95));
    if (Math.random() < 0.05) await sleep(randomDelay(220, 450));
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

$("generate").addEventListener("click", async () => {
  const token = await getToken();
  const topic = $("topic").value.trim();
  if (!token) return ($("generateStatus").textContent = "먼저 SEO Studio를 연결하세요.");
  if (!topic) return ($("generateStatus").textContent = "주제를 입력하세요.");
  $("generate").disabled = true;
  $("generateStatus").textContent = "초안을 생성하는 중입니다...";
  try {
    const includeImage = $("includeImage").checked;
    clearGeneratedImage();
    const response = await fetch(`${BASE}/api/extension/drafts`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ topic, keywords: $("keywords").value, strategy: "C-Rank 기본", includeImage }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `생성 실패 (${response.status})`);
    $("title").value = body.title || "";
    $("body").value = body.body || "";
    if (body.image?.dataUrl) {
      $("generatedImage").src = body.image.dataUrl;
      $("downloadImage").href = body.image.dataUrl;
      $("imagePreview").hidden = false;
      $("generateStatus").textContent = "초안과 대표 이미지 생성 완료";
    } else if (includeImage && body.imageError) {
      $("imagePreview").hidden = true;
      $("generateStatus").textContent = `초안 생성 완료 · 이미지: ${body.imageError}`;
    } else {
      $("imagePreview").hidden = true;
      $("generateStatus").textContent = "초안 생성 완료";
    }
  } catch (error) { $("generateStatus").textContent = `오류: ${error instanceof Error ? error.message : String(error)}`; }
  finally { $("generate").disabled = false; }
});

$("generateAndFill").addEventListener("click", async () => {
  if (!$("topic").value.trim()) return ($("generateStatus").textContent = "주제를 입력하세요.");
  $("generateAndFill").disabled = true;
  try {
    $("generateStatus").textContent = "초안을 생성하는 중입니다...";
    const token = await getToken();
    const topic = $("topic").value.trim();
    const includeImage = $("includeImage").checked;
    clearGeneratedImage();
    const response = await fetch(`${BASE}/api/extension/drafts`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ topic, keywords: $("keywords").value, strategy: "C-Rank 기본", includeImage }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `생성 실패 (${response.status})`);
    $("title").value = result.title || "";
    $("body").value = result.body || "";
    if (!$("title").value.trim() && !$("body").value.trim()) throw new Error("초안 생성 결과가 비어 있습니다.");
    if (result.image?.dataUrl) {
      $("generatedImage").src = result.image.dataUrl;
      $("downloadImage").href = result.image.dataUrl;
      $("imagePreview").hidden = false;
    }
    if (includeImage && !result.image?.dataUrl) {
      const reason = result.imageError || "이미지 데이터를 받지 못했습니다.";
      $("generateStatus").textContent = `대표 이미지 생성 실패: ${reason} 네이버 입력은 실행하지 않았습니다. Gemini API 키·선택 모델·할당량을 확인한 뒤 다시 시도하세요.`;
      return;
    }
    $("generateStatus").textContent = "초안 생성 완료 · 네이버 글쓰기 탭을 찾는 중...";
    const filled = await fillDraftIntoNaver();
    if (filled) $("generateStatus").textContent = result.image?.dataUrl ? "제목·이미지·본문 입력 완료" : "제목·본문 입력 완료";
  } catch (error) {
    $("generateStatus").textContent = `원클릭 입력 실패: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    $("generateAndFill").disabled = false;
  }
});

async function fillDraftIntoNaver() {
  $("generateStatus").textContent = "네이버 편집기에 실제 키보드 입력 중...";
  let attachedTabId = null;
  try {
    const title = $("title").value;
    const body = $("body").value;
    const imageDataUrl = $("generatedImage").src && $("generatedImage").src !== location.href ? $("generatedImage").src : "";
    if (!title && !body) return ($("generateStatus").textContent = "먼저 초안을 생성하세요.");
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
    await sleep(randomDelay(600, 1000));
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
    $("generateStatus").textContent = `네이버 편집기 입력 및 결과 확인 완료 (${verification.actualParagraphCount || 0}문단). 내용을 검토한 뒤 발행하세요.`;
    await reportWebDraftInputResult("completed", { paragraphCount: verification.actualParagraphCount || 0 }).catch(() => {});
    return true;
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
    $("webDraftStatus").textContent = `웹 초안 조회 실패: ${error instanceof Error ? error.message : String(error)}`;
  });
});

$("loadWebDraft").addEventListener("click", () => {
  loadSelectedWebDraft().catch((error) => {
    $("webDraftStatus").textContent = `웹 초안 불러오기 실패: ${error instanceof Error ? error.message : String(error)}`;
  });
});

$("runSeoCheck").addEventListener("click", () => {
  runSeoReview().catch((error) => {
    $("seoReviewSummary").textContent = `SEO 검토 실패: ${error instanceof Error ? error.message : String(error)}`;
  });
});

$("insertImage").addEventListener("click", async () => {
  const dataUrl = $("generatedImage").src;
  if (!dataUrl || dataUrl === location.href) return ($("generateStatus").textContent = "먼저 나노바나나 이미지를 생성하세요.");
  $("insertImage").disabled = true;
  $("generateStatus").textContent = "네이버 편집기에 이미지를 삽입하는 중...";
  try {
    const tabs = await chrome.tabs.query({ url: ["https://blog.naver.com/*", "https://m.blog.naver.com/*"] });
    const tab = tabs.find((candidate) => candidate.active) || tabs[0];
    if (!tab?.id || !/^https:\/\/(blog|m\.blog)\.naver\.com/.test(tab.url || "")) throw new Error("네이버 블로그 글쓰기 화면을 먼저 열어주세요.");
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id, { active: true });
    await insertImageIntoNaverEditor(tab.id, dataUrl);
    $("generateStatus").textContent = "이미지 업로드를 요청했습니다. 네이버 편집기에서 삽입 결과를 확인하세요.";
  } catch (error) {
    $("generateStatus").textContent = formatBrowserError(error, "네이버 이미지 삽입");
  } finally { $("insertImage").disabled = false; }
});

$("regenerateImage").addEventListener("click", async () => {
  const token = await getToken();
  const topic = $("topic").value.trim();
  if (!token) return ($("generateStatus").textContent = "먼저 SEO Studio를 연결하세요.");
  if (!topic) return ($("generateStatus").textContent = "주제를 입력하세요.");
  $("regenerateImage").disabled = true;
  $("generateStatus").textContent = "나노바나나가 새 이미지를 생성하는 중...";
  try {
    const response = await fetch(`${BASE}/api/extension/images/generate`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ topic, title: $("title").value, keywords: $("keywords").value }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.image?.dataUrl) throw new Error(body.error || `이미지 생성 실패 (${response.status})`);
    $("generatedImage").src = body.image.dataUrl;
    $("downloadImage").href = body.image.dataUrl;
    $("imagePreview").hidden = false;
    $("generateStatus").textContent = "새 이미지가 준비되었습니다. 네이버 삽입 버튼으로 교체할 수 있습니다.";
  } catch (error) {
    $("generateStatus").textContent = `오류: ${error instanceof Error ? error.message : String(error)}`;
  } finally { $("regenerateImage").disabled = false; }
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
  $("publishStatus").textContent = "발행 카테고리·태그를 저장했습니다.";
});

$("fillPublishInfo").addEventListener("click", async () => {
  $("fillPublishInfo").disabled = true;
  $("publishStatus").textContent = "네이버 발행 설정창에 입력하는 중...";
  try {
    await fillPublishInfoIntoNaver();
    await chrome.storage.local.set({ [PUBLISH_SETTINGS_KEY]: { category: $("publishCategory").value.trim(), tags: $("publishTags").value.trim() } });
    $("publishStatus").textContent = "카테고리·태그 입력 완료. 내용을 확인한 뒤 네이버 발행 버튼을 직접 누르세요.";
  } catch (error) {
    $("publishStatus").textContent = formatBrowserError(error, "발행 정보 입력");
  } finally {
    $("fillPublishInfo").disabled = false;
  }
});

chrome.storage.local.get(PUBLISH_SETTINGS_KEY).then((stored) => {
  const settings = stored[PUBLISH_SETTINGS_KEY] || {};
  $("publishCategory").value = settings.category || "";
  $("publishTags").value = settings.tags || "";
}).catch(() => {});

renderStatus();
