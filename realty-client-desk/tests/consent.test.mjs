import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, parseManwon } from "../src/lib/desk/consent.ts";

test("휴대폰 번호만 받고 010-1234-5678로", () => {
  assert.equal(normalizePhone("01012345678"), "010-1234-5678");
  assert.equal(normalizePhone("010-123-4567"), "010-123-4567");
  assert.equal(normalizePhone("02-123-4567"), null);
  assert.equal(normalizePhone(""), null);
});

test("예산 읽기(만 원)", () => {
  assert.equal(parseManwon("8억"), 80000);
  assert.equal(parseManwon("3.5억"), 35000);
  assert.equal(parseManwon("5,000"), 5000);
  assert.equal(parseManwon(""), null);
  assert.ok(Number.isNaN(parseManwon("팔억")));
});
