"use strict";

// 데스크톱 앱(src/main.js)의 AIMaster 계정 연동 로직과 동일한 방식 — 같은
// personal_access_tokens 백엔드를 그대로 재사용한다. 주의: 반드시 www까지 정확히
// 써야 한다 — buylife.xyz(www 없음)는 307 리다이렉트되면서 Authorization 헤더가
// 사라진다(naver-blog-auto-poster/README.md "AIMaster 계정 연동 아키텍처" 참고).
const AIMASTER_BASE_URL = "https://www.buylife.xyz";
const STORAGE_KEY = "aimasterToken";

async function getStoredToken() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || null;
}

async function setStoredToken(token) {
  if (token) {
    await chrome.storage.local.set({ [STORAGE_KEY]: token });
  } else {
    await chrome.storage.local.remove(STORAGE_KEY);
  }
}

async function checkAimasterToken(token) {
  if (!token) return { linked: false };
  try {
    const response = await fetch(`${AIMASTER_BASE_URL}/api/naver-blog-auto-poster/whoami`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { linked: false, error: body.error || `연동 확인 실패 (${response.status})` };
    }
    const body = await response.json();
    return { linked: true, email: body.email, name: body.name };
  } catch (error) {
    return { linked: false, error: error instanceof Error ? error.message : String(error) };
  }
}

const tokenInput = document.getElementById("aimaster-token");
const linkButton = document.getElementById("aimaster-link-btn");
const statusBox = document.getElementById("aimaster-status");

function renderStatus(result) {
  if (result.linked) {
    statusBox.textContent = `연동됨: ${result.name ? `${result.name} · ` : ""}${result.email}`;
  } else {
    statusBox.textContent = result.error ? `오류: ${result.error}` : "연동되지 않음";
  }
}

(async () => {
  const token = await getStoredToken();
  renderStatus(await checkAimasterToken(token));
})();

linkButton.addEventListener("click", async () => {
  linkButton.disabled = true;
  statusBox.textContent = "확인 중...";
  const token = tokenInput.value.trim();
  const result = await checkAimasterToken(token);
  linkButton.disabled = false;

  if (result.linked) {
    await setStoredToken(token);
    tokenInput.value = "";
  }
  renderStatus(result);
});

// AI 초안 생성 — 데스크톱 앱과 동일한 루트 서버 API(/api/naver-blog-auto-poster/generate)를
// 재사용한다. 서버가 사용자 본인의 OpenAI/Gemini 키로 대신 호출하고 결과(1차 초안 + 2차
// 셀프 리뷰를 거친 제목/본문, 선택적으로 이미지)만 돌려준다 — 이 확장은 API 키를 절대
// 직접 보관/사용하지 않는다.
//
// 이미지는 데스크톱 앱처럼 파일로 저장해서 자동 삽입할 방법이 없다(File Input에
// 스크립트로 파일을 못 넣는 브라우저 보안 제약, README 참고) — 대신 클립보드에 복사해서
// 사용자가 본문에 Ctrl+V로 직접 붙여넣게 한다.
const topicInput = document.getElementById("topic-input");
const generateIncludeImageCheckbox = document.getElementById("generate-include-image");
const generateImageModelSelect = document.getElementById("generate-image-model");
const generateButton = document.getElementById("generate-btn");
const generateStatusBox = document.getElementById("generate-status");
const generateImagePreviewWrap = document.getElementById("generate-image-preview-wrap");
const generateImagePreview = document.getElementById("generate-image-preview");
const generateImageCopyButton = document.getElementById("generate-image-copy-btn");

let lastGeneratedImage = null; // { base64, mimeType }

// Clipboard API의 ClipboardItem은 PNG를 가장 안정적으로 지원한다 — Gemini가 다른
// mimeType을 반환하는 경우까지 대비해 canvas로 항상 PNG로 정규화한 뒤 복사한다.
async function copyImageToClipboard(base64, mimeType) {
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    image.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d").drawImage(img, 0, 0);
  const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
}

generateImageCopyButton.addEventListener("click", async () => {
  if (!lastGeneratedImage) return;
  try {
    await copyImageToClipboard(lastGeneratedImage.base64, lastGeneratedImage.mimeType);
    generateStatusBox.textContent = "이미지를 클립보드에 다시 복사했습니다. 본문을 클릭한 뒤 Ctrl+V로 붙여넣어주세요.";
  } catch (error) {
    generateStatusBox.textContent = `오류: ${error instanceof Error ? error.message : String(error)}`;
  }
});

generateButton.addEventListener("click", async () => {
  const topic = topicInput.value.trim();
  if (!topic) {
    generateStatusBox.textContent = "오류: 주제를 입력해주세요.";
    return;
  }

  const token = await getStoredToken();
  if (!token) {
    generateStatusBox.textContent = "오류: 먼저 위에서 AIMaster 계정 연동을 완료해주세요.";
    return;
  }

  const includeImage = generateIncludeImageCheckbox.checked;

  generateButton.disabled = true;
  generateStatusBox.textContent = "AI가 초안을 작성하는 중입니다... (셀프 리뷰까지 포함되어 몇 초~수십 초 걸릴 수 있습니다)";

  try {
    const response = await fetch(`${AIMASTER_BASE_URL}/api/naver-blog-auto-poster/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ topic, includeImage, imageModel: generateImageModelSelect.value })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `생성 실패 (${response.status})`);
    }

    document.getElementById("draft-title").value = body.title;
    document.getElementById("draft-body").value = body.body;

    let statusText = "생성 완료. 아래 '제목/본문 자동 입력' 입력창에 채워졌습니다.";
    if (body.image?.base64) {
      lastGeneratedImage = { base64: body.image.base64, mimeType: body.image.mimeType || "image/png" };
      generateImagePreview.src = `data:${lastGeneratedImage.mimeType};base64,${lastGeneratedImage.base64}`;
      generateImagePreviewWrap.style.display = "block";
      await copyImageToClipboard(lastGeneratedImage.base64, lastGeneratedImage.mimeType);
      statusText += "\n이미지를 클립보드에 복사했습니다 — 본문을 클릭한 뒤 Ctrl+V로 붙여넣어주세요.";
    } else {
      lastGeneratedImage = null;
      generateImagePreviewWrap.style.display = "none";
      if (body.imageError) statusText += `\n(이미지 제외: ${body.imageError})`;
    }
    generateStatusBox.textContent = statusText;
  } catch (error) {
    generateStatusBox.textContent = `오류: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    generateButton.disabled = false;
  }
});

// 프로토타입 2 — 제목/본문 자동 입력. 데스크톱 앱과 달리 크롬 확장은 그 페이지
// "안에서" 자바스크립트로 직접 DOM을 조작해야 한다(Playwright의 CDP 원격 조종이
// 아님) — README "2단계와 1단계의 구조적 차이" 참고. 이 함수 전체가
// chrome.scripting.executeScript로 대상 탭에 그대로 주입되므로, 바깥의 다른 함수를
// 참조할 수 없고 완전히 자기완결적이어야 한다.
async function injectedFillTitleAndBody({ title, body }) {
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  // 사람처럼 한 글자씩 입력한다. dispatchEvent로 만든 키 이벤트는 isTrusted:false라
  // 브라우저가 실제 텍스트 삽입으로 처리해주지 않으므로, 실제 편집 명령 파이프라인을
  // 타는 execCommand("insertText")를 쓴다 — 이 방식이 실제로 SmartEditor ONE에서
  // 동작하는지는 아직 실사용 검증 전이다.
  async function humanType(text, doc) {
    for (const char of text) {
      if (char === "\n") {
        doc.execCommand("insertParagraph");
      } else {
        doc.execCommand("insertText", false, char);
      }
      await sleep(randomDelay(70, 170));
      if (Math.random() < 0.05) await sleep(randomDelay(250, 700));
    }
  }
  // 실제 편집 가능한 노드를 찾는다 — SmartEditor ONE 조사에서 클래스 없는 순수
  // contenteditable div가 따로 있던 것이 확인됐다(naver-blog-auto-poster 초기
  // 구조 조사 결과 참고). ".se-title-text" 자체가 아니라 그 안의(또는 그 자신의)
  // 진짜 contenteditable 노드에 커서를 둬야 execCommand가 실제로 먹힌다.
  function findEditableTarget(container) {
    if (container.isContentEditable) return container;
    return container.querySelector('[contenteditable="true"]') || container;
  }
  // 실제 사람이 클릭한 것과 최대한 비슷하게 마우스 이벤트를 순서대로 발생시킨다 —
  // focus()만으로는 브라우저가 캐럿을 어디에 둘지 판단하지 못할 수 있어서, 클릭
  // 좌표 기반으로 캐럿 위치를 잡게 유도한다.
  function simulateClick(el) {
    const rect = el.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    };
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.dispatchEvent(new MouseEvent("mouseup", opts));
    el.dispatchEvent(new MouseEvent("click", opts));
  }
  // 클릭한 순간 SmartEditor ONE이 그 자리에 새 내부 iframe을 동적으로 만들어서 진짜
  // 편집 영역을 그 안에 넣는 것을 실사용 테스트로 확인했다(클릭 전엔 존재하지 않던
  // iframe이라 처음 스크립트 주입 시점엔 못 찾았음). 클릭 후 activeElement가
  // iframe이면 그 안으로 따라 들어간다(같은 출처라 contentDocument 접근 가능).
  function resolveActiveEditable() {
    let active = document.activeElement;
    let depth = 0;
    while (active && active.tagName === "IFRAME" && depth < 5) {
      let innerDoc;
      try {
        innerDoc = active.contentDocument;
      } catch {
        break;
      }
      if (!innerDoc) break;
      const innerActive =
        innerDoc.activeElement && innerDoc.activeElement !== innerDoc.body
          ? innerDoc.activeElement
          : innerDoc.body;
      active = innerActive;
      depth += 1;
    }
    return active;
  }
  function placeCursorAtEnd(container) {
    let el = findEditableTarget(container);
    simulateClick(el);
    el.focus();

    // 클릭 직후 진짜 활성 요소를 다시 확인 — iframe 안으로 포커스가 넘어갔으면 그
    // 문서 기준으로 캐럿을 다시 잡는다.
    const resolved = resolveActiveEditable();
    if (resolved && resolved !== document.body) {
      el = resolved;
    }

    const ownerDoc = el.ownerDocument;
    const range = ownerDoc.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = (el.ownerDocument.defaultView || window).getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return el;
  }
  // 제목 모듈도 ".se-text-paragraph"를 재사용하고 ".se-body"는 제목까지 포함하는
  // 컨테이너라서(데스크톱 앱에서 실사용 테스트로 확인된 함정), 컨테이너로 범위를
  // 좁히는 대신 ".se-documentTitle" 조상이 없는 첫 문단을 찾는다.
  function findBodyParagraph() {
    const candidates = document.querySelectorAll(".se-text-paragraph");
    for (const el of candidates) {
      if (!el.closest(".se-documentTitle")) return el;
    }
    return null;
  }

  const titleEl = document.querySelector(".se-title-text");
  if (!titleEl) return { ok: false, error: "이 프레임에는 제목 요소가 없습니다." };

  const titleEditable = placeCursorAtEnd(titleEl);
  const titleDiag = {
    isContentEditable: titleEditable.isContentEditable,
    ownerDocIsTop: titleEditable.ownerDocument === document,
    activeElementTag: document.activeElement?.tagName
  };
  await humanType(title, titleEditable.ownerDocument);
  await sleep(randomDelay(400, 800));

  const bodyEl = findBodyParagraph();
  if (!bodyEl) return { ok: false, error: "본문 요소를 찾지 못했습니다.", diag: titleDiag };

  const bodyEditable = placeCursorAtEnd(bodyEl);
  await humanType(body, bodyEditable.ownerDocument);
  await sleep(200);

  // 실제로 들어갔는지 검증한다 — execCommand는 에러 없이 조용히 아무것도 안 넣을 수
  // 있어서(2026-09-21 실사용 테스트에서 "입력 완료"가 떴는데 실제로는 비어있던 버그),
  // 결과에 실제 textContent를 같이 담아 확인한다. 검증은 원래 컨테이너(titleEl/bodyEl)
  // 가 아니라 실제로 캐럿을 둔 요소(titleEditable/bodyEditable) 기준으로 한다 —
  // 텍스트가 중첩 iframe 안에 들어갔다면 바깥 문서 기준 textContent는 그 내용을
  // 반영하지 못하기 때문이다.
  return {
    ok: true,
    verified: titleEditable.textContent.includes(title) && bodyEditable.textContent.includes(body),
    actualTitleText: titleEditable.textContent,
    actualBodyText: bodyEditable.textContent,
    diag: titleDiag
  };
}

// 네이버 블로그 탭을 창과 무관하게 찾고, execCommand가 실제로 먹히도록 그 탭/창을
// 화면 앞으로 가져온다(§ "1단계와 2단계의 함정" 참고 — 두 기능이 동일하게 필요).
async function findAndFocusNaverTab() {
  const tabs = await chrome.tabs.query({ url: "https://blog.naver.com/*" });
  if (tabs.length === 0) {
    throw new Error("네이버 블로그 탭을 찾지 못했습니다 — blog.naver.com 탭이 열려있는지 확인해주세요.");
  }
  const tab = tabs.find((t) => t.active) || tabs[0];
  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tab.id, { active: true });
  await new Promise((resolve) => setTimeout(resolve, 200));
  return tab;
}

const draftTitleInput = document.getElementById("draft-title");
const draftBodyInput = document.getElementById("draft-body");
const draftButton = document.getElementById("draft-btn");
const draftStatusBox = document.getElementById("draft-status");

draftButton.addEventListener("click", async () => {
  draftButton.disabled = true;
  draftStatusBox.textContent = "사람처럼 천천히 입력 중입니다... (시간이 좀 걸립니다)";

  try {
    const tab = await findAndFocusNaverTab();

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: injectedFillTitleAndBody,
      args: [{ title: draftTitleInput.value, body: draftBodyInput.value }]
    });

    const success = results.find((r) => r.result?.ok);
    if (success) {
      if (success.result.verified) {
        draftStatusBox.textContent = "입력 완료(실제 입력 확인됨). 탭에서 결과를 확인해주세요.";
      } else {
        draftStatusBox.textContent = `경고: execCommand는 실행됐지만 실제로 텍스트가 안 들어간 것 같습니다.\n실제 제목: "${success.result.actualTitleText}"\n실제 본문: "${success.result.actualBodyText}"\n진단: ${JSON.stringify(success.result.diag)}`;
      }
    } else {
      const failure = results.find((r) => r.result && !r.result.ok);
      draftStatusBox.textContent = `오류: ${failure?.result?.error || "제목/본문 요소를 찾지 못했습니다 (네이버 블로그 글쓰기 화면이 맞는지 확인해주세요)."}`;
    }
  } catch (error) {
    draftStatusBox.textContent = `오류: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    draftButton.disabled = false;
  }
});

// 2단계 — 태그/카테고리 자동 입력. 사람이 먼저 브라우저에서 "발행" 버튼을 직접 눌러
// 발행 설정창을 연 뒤에 써야 한다(이 확장도 그 버튼을 대신 누르지 않는다 — 1단계와
// 동일한 원칙). 태그 입력창(#tag-input)과 카테고리 목록(.item__dTdzo)은 제목/본문과
// 달리 클릭해도 새 iframe이 생기지 않는 일반 DOM 요소였다(실사용 테스트로 확인) —
// 그래도 같은 자기완결 함수 패턴을 그대로 따른다.
async function injectedRunPublishSettings({ tags, categoryName }) {
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function simulateClick(el) {
    const rect = el.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    };
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.dispatchEvent(new MouseEvent("mouseup", opts));
    el.dispatchEvent(new MouseEvent("click", opts));
  }
  function dispatchEnterKey(el) {
    const opts = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
    el.dispatchEvent(new KeyboardEvent("keydown", opts));
    el.dispatchEvent(new KeyboardEvent("keyup", opts));
  }
  async function humanType(text) {
    for (const char of text) {
      document.execCommand("insertText", false, char);
      await sleep(randomDelay(70, 170));
      if (Math.random() < 0.05) await sleep(randomDelay(250, 700));
    }
  }

  const errors = [];
  let tagsFilled = false;
  let categorySelected = false;

  if (Array.isArray(tags) && tags.length > 0) {
    const tagInput = document.querySelector("#tag-input");
    if (!tagInput) {
      errors.push("이 프레임에는 태그 입력창이 없습니다.");
    } else {
      for (const rawTag of tags) {
        const tag = rawTag.trim();
        if (!tag) continue;
        simulateClick(tagInput);
        tagInput.focus();
        await humanType(tag);
        await sleep(randomDelay(200, 450));
        dispatchEnterKey(tagInput);
        await sleep(randomDelay(400, 800));
      }
      tagsFilled = true;
    }
  }

  if (categoryName) {
    const trigger = document.querySelector(".selectbox_button__IxraO");
    if (!trigger) {
      errors.push("이 프레임에는 카테고리 선택 버튼이 없습니다.");
    } else {
      const listLayer = document.querySelector(".option_list_layer__o54Wx");
      const isOpen = listLayer && listLayer.offsetParent !== null;
      if (!isOpen) {
        simulateClick(trigger);
        await sleep(randomDelay(400, 800));
      }
      const items = document.querySelectorAll(".item__dTdzo");
      let target = null;
      for (const el of items) {
        if (el.textContent.includes(categoryName)) {
          target = el;
          break;
        }
      }
      if (!target) {
        errors.push(`"${categoryName}" 카테고리를 목록에서 찾지 못했습니다.`);
      } else {
        // <li> 자체가 아니라 그 안의 실제 클릭 대상(라벨 또는 라디오)을 클릭한다 —
        // 구조 조사에서 선택 로직이 <li>가 아니라 라벨/라디오에 걸려있는 것으로
        // 확인됐다(<li> 클릭만으로는 선택이 반영되지 않던 실사용 테스트 결과).
        const clickable =
          target.querySelector(".radio_label__zTXH0") ||
          target.querySelector('input[type="radio"]') ||
          target.querySelector(".option__y4XPa") ||
          target;
        simulateClick(clickable);
        await sleep(randomDelay(300, 600));
        // 실제로 반영됐는지 트리거 버튼 텍스트로 검증한다(태그/본문 입력 때와 같은
        // 이유 — 클릭이 에러 없이 끝났다고 실제 선택까지 보장하지 않는다).
        const afterText = document.querySelector(".selectbox_button__IxraO")?.textContent || "";
        categorySelected = afterText.includes(categoryName);
        if (!categorySelected) {
          errors.push(`카테고리 선택이 반영되지 않은 것 같습니다(트리거 버튼 텍스트: "${afterText}").`);
        }
      }
    }
  }

  if (!tagsFilled && !categorySelected) {
    return { ok: false, error: errors.join(" / ") || "이 프레임에는 발행 설정 요소가 없습니다." };
  }
  return { ok: true, tagsFilled, categorySelected, errors };
}

const publishTagsInput = document.getElementById("publish-tags");
const publishCategoryInput = document.getElementById("publish-category");
const publishButton = document.getElementById("publish-btn");
const publishStatusBox = document.getElementById("publish-status");

publishButton.addEventListener("click", async () => {
  publishButton.disabled = true;
  publishStatusBox.textContent = "태그/카테고리를 입력하는 중입니다...";

  const tags = publishTagsInput.value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const categoryName = publishCategoryInput.value.trim();

  try {
    const tab = await findAndFocusNaverTab();
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: injectedRunPublishSettings,
      args: [{ tags, categoryName }]
    });

    const success = results.find((r) => r.result?.ok);
    if (success) {
      const { errors: warnings } = success.result;
      publishStatusBox.textContent =
        warnings && warnings.length > 0
          ? `일부만 완료됨. 탭에서 결과를 확인해주세요.\n${warnings.join("\n")}`
          : "입력 완료(실제 선택 확인됨). 탭에서 결과를 확인해주세요.";
    } else {
      const failure = results.find((r) => r.result && !r.result.ok);
      publishStatusBox.textContent = `오류: ${failure?.result?.error || "발행 설정 요소를 찾지 못했습니다 (먼저 브라우저에서 '발행' 버튼을 눌러 설정창을 열어주세요)."}`;
    }
  } catch (error) {
    publishStatusBox.textContent = `오류: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    publishButton.disabled = false;
  }
});
