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
  $("tagNames").value = activePost ? normalizeTistoryTags(activePost.tags || []).join(", ") : "";
  $("inputStatus").textContent = activePost ? `${postLabel(activePost)} 선택됨` : "";
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

function normalizeTistoryTags(values) {
  const source = Array.isArray(values) ? values : String(values || "").split(/[\n,]/);
  return [...new Set(source.map((value) => String(value).replace(/^#+/, "").trim()).filter(Boolean))].slice(0, 30);
}

async function addTistoryTags(tabId, tags) {
  for (const tag of normalizeTistoryTags(tags)) {
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

async function chooseTistoryCategory(tabId, category) {
  if (!category) return;
  await focusKnownTarget(tabId, 0, "#category-btn");
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

async function openPublishSettings(tabId) {
  const opened = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [0] },
    func: async () => {
      const button = document.querySelector("#publish-layer-btn");
      if (!button || !button.getClientRects().length) return false;
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); const rect = button.getBoundingClientRect();
      const event = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
      button.dispatchEvent(new MouseEvent("mouseover", event)); button.dispatchEvent(new MouseEvent("mousemove", event)); await wait(100 + Math.floor(Math.random() * 321));
      button.dispatchEvent(new MouseEvent("mousedown", event)); button.dispatchEvent(new MouseEvent("mouseup", event)); button.dispatchEvent(new MouseEvent("click", event));
      await wait(300);
      return Boolean(document.querySelector(".editor_layer[role='dialog']"));
    },
  });
  if (opened[0]?.result !== true) throw new Error("발행 설정창을 열지 못했습니다.");
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

async function verifyTistoryInput(tabId, bodyFrame) {
  const state = await readTistoryDraftState(tabId, bodyFrame);
  if (normalized(state.title) !== normalized(activePost?.title)) throw new Error("입력된 제목을 다시 확인하지 못했습니다.");
  for (const block of activePost?.blocks || []) {
    if (block.type !== "text" && block.type !== "link") continue;
    const expected = block.type === "link" ? `${block.text} ${block.url}` : block.text;
    if (normalized(expected) && !normalized(state.body).includes(normalized(expected))) {
      throw new Error("입력된 본문을 다시 확인하지 못했습니다.");
    }
  }
  const imageCount = (activePost?.blocks || []).filter((block) => block.type === "image").length;
  if (state.imageCount !== imageCount) throw new Error("입력된 이미지 수를 다시 확인하지 못했습니다.");
}

async function pasteTistoryImage(tabId, bodyFrame, url, order, total) {
  $("inputStatus").textContent = `이미지 ${order}/${total} 준비 중…`;
  const clipboard = await chrome.runtime.sendMessage({ type: "copy-tistory-image", url });
  if (!clipboard?.ok) throw new Error(clipboard?.error || `이미지 ${order}을(를) 클립보드에 준비하지 못했습니다.`);

  const before = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [bodyFrame] },
    func: () => document.querySelectorAll("body#tinymce[contenteditable='true'] > figure > img").length,
  });
  await focusKnownTarget(tabId, bodyFrame, "body#tinymce[contenteditable='true']");
  $("inputStatus").textContent = `이미지 ${order}/${total} 티스토리에 붙여넣는 중…`;
  await withDebugger(tabId, async () => {
    await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", { type: "keyDown", key: "Control", code: "ControlLeft", windowsVirtualKeyCode: 17, modifiers: 2 });
    await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", { type: "keyDown", key: "v", code: "KeyV", windowsVirtualKeyCode: 86, modifiers: 2 });
    await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", { type: "keyUp", key: "v", code: "KeyV", windowsVirtualKeyCode: 86, modifiers: 2 });
    await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", { type: "keyUp", key: "Control", code: "ControlLeft", windowsVirtualKeyCode: 17 });
  });
  const expected = (before[0]?.result || 0) + 1;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await inputSleep(500);
    const after = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [bodyFrame] },
      func: () => document.querySelectorAll("body#tinymce[contenteditable='true'] > figure > img").length,
    });
    if ((after[0]?.result || 0) >= expected) return;
  }
  throw new Error(`이미지 ${order}의 티스토리 업로드 완료를 확인하지 못했습니다.`);
}

async function reportInput(status, error = "") {
  if (!activePost) return;
  await extensionApi(`/api/extension/posts/${encodeURIComponent(activePost.id)}/input-result`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, error }) }).catch(() => {});
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
      if (block.type === "image") {
        pastedImages += 1;
        await pasteTistoryImage(tab.id, bodyFrame, block.url, pastedImages, totalImages);
      }
    }
    const category = $("categoryName").value.trim();
    if (category) await chooseTistoryCategory(tab.id, category);
    await addTistoryTags(tab.id, $("tagNames").value);
    await verifyTistoryInput(tab.id, bodyFrame);
    await openPublishSettings(tab.id);
    await reportInput("publish_ready");
    $("inputStatus").textContent = "제목·본문·카테고리·태그 입력과 발행 설정창 열기까지 완료했습니다. 마지막 비공개 저장/발행은 티스토리에서 직접 눌러 주세요.";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    $("inputStatus").textContent = `입력 중단: ${message}`;
    await reportInput("failed", message);
  } finally { $("fillPost").disabled = false; }
}

$("refreshPosts").addEventListener("click", refreshPosts);
$("postList").addEventListener("change", selectPost);
$("previewPost").addEventListener("click", previewPost);
$("previewFill").addEventListener("click", () => {
  $("postPreview").close();
  $("fillPost").click();
});
$("fillPost").addEventListener("click", fillTistoryPost);
