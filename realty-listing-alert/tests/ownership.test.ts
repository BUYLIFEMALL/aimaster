import { test } from "node:test";
import assert from "node:assert/strict";
import { ACCOUNT_KEYS, DEVICE_KEYS, connectPlan, mayShare, normEmail, sameOwnerGen } from "../extension/lib/ownership.js";

test("QA17-003 계정 기록 칸과 기기 공용 칸은 겹치지 않고, 계정 기록에 결과·상태·번호·통계가 들어 있다", () => {
  assert.deepEqual(ACCOUNT_KEYS.filter((k) => DEVICE_KEYS.includes(k)), []);
  for (const k of ["lastResult", "states", "phones", "history", "eventLog", "aiSummary", "weeklyReport", "kakaoFailed", "telegramFailed", "settingsCache", "consentAt"]) assert.ok(ACCOUNT_KEYS.includes(k), k);
  for (const k of ["deviceId", "pagesDay", "stoppedDate", "complexInfo"]) assert.ok(!ACCOUNT_KEYS.includes(k), k);
});

test("QA17-003 연결 교체 판정: 같은 계정 유지·다른 계정 지움·대소문자 무시", () => {
  assert.deepEqual(connectPlan({ newEmail: "A@x.com", dataOwner: "a@x.com", busy: false }), { action: "keep", owner: "a@x.com" });
  assert.deepEqual(connectPlan({ newEmail: "b@x.com", dataOwner: "a@x.com", busy: false }), { action: "wipe", owner: "b@x.com" });
  // 옛 형식(dataOwner 없음)은 예전 connectedEmail로 판단
  assert.equal(connectPlan({ newEmail: "a@x.com", prevConnectedEmail: "A@x.com", busy: false }).action, "keep");
  assert.equal(connectPlan({ newEmail: "b@x.com", prevConnectedEmail: "a@x.com", busy: false }).action, "wipe");
  // 아무 기록도 없으면 지워도 잃을 것이 없다
  assert.equal(connectPlan({ newEmail: "b@x.com", busy: false }).action, "wipe");
});

test("QA17-003 연결 교체 거절: 수집 중·계정 확인 실패는 아무것도 바꾸지 않음", () => {
  assert.deepEqual(connectPlan({ newEmail: "b@x.com", dataOwner: "a@x.com", busy: true }), { action: "reject", reason: "running" });
  assert.deepEqual(connectPlan({ newEmail: null, dataOwner: "a@x.com", busy: false }), { action: "reject", reason: "whoami" });
  assert.deepEqual(connectPlan({ newEmail: "  ", dataOwner: "a@x.com", busy: false }), { action: "reject", reason: "whoami" });
});

test("QA17-003 웹에 넘기기: 로그인 = 연결 = 소유, 결과 owner 필요 시 옛 결과 차단", () => {
  const base = { requestEmail: "b@x.com", connectedEmail: "B@x.com", dataOwner: "b@x.com" };
  assert.equal(mayShare(base), true);
  assert.equal(mayShare({ ...base, dataOwner: "a@x.com" }), false); // 기록은 A 것
  assert.equal(mayShare({ ...base, dataOwner: "" }), false); // 소유 표시 없음
  assert.equal(mayShare({ ...base, connectedEmail: "a@x.com" }), false); // 확장은 A에 연결
  assert.equal(mayShare({ ...base, requestEmail: "" }), false);
  assert.equal(mayShare({ ...base, needResultOwner: true, resultOwner: "b@x.com" }), true);
  assert.equal(mayShare({ ...base, needResultOwner: true, resultOwner: undefined }), false); // 옛 결과
  assert.equal(mayShare({ ...base, needResultOwner: true, resultOwner: "a@x.com" }), false);
});

test("QA17-003 저장 직전 재확인: 소유자·세대가 그대로일 때만 저장", () => {
  assert.equal(sameOwnerGen({ owner: "a@x.com", gen: 1 }, { owner: "A@x.com", gen: 1 }), true);
  assert.equal(sameOwnerGen({ owner: "a@x.com", gen: 1 }, { owner: "b@x.com", gen: 2 }), false);
  assert.equal(sameOwnerGen({ owner: "a@x.com", gen: 1 }, { owner: "a@x.com", gen: 2 }), false); // A→B→A 다시 와도 세대가 다르면 저장 안 함
  assert.equal(sameOwnerGen({ owner: "", gen: 0 }, { owner: "", gen: 0 }), false);
  assert.equal(normEmail(" A@X.com "), "a@x.com");
});
