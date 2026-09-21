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

const draftTitleInput = document.getElementById("draft-title");
const draftBodyInput = document.getElementById("draft-body");
const draftButton = document.getElementById("draft-btn");
const draftStatusBox = document.getElementById("draft-status");

draftButton.addEventListener("click", async () => {
  draftButton.disabled = true;
  draftStatusBox.textContent = "사람처럼 천천히 입력 중입니다... (시간이 좀 걸립니다)";

  try {
    // 사이드패널이 붙어있는 창과 네이버 블로그 탭이 열려있는 창이 서로 다를 수 있다
    // (실사용 테스트에서 실제로 확인됨 — "activeTab in currentWindow"로 찾으면 사이드
    // 패널이 있는 창에서 활성화된 엉뚱한 탭을 잡게 됨). 창과 무관하게 blog.naver.com
    // 탭을 직접 찾는다.
    const tabs = await chrome.tabs.query({ url: "https://blog.naver.com/*" });
    if (tabs.length === 0) {
      throw new Error("네이버 블로그 탭을 찾지 못했습니다 — blog.naver.com 탭이 열려있는지 확인해주세요.");
    }
    const tab = tabs.find((t) => t.active) || tabs[0];

    // execCommand("insertText")는 실제 키보드 입력을 흉내내는 명령이라, 그 탭/창이
    // 실제로 화면에서 포커스된 상태여야 동작하는 것으로 보인다(백그라운드 창에서는
    // "입력 완료"로 응답이 와도 실제로는 아무것도 안 들어가는 문제를 실사용 테스트에서
    // 확인함). 스크립트 실행 전에 그 탭/창을 먼저 활성화한다.
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id, { active: true });
    await new Promise((resolve) => setTimeout(resolve, 200));

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
