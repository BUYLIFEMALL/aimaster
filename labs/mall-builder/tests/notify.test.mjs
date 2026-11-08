// 실행: node --test tests/   — 솔라피는 실제로 부르지 않고 가짜 발송 함수로 확인
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMobile, checkSenderPhone, classifySendError, fillSite, kindLabel, maskPhone, parseKinds, sendClaimed } from "../src/lib/notify.ts";

const CREDS = { api_key: "k", api_secret: "s", sender_phone: "0212345678" };
const ITEMS = [
  { id: "a", to: "01011112222", body: "하나" },
  { id: "b", to: "01033334444", body: "둘" },
  { id: "c", to: "01055556666", body: "셋" },
];

test("알림 종류: 알려진 것만, 순서 고정", () => {
  assert.deepEqual(parseKinds(["customer_paid", "hack", "staff_new_order"]), ["staff_new_order", "customer_paid"]);
  assert.deepEqual(parseKinds([]), []);
});

test("번호 검사: 발신번호는 일반 전화 가능, 받을 번호는 핸드폰만, 비우면 통과", () => {
  assert.equal(checkSenderPhone("02-1234-5678"), null);
  assert.equal(checkSenderPhone(""), null);
  assert.match(checkSenderPhone("123") ?? "", /발신번호/);
  assert.equal(checkMobile("010-1234-5678"), null);
  assert.match(checkMobile("02-555-6666") ?? "", /핸드폰/);
  assert.equal(maskPhone("01012345678"), "***-****-5678");
});

test("보냄·실패·불확실을 나눠 기록하고, 한 건 실패가 나머지를 막지 않음", async () => {
  const sent = [];
  const send = async (_c, to) => {
    if (to === "01033334444") throw Object.assign(new Error("잔액이 부족합니다"), { _tag: "MessageNotReceivedError" });
    if (to === "01055556666") throw Object.assign(new Error("fetch failed"), { _tag: "NetworkError" });
    sent.push(to);
  };
  const r = await sendClaimed(ITEMS, CREDS, send);
  assert.deepEqual(r.map((x) => x.result), ["sent", "failed", "unknown"]);
  assert.match(r[1].error, /잔액/);
  assert.deepEqual(sent, ["01011112222"]);
});

test("키가 없으면 보내지 않고 실패로 기록(발송 함수 안 부름)", async () => {
  let called = 0;
  const r = await sendClaimed(ITEMS.slice(0, 1), null, async () => { called++; });
  assert.equal(called, 0);
  assert.equal(r[0].result, "failed");
});

test("알 수 없는 오류는 「확인 필요」(다시 보내지 않음)", () => {
  assert.equal(classifySendError(new Error("boom")).result, "unknown");
  assert.equal(classifySendError(Object.assign(new Error("x"), { _tag: "ApiKeyError" })).result, "failed");
});

test("재입고 알림 문구의 {{site}}를 사이트 주소로 바꾼다(D16)", () => {
  const body = "[몰] 「상품」이(가) 다시 입고되었습니다. {{site}}/s/m/p/1";
  assert.equal(fillSite(body, "https://dev-mall-builder.vercel.app/"), "[몰] 「상품」이(가) 다시 입고되었습니다. https://dev-mall-builder.vercel.app/s/m/p/1");
  assert.equal(fillSite("주소 없음", "https://x"), "주소 없음");
  assert.equal(kindLabel("customer_restock"), "재입고 → 손님");
  assert.equal(kindLabel("email_customer_restock"), "재입고 → 손님");
});
