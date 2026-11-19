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

import { smsEstimate, OPTOUT_PLACEHOLDER, OPTOUT_TOKEN_LEN } from "../src/lib/desk/smsBytes.ts";
import { randomBytes } from "node:crypto";
import { composeAd, adFooter, adHeader } from "../src/lib/desk/adRules.ts";

test("자리표시는 실제 토큰(16자)과 같은 길이로 센다 — 실제 발송 문구와 바이트가 같다", () => {
  const token = randomBytes(12).toString("base64url");
  assert.equal(token.length, OPTOUT_TOKEN_LEN, "실제 토큰 생성 방식(listings.ts)과 길이가 같아야 함");
  const o = { office_name: "행복부동산", office_phone: "02-123-4567", office_address: null, reject_080: null };
  const url = "https://realty-client-desk.buylife.xyz/u/";
  const body = "급매 84㎡";
  const preview = `${adHeader(o)}\n${body}\n${adFooter(o, url + OPTOUT_PLACEHOLDER)}`;
  const real = composeAd(o, body, url + token);
  assert.equal(smsEstimate(preview).bytes, smsBytes(real));
});

test("경계: 실제 문구 90바이트는 단문, 91바이트는 장문", () => {
  const o = { office_name: "A", office_phone: "1", office_address: null, reject_080: null };
  const url = "https://x.kr/u/";
  const fixed = smsBytes(`${adHeader(o)}\n\n${adFooter(o, url + "x".repeat(16))}`);
  const at90 = `${adHeader(o)}\n${"b".repeat(90 - fixed)}\n${adFooter(o, url + OPTOUT_PLACEHOLDER)}`;
  const at91 = `${adHeader(o)}\n${"b".repeat(91 - fixed)}\n${adFooter(o, url + OPTOUT_PLACEHOLDER)}`;
  assert.deepEqual(smsEstimate(at90), { bytes: 90, exact: true, long: false });
  assert.deepEqual(smsEstimate(at91), { bytes: 91, exact: true, long: true });
});

test("이모지 등 확실히 셀 수 없는 글자가 있으면 추정(exact=false), 한글·흔한 기호는 확정", () => {
  assert.equal(smsEstimate("급매 84㎡ · 역세권 ★").exact, true);
  assert.equal(smsEstimate("급매 🏠").exact, false);
  assert.equal(smsEstimate("좋아요 😀").exact, false);
  assert.equal(smsEstimate("✅ 확인").exact, false);
});
