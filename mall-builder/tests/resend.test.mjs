// 실행: node --test tests/   — Resend는 실제로 부르지 않고 가짜 응답으로 확인
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEmail, checkEmail, classifyStatus, fromHeader, orderLink, sendEmailsClaimed } from "../src/lib/resend.ts";
import { kindLabel, maskEmail } from "../src/lib/notify.ts";

const CREDS = { api_key: "re_x", from: "order@mail.example.com", store_name: "AIMaster B2B", slug: "aimaster-b2b" };
const item = (id, kind = "email_customer_paid", order_id = "o1") => ({ id, order_id, kind, to: "c@example.com", subject: "[몰] 주문 입금 확인", body: "본문 <b>굵게</b>" });

function fakeFetch(statuses) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, key: init.headers["Idempotency-Key"], auth: init.headers.Authorization, body: JSON.parse(init.body) });
    const s = statuses.shift() ?? 200;
    if (s === "throw") throw new Error("network down");
    return new Response(JSON.stringify(s === 200 ? { id: "e1" } : { message: s === 403 ? "The domain is not verified" : "bad" }), { status: s });
  };
  return { f, calls };
}

test("상태 → 결과: 2xx 보냄, 4xx 실패, 409·429·5xx 불확실", () => {
  assert.equal(classifyStatus(200), "sent");
  assert.equal(classifyStatus(422), "failed");
  assert.equal(classifyStatus(403), "failed");
  assert.equal(classifyStatus(409), "unknown");
  assert.equal(classifyStatus(429), "unknown");
  assert.equal(classifyStatus(503), "unknown");
});

test("보냄·실패를 기록하고, 머리글에 알림 번호(중복 방지 키)와 운영자 키", async () => {
  const { f, calls } = fakeFetch([200, 403]);
  const r = await sendEmailsClaimed([item("a"), item("b")], CREDS, "https://dev.example.com", f, 0);
  assert.deepEqual(r.map((x) => x.result), ["sent", "failed"]);
  assert.match(r[1].error, /도메인이 Resend에서 인증되지 않았습니다/);
  assert.equal(calls[0].key, "a");
  assert.equal(calls[0].auth, "Bearer re_x");
  assert.equal(calls[0].body.from, "AIMaster B2B <order@mail.example.com>");
});

test("불확실하면 같은 키로 한 번만 다시 보냄(두 번째도 불확실이면 확인 필요)", async () => {
  let t = fakeFetch([503, 200]);
  let r = await sendEmailsClaimed([item("a")], CREDS, "https://d", t.f, 0);
  assert.equal(r[0].result, "sent");
  assert.deepEqual(t.calls.map((c) => c.key), ["a", "a"]);
  t = fakeFetch(["throw", "throw"]);
  r = await sendEmailsClaimed([item("a")], CREDS, "https://d", t.f, 0);
  assert.equal(r[0].result, "unknown");
  assert.equal(t.calls.length, 2);
});

test("키가 없으면 보내지 않고 실패", async () => {
  const { f, calls } = fakeFetch([]);
  const r = await sendEmailsClaimed([item("a")], null, "https://d", f, 0);
  assert.equal(calls.length, 0);
  assert.equal(r[0].result, "failed");
});

test("본문은 HTML 이스케이프, 링크는 운영자→관리 화면·손님→주문 화면", () => {
  const e = buildEmail(item("a"), CREDS, "https://dev.example.com/");
  assert.ok(e.html.includes("&lt;b&gt;"));
  assert.ok(!e.html.includes("<b>굵게"));
  assert.equal(orderLink("https://d", "s", { order_id: "o1", kind: "email_staff_new_order" }), "https://d/s/s/admin/orders/o1");
  assert.equal(orderLink("https://d", "s", { order_id: "o1", kind: "email_customer_paid" }), "https://d/s/s/orders/o1");
  assert.equal(orderLink("https://d", "s", { order_id: null, kind: "email_test" }), null);
  assert.equal(fromHeader('<Bad"Name>', "a@b.com"), "BadName <a@b.com>");
});

test("주소 형식·기록 표시", () => {
  assert.equal(checkEmail("order@mail.buylife.xyz"), null);
  assert.equal(checkEmail(""), null);
  assert.match(checkEmail("no-at") ?? "", /형식/);
  assert.equal(maskEmail("owner@example.com"), "ow***@example.com");
  assert.equal(kindLabel("email_customer_paid"), "입금 확인 → 손님");
  assert.equal(kindLabel("email_test"), "시험 메일");
});
