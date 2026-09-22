"use strict";

const BASE = "https://naver-blog-seo-studio.vercel.app";
const KEY = "seoStudioToken";
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function getToken() { return (await chrome.storage.local.get(KEY))[KEY] || ""; }

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

async function debuggerCommand(tabId, method, params = {}) {
  return chrome.debugger.sendCommand({ tabId }, method, params);
}

async function typeWithDebugger(tabId, value) {
  for (const character of plainText(value)) {
    if (character === "\n") {
      await debuggerCommand(tabId, "Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
      await debuggerCommand(tabId, "Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    } else {
      await debuggerCommand(tabId, "Input.insertText", { text: character });
    }
    await sleep(randomDelay(45, 95));
    if (Math.random() < 0.05) await sleep(randomDelay(220, 450));
  }
}

async function focusNaverEditor(tabId, kind) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    args: [kind],
    func: (editorKind) => {
      const container = editorKind === "title"
        ? document.querySelector(".se-title-text")
        : [...document.querySelectorAll(".se-text-paragraph")].find((element) => !element.closest(".se-documentTitle"));
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
      simulateClick(container);
      container.focus();
      const editable = findEditable(container) || resolveActiveEditable();
      if (!editable) return { ok: false, reason: "contenteditable target not found", container: container.className || container.tagName };
      editable.focus();
      const rect = editable.getBoundingClientRect();
      const mouse = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
      const range = editable.ownerDocument.createRange();
      range.selectNodeContents(container.isContentEditable ? editable : container);
      range.collapse(false);
      const selection = editable.ownerDocument.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return { ok: true, kind: editorKind, frame: location.href, editableTag: editable.tagName, editableClass: editable.className || null };
    },
  });
  return results.find((entry) => entry.result?.ok)?.result || { ok: false };
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
    const response = await fetch(`${BASE}/api/extension/drafts`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ topic, keywords: $("keywords").value, strategy: "C-Rank 기본" }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `생성 실패 (${response.status})`);
    $("title").value = body.title || "";
    $("body").value = body.body || "";
    $("generateStatus").textContent = "초안 생성 완료";
  } catch (error) { $("generateStatus").textContent = `오류: ${error instanceof Error ? error.message : String(error)}`; }
  finally { $("generate").disabled = false; }
});

$("fill").addEventListener("click", async () => {
  $("generateStatus").textContent = "네이버 편집기에 실제 키보드 입력 중...";
  let attachedTabId = null;
  try {
    const title = $("title").value;
    const body = $("body").value;
    if (!title && !body) return ($("generateStatus").textContent = "먼저 초안을 생성하세요.");
    const tabs = await chrome.tabs.query({ url: ["https://blog.naver.com/*", "https://m.blog.naver.com/*"] });
    const tab = tabs.find((candidate) => candidate.active) || tabs[0];
    if (!tab?.id || !/^https:\/\/(blog|m\.blog)\.naver\.com/.test(tab.url || "")) return ($("generateStatus").textContent = "네이버 블로그 글쓰기 화면을 먼저 열어주세요.");
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id, { active: true });
    await sleep(350);
    const titleFocus = await focusNaverEditor(tab.id, "title");
    if (!titleFocus.ok) return ($("generateStatus").textContent = "제목 입력 요소를 찾지 못했습니다. 네이버 글쓰기 화면을 새로 연 뒤 다시 시도하세요.");
    await chrome.debugger.attach({ tabId: tab.id }, "1.3");
    attachedTabId = tab.id;
    await debuggerCommand(tab.id, "Input.setIgnoreInputEvents", { ignore: false });
    await typeWithDebugger(tab.id, title);
    await sleep(randomDelay(600, 1000));
    const bodyFocus = await focusNaverEditor(tab.id, "body");
    if (!bodyFocus.ok) return ($("generateStatus").textContent = "본문 문단 입력 요소를 찾지 못했습니다. 네이버 글쓰기 본문을 클릭한 뒤 다시 시도하세요.");
    await typeWithDebugger(tab.id, body);
    $("generateStatus").textContent = "네이버 편집기에 실제 키보드 입력이 완료되었습니다. 내용을 검토한 뒤 발행하세요.";
  } catch (error) {
    $("generateStatus").textContent = `입력 실패: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    if (attachedTabId !== null) {
      try { await chrome.debugger.detach({ tabId: attachedTabId }); } catch { /* tab may have navigated */ }
    }
  }
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
        };
      },
    });
    const combined = results.map((entry) => ({ frameId: entry.frameId, result: entry.result }));
    $("inspectResult").value = JSON.stringify(combined, null, 2);
    $("inspectStatus").textContent = `분석 완료 (${combined.length}개 프레임). 결과를 복사해 전달해주세요.`;
  } catch (error) {
    $("inspectStatus").textContent = `오류: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    $("inspect").disabled = false;
  }
});

renderStatus();
