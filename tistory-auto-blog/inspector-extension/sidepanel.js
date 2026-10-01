"use strict";

// 티스토리 글쓰기 화면 조사 전용 확장(2026-10-01, 주인님 지시: 티스토리도 ai-auto-blog처럼 크롬 확장 연계).
// docs/PLATFORM_PATTERNS.md §20 규칙 3 — "화면 구조(셀렉터)는 추측해서 하드코딩하지 않는다. 실제 화면을 조사하는 전용 도구를 먼저 만들고
// 그 결과를 직접 읽은 뒤에만 자동화 코드를 쓴다"를 지키기 위한 도구다.
//  - 읽기만 한다: 클릭·입력·값 변경·발행 없음. 제목/본문 "내용"은 저장하지 않고 글자 수·구조만 기록한다(개인 글 보호).
//  - 모든 프레임(allFrames)에서 읽는다(읽기 전용이라 §28의 "상태 변경 주입은 allFrames 금지" 규칙에 해당하지 않음).
//  - 화면 상태마다 분석을 눌러 결과를 쌓고(기본 화면 → HTML 모드 → 사진 버튼 → 발행 설정창 …), 한 번에 복사/저장해 전달한다.

const STORE_KEY = "tistoryInspectorSnapshots";
const $ = (id) => document.getElementById(id);
let snapshots = [];

function saveSnapshots() {
  return chrome.storage.local.set({ [STORE_KEY]: snapshots }).catch(() => {});
}

function renderList() {
  const list = $("list");
  list.textContent = "";
  for (const [index, snap] of snapshots.entries()) {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = `${index + 1}. ${snap.step}`;
    const meta = document.createElement("small");
    meta.textContent = `${snap.frames.length}개 프레임`;
    li.append(label, meta);
    list.append(li);
  }
  $("result").value = snapshots.length ? JSON.stringify(buildReport(), null, 2) : "";
}

function buildReport() {
  return {
    tool: "tistory-inspector",
    toolVersion: "0.1.0",
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    note: "읽기 전용 조사 결과. 제목·본문 내용·쿠키·로그인 정보는 포함하지 않음(글자 수만).",
    snapshots,
  };
}

async function getTistoryTab() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active?.id && /^https:\/\/[^/]*tistory\.com\//.test(active.url || "")) return active;
  const tabs = await chrome.tabs.query({ url: ["https://*.tistory.com/*"] });
  // 글쓰기 화면(/manage/newpost, /manage/post)을 우선
  return tabs.find((tab) => /\/manage\/(newpost|post)/.test(tab.url || "")) || tabs[0] || null;
}

// 페이지 안에서 실행되는 자기완결형 읽기 함수(바깥 변수 사용 불가).
function collectInPage() {
  const MAX = 160;
  const trunc = (value, n = 70) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  };
  const attrsOf = (el) => {
    const out = {};
    for (const attr of el.attributes) {
      if (attr.name === "value") continue; // 입력값은 저장하지 않는다
      if (/^(id|name|type|role|title|placeholder|href|for|src|contenteditable|tabindex)$/.test(attr.name) || /^aria-/.test(attr.name) || /^data-/.test(attr.name)) {
        out[attr.name] = attr.name === "href" || attr.name === "src" ? trunc(attr.value.split("?")[0], 90) : trunc(attr.value, 80);
      }
    }
    return out;
  };
  const pathOf = (el) => {
    const parts = [];
    let node = el.parentElement;
    for (let depth = 0; node && depth < 4; depth += 1, node = node.parentElement) {
      const cls = typeof node.className === "string" ? node.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      parts.push(`${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}${cls ? `.${cls}` : ""}`);
    }
    return parts.join(" < ");
  };
  // 글 내용이 들어갈 수 있는 요소(편집 영역·입력칸, 그것을 품은 컨테이너)는 텍스트를 아예 기록하지 않는다.
  const mayHoldUserText = (el) => el.isContentEditable || /^(TEXTAREA|INPUT|BODY|HTML)$/.test(el.tagName) || Boolean(el.querySelector("[contenteditable], textarea, input:not([type='radio']):not([type='checkbox']):not([type='file']):not([type='button']):not([type='submit']), iframe, .CodeMirror, .cm-editor"));
  const safeText = (el, n = 50) => (mayHoldUserText(el) ? "" : trunc(el.textContent, n));
  const describe = (el, extra = {}) => {
    const rect = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      attrs: attrsOf(el),
      classes: typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 12) : [],
      text: safeText(el, 50),
      visible: visible(el),
      disabled: el.disabled || el.getAttribute("aria-disabled") === "true" || null,
      checked: typeof el.checked === "boolean" ? el.checked : null,
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      parents: pathOf(el),
      ...extra,
    };
  };
  const pick = (selector, mapper = describe) => {
    const all = [...document.querySelectorAll(selector)];
    // 보이는 요소를 먼저
    all.sort((a, b) => Number(visible(b)) - Number(visible(a)));
    return all.slice(0, MAX).map((el) => mapper(el));
  };

  const editableInfo = (el) => {
    const isText = el.tagName === "TEXTAREA" || el.tagName === "INPUT";
    return describe(el, {
      textLength: isText ? (el.value || "").length : (el.textContent || "").length,
      childTags: isText ? null : [...el.children].slice(0, 12).map((child) => child.tagName.toLowerCase()),
      isContentEditable: el.isContentEditable || null,
    });
  };

  const modeWords = [...document.querySelectorAll("button, a, li, span, div, label, [role]")]
    .filter((el) => el.children.length <= 2 && !mayHoldUserText(el) && /^(기본모드|기본 모드|마크다운|HTML|html|모드)/.test(trunc(el.textContent, 20)))
    .slice(0, 30)
    .map((el) => describe(el));

  const layers = [...document.querySelectorAll("[class*='layer'], [class*='modal'], [class*='popup'], [class*='dialog'], [class*='dropdown'], [class*='menu'], [role='dialog'], [role='menu'], [role='listbox']")]
    .filter(visible)
    .slice(0, 60)
    .map((el) => describe(el, { buttonsInside: [...el.querySelectorAll("button, a, [role='button'], input, select")].slice(0, 25).map((child) => ({ tag: child.tagName.toLowerCase(), attrs: attrsOf(child), text: safeText(child, 30), visible: visible(child) })) }));

  return {
    url: location.origin + location.pathname,
    isTopFrame: window === window.top,
    documentTitleLength: (document.title || "").length,
    bodyClasses: typeof document.body?.className === "string" ? document.body.className.trim().split(/\s+/).slice(0, 12) : [],
    viewport: { w: innerWidth, h: innerHeight },
    iframes: pick("iframe", (el) => describe(el, { sameOrigin: (() => { try { return Boolean(el.contentDocument); } catch { return false; } })() })),
    editables: pick("[contenteditable='true'], [contenteditable=''], textarea, input:not([type]), input[type='text'], input[type='search'], .CodeMirror, .cm-editor, .mce-content-body, [class*='editor']", editableInfo),
    buttons: pick("button, [role='button'], a[href^='javascript'], a[class*='btn'], input[type='button'], input[type='submit']"),
    selectsAndDropdowns: pick("select, [role='combobox'], [role='listbox'], [aria-haspopup], [class*='select']"),
    radiosAndCheckboxes: pick("input[type='radio'], input[type='checkbox']", (el) => describe(el, { labelText: trunc((el.labels?.[0] || el.closest("label"))?.textContent || "", 40) })),
    fileInputs: pick("input[type='file']"),
    modeCandidates: modeWords,
    visibleLayers: layers,
  };
}

$("inspect").addEventListener("click", async () => {
  const button = $("inspect");
  button.disabled = true;
  $("status").textContent = "분석 중...";
  try {
    const tab = await getTistoryTab();
    if (!tab?.id) throw new Error("티스토리 탭을 찾지 못했습니다. 티스토리 글쓰기 화면(내블로그주소.tistory.com/manage/newpost)을 먼저 열어주세요.");
    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, func: collectInPage });
    const frames = results.map((entry) => ({ frameId: entry.frameId, result: entry.result })).filter((entry) => entry.result);
    snapshots.push({
      step: $("step").selectedOptions[0].textContent.trim(),
      memo: $("memo").value.trim().slice(0, 120),
      takenAt: new Date().toISOString(),
      tabUrl: (() => { try { const u = new URL(tab.url); return u.origin + u.pathname; } catch { return ""; } })(),
      frames,
    });
    await saveSnapshots();
    renderList();
    $("status").textContent = `완료: "${snapshots[snapshots.length - 1].step}" (${frames.length}개 프레임). 다음 화면으로 넘어가 같은 방법으로 분석을 이어가세요.`;
  } catch (error) {
    $("status").textContent = error?.message || String(error);
  } finally {
    button.disabled = false;
  }
});

$("copy").addEventListener("click", async () => {
  if (!snapshots.length) return ($("status").textContent = "아직 분석한 화면이 없습니다.");
  try {
    await navigator.clipboard.writeText(JSON.stringify(buildReport(), null, 2));
    $("status").textContent = "전체 결과를 복사했습니다. Claude 대화에 붙여넣어 주세요(길면 파일 저장을 권장합니다).";
  } catch {
    $("result").select();
    $("status").textContent = "자동 복사에 실패했습니다. 아래 칸을 직접 복사하거나 JSON 파일로 저장해 주세요.";
  }
});

$("download").addEventListener("click", () => {
  if (!snapshots.length) return ($("status").textContent = "아직 분석한 화면이 없습니다.");
  const blob = new Blob([JSON.stringify(buildReport(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tistory-inspector-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  $("status").textContent = "JSON 파일로 저장했습니다. 그 파일을 Claude 대화에 첨부해 주세요.";
});

$("clear").addEventListener("click", async () => {
  snapshots = [];
  await saveSnapshots();
  renderList();
  $("status").textContent = "분석 결과를 모두 지웠습니다.";
});

chrome.storage.local.get(STORE_KEY).then((stored) => {
  snapshots = Array.isArray(stored[STORE_KEY]) ? stored[STORE_KEY] : [];
  renderList();
}).catch(() => {});
