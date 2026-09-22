"use strict";

const BASE = "https://naver-blog-seo-studio.vercel.app";
const KEY = "seoStudioToken";
const $ = (id) => document.getElementById(id);

async function getToken() { return (await chrome.storage.local.get(KEY))[KEY] || ""; }

async function verify(token) {
  if (!token) return { ok: false, error: "토큰을 입력하세요." };
  try {
    const response = await fetch(`${BASE}/api/extension/whoami`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json().catch(() => ({}));
    return response.ok ? { ok: true, email: body.email } : { ok: false, error: body.error || `연결 실패 (${response.status})` };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
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
    $("title").value = body.title || ""; $("body").value = body.body || ""; $("generateStatus").textContent = "초안 생성 완료";
  } catch (error) { $("generateStatus").textContent = `오류: ${error instanceof Error ? error.message : String(error)}`; }
  finally { $("generate").disabled = false; }
});

$("fill").addEventListener("click", async () => {
  $("generateStatus").textContent = "네이버 편집기에 입력 중...";
  try {
  const title = $("title").value, body = $("body").value;
  if (!title && !body) return ($("generateStatus").textContent = "먼저 초안을 생성하세요.");
  const tabs = await chrome.tabs.query({ url: ["https://blog.naver.com/*", "https://m.blog.naver.com/*"] });
  const tab = tabs.find((candidate) => candidate.active) || tabs[0];
  if (!tab?.id || !/^https:\/\/(blog|m\.blog)\.naver\.com/.test(tab.url || "")) return ($("generateStatus").textContent = "네이버 블로그 글쓰기 화면을 먼저 여세요.");
  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tab.id, { active: true });
  await new Promise((resolve) => setTimeout(resolve, 250));
  const results = await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, args: [{ title, body }], func: async ({ title: titleText, body: bodyText }) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const plain = (text) => text.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/^\s*[-*]\s+/gm, "• ").trim();
    const findEditableTarget = (container) => container?.isContentEditable ? container : container?.querySelector('[contenteditable="true"]') || container;
    const simulateClick = (element) => { const rect = element.getBoundingClientRect(); const options = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }; element.dispatchEvent(new MouseEvent("mousedown", options)); element.dispatchEvent(new MouseEvent("mouseup", options)); element.dispatchEvent(new MouseEvent("click", options)); };
    const resolveActiveEditable = () => { let active = document.activeElement; let depth = 0; while (active && active.tagName === "IFRAME" && depth < 5) { let innerDocument; try { innerDocument = active.contentDocument; } catch { break; } if (!innerDocument) break; active = innerDocument.activeElement && innerDocument.activeElement !== innerDocument.body ? innerDocument.activeElement : innerDocument.body; depth += 1; } return active; };
    const placeCursorAtEnd = (container) => { if (!container) return null; let element = findEditableTarget(container); simulateClick(element); element.focus(); const resolved = resolveActiveEditable(); if (resolved && resolved !== document.body && resolved.isContentEditable) element = resolved; const range = element.ownerDocument.createRange(); range.selectNodeContents(element); range.collapse(false); const selection = element.ownerDocument.getSelection(); selection.removeAllRanges(); selection.addRange(range); return element; };
    const findBodyParagraph = () => [...document.querySelectorAll(".se-text-paragraph")].find((element) => !element.closest(".se-documentTitle"));
    const typeNaturally = async (text, doc) => { for (const character of plain(text)) { if (character === "\n") doc.execCommand("insertParagraph"); else doc.execCommand("insertText", false, character); await sleep(randomDelay(45, 95)); if (Math.random() < 0.05) await sleep(randomDelay(220, 450)); } };
    const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\u00a0/g, " ");
    const insertFormattedBody = async (text, doc) => {
      const normalized = plain(text).replace(/\n{3,}/g, "\n\n");
      const paragraphs = normalized.split(/\n\s*\n/).filter(Boolean);
      for (const paragraph of paragraphs) {
        const html = `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>").replace(/  /g, "&nbsp; ")}</p>`;
        doc.execCommand("insertHTML", false, html);
        doc.execCommand("insertParagraph");
        await sleep(randomDelay(280, 520));
      }
      doc.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: normalized }));
    };
    const titleContainer = document.querySelector(".se-title-text");
    const bodyContainer = findBodyParagraph();
    if (!titleContainer || !bodyContainer) return { ok: false, error: `기존 에디터 요소를 찾지 못했습니다 (제목 ${Boolean(titleContainer)}, 본문 ${Boolean(bodyContainer)}, iframe ${document.querySelectorAll("iframe").length}, editable ${document.querySelectorAll('[contenteditable="true"]').length}, url ${location.pathname}).` };
    const titleTarget = placeCursorAtEnd(titleContainer);
    await typeNaturally(titleText, titleTarget.ownerDocument);
    await sleep(randomDelay(600, 1000));
    const bodyTarget = placeCursorAtEnd(bodyContainer);
    await insertFormattedBody(bodyText, bodyTarget.ownerDocument);
    return { ok: true, title: titleTarget.textContent, body: bodyTarget.textContent };
  } });
  const result = results?.find((entry) => entry.result?.ok)?.result || results?.find((entry) => entry.result)?.result;
  $("generateStatus").textContent = result?.ok ? "네이버 편집기에 입력했습니다. 내용을 검토한 뒤 발행하세요." : `입력 실패: ${result?.error || "페이지에 접근하지 못했습니다."}`;
  } catch (error) {
    $("generateStatus").textContent = `입력 실행 오류: ${error instanceof Error ? error.message : String(error)}`;
  }
});

renderStatus();
