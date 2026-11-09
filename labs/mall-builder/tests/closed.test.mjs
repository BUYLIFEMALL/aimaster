import { test } from "node:test";
import assert from "node:assert/strict";
import { canEnterClosed, openWhileClosed, readClosed } from "../src/lib/closed.ts";

test("폐쇄몰 설정 읽기 — 없거나 이상한 값은 꺼짐", () => {
  assert.deepEqual(readClosed(null), { enabled: false, approval: false, code: false, notice: "" });
  assert.deepEqual(readClosed({ guest_order: true }), { enabled: false, approval: false, code: false, notice: "" });
  assert.deepEqual(readClosed({ closed: { enabled: true, approval: true, code: false, notice: "회원 전용" } }), { enabled: true, approval: true, code: false, notice: "회원 전용" });
  assert.equal(readClosed({ closed: { enabled: "true" } }).enabled, false);
});

test("승인 전에도 여는 경로 — 가입·마이페이지만", () => {
  assert.equal(openWhileClosed("/s/abc/join", "abc"), true);
  assert.equal(openWhileClosed("/s/abc/my", "abc"), true);
  assert.equal(openWhileClosed("/s/abc", "abc"), false);
  assert.equal(openWhileClosed("/s/abc/p/1", "abc"), false);
  assert.equal(openWhileClosed("/s/abc/myshop", "abc"), false);
  assert.equal(openWhileClosed("/s/other/join", "abc"), false);
  assert.equal(openWhileClosed(null, "abc"), false);
});

test("입장 판단 — 꺼짐·운영자·승인만", () => {
  const on = { enabled: true, approval: true, code: true, notice: "" };
  assert.equal(canEnterClosed({ ...on, enabled: false }, false, null), true);
  assert.equal(canEnterClosed(on, true, null), true);
  assert.equal(canEnterClosed(on, false, "approved"), true);
  assert.equal(canEnterClosed(on, false, "pending"), false);
  assert.equal(canEnterClosed(on, false, null), false);
});
