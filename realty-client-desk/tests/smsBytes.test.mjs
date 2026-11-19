import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { smsBytes, isLongSms, SMS_MAX_BYTES, OPTOUT_SAMPLE_TOKEN } from "../src/lib/desk/smsBytes.ts";
import { composeAd, adFooter, adHeader } from "../src/lib/desk/adRules.ts";

const URL = "https://realty-client-desk.buylife.xyz/u/";
const office = { office_name: "행복부동산", office_phone: "02-123-4567", office_address: null, reject_080: null };
// page.tsx·SendAdForm.tsx가 만드는 미리보기와 같은 모양
const preview = (o, body) => `${adHeader(o)}\n${body.trim()}\n${adFooter(o, URL + OPTOUT_SAMPLE_TOKEN)}`;

test("영문·숫자·기호·줄바꿈 1바이트, 한글 2바이트", () => {
  assert.equal(smsBytes("abc 123!"), 8);
  assert.equal(smsBytes("가나다"), 6);
  assert.equal(smsBytes("가\nA"), 4);
  assert.equal(smsBytes(""), 0);
});

test("예시 토큰은 실제 토큰과 같은 16자 ASCII", () => {
  const real = randomBytes(12).toString("base64url");
  assert.equal(OPTOUT_SAMPLE_TOKEN.length, real.length);
  assert.equal(smsBytes(OPTOUT_SAMPLE_TOKEN), smsBytes(real));
});

test("본문에 자리표시·예시 토큰 글자가 있어도 치환 없이 실제 발송 문구와 같은 바이트", () => {
  for (const body of ["급매 84㎡", "(고객마다 다름) 문의 주세요", `코드 ${OPTOUT_SAMPLE_TOKEN} 참고`]) {
    const real = composeAd(office, body, URL + randomBytes(12).toString("base64url"));
    assert.equal(smsBytes(preview(office, body)), smsBytes(real), body);
  }
});

test("경계: 실제 문구 90바이트는 단문, 91바이트는 장문으로 추정", () => {
  const o = { office_name: "A", office_phone: "1", office_address: null, reject_080: null };
  const fixed = smsBytes(preview(o, ""));
  assert.equal(SMS_MAX_BYTES, 90);
  assert.equal(isLongSms(preview(o, "b".repeat(90 - fixed))), false);
  assert.equal(isLongSms(preview(o, "b".repeat(91 - fixed))), true);
  assert.equal(isLongSms("가".repeat(45)), false);
  assert.equal(isLongSms("가".repeat(46)), true);
});

test("이모지·인코딩 경계 글자도 같은 규칙으로 셈(화면은 항상 추정 표시)", () => {
  assert.equal(smsBytes("🏠"), 2, "코드 포인트 하나 = 2바이트로 추정");
  assert.equal(smsBytes("힣똠"), 4);
  assert.equal(smsBytes("a\u0000b"), 3);
});
