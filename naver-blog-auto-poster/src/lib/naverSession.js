"use strict";

const fs = require("node:fs");
const path = require("node:path");

// 프로토타입 1 — 네이버 로그인 세션 유지 검증.
//
// 계정 보호 원칙(README 참고): 아이디/비밀번호를 절대 자동으로 입력하지 않는다.
// 로그인/보안확인 화면이 뜨면 사람이 보이는 브라우저 창에서 직접 완료하도록 기다리기만
// 한다. 로그인이 끝나면 그 세션은 로컬 프로필 폴더에 저장되어, 다음 실행부터는
// 재로그인 없이 재사용된다.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 현재 페이지가 "로그인됨 / 로그인 필요 / 보안확인(캡챠 등)" 중 어느 상태인지 판별한다.
 * 아이디/비밀번호 입력창이 보이면 로그인 필요, 네이버의 보안 확인 관련 문구/도메인이
 * 감지되면 보안확인, 둘 다 아니면 로그인된 것으로 본다.
 */
async function detectLoginState(page) {
  const url = page.url();
  const hasCredentialInputs = await page
    .locator("#id, #pw")
    .count()
    .then((count) => count > 0)
    .catch(() => false);

  if (/nid\.naver\.com\/nidlogin/i.test(url) || hasCredentialInputs) {
    return "login_required";
  }

  const bodyText = await page.locator("body").innerText({ timeout: 2000 }).catch(() => "");
  const looksLikeSecurityHost = /nid\.naver\.com/i.test(url) || /captcha|security|verification/i.test(url);
  const mentionsSecurityCheck = /캡챠|보안\s*확인|비정상적|본인\s*확인|자동\s*입력\s*방지/i.test(bodyText);
  if (looksLikeSecurityHost && mentionsSecurityCheck) {
    return "security_check";
  }

  return "logged_in";
}

/**
 * 로그인 상태가 될 때까지 대기한다(사람이 직접 로그인/보안확인을 완료할 시간을 준다).
 * 같은 상태로 연속 2회 이상 확인돼야 "안정적으로 로그인됨"으로 판단한다.
 */
async function waitUntilLoggedIn(page, { onStatus, timeoutMs = 10 * 60 * 1000, pollMs = 1500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let stableReads = 0;
  let lastState = "";

  while (Date.now() < deadline) {
    const state = await detectLoginState(page);
    if (state !== lastState) {
      lastState = state;
      onStatus?.(state);
    }

    if (state === "logged_in") {
      stableReads += 1;
      if (stableReads >= 2) return;
    } else {
      stableReads = 0;
    }

    await sleep(pollMs);
  }

  throw new Error("제한 시간 안에 네이버 로그인을 확인하지 못했습니다.");
}

/**
 * 계정별 브라우저 프로필 디렉터리. 계정마다 세션을 분리해서, 여러 네이버 계정을
 * 나중에 등록해도 서로 섞이지 않게 한다.
 */
function profileDirFor(runtimeRoot, accountKey) {
  const safeKey = String(accountKey || "default").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return path.join(runtimeRoot, "browser-profiles", safeKey);
}

/**
 * 네이버 로그인 세션을 열고(필요하면 사람이 로그인할 때까지 기다리고) 확인한다.
 * 반환된 context/page는 호출한 쪽에서 필요할 때 닫아야 한다 — 세션 자체는 프로필
 * 폴더에 저장되어 있으므로, 창을 닫아도 다음 실행 때 그대로 재사용된다.
 */
async function ensureNaverSession({ runtimeRoot, accountKey = "default", onStatus } = {}) {
  let chromium;
  try {
    ({ chromium } = require("playwright-core"));
  } catch {
    throw new Error("playwright-core가 설치되어 있지 않습니다. npm install을 먼저 실행하세요.");
  }

  const profileDir = profileDirFor(runtimeRoot, accountKey);
  fs.mkdirSync(profileDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1280, height: 860 },
    args: ["--no-first-run", "--hide-crash-restore-bubble", "--disable-session-crashed-bubble"]
  });

  try {
    const page = context.pages()[0] || (await context.newPage());
    await page.goto("https://naver.com", { waitUntil: "domcontentloaded", timeout: 45000 });

    const initialState = await detectLoginState(page);
    onStatus?.(initialState);

    if (initialState !== "logged_in") {
      onStatus?.("waiting_for_manual_login");
      await waitUntilLoggedIn(page, { onStatus });
    }

    return { context, page, profileDir };
  } catch (error) {
    await context.close().catch(() => {});
    throw error;
  }
}

module.exports = {
  detectLoginState,
  waitUntilLoggedIn,
  ensureNaverSession,
  profileDirFor
};
