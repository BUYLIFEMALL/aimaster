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

test("v1.09: 거래 입장은 거래 종류에 맞아야 한다", async () => {
  const { isSideOf, PROPERTY_TYPES } = await import("../src/lib/desk/consent.ts");
  assert.ok(isSideOf("매매", "매수") && isSideOf("매매", "매도"));
  assert.ok(isSideOf("전세", "임차") && isSideOf("월세", "임대"));
  assert.ok(!isSideOf("매매", "임차") && !isSideOf("전세", "매수") && !isSideOf("월세", ""));
  for (const t of ["다세대/빌라", "다가구/주택", "건물", "분양권"]) assert.ok(PROPERTY_TYPES.includes(t));
  assert.ok(!PROPERTY_TYPES.includes("빌라·주택"));
});
