// 실행: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { autoDueAt, parseAutoDays } from "../src/lib/autoProgress.ts";

test("자동 일수 입력: 비우면 끔, 1~60 정수만(DB 제약과 같음)", () => {
  assert.deepEqual(parseAutoDays("", "자동 배송 완료"), { ok: true, value: null });
  assert.deepEqual(parseAutoDays(" 7 ", "자동 배송 완료"), { ok: true, value: 7 });
  assert.deepEqual(parseAutoDays("60", "자동 구매 확정"), { ok: true, value: 60 });
  for (const bad of ["0", "61", "-1", "1.5", "abc", "7일"]) assert.equal(parseAutoDays(bad, "x").ok, false, bad);
  const r = parseAutoDays("0", "자동 구매 확정");
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.error, /자동 구매 확정/);
});

test("예정 시각: 그 상태가 된 시각 + 일수, 꺼져 있거나 시각이 없으면 없음", () => {
  assert.equal(autoDueAt("2026-11-01T00:00:00Z", 7)?.toISOString(), "2026-11-08T00:00:00.000Z");
  assert.equal(autoDueAt(null, 7), null);
  assert.equal(autoDueAt("2026-11-01T00:00:00Z", null), null);
  assert.equal(autoDueAt("엉터리", 7), null);
});
