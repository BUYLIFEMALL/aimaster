// 계정 기록 소유 규칙(2026-11-17 QA17-003, RE-20261117-04 후속 P1) — 순수 함수만(시험 tests/ownership.test.ts).
// 같은 브라우저 확장을 다른 계정으로 다시 연결하면 이전 계정의 기록이 새 계정 화면·다음 회차로 넘어가던 문제를 막는다.
//  - 기록마다 소유 계정(dataOwner, lastResult.owner)을 남긴다.
//  - 다른 계정으로 연결을 바꾸면 아래 「계정 기록 칸」만 지운다. 같은 계정 재연결은 그대로 둔다.
//  - 기기 공용 칸(deviceId·하루 사용량·차단 날짜·공개 자료 캐시·규칙 캐시)은 지우지 않는다.

/** 계정마다 따로인 기록 칸 — 다른 계정으로 바꾸면 지운다 */
export const ACCOUNT_KEYS = [
  "lastResult", "states", "history", "eventLog", "aiSummary", "weeklyReport", "weeklySentKey", "aiSentDate",
  "tradeMissing", "phones", "settingsCache", "kakaoFailed", "telegramFailed", "runCursor", "consentAt", "log",
];

/** 기기 공용 칸 — 계정을 바꿔도 남긴다(시험에서 ACCOUNT_KEYS와 겹치지 않는지 확인) */
export const DEVICE_KEYS = ["deviceId", "pagesDay", "limitDate", "limitNoticeDate", "stoppedDate", "tradeCache", "complexInfo", "rulesCache", "tick", "nextDueAt"];

export function normEmail(e) {
  return String(e ?? "").trim().toLowerCase();
}

/**
 * 연결 교체 판정. newEmail = 새 연결 코드로 서버에 물은 계정(실패면 빈 값).
 * 기존 소유자는 dataOwner, 없으면(옛 형식) 예전 connectedEmail로 본다.
 * 반환: { action: "reject", reason: "running"|"whoami" } | { action: "keep"|"wipe", owner }
 */
export function connectPlan({ newEmail, dataOwner, prevConnectedEmail, busy }) {
  if (busy) return { action: "reject", reason: "running" };
  const next = normEmail(newEmail);
  if (!next) return { action: "reject", reason: "whoami" }; // 확인 실패는 아무것도 바꾸지 않는다(비파괴·차단)
  const prev = normEmail(dataOwner) || normEmail(prevConnectedEmail);
  return { action: prev && prev === next ? "keep" : "wipe", owner: next };
}

/**
 * 웹 화면에 기록을 넘겨도 되는가: 웹 로그인 계정 = 확장 연결 계정 = 기록 소유 계정.
 * needResultOwner면 lastResult.owner도 같아야 한다(owner 없는 옛 결과는 넘기지 않음 — 다음 회차부터 보임).
 */
export function mayShare({ requestEmail, connectedEmail, dataOwner, resultOwner, needResultOwner = false }) {
  const r = normEmail(requestEmail);
  if (!r || r !== normEmail(connectedEmail) || r !== normEmail(dataOwner)) return false;
  if (needResultOwner && normEmail(resultOwner) !== r) return false;
  return true;
}

/** 수집 시작 때의 소유 상태와 지금(저장 직전)이 같은가 — 다르면 이번 회차 기록을 저장하지 않는다 */
export function sameOwnerGen(start, now) {
  return !!start && !!now && normEmail(start.owner) !== "" && normEmail(start.owner) === normEmail(now.owner) && Number(start.gen || 0) === Number(now.gen || 0);
}
