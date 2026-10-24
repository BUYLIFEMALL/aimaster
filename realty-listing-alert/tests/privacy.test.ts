// 중개사 상호의 전화번호 지우기 시험(개선 L-1) — node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { stripPhoneNumbers } from "../extension/lib/privacy.js";

test("상호 뒤에 붙은 지역번호 전화를 지운다(0단계 실제 모양)", () => {
  assert.equal(stripPhoneNumbers("백송공인중개사사무소031)917-1234"), "백송공인중개사사무소");
  assert.equal(stripPhoneNumbers("행복부동산 02-123-4567"), "행복부동산");
  assert.equal(stripPhoneNumbers("(031) 917 1234 일산공인"), "일산공인");
});

test("휴대폰·대표번호·숫자만 붙은 번호도 지운다", () => {
  assert.equal(stripPhoneNumbers("미래공인중개사 010-1234-5678"), "미래공인중개사");
  assert.equal(stripPhoneNumbers("미래공인중개사01012345678"), "미래공인중개사");
  assert.equal(stripPhoneNumbers("대형중개 1588-1234"), "대형중개");
});

test("번호가 없으면 그대로, 상호 안 숫자는 남긴다", () => {
  assert.equal(stripPhoneNumbers("백송공인중개사사무소"), "백송공인중개사사무소");
  assert.equal(stripPhoneNumbers("21세기부동산"), "21세기부동산");
  assert.equal(stripPhoneNumbers("제일 3단지 공인"), "제일 3단지 공인");
  assert.equal(stripPhoneNumbers(undefined), "");
});
