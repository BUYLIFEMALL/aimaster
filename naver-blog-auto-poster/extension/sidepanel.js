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
