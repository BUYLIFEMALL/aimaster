import test from "node:test";
import assert from "node:assert/strict";
import { claimDecision, needsCheck, isUncertainFailure, STALE_MS } from "../src/lib/uploadGuard.ts";

const now = Date.parse("2026-10-29T12:00:00Z");
const recent = new Date(now - 60_000).toISOString();
const old = new Date(now - STALE_MS - 1000).toISOString();

test("DUP-4 선점 판단: 처음·실패는 바로 진행", () => {
  assert.equal(claimDecision(null, recent, now, false), "go");
  assert.equal(claimDecision("unposted", recent, now, false), "go");
  assert.equal(claimDecision("failed", recent, now, false), "go");
});

test("DUP-4 선점 판단: 올리는 중이면 확인해도 거절", () => {
  assert.equal(claimDecision("posting", recent, now, false), "busy");
  assert.equal(claimDecision("posting", recent, now, true), "busy");
  assert.equal(claimDecision("posting", null, now, true), "busy");
});

test("DUP-4 선점 판단: 이미 올림·오래된 올리는 중은 회원 확인이 있어야 진행", () => {
  assert.equal(claimDecision("posted", recent, now, false), "confirm");
  assert.equal(claimDecision("posted", recent, now, true), "go");
  assert.equal(claimDecision("posting", old, now, false), "confirm");
  assert.equal(claimDecision("posting", old, now, true), "go");
});

test("DUP-4 화면: 오래된 올리는 중만 확인 필요", () => {
  assert.equal(needsCheck("posting", old, now), true);
  assert.equal(needsCheck("posting", recent, now), false);
  assert.equal(needsCheck("failed", old, now), false);
});

test("DUP-4 실패 분류: 보내기 전·4xx는 확실한 실패, 보낸 뒤 연결 오류·5xx는 불확실", () => {
  assert.equal(isUncertainFailure(false, "fetch failed"), false);
  assert.equal(isUncertainFailure(true, "유튜브 업로드에 실패했습니다. (400) bad"), false);
  assert.equal(isUncertainFailure(true, "유튜브 업로드에 실패했습니다. (503) busy"), true);
  assert.equal(isUncertainFailure(true, "fetch failed"), true);
});
