"use strict";

// BLOG(원문)생성 자동화 → 네이버 블로그 글쓰기 화면 입력 확장(2026-10-01, 주인님 지시: A안 BLOG 전용 확장, 한 글자씩 입력, 네이버만).
// naver-blog-seo-studio/extension/sidepanel.js의 실제 네이버 편집기에서 검증된 처리(제목·본문 위치 찾기, 이미지 파일 업로드,
// 발행 설정창 열기·카테고리·태그 입력)를 그대로 가져오고, 루트 docs/PLATFORM_PATTERNS.md §20(봇 탐지 회피)에 맞춰 바꿨다.
//  - 한 글자씩 70~170ms 간격 + 가끔 250~700ms 쉼(§20 규칙 1)
//  - 클릭 전에 마우스를 올리고 잠깐 기다림(§20 규칙 2)
//  - 셀렉터는 SEO 스튜디오가 실제 화면 조사로 확인한 것만 쓰고, 애매하면 명확한 오류로 멈춤(§20 규칙 3) — "구조 분석" 버튼 제공
//  - 마지막 "발행" 버튼은 절대 누르지 않음(§20 규칙 4). 발행 설정창을 여는 첫 "발행" 버튼까지만 누른다.
// chrome.scripting.executeScript로 넘기는 함수는 페이지 안에서 따로 실행되므로 바깥 함수를 쓸 수 없다 —
// 주입 함수 안에 필요한 도우미(hover·대기 등)를 매번 다시 정의한다(naver-blog-auto-poster_web/AGENTS.md §7).

const BASE = "https://ai-auto-blog-one.vercel.app";
const KEY = "aiAutoBlogToken";
const PUBLISH_SETTINGS_KEY = "aiAutoBlogPublishSettings";
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// §20 타이핑 간격
const TYPE_MIN_MS = 70;
const TYPE_MAX_MS = 170;
const THINK_CHANCE = 0.04;
const THINK_MIN_MS = 250;
const THINK_MAX_MS = 700;

let posts = [];
let active = null; // { id, title, blocks: [{type:'text',text}|{type:'image',url,alt,dataUrl}], tags }

function renderExtensionVersion() {
  const manifest = chrome.runtime?.getManifest?.();
  const version = manifest?.version_name || (manifest?.version ? `v${manifest.version}` : "");
  if (version) $("extensionVersion").textContent = version;
}

async function getToken() { return (await chrome.storage.local.get(KEY))[KEY] || ""; }

async function api(path, options = {}) {
  const token = await getToken();
  if (!token) throw new Error("먼저 BLOG 연동 토큰으로 연결해주세요.");
  const response = await fetch(`${BASE}${path}`, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `요청 실패 (${response.status})`);
  return result;
}

async function verify(token) {
  if (!token) return { ok: false, error: "토큰을 입력하세요." };
  try {
    const response = await fetch(`${BASE}/api/extension/whoami`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json().catch(() => ({}));
    return response.ok ? { ok: true, email: body.email, latestVersion: body.latestVersion, downloadUrl: body.downloadUrl } : { ok: false, error: body.error || `연결 실패 (${response.status})` };
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
}

function estimateMinutes(textLength) {
  const averageMs = (TYPE_MIN_MS + TYPE_MAX_MS) / 2 + THINK_CHANCE * (THINK_MIN_MS + THINK_MAX_MS) / 2;
  return Math.max(1, Math.round((textLength * averageMs) / 60000));
}

function formatPostLabel(post) {
  const date = post.extension_handoff_at ? new Date(post.extension_handoff_at).toLocaleDateString("ko-KR") : "";
  const status = { in_progress: " · 입력 중", completed: " · 입력 완료", publish_ready: " · 발행 준비 완료", failed: " · 입력 실패" }[post.naver_input_status] || "";
  return `${post.title || "제목 없는 글"}${date ? ` · ${date}` : ""} · 이미지 ${post.image_count}장${status}`;
}

function resetActive() {
  active = null;
  $("tagSuggestion").hidden = true;
  $("tagSuggestionList").textContent = "";
  $("postPreview").close();
  $("postPreviewContent").textContent = "";
}

async function refreshPosts() {
  resetActive();
  $("postStatus").textContent = "보낸 글을 불러오는 중...";
  const result = await api("/api/extension/posts");
  posts = Array.isArray(result.posts) ? result.posts : [];
  const select = $("postList");
  select.textContent = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = posts.length ? "입력할 글을 선택하세요." : "보낸 글이 없습니다.";
  select.append(placeholder);
  for (const post of posts) {
    const option = document.createElement("option");
    option.value = String(post.id);
    option.textContent = formatPostLabel(post);
    select.append(option);
  }
  $("postStatus").textContent = posts.length
    ? `보낸 글 ${posts.length}개를 불러왔습니다. 글을 선택하면 이미지까지 미리 불러옵니다.`
    : "보낸 글이 없습니다. BLOG 글 보기 화면에서 \"네이버로 보내기\"를 눌러주세요.";
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지 데이터를 읽지 못했습니다."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("이미지 형식이 올바르지 않습니다."));
    reader.readAsDataURL(blob);
  });
}

async function loadSelectedPost() {
  const post = posts.find((item) => String(item.id) === $("postList").value);
  if (!post) throw new Error("입력할 글을 먼저 선택해주세요.");
  resetActive();
  const blocks = [];
  let failedImages = 0;
  for (const block of Array.isArray(post.blocks) ? post.blocks : []) {
    if (block.type === "text" && block.text) blocks.push({ type: "text", text: block.text });
    if (block.type === "link" && block.text && /^https?:\/\//.test(block.url || "")) blocks.push({ type: "link", text: block.text, url: block.url });
    if (block.type === "image" && block.url) {
      try {
        const response = await fetch(block.url);
        if (!response.ok) throw new Error(String(response.status));
        blocks.push({ type: "image", url: block.url, alt: block.alt || "", dataUrl: await blobToDataUrl(await response.blob()) });
      } catch {
        failedImages += 1; // 보관 기간(30일)이 지나 지워진 이미지 등 — 그 칸은 건너뛴다
      }
    }
  }
  active = { id: post.id, title: post.title || "", blocks, tags: Array.isArray(post.tags) ? post.tags : [] };
  renderPreview();
  if (active.tags.length) {
    $("tagSuggestion").hidden = false;
    $("tagSuggestionList").textContent = active.tags.map((tag) => `#${tag}`).join(" ");
  }
  const textLength = blocks.reduce((sum, block) => sum + (block.type === "text" ? block.text.length : 0), 0) + active.title.length;
  const images = blocks.filter((block) => block.type === "image").length;
  $("postStatus").textContent = `글과 이미지 ${images}장을 불러왔습니다${failedImages ? ` (이미지 ${failedImages}장은 불러오지 못해 건너뜁니다)` : ""}. 약 ${textLength.toLocaleString()}자 · 예상 입력 시간 약 ${estimateMinutes(textLength)}분.`;
}

function renderPreview() {
  const container = $("postPreviewContent");
  container.textContent = "";
  const title = document.createElement("h4");
  title.textContent = active.title || "제목 없는 글";
  container.append(title);
  for (const block of active.blocks) {
    if (block.type === "text") {
      for (const paragraph of block.text.split(/\n{2,}/).map((value) => value.trim()).filter(Boolean)) {
        const element = document.createElement("p");
        element.textContent = paragraph;
        element.style.whiteSpace = "pre-line";
        container.append(element);
      }
      continue;
    }
    if (block.type === "link") {
      const paragraph = document.createElement("p");
      const anchor = document.createElement("a");
      anchor.href = block.url;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      anchor.textContent = block.text;
      paragraph.append(anchor, document.createTextNode(" (실제 링크로 입력)"));
      container.append(paragraph);
      continue;
    }
    const figure = document.createElement("figure");
    const image = document.createElement("img");
    const caption = document.createElement("figcaption");
    image.src = block.dataUrl;
    image.alt = block.alt;
    caption.textContent = block.alt || "본문 이미지";
    figure.append(image, caption);
    container.append(figure);
  }
}

function openPreview() {
  if (!active) return ($("postStatus").textContent = "먼저 목록에서 글을 선택해주세요.");
  if (!$("postPreview").open) $("postPreview").showModal();
}

async function reportInputResult(status, error = "") {
  if (!active) return;
  await api(`/api/extension/posts/${encodeURIComponent(active.id)}/input-result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, error }),
  }).catch(() => {});
}

function formatBrowserError(error, context = "작업") {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/already attached|another debugger/i.test(message)) return `${context} 실패: 다른 디버거가 네이버 탭에 연결되어 있습니다. DevTools와 다른 자동화 확장을 닫고 다시 시도하세요.`;
  if (/Cannot access contents of url|Receiving end does not exist|host permission/i.test(message)) return `${context} 실패: 네이버 페이지 접근 권한이 없습니다. 확장을 새로고침한 뒤 네이버 글쓰기 탭에서 다시 시도하세요.`;
  if (/No tab with id|tab was closed|target closed/i.test(message)) return `${context} 실패: 네이버 글쓰기 탭이 닫혔거나 이동했습니다. 글쓰기 화면을 다시 연 뒤 시도하세요.`;
  if (/debugger.*attach|debugger.*permission|permission denied/i.test(message)) return `${context} 실패: Chrome 디버거 권한이 거부되었습니다. 확장을 다시 로드하고 권한을 허용하세요.`;
  if (/Extension context invalidated|context invalidated/i.test(message)) return `${context} 실패: 확장이 업데이트되어 연결이 끊겼습니다. 확장 관리 화면에서 새로고침하세요.`;
  return `${context} 실패: ${message || "알 수 없는 오류"}`;
}

async function getNaverBlogTab() {
  const tabs = await chrome.tabs.query({ url: ["https://blog.naver.com/*", "https://m.blog.naver.com/*"] });
  return tabs.find((candidate) => candidate.active) || tabs[0] || null;
}

async function debuggerCommand(tabId, method, params = {}) {
  return chrome.debugger.sendCommand({ tabId }, method, params);
}

async function withDebugger(tabId, task) {
  await chrome.debugger.attach({ tabId }, "1.3");
  try {
    await debuggerCommand(tabId, "Input.setIgnoreInputEvents", { ignore: false });
    return await task();
  } finally {
    try { await chrome.debugger.detach({ tabId }); } catch { /* tab may have navigated */ }
  }
}

// §20 규칙 1: 한 글자씩, 무작위 간격. 줄바꿈은 Enter 키.
let typedSoFar = 0;
let totalToType = 0;
let typingStartedAt = 0;
async function typeWithDebugger(tabId, value) {
  const text = String(value || "").replace(/\r\n/g, "\n");
  for (const character of text) {
    if (character === "\n") {
      await debuggerCommand(tabId, "Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
      await debuggerCommand(tabId, "Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    } else {
      await debuggerCommand(tabId, "Input.insertText", { text: character });
    }
    typedSoFar += 1;
    if (typedSoFar === 1 || typedSoFar % 20 === 0) {
      const elapsed = Math.max(1, Math.round((Date.now() - typingStartedAt) / 1000));
      const remaining = Math.max(0, totalToType - typedSoFar);
      $("inputStatus").textContent = `네이버 편집기 입력 중... ${typedSoFar.toLocaleString()}/${totalToType.toLocaleString()}자 · ${elapsed}초 경과 · 남은 시간 약 ${estimateMinutes(remaining)}분`;
    }
    await sleep(randomDelay(TYPE_MIN_MS, TYPE_MAX_MS));
    if (Math.random() < THINK_CHANCE) await sleep(randomDelay(THINK_MIN_MS, THINK_MAX_MS));
  }
}

// 제목/본문 입력 위치로 이동. §20 규칙 2: 마우스를 올리고 잠깐 기다린 뒤 클릭.
async function focusNaverEditor(tabId, kind) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    args: [{ kind }],
    func: async ({ kind: editorKind }) => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const between = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
      const isImageOwned = (element) => Boolean(element.closest(".se-documentTitle, .se-image, .se-component-image, .se-section-image, .se-module-image, .se-component-content-fit"));
      const bodyCandidates = [...document.querySelectorAll(".se-text-paragraph")].filter((element) => !isImageOwned(element));
      // 이미지 뒤에 네이버가 만드는 빈 문단을 우선 — 이미지 설명칸에 입력되지 않게 한다(SEO 스튜디오에서 확인한 동작).
      const lastImage = [...document.querySelectorAll(".se-component.se-image, .se-section-image")].at(-1);
      const afterImage = lastImage ? bodyCandidates.filter((element) => Boolean(lastImage.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)) : bodyCandidates;
      const bodyPool = afterImage.length ? afterImage : bodyCandidates;
      const emptyBody = bodyPool.find((element) => !(element.innerText || element.textContent || "").trim());
      const container = editorKind === "title" ? document.querySelector(".se-title-text") : (emptyBody || bodyPool.at(-1));
      if (!container) return { ok: false };
      container.scrollIntoView({ block: "center", inline: "nearest" });
      await wait(between(120, 260));
      const rect = container.getBoundingClientRect();
      const point = { bubbles: true, cancelable: true, view: window, clientX: rect.left + Math.min(rect.width - 4, between(8, 40)), clientY: rect.top + rect.height / 2 };
      container.dispatchEvent(new MouseEvent("mouseover", point));
      container.dispatchEvent(new MouseEvent("mousemove", point));
      await wait(between(90, 240));
      container.dispatchEvent(new MouseEvent("mousedown", point));
      container.dispatchEvent(new MouseEvent("mouseup", point));
      container.dispatchEvent(new MouseEvent("click", point));
      container.focus();
      const findEditable = (element) => element?.isContentEditable ? element : element?.querySelector('[contenteditable="true"]') || element?.closest('[contenteditable="true"]');
      let activeElement = document.activeElement;
      for (let depth = 0; activeElement && activeElement.tagName === "IFRAME" && depth < 5; depth += 1) {
        try { activeElement = activeElement.contentDocument?.activeElement || activeElement.contentDocument?.body; } catch { break; }
      }
      const editable = findEditable(container) || (activeElement?.isContentEditable ? activeElement : null);
      if (!editable) return { ok: false, reason: "contenteditable target not found" };
      editable.focus();
      const range = editable.ownerDocument.createRange();
      range.selectNodeContents(container.isContentEditable ? editable : container);
      range.collapse(false);
      const selection = editable.ownerDocument.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return { ok: true };
    },
  });
  return results.find((entry) => entry.result?.ok)?.result || { ok: false };
}

async function guardNaverFileChooser(tabId, enabled) {
  // 이미지 버튼을 누를 때 윈도우 파일 선택 창이 뜨지 않게 막는다(SEO 스튜디오 v1.0.29에서 확인한 방식).
  return chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    world: "MAIN",
    args: [enabled],
    func: (install) => {
      const key = Symbol.for("aimaster.blog.fileChooserGuard");
      window[key]?.();
      if (!install) return;
      const onClick = (event) => {
        if (event.composedPath().some((node) => node instanceof HTMLInputElement && node.type === "file")) event.preventDefault();
      };
      window.addEventListener("click", onClick, true);
      const original = HTMLInputElement.prototype.showPicker;
      const guarded = function (...args) { if (this.type !== "file") return original.apply(this, args); };
      if (original) HTMLInputElement.prototype.showPicker = guarded;
      const cleanup = () => {
        window.removeEventListener("click", onClick, true);
        if (original && HTMLInputElement.prototype.showPicker === guarded) HTMLInputElement.prototype.showPicker = original;
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
    func: async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const between = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
      const exactButtons = [...document.querySelectorAll("button.se-image-toolbar-button, button.se-insert-menu-button-image")];
      const candidates = [...exactButtons, ...[...document.querySelectorAll("button, [role='button'], a, [class*='image'], [class*='photo']")].filter((element) => !exactButtons.includes(element))];
      const imageButton = candidates.find((element) => {
        if (element.matches("img, input, [aria-hidden='true']")) return false;
        const label = `${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""} ${element.className || ""} ${element.textContent || ""}`;
        return /사진|이미지|image|photo/i.test(label);
      });
      if (!imageButton) return { clicked: false };
      const rect = imageButton.getBoundingClientRect();
      const point = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
      imageButton.dispatchEvent(new MouseEvent("mouseover", point));
      imageButton.dispatchEvent(new MouseEvent("mousemove", point));
      await wait(between(120, 320));
      imageButton.dispatchEvent(new MouseEvent("mousedown", point));
      imageButton.dispatchEvent(new MouseEvent("mouseup", point));
      imageButton.click();
      return { clicked: true };
    },
  });
  if (!buttonResults.some((entry) => entry.result?.clicked)) throw new Error("네이버 이미지(사진) 버튼을 찾지 못했습니다. 구조 분석을 실행해 결과를 전달해주세요.");
  await sleep(randomDelay(2300, 3000)); // 네이버가 파일 input을 만드는 시간
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    args: [{ header, encoded }],
    func: ({ header: dataHeader, encoded: data }) => {
      const mimeType = dataHeader.slice(5, dataHeader.indexOf(";")) || "image/png";
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const extension = mimeType.split("/")[1] === "jpeg" ? "jpg" : (mimeType.split("/")[1] || "png");
      const file = new File([bytes], `blog-image.${extension}`, { type: mimeType });
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
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: error instanceof Error ? error.message : "file input assignment failed" };
      }
    },
  });
  const result = results.find((entry) => entry.result?.ok)?.result;
  if (!result?.ok) throw new Error(`네이버 이미지 업로드 처리 실패: ${results.find((entry) => entry.result)?.result?.reason || "input not found"}`);
  return result;
}

async function countEditorImages(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => document.querySelectorAll(".se-component-image img, .se-image-resource, img[src^='blob:']").length,
  });
  return results.reduce((sum, entry) => sum + (entry.result || 0), 0);
}

async function insertImageIntoNaverEditor(tabId, dataUrl) {
  const before = await countEditorImages(tabId);
  await chrome.debugger.attach({ tabId }, "1.3");
  try {
    await debuggerCommand(tabId, "Page.setInterceptFileChooserDialog", { enabled: true });
    await guardNaverFileChooser(tabId, true);
    await uploadNaverImage(tabId, dataUrl);
  } finally {
    try {
      try { await guardNaverFileChooser(tabId, false); }
      finally { await debuggerCommand(tabId, "Page.setInterceptFileChooserDialog", { enabled: false }); }
    } finally { try { await chrome.debugger.detach({ tabId }); } catch { /* ignore */ } }
  }
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if ((await countEditorImages(tabId)) > before) return;
    await sleep(500);
  }
  throw new Error("이미지 파일은 선택됐지만 네이버 편집기에 반영된 것을 확인하지 못했습니다. 네이버 화면을 확인한 뒤 다시 시도하세요.");
}

// 링크만 있는 줄(추천 링크 등)은 한 글자씩 입력하면 링크가 걸리지 않는다(네이버 자동 링크도 안 걸림 — 2026-10-01 주인님 확인).
// 그래서 사람이 웹 페이지의 링크를 복사해 Ctrl+V 하듯, 링크가 걸린 HTML을 "붙여넣기" 이벤트로 편집기에 넘긴다.
// 붙여넣은 뒤 편집기 안에 그 주소의 실제 링크(a[href])가 생겼는지 확인하고, 안 생겼으면 호출부가 "글자: 주소"로 입력한다.
async function pasteLinkIntoNaver(tabId, text, url) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    args: [{ text, url }],
    func: async ({ text: label, url: href }) => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      let active = document.activeElement;
      for (let depth = 0; active && active.tagName === "IFRAME" && depth < 5; depth += 1) {
        try { active = active.contentDocument?.activeElement || active.contentDocument?.body; } catch { break; }
      }
      const editable = active?.isContentEditable ? active : null;
      if (!editable) return { skipped: true };
      const doc = editable.ownerDocument;
      const before = doc.querySelectorAll(`a[href^="${href}"]`).length;
      const escape = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const transfer = new DataTransfer();
      transfer.setData("text/html", `<a href="${escape(href)}">${escape(label)}</a>`);
      transfer.setData("text/plain", `${label} ${href}`);
      editable.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }));
      await wait(700);
      const linked = doc.querySelectorAll(`a[href^="${href}"]`).length > before;
      const bodyText = (doc.body?.innerText || "").replace(/\s+/g, " ");
      return { skipped: false, linked, inserted: bodyText.includes(label.replace(/\s+/g, " ")) };
    },
  });
  const result = results.find((entry) => entry.result && !entry.result.skipped)?.result;
  return result || { linked: false, inserted: false };
}

async function verifyNaverEditorContent(tabId, expectedTitle, expectedTexts) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        args: [{ expectedTitle, expectedTexts }],
        func: ({ expectedTitle: titleValue, expectedTexts: texts }) => {
          const normalize = (value) => String(value || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
          const titleElement = document.querySelector(".se-title-text");
          const paragraphs = [...document.querySelectorAll(".se-text-paragraph")].filter((element) => !element.closest(".se-documentTitle, .se-image, .se-component-image, .se-section-image, .se-module-image"));
          if (!titleElement && paragraphs.length === 0) return { ok: false };
          const actualTitle = normalize(titleElement?.innerText || titleElement?.textContent || "");
          const actualBody = normalize(paragraphs.map((paragraph) => paragraph.innerText || paragraph.textContent || "").join("\n"));
          const expectedParagraphs = texts.flatMap((text) => String(text).split(/\n+/)).map(normalize).filter(Boolean);
          const missing = expectedParagraphs.filter((paragraph) => !actualBody.includes(paragraph));
          const titleMatched = !normalize(titleValue) || actualTitle.includes(normalize(titleValue));
          return { ok: titleMatched && missing.length === 0, titleMatched, missingCount: missing.length, expectedCount: expectedParagraphs.length };
        },
      });
      const found = results.find((entry) => entry.result && (entry.result.titleMatched || entry.result.ok))?.result;
      if (found) return found;
    } catch { /* frame navigation during check — retry */ }
    await sleep(350 + attempt * 250);
  }
  return { ok: false };
}

// 발행 설정창(태그 입력란이 보이는 창)이 열린 프레임 찾기
async function findPublishSettingsFrame(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => {
      const input = document.querySelector("#tag-input");
      return { ready: Boolean(input && input.getClientRects().length && getComputedStyle(input).visibility !== "hidden") };
    },
  });
  return results.find((entry) => entry.result?.ready)?.frameId ?? null;
}

// 발행 "설정창"을 여는 첫 발행 버튼만 누른다. 설정창 안의 마지막 발행 버튼은 찾지도 누르지도 않는다(§20 규칙 4).
async function openNaverPublishSettings(tabId) {
  const alreadyOpen = await findPublishSettingsFrame(tabId);
  if (alreadyOpen !== null) return alreadyOpen;
  const candidates = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => {
      const isVisible = (element) => Boolean(element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
      const text = (element) => (element.textContent || "").replace(/\s+/g, " ").trim();
      return [...document.querySelectorAll("button, [role='button']")]
        .filter((element) => isVisible(element) && text(element) === "발행" && !element.closest("[role='dialog'], [aria-modal='true']")).length;
    },
  });
  const matching = candidates.filter((entry) => entry.result > 0);
  if (matching.length !== 1 || matching[0].result !== 1) throw new Error("발행 설정을 여는 발행 버튼을 하나로 확인하지 못했습니다. 구조 분석을 실행해 결과를 전달해주세요.");
  const frameId = matching[0].frameId;
  const clicked = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    func: async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const between = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
      const isVisible = (element) => Boolean(element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
      const text = (element) => (element.textContent || "").replace(/\s+/g, " ").trim();
      const buttons = [...document.querySelectorAll("button, [role='button']")]
        .filter((element) => isVisible(element) && text(element) === "발행" && !element.closest("[role='dialog'], [aria-modal='true']"));
      if (buttons.length !== 1) return false;
      const rect = buttons[0].getBoundingClientRect();
      const point = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
      buttons[0].dispatchEvent(new MouseEvent("mouseover", point));
      buttons[0].dispatchEvent(new MouseEvent("mousemove", point));
      await wait(between(180, 420));
      buttons[0].click();
      return true;
    },
  });
  if (!clicked.some((entry) => entry.result === true)) throw new Error("발행 설정 버튼을 누르지 못했습니다.");
  for (let attempt = 0; attempt < 14; attempt += 1) {
    await sleep(300);
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
    await withDebugger(tab.id, async () => {
      for (const tag of tags) {
        const focused = await chrome.scripting.executeScript({
          target,
          func: async () => {
            const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
            const input = document.querySelector("#tag-input");
            if (!input || !input.getClientRects().length) return false;
            if (input.value.trim()) throw new Error("태그 입력란에 미완성 값이 있습니다. 확인 후 다시 실행해주세요.");
            const rect = input.getBoundingClientRect();
            const point = { bubbles: true, cancelable: true, view: window, clientX: rect.left + 12, clientY: rect.top + rect.height / 2 };
            input.dispatchEvent(new MouseEvent("mouseover", point));
            await wait(80 + Math.floor(Math.random() * 160));
            input.dispatchEvent(new MouseEvent("mousedown", point));
            input.dispatchEvent(new MouseEvent("mouseup", point));
            input.focus();
            return document.activeElement === input;
          },
        });
        if (!focused.some((entry) => entry.result === true)) throw new Error("태그 입력란을 선택하지 못했습니다.");
        for (const character of tag) {
          await debuggerCommand(tab.id, "Input.insertText", { text: character });
          await sleep(randomDelay(TYPE_MIN_MS, TYPE_MAX_MS));
        }
        await debuggerCommand(tab.id, "Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
        await debuggerCommand(tab.id, "Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
        await sleep(randomDelay(300, 600));
        const accepted = await chrome.scripting.executeScript({ target, func: () => document.querySelector("#tag-input")?.value === "" });
        if (!accepted.some((entry) => entry.result === true)) throw new Error("태그가 처리되지 않았습니다. 네이버 설정창의 안내를 확인해주세요.");
      }
    });
  }
  if (category) {
    const opened = await chrome.scripting.executeScript({
      target,
      func: async () => {
        const trigger = document.querySelector(".selectbox_button__IxraO");
        if (!trigger || !trigger.getClientRects().length) return false;
        const layer = document.querySelector(".option_list_layer__o54Wx");
        if (!layer?.getClientRects().length) {
          trigger.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
          await new Promise((resolve) => setTimeout(resolve, 120 + Math.floor(Math.random() * 200)));
          trigger.click();
        }
        return true;
      },
    });
    if (!opened.some((entry) => entry.result === true)) throw new Error("발행 카테고리 선택 버튼을 찾지 못했습니다.");
    await sleep(randomDelay(350, 600));
    const selection = await chrome.scripting.executeScript({
      target, args: [category],
      func: async (name) => {
        const items = [...document.querySelectorAll(".option_list_layer__o54Wx .item__dTdzo")].filter((el) => el.getClientRects().length);
        const normalize = (text) => text.trim().replace(/^[●◆★▶\s]+/, "");
        const exact = items.filter((el) => normalize(el.textContent || "") === name);
        const candidates = exact.length ? exact : items.filter((el) => (el.textContent || "").includes(name));
        if (candidates.length !== 1) return { ok: false, count: candidates.length };
        candidates[0].dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 120 + Math.floor(Math.random() * 200)));
        candidates[0].click();
        return { ok: true, text: normalize(candidates[0].textContent || "") };
      },
    });
    const selected = selection[0]?.result;
    if (!selected?.ok) throw new Error(selected?.count > 1 ? "카테고리 이름이 여러 항목과 일치합니다. 전체 이름을 입력해주세요." : "요청한 카테고리를 찾지 못했습니다.");
    await sleep(300);
    const checked = await chrome.scripting.executeScript({ target, args: [selected.text], func: (name) => (document.querySelector(".selectbox_button__IxraO")?.textContent || "").includes(name) });
    if (!checked.some((entry) => entry.result === true)) throw new Error("카테고리 선택 결과를 확인하지 못했습니다.");
  }
}

async function preparePublishSettings(summary) {
  await reportInputResult("completed");
  const category = $("publishCategory").value.trim();
  const tags = $("publishTags").value.trim();
  if (!category && !tags) {
    $("inputStatus").textContent = `${summary} 카테고리·태그가 없어 발행 설정창은 열지 않았습니다. 네이버에서 직접 발행하세요.`;
    return;
  }
  $("inputStatus").textContent = `${summary} 발행 설정을 열고 카테고리·태그를 입력하는 중...`;
  try {
    await fillPublishInfoIntoNaver();
    await chrome.storage.local.set({ [PUBLISH_SETTINGS_KEY]: { category, tags } });
    await reportInputResult("publish_ready");
    $("inputStatus").textContent = "제목·본문·이미지·카테고리·태그 입력 완료. 내용을 확인한 뒤 네이버의 마지막 발행 버튼만 직접 누르세요.";
    $("publishStatus").textContent = "카테고리·태그 입력 완료. 마지막 발행 버튼은 직접 누르세요.";
  } catch (error) {
    $("inputStatus").textContent = `${summary} 카테고리·태그 자동 입력에 실패했습니다. 아래 "카테고리·태그 다시 입력"으로 재시도하세요.`;
    $("publishStatus").textContent = formatBrowserError(error, "카테고리·태그 입력");
  }
}

async function fillPostIntoNaver() {
  if (!active) return ($("inputStatus").textContent = "보낸 글을 먼저 선택해주세요.");
  const tab = await getNaverBlogTab();
  if (!tab?.id || !/^https:\/\/(blog|m\.blog)\.naver\.com/.test(tab.url || "")) return ($("inputStatus").textContent = "네이버 블로그 글쓰기 화면을 먼저 열어주세요.");
  $("fill").disabled = true;
  $("previewFill").disabled = true;
  try {
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id, { active: true });
    await sleep(randomDelay(350, 600));
    const textBlocks = active.blocks.filter((block) => block.type === "text").map((block) => block.text);
    totalToType = active.title.length + textBlocks.reduce((sum, text) => sum + text.length, 0);
    typedSoFar = 0;
    typingStartedAt = Date.now();

    const titleFocus = await focusNaverEditor(tab.id, "title");
    if (!titleFocus.ok) throw new Error("제목 입력 위치를 찾지 못했습니다. 네이버 글쓰기 화면을 새로 연 뒤 다시 시도하세요.");
    await reportInputResult("in_progress");
    await withDebugger(tab.id, () => typeWithDebugger(tab.id, active.title));
    await sleep(randomDelay(400, 800));

    const bodyFocus = await focusNaverEditor(tab.id, "body");
    if (!bodyFocus.ok) throw new Error("본문 입력 위치를 찾지 못했습니다.");
    let imageIndex = 0;
    let linkedCount = 0;
    let previous = null;
    const imageTotal = active.blocks.filter((block) => block.type === "image").length;
    const linkTotal = active.blocks.filter((block) => block.type === "link").length;
    for (const block of active.blocks) {
      if (block.type === "link") {
        // 앞이 글이면 새 문단에서 시작
        if (previous === "text" || previous === "link") await withDebugger(tab.id, () => typeWithDebugger(tab.id, "\n\n"));
        $("inputStatus").textContent = `링크를 실제 링크로 붙여넣는 중... (${block.text})`;
        await sleep(randomDelay(300, 600));
        const pasted = await pasteLinkIntoNaver(tab.id, block.text, block.url);
        if (pasted.linked) linkedCount += 1;
        else if (!pasted.inserted) await withDebugger(tab.id, () => typeWithDebugger(tab.id, `${block.text}: ${block.url} `)); // 붙여넣기가 무시되면 예전처럼 글자로
        previous = "link";
        await sleep(randomDelay(300, 600));
        continue;
      }
      if (block.type === "image") {
        imageIndex += 1;
        $("inputStatus").textContent = `이미지 ${imageIndex}/${imageTotal}장을 네이버에 올리는 중...`;
        await insertImageIntoNaverEditor(tab.id, block.dataUrl);
        await sleep(randomDelay(500, 900));
        const focus = await focusNaverEditor(tab.id, "body");
        if (!focus.ok) throw new Error("이미지 다음 본문 입력 위치를 찾지 못했습니다.");
        previous = "image";
        continue;
      }
      const prefix = previous === "link" ? "\n\n" : "";
      await withDebugger(tab.id, () => typeWithDebugger(tab.id, prefix + block.text));
      previous = "text";
      await sleep(randomDelay(300, 700));
    }

    const verification = await verifyNaverEditorContent(tab.id, active.title, textBlocks);
    if (!verification.ok) {
      const details = verification.titleMatched === false ? "제목 확인 실패" : `본문 확인 실패 (빠진 문단 ${verification.missingCount ?? "?"}/${verification.expectedCount ?? "?"})`;
      await reportInputResult("failed", details);
      throw new Error(`${details}. 네이버 화면을 확인하고, 문제가 계속되면 구조 분석 결과를 전달해주세요.`);
    }
    const minutes = Math.max(1, Math.round((Date.now() - typingStartedAt) / 60000));
    const linkSummary = linkTotal ? ` 링크 ${linkedCount}/${linkTotal}개 실제 링크로 입력${linkedCount < linkTotal ? '(나머지는 주소 글자로 입력)' : ''}.` : '';
    await preparePublishSettings(`제목·본문·이미지 ${imageTotal}장 입력 완료(약 ${minutes}분).${linkSummary}`);
  } catch (error) {
    $("inputStatus").textContent = formatBrowserError(error, "네이버 편집기 입력");
    await reportInputResult("failed", error instanceof Error ? error.message : String(error));
  } finally {
    $("fill").disabled = false;
    $("previewFill").disabled = false;
  }
}

$("link").addEventListener("click", async () => {
  const token = $("token").value.trim();
  $("link").disabled = true;
  const result = await verify(token);
  if (result.ok) { await chrome.storage.local.set({ [KEY]: token }); $("token").value = ""; }
  $("link").disabled = false;
  $("status").textContent = result.ok ? `연결됨: ${result.email}` : `오류: ${result.error}`;
  if (result.ok) renderUpdateBanner(result.latestVersion, result.downloadUrl);
  if (result.ok) refreshPosts().catch((error) => ($("postStatus").textContent = `보낸 글 조회 실패: ${error.message}`));
});

$("refreshPosts").addEventListener("click", () => {
  refreshPosts().catch((error) => ($("postStatus").textContent = `보낸 글 조회 실패: ${error instanceof Error ? error.message : String(error)}`));
});

$("postList").addEventListener("change", () => {
  if (!$("postList").value) { resetActive(); return; }
  $("postStatus").textContent = "선택한 글과 이미지를 불러오는 중...";
  loadSelectedPost().catch((error) => {
    resetActive();
    $("postStatus").textContent = `글 불러오기 실패: ${error instanceof Error ? error.message : String(error)}`;
  });
});

$("openPreview").addEventListener("click", openPreview);
$("closePreview").addEventListener("click", () => $("postPreview").close());
$("closePreviewFooter").addEventListener("click", () => $("postPreview").close());
$("previewFill").addEventListener("click", () => { $("postPreview").close(); fillPostIntoNaver(); });
$("fill").addEventListener("click", fillPostIntoNaver);

$("applyTags").addEventListener("click", () => {
  if (!active?.tags.length) return;
  $("publishTags").value = active.tags.join(", ");
  $("postStatus").textContent = "글의 해시태그를 태그 칸에 넣었습니다. 필요하면 고친 뒤 저장하세요.";
});

$("savePublishSettings").addEventListener("click", async () => {
  await chrome.storage.local.set({ [PUBLISH_SETTINGS_KEY]: { category: $("publishCategory").value.trim(), tags: $("publishTags").value.trim() } });
  $("publishStatus").textContent = "카테고리·태그를 저장했습니다.";
});

$("fillPublishInfo").addEventListener("click", async () => {
  $("fillPublishInfo").disabled = true;
  $("publishStatus").textContent = "네이버 설정창에 카테고리·태그를 입력하는 중...";
  try {
    await fillPublishInfoIntoNaver();
    await chrome.storage.local.set({ [PUBLISH_SETTINGS_KEY]: { category: $("publishCategory").value.trim(), tags: $("publishTags").value.trim() } });
    await reportInputResult("publish_ready");
    $("publishStatus").textContent = "카테고리·태그 입력 완료. 내용을 확인한 뒤 네이버의 마지막 발행 버튼을 직접 누르세요.";
  } catch (error) {
    $("publishStatus").textContent = formatBrowserError(error, "카테고리·태그 입력");
  } finally {
    $("fillPublishInfo").disabled = false;
  }
});

$("inspect").addEventListener("click", async () => {
  $("inspect").disabled = true;
  $("inspectStatus").textContent = "분석 중...";
  try {
    const tab = await getNaverBlogTab();
    if (!tab?.id) throw new Error("네이버 블로그 탭을 찾지 못했습니다.");
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id, { active: true });
    await sleep(250);
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
          paragraphCandidates: [...document.querySelectorAll('.se-text-paragraph, .se-component-content')].slice(0, 30).map(describe),
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
    $("inspectStatus").textContent = formatBrowserError(error, "구조 분석");
  } finally {
    $("inspect").disabled = false;
  }
});

chrome.storage.local.get(PUBLISH_SETTINGS_KEY).then((stored) => {
  const settings = stored[PUBLISH_SETTINGS_KEY] || {};
  $("publishCategory").value = settings.category || "";
  $("publishTags").value = settings.tags || "";
}).catch(() => {});

renderExtensionVersion();
renderStatus().then(async () => {
  if (await getToken()) refreshPosts().catch(() => {});
});
