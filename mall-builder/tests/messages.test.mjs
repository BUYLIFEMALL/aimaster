// 실행: node --test tests/   — M2-12a 운영사 메시지(2026-11-16): 입력·설정 검사, 문자 길이, 치환 문자, 발송 내역 조건
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BULK_DAY_MAX, BULK_ONCE_MAX, PLACEHOLDERS, TEMPLATE_KINDS, applyMessageLogFilters, composeSms, fillPlaceholders, messageLogHref,
  parseMessageLogQuery, smsBytes, smsType, unknownPlaceholders, validateMessage, validateMessageSettings,
} from "../src/lib/messages.ts";
import { MENU_PERM, canSeeMenu } from "../src/lib/staff.ts";

test("입력 검사 — 통로·내용·메일 제목·길이", () => {
  assert.equal(validateMessage({ channel: "fax", body: "a" }).ok, false);
  assert.equal(validateMessage({ channel: "sms", body: "  " }).ok, false);
  assert.equal(validateMessage({ channel: "email", body: "본문", subject: "" }).ok, false);
  assert.equal(validateMessage({ channel: "sms", body: "가".repeat(1001) }).ok, false);
  assert.deepEqual(validateMessage({ channel: "sms", is_ad: "1", body: " 세일 " }), { ok: true, value: { channel: "sms", isAd: true, subject: "", body: "세일" } });
  assert.equal(validateMessage({ channel: "email", subject: "제목", body: "본문" }).value?.isAd, false);
});

test("설정 검사 — 상한 범위·수신 거부 길이·알 수 없는 알림 버림", () => {
  assert.equal(validateMessageSettings({ bulk_once: 0, bulk_day: 10 }).ok, false);
  assert.equal(validateMessageSettings({ bulk_once: BULK_ONCE_MAX + 1, bulk_day: 10 }).ok, false);
  assert.equal(validateMessageSettings({ bulk_once: 10, bulk_day: BULK_DAY_MAX + 1 }).ok, false);
  assert.equal(validateMessageSettings({ bulk_once: 10, bulk_day: 10, optout: "가".repeat(61) }).ok, false);
  const r = validateMessageSettings({ bulk_once: "500", bulk_day: "1500", optout: " 080 ", kinds: ["customer_cancelled", "x", "customer_cancelled"], email_kinds: ["customer_refunded"] });
  assert.deepEqual(r, { ok: true, value: { bulkOnce: 500, bulkDay: 1500, optout: "080", kinds: ["customer_cancelled"], emailKinds: ["customer_refunded"] } });
});

test("문자 길이 — 한글 2바이트, 90바이트 넘으면 장문, 광고 앞뒤 글 포함", () => {
  assert.equal(smsBytes("가a1"), 4);
  assert.equal(smsType("가".repeat(45)), "SMS");
  assert.equal(smsType("가".repeat(46)), "LMS");
  assert.equal(composeSms("몰", " 세일 ", true, "거부 080"), "(광고)[몰] 세일\n거부 080");
  assert.equal(composeSms("몰", "안내", false, "거부 080"), "[몰] 안내");
});

test("치환 문자 — DB 목록과 같은 9개, 미리보기·오타 찾기", () => {
  assert.equal(PLACEHOLDERS.length, 9);
  assert.equal(fillPlaceholders("{받는분}님 {주문번호} {송장번호}", { "{받는분}": "홍", "{주문번호}": "A-1" }), "홍님 A-1 ");
  assert.deepEqual(unknownPlaceholders("{주문번호} {주문 번호} {송장} {금액}"), ["{송장}"]);
  assert.equal(TEMPLATE_KINDS.length, 8);
});

test("발송 내역 조건 — 잘못된 값 버림·기간 뒤바뀜 바로잡기·주소 유지·조회 조건", () => {
  assert.deepEqual(parseMessageLogQuery({}), { channel: undefined, status: undefined, source: undefined, from: undefined, to: undefined, page: 1 });
  const f = parseMessageLogQuery({ channel: "email", status: "failed", source: "manual", from: "2026-11-20", to: "2026-11-01", page: "3" });
  assert.deepEqual([f.from, f.to, f.page], ["2026-11-01", "2026-11-20", 3]);
  assert.equal(parseMessageLogQuery({ channel: "kakao", status: "x", source: "y" }).channel, undefined);
  assert.equal(messageLogHref("/l", f, { page: 1 }), "/l?channel=email&status=failed&source=manual&from=2026-11-01&to=2026-11-20");
  const calls = [];
  const q = new Proxy({}, { get: (_, m) => (...a) => (calls.push([m, ...a]), q) });
  applyMessageLogFilters(q, parseMessageLogQuery({ source: "manual" }));
  applyMessageLogFilters(q, parseMessageLogQuery({ source: "auto", channel: "sms" }));
  assert.deepEqual(calls, [["not", "campaign_id", "is", null], ["eq", "channel", "sms"], ["is", "campaign_id", null]]);
});

test("메뉴 권한 — 보내기·내역은 유저 권한, 설정은 대표만", () => {
  assert.equal(MENU_PERM["/messages"], "customers");
  assert.equal(MENU_PERM["/messages/log"], "customers");
  assert.equal(MENU_PERM["/messages/settings"], "owner");
  const mgr = { role: "manager", perms: { customers: true } };
  assert.equal(canSeeMenu("/messages", mgr), true);
  assert.equal(canSeeMenu("/messages/settings", mgr), false);
  assert.equal(canSeeMenu("/messages", { role: "staff", perms: { products: true } }), false);
});
