import { test } from "node:test";
import assert from "node:assert/strict";
import { ACCOUNT_KEYS, DEVICE_KEYS, LEGACY_KEY, addQuarantine, connectPlan, mayShare, normEmail, sameOwnerGen, sameQuarantine } from "../extension/lib/ownership.js";

test("QA17-003 계정 기록 칸과 기기 공용 칸은 겹치지 않고, 계정 기록에 결과·상태·번호·통계가 들어 있다", () => {
  assert.deepEqual(ACCOUNT_KEYS.filter((k) => DEVICE_KEYS.includes(k)), []);
  for (const k of ["lastResult", "states", "phones", "history", "eventLog", "aiSummary", "weeklyReport", "kakaoFailed", "telegramFailed", "settingsCache", "consentAt"]) assert.ok(ACCOUNT_KEYS.includes(k), k);
  for (const k of ["deviceId", "pagesDay", "stoppedDate", "complexInfo"]) assert.ok(!ACCOUNT_KEYS.includes(k), k);
});

test("QA17-003 연결 교체 판정: 같은 계정 유지·다른 계정 지움·대소문자 무시", () => {
  assert.deepEqual(connectPlan({ newEmail: "A@x.com", dataOwner: "a@x.com", busy: false }), { action: "keep", owner: "a@x.com" });
  assert.deepEqual(connectPlan({ newEmail: "b@x.com", dataOwner: "a@x.com", busy: false }), { action: "wipe", owner: "b@x.com" });
  // 옛 형식(dataOwner 없음)은 예전 연결 이메일이 같아 보여도 소유 근거가 없으니 격리 보존(legacy)
  assert.deepEqual(connectPlan({ newEmail: "a@x.com", busy: false }), { action: "legacy", owner: "a@x.com" });
  assert.equal(connectPlan({ newEmail: "a@x.com", dataOwner: "", busy: false }).action, "legacy");
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

test("QA17-003 옛 기록 격리: 원값 그대로·소유 불명 표시·기존 격리 덮어쓰지 않고 덧붙임", () => {
  const snap = { states: { x: 1 }, phones: { 1: "번호" }, history: [{ n: 1 }] };
  const first = addQuarantine(undefined, snap, { at: "t1", hintEmail: " A@x.com " });
  assert.deepEqual(first, [{ at: "t1", ownerUnknown: true, hintEmail: "a@x.com", keys: snap }]);
  const second = addQuarantine(first, { log: ["줄"] }, { at: "t2" });
  assert.equal(second.length, 2);
  assert.deepEqual(second[0], first[0]); // 기존 항목 그대로
  assert.deepEqual(second[1], { at: "t2", ownerUnknown: true, hintEmail: null, keys: { log: ["줄"] } });
  // 원본 스냅샷을 바꿔도 격리 항목은 영향 없음(얕은 복사 확인)
  snap.extra = 1;
  assert.equal("extra" in first[0].keys, false);
});

test("QA17-003 격리 칸은 계정 기록·기기 칸 어디에도 속하지 않음(전환 때 지워지지 않음)", () => {
  assert.equal(ACCOUNT_KEYS.includes(LEGACY_KEY), false);
  assert.equal(DEVICE_KEYS.includes(LEGACY_KEY), false);
});

test("QA17-003 격리 저장 확인: 다시 읽은 값이 같아야만 원키 삭제", () => {
  const v = addQuarantine([], { states: { a: 1 } }, { at: "t" });
  assert.equal(sameQuarantine(JSON.parse(JSON.stringify(v)), v), true);
  assert.equal(sameQuarantine(undefined, v), false);
  assert.equal(sameQuarantine([], v), false);
  // 키 순서만 다르면 같음, 값이 다르면 다름
  assert.equal(sameQuarantine([{ keys: { b: 1, a: { y: 2, x: 1 } }, at: "t" }], [{ at: "t", keys: { a: { x: 1, y: 2 }, b: 1 } }]), true);
  assert.equal(sameQuarantine([{ keys: { a: 1 } }], [{ keys: { a: 2 } }]), false);
});

test("QA17-003 P2 격리 칸에 배열이 아닌 값이 있으면 덮어쓰지 않고 null(멈춤), 키 없음·배열만 진행", () => {
  const snap = { states: { a: 1 } };
  for (const bad of [{ mustPreserve: true }, "문자", 42, null, true]) assert.equal(addQuarantine(bad as never, snap, { at: "t" }), null, String(JSON.stringify(bad)));
  assert.equal(addQuarantine(undefined, snap, { at: "t" })?.length, 1);
  assert.equal(addQuarantine([], snap, { at: "t" })?.length, 1);
  assert.equal(addQuarantine([{ old: 1 }] as never, snap, { at: "t" })?.length, 2);
});
