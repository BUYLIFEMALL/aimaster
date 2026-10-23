import { test } from "node:test";
import assert from "node:assert/strict";
import { checkReplaceRange, round2, fmtTime } from "../lib/replaceRange.ts";

test("구간 다시 만들기 범위 검사", () => {
  assert.equal(checkReplaceRange(10, 30, 180), null);
  assert.match(checkReplaceRange(10, 15, 180), /10초 이상/);
  assert.match(checkReplaceRange(30, 20, 180), /뒤여야/);
  assert.match(checkReplaceRange(0, 100, 180), /절반/);
  assert.match(checkReplaceRange(170, 190, 180), /곡 길이/);
  assert.match(checkReplaceRange(-1, 20, 180), /0초 이상/);
  assert.equal(checkReplaceRange(0, 60, null), null);
});

test("소수 2자리·시간 표시", () => {
  assert.equal(round2(10.456), 10.46);
  assert.equal(fmtTime(70), "1:10");
  assert.equal(fmtTime(9.9), "0:09");
});
