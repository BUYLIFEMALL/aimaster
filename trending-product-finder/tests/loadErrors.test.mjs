// v1.11 조회 장애/빈 상태 구분 — 판정 함수 단위 테스트
import { test } from "node:test";
import assert from "node:assert/strict";
import { failedQueries, logLoadErrors } from "../lib/loadErrors.ts";

test("오류가 있는 조회 이름만 고른다(빈 결과는 오류 아님)", () => {
  assert.deepEqual(failedQueries({ a: { error: null }, b: { error: { message: "timeout" } }, c: {} }), ["b"]);
  assert.deepEqual(failedQueries({}), []);
});

test("로그에는 조회 이름·오류 코드만 남긴다", () => {
  const logs = []; const orig = console.error; console.error = m => logs.push(m);
  try { assert.deepEqual(logLoadErrors("reports", { 목록: { error: { code: "57014", message: "canceling statement" } }, 개수: { error: null } }), ["목록"]); }
  finally { console.error = orig; }
  assert.deepEqual(logs, ["[load-error] reports · 목록: 57014 canceling statement"]);
});
