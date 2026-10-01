"use strict";

// 실제 티스토리 DOM을 조사하기 전 자동 입력을 금지한다. 이 코드는 읽기 전용이다.
const STORAGE_KEY = "tistoryEditorInspectionSnapshots";
const $ = (id) => document.getElementById(id);
let snapshots = [];

function report() {
  return {
    tool: "tistory-auto-blog-extension",
    version: "v1.01",
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
  return {
    url: location.origin + location.pathname,
    isTopFrame: window === window.top,
    editables: select("[contenteditable], textarea, input:not([type='hidden']), .CodeMirror, .cm-editor"),
    buttons: select("button, [role='button'], input[type='button'], input[type='submit']"),
    fileInputs: select("input[type='file']"),
    modeCandidates: select("button, [role='button'], li, a, span").filter((item) => /기본|마크다운|HTML|모드/i.test(item.text)),
    visibleLayers: select("[role='dialog'], [role='menu'], [role='listbox'], [class*='modal'], [class*='popup'], [class*='layer'], [class*='dropdown']").filter((item) => item.visible),
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
chrome.storage.local.get(STORAGE_KEY).then((stored) => { snapshots = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : []; render(); });
