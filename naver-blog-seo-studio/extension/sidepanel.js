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
  const title = $("title").value, body = $("body").value;
  if (!title && !body) return ($("generateStatus").textContent = "먼저 초안을 생성하세요.");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https:\/\/(blog|m\.blog)\.naver\.com/.test(tab.url || "")) return ($("generateStatus").textContent = "네이버 블로그 글쓰기 화면을 먼저 여세요.");
  const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, args: [title, body], func: (titleText, bodyText) => {
    const editable = (container) => container?.isContentEditable ? container : container?.querySelector('[contenteditable="true"]');
    const titleContainer = document.querySelector(".se-title-text, .se-documentTitle");
    const bodyContainer = [...document.querySelectorAll('.se-text-paragraph, [contenteditable="true"]')].find((element) => !element.closest(".se-documentTitle") && !element.closest(".se-title-text"));
    const titleTarget = editable(titleContainer) || titleContainer, bodyTarget = editable(bodyContainer) || bodyContainer;
    if (!titleTarget && !bodyTarget) return { ok: false, error: "네이버 글쓰기 입력 요소를 찾지 못했습니다. 글쓰기 화면을 새로 연 뒤 다시 시도하세요." };
    const put = (target, text) => { if (!target || !text) return; target.focus(); const selection = target.ownerDocument.getSelection(), range = target.ownerDocument.createRange(); range.selectNodeContents(target); selection.removeAllRanges(); selection.addRange(range); target.ownerDocument.execCommand("insertText", false, text); target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text })); };
    put(titleTarget, titleText); put(bodyTarget, bodyText); return { ok: true, title: Boolean(titleTarget), body: Boolean(bodyTarget) };
  } });
  const result = results?.[0]?.result;
  $("generateStatus").textContent = result?.ok ? "네이버 편집기에 입력했습니다. 내용을 검토한 뒤 발행하세요." : `입력 실패: ${result?.error || "페이지에 접근하지 못했습니다."}`;
});

renderStatus();
