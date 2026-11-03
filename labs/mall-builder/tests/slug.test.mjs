// 실행: node --test tests/   (Node 23.6+ 는 .ts 를 바로 읽는다)
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugError, normalizeSlug, storeNameError } from "../src/lib/slug.ts";

test("쓸 수 있는 몰 주소", () => {
  for (const ok of ["abc", "my-shop", "shop2026", "a1-b2-c3", "x".repeat(30)]) {
    assert.equal(slugError(ok), null, ok);
  }
});

test("대소문자·앞뒤 공백은 정리해서 판단", () => {
  assert.equal(normalizeSlug("  My-Shop "), "my-shop");
  assert.equal(slugError("  My-Shop "), null);
});

test("형식이 틀린 주소는 거부", () => {
  for (const bad of ["ab", "-shop", "shop-", "my--shop", "my_shop", "한글몰", "x".repeat(31), ""]) {
    assert.notEqual(slugError(bad), null, bad);
  }
});

test("예약어는 거부", () => {
  for (const reserved of ["admin", "api", "login", "settings", "new"]) {
    assert.match(slugError(reserved) ?? "", /쓸 수 없는/, reserved);
  }
});

test("몰 이름 길이", () => {
  assert.equal(storeNameError("알파상회"), null);
  assert.notEqual(storeNameError("   "), null);
  assert.notEqual(storeNameError("가".repeat(41)), null);
});
