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
  async function humanType(text) {
    for (const char of text) {
      if (char === "\n") {
        document.execCommand("insertParagraph");
      } else {
        document.execCommand("insertText", false, char);
      }
      await sleep(randomDelay(70, 170));
      if (Math.random() < 0.05) await sleep(randomDelay(250, 700));
    }
  }
  function placeCursorAtEnd(el) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
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

  placeCursorAtEnd(titleEl);
  await humanType(title);
  await sleep(randomDelay(400, 800));

  const bodyEl = findBodyParagraph();
  if (!bodyEl) return { ok: false, error: "본문 요소를 찾지 못했습니다." };

  placeCursorAtEnd(bodyEl);
  await humanType(body);

  return { ok: true };
}

const draftTitleInput = document.getElementById("draft-title");
const draftBodyInput = document.getElementById("draft-body");
const draftButton = document.getElementById("draft-btn");
const draftStatusBox = document.getElementById("draft-status");

draftButton.addEventListener("click", async () => {
  draftButton.disabled = true;
  draftStatusBox.textContent = "사람처럼 천천히 입력 중입니다... (시간이 좀 걸립니다)";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error("활성 탭을 찾지 못했습니다.");

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: injectedFillTitleAndBody,
      args: [{ title: draftTitleInput.value, body: draftBodyInput.value }]
    });

    const success = results.find((r) => r.result?.ok);
    if (success) {
      draftStatusBox.textContent = "입력 완료. 탭에서 결과를 확인해주세요.";
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
