"use strict";

// 실제 티스토리 DOM을 조사하기 전 자동 입력을 금지한다. 이 코드는 읽기 전용이다.
const STORAGE_KEY = "tistoryEditorInspectionSnapshots";
const TOKEN_KEY = "tistoryAutoBlogToken";
const PUBLISH_SETTINGS_KEY = "tistoryPublishSettings";
const TOPIC_OPTIONS_KEY = "tistoryHomeTopicOptions";
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
restorePublishSettings();

// Confirmed Tistory editor implementation. All state-changing calls target one
// verified frame; allFrames is only used to discover the TinyMCE frame.
const TYPE_MIN_MS = 70;
const TYPE_MAX_MS = 170;
const THINK_CHANCE = 0.04;
let posts = [];
let activePost = null;
const inputSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const inputDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function extensionApi(path, options = {}) {
  const token = await getToken();
  if (!token) throw new Error("먼저 계정 연결 토큰을 입력해 주세요.");
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `요청 실패 (${response.status})`);
  return body;
}

function postLabel(post) {
  return `${post.title || "제목 없는 글"} · 이미지 ${post.image_count || 0}장`;
}

async function refreshPosts() {
  $("refreshPosts").disabled = true;
  $("postStatus").textContent = "보낸 글을 불러오는 중입니다…";
  try {
    const response = await extensionApi("/api/extension/posts");
    posts = Array.isArray(response.posts) ? response.posts : [];
    const select = $("postList");
    select.textContent = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = posts.length ? "입력할 글을 선택하세요." : "보낸 글이 없습니다.";
    select.append(placeholder);
    for (const post of posts) {
      const option = document.createElement("option");
      option.value = String(post.id);
      option.textContent = postLabel(post);
      select.append(option);
    }
    select.disabled = !posts.length;
    $("postStatus").textContent = posts.length ? `${posts.length}개의 보낸 글을 찾았습니다.` : "글 보기에서 ‘확장 입력기로 보내기’를 먼저 눌러 주세요.";
  } catch (error) {
    $("postStatus").textContent = error instanceof Error ? error.message : String(error);
  } finally { $("refreshPosts").disabled = false; }
}

function selectPost() {
  activePost = posts.find((post) => String(post.id) === $("postList").value) || null;
  $("previewPost").disabled = !activePost;
  $("fillPost").disabled = !activePost;
  $("resumePostSettings").disabled = !activePost;
  $("inputStatus").textContent = activePost ? `${postLabel(activePost)} 선택됨` : "";
}

function syncPublishSettingsFields() {
  $("postPasswordField").hidden = $("postVisibility").value !== "protected";
  $("reserveFields").hidden = $("publishTiming").value !== "reserve";
}

function savedPublishSettings() {
  return {
    categoryName: $("categoryName").value.trim(), tagNames: $("tagNames").value.trim(), visibility: $("postVisibility").value,
    comment: $("commentPolicy").value, topic: $("topicName").value.trim(), timing: $("publishTiming").value,
    reserveDate: $("reserveDate").value, reserveTime: $("reserveTime").value,
  };
}

function renderTopicOptions(values, selected = $("topicName").value) {
  const select = $("topicName");
  const names = [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];
  select.textContent = "";
  const none = document.createElement("option"); none.value = ""; none.textContent = "선택 안 함"; select.append(none);
  for (const name of names) {
    const option = document.createElement("option"); option.value = name; option.textContent = name; select.append(option);
  }
  // 이전에 저장한 선택지가 티스토리 목록에서 사라진 경우도, 사용자 선택을 조용히 잃지 않게 표시한다.
  if (selected && !names.includes(selected)) {
    const saved = document.createElement("option"); saved.value = selected; saved.textContent = `${selected} (저장됨)`; select.append(saved);
  }
  select.disabled = names.length === 0;
  select.value = selected || "";
}

async function savePublishSettings() {
  await chrome.storage.local.set({ [PUBLISH_SETTINGS_KEY]: savedPublishSettings() });
  $("publishSettingsStatus").textContent = "저장했습니다. 보호 비밀번호는 저장하지 않습니다.";
}

async function saveCategoryTags() {
  const stored = await chrome.storage.local.get(PUBLISH_SETTINGS_KEY);
  const existing = stored[PUBLISH_SETTINGS_KEY] && typeof stored[PUBLISH_SETTINGS_KEY] === "object" ? stored[PUBLISH_SETTINGS_KEY] : {};
  await chrome.storage.local.set({ [PUBLISH_SETTINGS_KEY]: {
    ...existing,
    categoryName: $("categoryName").value.trim(),
    tagNames: $("tagNames").value.trim(),
  } });
  $("categorySettingsStatus").textContent = "카테고리와 태그를 저장했습니다.";
}

async function restorePublishSettings() {
  const stored = await chrome.storage.local.get([PUBLISH_SETTINGS_KEY, TOPIC_OPTIONS_KEY]);
  const settings = stored[PUBLISH_SETTINGS_KEY];
  const cachedTopics = stored[TOPIC_OPTIONS_KEY];
  if (Array.isArray(cachedTopics)) renderTopicOptions(cachedTopics, settings?.topic || "");
  else if (settings?.topic) renderTopicOptions([], settings.topic);
  if (!settings || typeof settings !== "object") return;
  for (const id of ["categoryName", "tagNames", "postVisibility", "commentPolicy", "topicName", "publishTiming", "reserveDate", "reserveTime"]) {
    if (typeof settings[id] === "string" && $(id)) $(id).value = settings[id];
  }
  syncPublishSettingsFields();
  $("publishSettingsStatus").textContent = "저장한 설정을 불러왔습니다. 보호 비밀번호는 다시 입력해 주세요.";
}

async function loadTistoryTopics() {
  const tab = await getTistoryEditorTab();
  const button = $("loadTopics");
  button.disabled = true;
  $("publishSettingsStatus").textContent = "티스토리 발행 창에서 홈주제를 읽는 중…";
  try {
    await chrome.windows.update(tab.windowId, { focused: true }); await chrome.tabs.update(tab.id, { active: true });
    await openPublishSettings(tab.id);
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      func: async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const visible = (node) => Boolean(node?.getClientRects().length) && getComputedStyle(node).visibility !== "hidden";
        const text = (node) => String(node?.textContent || "").replace(/\s+/g, " ").trim();
        const root = [...document.querySelectorAll(".editor_layer[role='dialog'], .editor_layer.ReactModal__Content--after-open")]
          .find(visible);
        const buttons = [...(root?.querySelectorAll("button.mce-btn-type1.select_btn") || [])].filter(visible);
        const topicButton = buttons[1];
        if (!topicButton) throw new Error("홈주제 선택 메뉴를 찾지 못했습니다.");
        const before = new Set([...document.querySelectorAll("[role='listbox']")].filter(visible));
        topicButton.click();
        for (let attempt = 0; attempt < 15; attempt += 1) {
          await wait(100);
          const lists = [...document.querySelectorAll("[role='listbox']")].filter(visible);
          const list = lists.find((candidate) => !before.has(candidate)) || lists.find((candidate) => candidate.contains(topicButton) === false);
          if (!list) continue;
          const names = [...list.querySelectorAll("[role='option'], button, a, li, div")]
            .filter((node) => visible(node) && node.children.length === 0)
            .map(text)
            .filter((value) => value && value !== "선택 안 함" && value !== "더보기");
          const unique = [...new Set(names)];
          if (unique.length) return unique;
        }
        throw new Error("홈주제 선택지를 읽지 못했습니다.");
      },
    });
    const topics = result[0]?.result;
    if (!Array.isArray(topics) || !topics.length) throw new Error("홈주제 선택지를 읽지 못했습니다.");
    renderTopicOptions(topics);
    await chrome.storage.local.set({ [TOPIC_OPTIONS_KEY]: topics });
    $("publishSettingsStatus").textContent = `${topics.length}개 홈주제를 불러왔습니다. 목록에서 바로 선택하세요.`;
  } catch (error) {
    $("publishSettingsStatus").textContent = error instanceof Error ? error.message : String(error);
  } finally { button.disabled = false; }
}

function extractTagsFromSelectedPost() {
  if (!activePost) throw new Error("먼저 보낸 글을 선택해 주세요.");
  const tags = normalizeTistoryTags(activePost.tags || []);
  if (!tags.length) throw new Error("선택한 글에서 추출할 태그가 없습니다.");
  $("tagNames").value = tags.join(", ");
  $("categorySettingsStatus").textContent = `${tags.length}개 태그를 가져왔습니다. 필요하면 수정 후 카테고리·태그 저장을 누르세요.`;
}

function previewPost() {
  if (!activePost) return;
  const container = $("postPreviewContent");
  container.textContent = "";
  const title = document.createElement("h3");
  title.textContent = activePost.title || "제목 없는 글";
  container.append(title);
  for (const block of activePost.blocks || []) {
    if (block.type === "image") {
      const image = document.createElement("img"); image.src = block.url; image.alt = block.alt || "본문 이미지"; container.append(image);
    } else if (block.type === "html") {
      const wrapper = document.createElement("div"); wrapper.innerHTML = block.html; container.append(wrapper);
    } else {
      const paragraph = document.createElement("p"); paragraph.textContent = block.type === "link" ? `${block.text} ${block.url}` : block.text; paragraph.style.whiteSpace = "pre-line"; container.append(paragraph);
    }
  }
  $("postPreview").showModal();
}

async function getTistoryEditorTab() {
  const tab = await findTistoryTab();
  if (!tab?.id || !/\/manage\/(newpost|post)/.test(tab.url || "")) throw new Error("티스토리 글쓰기 화면을 먼저 열어 주세요.");
  return tab;
}

async function editorFrameId(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => Boolean(document.querySelector("body#tinymce[contenteditable='true']")),
  });
  const matches = results.filter((entry) => entry.result === true);
  if (matches.length !== 1) throw new Error("본문 TinyMCE 프레임을 하나로 확인하지 못했습니다. 구조 분석을 다시 실행해 주세요.");
  return matches[0].frameId;
}

async function focusKnownTarget(tabId, frameId, selector) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] }, args: [selector],
    func: async (targetSelector) => {
      const target = document.querySelector(targetSelector);
      if (!target || !target.getClientRects().length) return false;
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const delay = 80 + Math.floor(Math.random() * 341);
      target.scrollIntoView({ block: "center", inline: "nearest" });
      const rect = target.getBoundingClientRect();
      const event = { bubbles: true, cancelable: true, view: window, clientX: rect.left + Math.min(18, Math.max(4, rect.width / 2)), clientY: rect.top + Math.max(4, rect.height / 2) };
      target.dispatchEvent(new MouseEvent("mouseover", event));
      target.dispatchEvent(new MouseEvent("mousemove", event));
      await wait(delay);
      target.dispatchEvent(new MouseEvent("mousedown", event));
      target.dispatchEvent(new MouseEvent("mouseup", event));
      target.dispatchEvent(new MouseEvent("click", event));
      target.focus();
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.setSelectionRange(target.value.length, target.value.length);
      } else {
        const range = document.createRange(); range.selectNodeContents(target); range.collapse(false);
        const selection = document.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      }
      return document.activeElement === target || target.isContentEditable;
    },
  });
  if (results[0]?.result !== true) throw new Error(`입력 위치(${selector})를 찾지 못했습니다.`);
}

async function withDebugger(tabId, task) {
  await chrome.debugger.attach({ tabId }, "1.3");
  try { return await task(); }
  finally { try { await chrome.debugger.detach({ tabId }); } catch { /* page may navigate */ } }
}

async function humanType(tabId, text, statusPrefix) {
  const value = String(text || "").replace(/\r\n/g, "\n");
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "\n") {
      await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    } else await chrome.debugger.sendCommand({ tabId }, "Input.insertText", { text: character });
    if (index === 0 || index % 25 === 0) $("inputStatus").textContent = `${statusPrefix} ${index + 1}/${value.length}`;
    await inputSleep(inputDelay(TYPE_MIN_MS, TYPE_MAX_MS));
    if (Math.random() < THINK_CHANCE) await inputSleep(inputDelay(250, 700));
  }
}

async function insertTistoryHtml(tabId, bodyFrame, html, statusPrefix) {
  $("inputStatus").textContent = statusPrefix;
  const inserted = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [bodyFrame] },
    args: [html],
    func: (safeHtml) => {
      const editor = document.querySelector("body#tinymce[contenteditable='true']");
      if (!editor) return false;
      editor.focus();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !editor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
        const range = document.createRange(); range.selectNodeContents(editor); range.collapse(false);
        selection?.removeAllRanges(); selection?.addRange(range);
      }
      // TinyMCE가 감지하는 native editing 경로로 넣어 제목·목록·인용·표·링크의 의미 HTML을 보존한다.
      return document.execCommand("insertHTML", false, safeHtml);
    },
  });
  if (inserted[0]?.result !== true) throw new Error("본문 서식을 티스토리 편집기에 넣지 못했습니다.");
  await inputSleep(inputDelay(180, 420));
}

function normalizeTistoryTags(values) {
  const source = Array.isArray(values) ? values : String(values || "").split(/[\n,]/);
  return [...new Set(source.map((value) => String(value).replace(/^#+/, "").trim()).filter(Boolean))].slice(0, 30);
}

async function addTistoryTags(tabId, tags) {
  const existing = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [0] },
    func: () => [...document.querySelectorAll(".editor_tag > .txt_tag")].map((node) => (node.textContent || "").replace(/^#+/, "").trim()).filter(Boolean),
  });
  const existingTags = new Set((existing[0]?.result || []).map((tag) => tag.toLocaleLowerCase()));
  for (const tag of normalizeTistoryTags(tags).filter((tag) => !existingTags.has(tag.toLocaleLowerCase()))) {
    const before = await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, func: () => document.querySelectorAll(".editor_tag > .txt_tag").length });
    await focusKnownTarget(tabId, 0, "#tagText");
    await withDebugger(tabId, () => humanType(tabId, tag, `태그 입력 중…`));
    await withDebugger(tabId, async () => {
      await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    });
    await inputSleep(inputDelay(300, 600));
    const after = await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, func: () => document.querySelectorAll(".editor_tag > .txt_tag").length });
    if ((after[0]?.result || 0) <= (before[0]?.result || 0)) throw new Error("태그 확정 결과를 확인하지 못했습니다.");
  }
}

async function openTistoryCategory(tabId) {
  const opened = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [0] },
    func: async () => {
      const button = document.querySelector("#category-btn");
      // 티스토리는 목록을 버튼 클릭 뒤에 React로 생성할 수 있습니다.
      // 클릭 전 #category-list가 없다는 이유로 중단하면 버튼을 한 번도 누르지 못합니다.
      if (!button || !button.getClientRects().length) return false;
      const visible = (node) => Boolean(node?.getClientRects().length) && getComputedStyle(node).visibility !== "hidden";
      const isOpen = () => {
        const list = document.querySelector("#category-list");
        return button.getAttribute("aria-expanded") === "true" || visible(list);
      };
      if (isOpen()) return true;
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      button.scrollIntoView({ block: "center", inline: "nearest" });
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const rect = button.getBoundingClientRect();
        const event = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
        button.focus();
        button.dispatchEvent(new MouseEvent("mouseover", event)); button.dispatchEvent(new MouseEvent("mousemove", event));
        await wait(100 + Math.floor(Math.random() * 321));
        // click()은 React의 일반 클릭 처리 경로를 타고, 합성 포인터 이벤트는 기존 티스토리 동작도 지원합니다.
        button.click();
        for (let waitAttempt = 0; waitAttempt < 10; waitAttempt += 1) {
          await wait(100);
          if (isOpen()) return true;
        }
      }
      return false;
    },
  });
  if (opened[0]?.result !== true) throw new Error("카테고리 목록을 열지 못했습니다.");
}

async function chooseTistoryCategory(tabId, category) {
  if (!category) return;
  await openTistoryCategory(tabId);
  const picked = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [0] }, args: [category],
    func: async (name) => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const option = [...document.querySelectorAll("#category-list [role='option']")].filter((item) => item.getAttribute("aria-label") === name);
      if (option.length !== 1) return false;
      const node = option[0]; const rect = node.getBoundingClientRect();
      const event = { bubbles: true, cancelable: true, view: window, clientX: rect.left + 12, clientY: rect.top + Math.max(4, rect.height / 2) };
      node.dispatchEvent(new MouseEvent("mouseover", event)); node.dispatchEvent(new MouseEvent("mousemove", event)); await wait(100 + Math.floor(Math.random() * 321));
      node.dispatchEvent(new MouseEvent("mousedown", event)); node.dispatchEvent(new MouseEvent("mouseup", event)); node.dispatchEvent(new MouseEvent("click", event));
      await wait(250);
      return node.getAttribute("aria-selected") === "true";
    },
  });
  if (picked[0]?.result !== true) throw new Error(`카테고리 ‘${category}’를 선택하지 못했습니다.`);
}

async function isPublishSettingsOpen(tabId) {
  const state = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [0] },
    func: () => [...document.querySelectorAll(".editor_layer[role='dialog'], .editor_layer.ReactModal__Content--after-open")]
      .some((node) => Boolean(node.getClientRects().length) && getComputedStyle(node).visibility !== "hidden"),
  });
  return state[0]?.result === true;
}

async function openPublishSettings(tabId) {
  if (await isPublishSettingsOpen(tabId)) return;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const target = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      func: () => {
        const button = document.querySelector("#publish-layer-btn");
        if (!button || !button.getClientRects().length) return null;
        button.scrollIntoView({ block: "center", inline: "nearest" }); button.focus();
        const rect = button.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      },
    });
    const point = target[0]?.result;
    if (!point) throw new Error("발행 설정 버튼을 찾지 못했습니다.");
    // DOM click은 isTrusted=false라 티스토리 React가 무시할 수 있다. CDP 포인터 입력으로 실제 클릭 경로를 사용한다.
    await withDebugger(tabId, async () => {
      await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
      await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
      await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
    });
    for (let waitAttempt = 0; waitAttempt < 20; waitAttempt += 1) {
      await inputSleep(100);
      if (await isPublishSettingsOpen(tabId)) return;
    }
  }
  throw new Error("발행 설정창을 열지 못했습니다.");
}

function publishSettingsFromPanel() {
  const settings = {
    visibility: $("postVisibility").value,
    password: $("postPassword").value,
    comment: $("commentPolicy").value,
    topic: $("topicName").value.trim(),
    timing: $("publishTiming").value,
    reserveDate: $("reserveDate").value,
    reserveTime: $("reserveTime").value,
  };
  if (settings.visibility === "protected" && !settings.password) throw new Error("보호글에는 비밀번호를 입력해 주세요.");
  if (settings.timing === "reserve" && (!settings.reserveDate || !settings.reserveTime)) throw new Error("예약 발행에는 날짜와 시간을 모두 입력해 주세요.");
  return settings;
}

async function applyTistoryPublishSettings(tabId, settings) {
  const applied = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [0] }, args: [settings],
    func: async (requested) => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const dialog = () => [...document.querySelectorAll(".editor_layer[role='dialog'], .editor_layer.ReactModal__Content--after-open")].find((node) => Boolean(node.getClientRects().length));
      const visible = (node) => Boolean(node?.getClientRects().length);
      const nodeText = (node) => String(node?.textContent || "").replace(/\s+/g, " ").trim();
      const click = async (node) => {
        if (!node || !visible(node)) return false;
        const rect = node.getBoundingClientRect();
        const event = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
        node.dispatchEvent(new MouseEvent("mouseover", event)); node.dispatchEvent(new MouseEvent("mousemove", event));
        await wait(90 + Math.floor(Math.random() * 160));
        node.dispatchEvent(new MouseEvent("mousedown", event)); node.dispatchEvent(new MouseEvent("mouseup", event)); node.dispatchEvent(new MouseEvent("click", event));
        await wait(180);
        return true;
      };
      const setValue = (input, value) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true })); input.dispatchEvent(new Event("change", { bubbles: true }));
      };
      const root = dialog();
      if (!root) throw new Error("발행 설정창을 확인하지 못했습니다.");
      const visibilityLabel = { public: "공개", protected: "보호", private: "비공개" }[requested.visibility];
      const radio = [...root.querySelectorAll("input[name='basicSet'][type='radio']")].find((input) => {
        const label = root.querySelector(`label[for='${input.id}']`);
        return nodeText(label || input.parentElement).includes(visibilityLabel);
      });
      if (!radio) throw new Error(`${visibilityLabel} 공개 범위 선택 항목을 찾지 못했습니다.`);
      await click(radio);
      if (!radio.checked) throw new Error(`${visibilityLabel} 공개 범위 적용을 확인하지 못했습니다.`);
      if (requested.visibility === "protected") {
        const password = root.querySelector("#postPassword");
        if (!password) throw new Error("보호글 비밀번호 입력칸을 찾지 못했습니다.");
        setValue(password, requested.password);
        if (password.value !== requested.password) throw new Error("보호글 비밀번호 입력을 확인하지 못했습니다.");
      }

      const selectButtons = [...root.querySelectorAll("button.mce-btn-type1.select_btn")].filter(visible);
      const chooseListOption = async (button, label, required = true) => {
        if (!button) { if (!required) return; throw new Error("발행 설정 선택 메뉴를 찾지 못했습니다."); }
        await click(button);
        const list = [...document.querySelectorAll("[role='listbox']")].find(visible);
        const matches = [...(list?.querySelectorAll("button, [role='option'], a, li, div") || [])]
          .filter((node) => visible(node) && nodeText(node) === label);
        if (matches.length !== 1) throw new Error(`‘${label}’ 선택 항목을 정확히 찾지 못했습니다.`);
        await click(matches[0]);
        if (!nodeText(button).includes(label)) throw new Error(`‘${label}’ 선택 적용을 확인하지 못했습니다.`);
      };
      await chooseListOption(selectButtons[0], requested.comment === "allow" ? "댓글 허용" : "댓글 비허용");
      if (requested.topic) await chooseListOption(selectButtons[1], requested.topic);

      const timingLabel = requested.timing === "now" ? "현재" : "예약";
      const timingButton = [...root.querySelectorAll("button.btn_date")].find((button) => nodeText(button) === timingLabel);
      if (!timingButton) throw new Error(`${timingLabel} 발행 선택 항목을 찾지 못했습니다.`);
      await click(timingButton);
      if (!timingButton.classList.contains("on")) throw new Error(`${timingLabel} 발행 적용을 확인하지 못했습니다.`);

      if (requested.timing === "reserve") {
        const targetDate = new Date(`${requested.reserveDate}T00:00:00`);
        if (Number.isNaN(targetDate.getTime())) throw new Error("예약 날짜 형식이 올바르지 않습니다.");
        const dateButton = root.querySelector("button.btn_reserve");
        if (!dateButton) throw new Error("예약 날짜 선택 버튼을 찾지 못했습니다.");
        await click(dateButton);
        for (let step = 0; step < 37; step += 1) {
          const calendar = [...document.querySelectorAll(".layer_info, .inner_layer")].find(visible);
          const matched = nodeText(calendar).match(/(\d{4})년\s*(\d{1,2})월/);
          if (!matched) throw new Error("예약 달력의 연월 정보를 읽지 못했습니다.");
          const year = Number(matched[1]); const month = Number(matched[2]);
          if (year === targetDate.getFullYear() && month === targetDate.getMonth() + 1) break;
          const direction = year > targetDate.getFullYear() || (year === targetDate.getFullYear() && month > targetDate.getMonth() + 1) ? ".btn_prev" : ".btn_next";
          const navigation = calendar.querySelector(direction);
          if (!navigation) throw new Error("예약 달력 이동 버튼을 찾지 못했습니다.");
          await click(navigation);
          if (step === 36) throw new Error("예약 날짜가 달력 탐색 범위를 벗어났습니다.");
        }
        const calendar = [...document.querySelectorAll(".layer_info, .inner_layer")].find(visible);
        const days = [...(calendar?.querySelectorAll("button.btn_day") || [])].filter((button) => nodeText(button) === String(targetDate.getDate()));
        if (days.length !== 1) throw new Error("예약 날짜를 안전하게 하나로 식별하지 못했습니다.");
        await click(days[0]);
        if (!nodeText(dateButton).includes(requested.reserveDate)) throw new Error("예약 날짜 적용을 확인하지 못했습니다.");
        const [hour, minute] = requested.reserveTime.split(":");
        const hourInput = root.querySelector("#dateHour"); const minuteInput = root.querySelector("#dateMinute");
        if (!hourInput || !minuteInput) throw new Error("예약 시간 입력칸을 찾지 못했습니다.");
        setValue(hourInput, String(Number(hour))); setValue(minuteInput, String(Number(minute)));
        if (Number(hourInput.value) !== Number(hour) || Number(minuteInput.value) !== Number(minute)) throw new Error("예약 시간 적용을 확인하지 못했습니다.");
      }
      return { visibility: visibilityLabel, timing: timingLabel };
    },
  });
  if (!applied[0]?.result) throw new Error("발행 설정 적용 결과를 확인하지 못했습니다.");
  return applied[0].result;
}

async function readTistoryDraftState(tabId, bodyFrame) {
  const [top, body] = await Promise.all([
    chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      func: () => ({
        title: document.querySelector("#post-title-inp")?.value || "",
        tagCount: document.querySelectorAll(".editor_tag > .txt_tag").length,
      }),
    }),
    chrome.scripting.executeScript({
      target: { tabId, frameIds: [bodyFrame] },
      func: () => {
        const editor = document.querySelector("body#tinymce[contenteditable='true']");
        return { body: editor?.innerText || "", imageCount: editor?.querySelectorAll(":scope > figure > img").length || 0 };
      },
    }),
  ]);
  return { title: top[0]?.result?.title || "", tagCount: top[0]?.result?.tagCount || 0, body: body[0]?.result?.body || "", imageCount: body[0]?.result?.imageCount || 0 };
}

function normalized(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

// 티스토리는 URL을 자동 링크로 바꾸고, 줄바꿈을 p/figure로 다시 구성합니다.
// 그래서 추출 단계의 원문 전체를 innerText와 그대로 비교하면 정상 입력도 실패로 판단할 수 있습니다.
// 공백·문장부호 차이를 제외한 앞/뒤 문맥 조각으로 확인하되, 본문 원문 자체는 오류나 로그에 남기지 않습니다.
function compactVerificationText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function verificationSamples(value) {
  const compact = compactVerificationText(value);
  if (!compact) return [];
  if (compact.length <= 72) return [compact];
  return [...new Set([compact.slice(0, 48), compact.slice(-48)])];
}

function expectedBlockText(block) {
  return block.type === "link" ? `${block.text} ${block.url}` : block.text;
}

async function verifyTistoryInput(tabId, bodyFrame, { allowPartialText = false } = {}) {
  const state = await readTistoryDraftState(tabId, bodyFrame);
  if (normalized(state.title) !== normalized(activePost?.title)) throw new Error("입력된 제목을 다시 확인하지 못했습니다.");

  const textBlocks = (activePost?.blocks || []).filter((block) => block.type === "text" || block.type === "html" || block.type === "link");
  const actualBody = compactVerificationText(state.body);
  const matchedTextBlocks = textBlocks.filter((block) => {
    const samples = verificationSamples(expectedBlockText(block));
    return samples.length === 0 || samples.some((sample) => actualBody.includes(sample));
  }).length;
  const requiredTextBlocks = allowPartialText && textBlocks.length > 0
    ? Math.max(1, Math.ceil(textBlocks.length * 0.6))
    : textBlocks.length;

  if (textBlocks.length > 0 && (!actualBody || matchedTextBlocks < requiredTextBlocks)) {
    throw new Error(`입력된 본문을 다시 확인하지 못했습니다. (확인 ${matchedTextBlocks}/${textBlocks.length}개 문단)`);
  }
  const imageCount = (activePost?.blocks || []).filter((block) => block.type === "image").length;
  if (state.imageCount !== imageCount) throw new Error("입력된 이미지 수를 다시 확인하지 못했습니다.");
  return { matchedTextBlocks, totalTextBlocks: textBlocks.length };
}

async function pasteTistoryImage(tabId, bodyFrame, url, order, total) {
  const before = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [bodyFrame] },
    func: () => document.querySelectorAll("body#tinymce[contenteditable='true'] > figure > img").length,
  });
  $("inputStatus").textContent = `이미지 ${order}/${total} 티스토리에 전달 중…`;
  const dispatched = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [bodyFrame] },
    args: [url, `tistory-image-${order}.png`],
    func: async (imageUrl, fileName) => {
      const editor = document.querySelector("body#tinymce[contenteditable='true']");
      if (!editor) throw new Error("티스토리 본문 입력 영역을 찾지 못했습니다.");
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`이미지를 가져오지 못했습니다. (${response.status})`);
      const source = await response.blob();
      if (!source.type.startsWith("image/")) throw new Error("전달할 파일이 이미지 형식이 아닙니다.");
      const sourceUrl = URL.createObjectURL(source);
      try {
        const image = await new Promise((resolve, reject) => {
          const element = new Image();
          element.onload = () => resolve(element);
          element.onerror = () => reject(new Error("이미지를 PNG로 변환하지 못했습니다."));
          element.src = sourceUrl;
        });
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext("2d")?.drawImage(image, 0, 0);
        const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!png) throw new Error("이미지를 PNG로 변환하지 못했습니다.");
        const transfer = new DataTransfer();
        transfer.items.add(new File([png], fileName, { type: "image/png" }));
        editor.focus();
        const event = new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer });
        return { dispatched: editor.dispatchEvent(event), defaultPrevented: event.defaultPrevented };
      } finally {
        URL.revokeObjectURL(sourceUrl);
      }
    },
  });
  // cancelable 이벤트는 편집기가 정상 처리하면서 preventDefault()를 호출하면
  // dispatchEvent()가 false를 반환합니다. 이는 전달 실패가 아니라 티스토리가
  // 붙여넣기를 인계받았다는 뜻이므로, 실제 figure > img 생성 여부로 판정합니다.
  if (!dispatched[0]?.result) throw new Error(`이미지 ${order}의 티스토리 전달 결과를 확인하지 못했습니다.`);
  const expected = (before[0]?.result || 0) + 1;
  // 티스토리는 붙여넣은 이미지를 서버로 올린 뒤 figure > img를 추가합니다.
  // 고해상도 PNG나 응답이 느린 경우 20초 안에 완료되지 않아 실제 업로드 중에도
  // 실패로 처리됐으므로, 최대 90초 동안 DOM 완료 상태를 확인합니다.
  for (let attempt = 0; attempt < 180; attempt += 1) {
    await inputSleep(500);
    if (attempt > 0 && attempt % 10 === 0) {
      $("inputStatus").textContent = `이미지 ${order}/${total} 업로드 확인 중… ${Math.floor(attempt / 2)}초`;
    }
    const after = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [bodyFrame] },
      func: () => document.querySelectorAll("body#tinymce[contenteditable='true'] > figure > img").length,
    });
    if ((after[0]?.result || 0) >= expected) return;
  }
  throw new Error(`이미지 ${order}의 티스토리 업로드 완료를 90초 동안 확인하지 못했습니다.`);
}

async function reportInput(status, error = "") {
  if (!activePost) return;
  await extensionApi(`/api/extension/posts/${encodeURIComponent(activePost.id)}/input-result`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, error }) }).catch(() => {});
}

async function applyRemainingTistorySettings(tabId, bodyFrame, verificationOptions) {
  const verification = await verifyTistoryInput(tabId, bodyFrame, verificationOptions);
  const category = $("categoryName").value.trim();
  if (category) await chooseTistoryCategory(tabId, category);
  await addTistoryTags(tabId, $("tagNames").value);
  await openPublishSettings(tabId);
  return { ...await applyTistoryPublishSettings(tabId, publishSettingsFromPanel()), verification };
}

async function fillTistoryPost() {
  if (!activePost) return;
  const tab = await getTistoryEditorTab();
  $("fillPost").disabled = true;
  try {
    await chrome.windows.update(tab.windowId, { focused: true }); await chrome.tabs.update(tab.id, { active: true });
    const bodyFrame = await editorFrameId(tab.id);
    const before = await readTistoryDraftState(tab.id, bodyFrame);
    if (normalized(before.title) || normalized(before.body) || before.tagCount || before.imageCount) {
      throw new Error("기존 제목·본문·태그가 있는 글에는 덧쓰기하지 않습니다. 비어 있는 새 글에서 실행해 주세요.");
    }
    await focusKnownTarget(tab.id, 0, "#post-title-inp");
    await reportInput("in_progress");
    await withDebugger(tab.id, () => humanType(tab.id, activePost.title || "", "제목 입력 중…"));
    await focusKnownTarget(tab.id, bodyFrame, "body#tinymce[contenteditable='true']");
    const totalImages = (activePost.blocks || []).filter((block) => block.type === "image").length;
    let pastedImages = 0;
    for (const block of activePost.blocks || []) {
      if (block.type === "text" || block.type === "link") await withDebugger(tab.id, () => humanType(tab.id, `${block.type === "link" ? `${block.text} ${block.url}` : block.text}\n\n`, "본문 입력 중…"));
      if (block.type === "html") await insertTistoryHtml(tab.id, bodyFrame, `${block.html}<p><br></p>`, "본문 서식 입력 중…");
      if (block.type === "image") {
        pastedImages += 1;
        await pasteTistoryImage(tab.id, bodyFrame, block.url, pastedImages, totalImages);
      }
    }
    const publishSettings = await applyRemainingTistorySettings(tab.id, bodyFrame);
    await reportInput("publish_ready");
    $("inputStatus").textContent = `제목·본문·카테고리·태그와 ${publishSettings.visibility}·${publishSettings.timing} 발행 설정을 적용했습니다. 마지막 저장/발행은 티스토리에서 직접 눌러 주세요.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    $("inputStatus").textContent = `입력 중단: ${message}`;
    await reportInput("failed", message);
  } finally { $("fillPost").disabled = false; }
}

async function resumeTistoryPostSettings() {
  if (!activePost) return;
  const tab = await getTistoryEditorTab();
  $("resumePostSettings").disabled = true;
  try {
    await chrome.windows.update(tab.windowId, { focused: true }); await chrome.tabs.update(tab.id, { active: true });
    const bodyFrame = await editorFrameId(tab.id);
    // 중단 후 재개는 이미 화면에 있는 글을 절대 다시 쓰지 않습니다.
    // 티스토리가 서식을 다시 만든 일부 문단은 허용하되 제목·본문 존재·이미지 수는 계속 검증합니다.
    const publishSettings = await applyRemainingTistorySettings(tab.id, bodyFrame, { allowPartialText: true });
    await reportInput("publish_ready");
    $("inputStatus").textContent = `기존 제목·본문·이미지는 그대로 두고 카테고리·태그와 ${publishSettings.visibility}·${publishSettings.timing} 발행 설정을 적용했습니다. 마지막 저장/발행은 티스토리에서 직접 눌러 주세요.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    $("inputStatus").textContent = `설정 이어서 적용 중단: ${message}`;
    await reportInput("failed", message);
  } finally { $("resumePostSettings").disabled = false; }
}

$("refreshPosts").addEventListener("click", refreshPosts);
$("postList").addEventListener("change", selectPost);
$("previewPost").addEventListener("click", previewPost);
$("previewFill").addEventListener("click", () => {
  $("postPreview").close();
  $("fillPost").click();
});
$("fillPost").addEventListener("click", fillTistoryPost);
$("resumePostSettings").addEventListener("click", resumeTistoryPostSettings);
$("extractTags").addEventListener("click", () => {
  try { extractTagsFromSelectedPost(); } catch (error) { $("categorySettingsStatus").textContent = error instanceof Error ? error.message : String(error); }
});
$("saveCategoryTags").addEventListener("click", () => { saveCategoryTags().catch((error) => { $("categorySettingsStatus").textContent = error instanceof Error ? error.message : String(error); }); });
$("savePublishSettings").addEventListener("click", () => { savePublishSettings().catch((error) => { $("publishSettingsStatus").textContent = error instanceof Error ? error.message : String(error); }); });
$("loadTopics").addEventListener("click", loadTistoryTopics);
$("postVisibility").addEventListener("change", syncPublishSettingsFields);
$("publishTiming").addEventListener("change", syncPublishSettingsFields);
