import { test } from "node:test";
import assert from "node:assert/strict";
import { smsBytes, isLongSms, SMS_MAX_BYTES } from "../src/lib/desk/smsBytes.ts";

test("영문·숫자·기호·줄바꿈 1바이트, 한글 2바이트", () => {
  assert.equal(smsBytes("abc 123!"), 8);
  assert.equal(smsBytes("가나다"), 6);
  assert.equal(smsBytes("가\nA"), 4);
  assert.equal(smsBytes(""), 0);
});

test("한글 45자는 단문, 46자는 장문(글자 수 90 기준과 다름)", () => {
  assert.equal(SMS_MAX_BYTES, 90);
  assert.equal(isLongSms("가".repeat(45)), false);
  assert.equal(isLongSms("가".repeat(46)), true);
  assert.equal(isLongSms("a".repeat(90)), false);
  assert.equal(isLongSms("a".repeat(91)), true);
});
