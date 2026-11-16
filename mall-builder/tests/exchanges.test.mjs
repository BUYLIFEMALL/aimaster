// 실행: node --test tests/   — M2-12b 교환 화면 순수 함수 + 서버 동작 접근 경계(소스 검사)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  deliveredAtFromEvents, exchangeDaysLeft, exchangeStockNote, itemHadOptions, itemRequestState, parseExchangeFee, parseExchangeQty,
  exchangeNotices, exchangeReturnPath, remainingQty, staffExchangeActions,
} from "../src/lib/exchanges.ts";

const D = (s) => new Date(s);
const item = (o = {}) => ({ id: "i1", product_id: "p1", variant_id: "v1", name_snapshot: "티셔츠", option_snapshot: "S", qty: 3, cancelled_qty: 0, ...o });
const ex = (o = {}) => ({
  id: "x1", item_id: "i1", qty: 1, from_variant_id: "v1", to_variant_id: "v2", from_option: "S", to_option: "M", from_option_based: true, to_option_based: true,
  reason: "size", memo: "", requested_by: "customer", step: "requested", collect_courier: "", collect_tracking: "", reship_courier: "", reship_tracking: "",
  fee: 0, fee_status: "none", restocked: false, reship_deducted: false, reject_note: "", created_at: "2026-11-10T00:00:00Z", ...o,
});
const opts = [{ id: "v2", product_id: "p1", key: "M", is_active: true }];

test("배송 완료 시각은 실제 전이만(같은 상태 기록 무시) — DB 규칙과 같음", () => {
  const ev = [
    { from_status: "shipping", to_status: "delivered", created_at: "2026-11-01T00:00:00Z" },
    { from_status: "delivered", to_status: "delivered", created_at: "2026-11-09T00:00:00Z" },
  ];
  assert.equal(deliveredAtFromEvents(ev), "2026-11-01T00:00:00Z");
  assert.equal(deliveredAtFromEvents([]), null);
});

test("7일 남은 날 — 이력 없으면 null, 지나면 0", () => {
  assert.equal(exchangeDaysLeft(null), null);
  assert.equal(exchangeDaysLeft("2026-11-10T00:00:00Z", D("2026-11-11T00:00:00Z")), 6);
  assert.equal(exchangeDaysLeft("2026-11-01T00:00:00Z", D("2026-11-11T00:00:00Z")), 0);
});

test("원래 옵션 상품 판단은 주문 줄 증거(옵션 번호 또는 글자)", () => {
  assert.equal(itemHadOptions({ variant_id: null, option_snapshot: "흰" }), true); // 옵션 지워져도 글자 남음
  assert.equal(itemHadOptions({ variant_id: null, option_snapshot: "" }), false);
});

test("남은 수량 = 주문 − 취소 − 거절 아닌 교환", () => {
  assert.equal(remainingQty(item({ cancelled_qty: 1 }), [ex({ qty: 1, step: "done" }), ex({ qty: 1, step: "rejected" })]), 1);
});

test("유저 신청 칸: 기간·진행 중·수량·옵션 후보", () => {
  const base = { who: "customer", orderStatus: "delivered", daysLeft: 3, item: item(), exchanges: [], options: opts };
  assert.deepEqual(itemRequestState(base), { ok: true, maxQty: 3, needsOption: true });
  assert.equal(itemRequestState({ ...base, daysLeft: 0 }).ok, false);
  assert.equal(itemRequestState({ ...base, daysLeft: null }).ok, false);
  assert.equal(itemRequestState({ ...base, who: "staff", daysLeft: null }).ok, true); // 직원 대리는 기간 제한 없음
  assert.equal(itemRequestState({ ...base, orderStatus: "return_requested" }).ok, false);
  assert.equal(itemRequestState({ ...base, exchanges: [ex()] }).ok, false); // 진행 중
  const noOpt = itemRequestState({ ...base, options: [] });
  assert.equal(noOpt.ok, false);
  assert.match(noOpt.reason, /문의/);
  assert.deepEqual(itemRequestState({ ...base, item: item({ variant_id: null, option_snapshot: "" }), options: [] }), { ok: true, maxQty: 3, needsOption: false });
});

test("운영사 단추: 단계·주문 상태·교환비·불가능 재발송은 단추 대신 안내", () => {
  let a = staffExchangeActions(ex(), "delivered", true);
  assert.equal(a.collecting && a.collected && a.reject && a.fee, true);
  assert.equal(a.reship, false);
  a = staffExchangeActions(ex({ step: "collected", fee: 3000, fee_status: "waiting" }), "delivered", true);
  assert.equal(a.reship, false); assert.equal(a.feePaid, true); assert.equal(a.reject, false); assert.match(a.reshipBlocked, /입금/);
  a = staffExchangeActions(ex({ step: "collected", to_variant_id: null }), "delivered", false);
  assert.equal(a.reship, false); assert.match(a.reshipBlocked, /관리자에게 문의/); assert.doesNotMatch(a.reshipBlocked, /거절/);
  a = staffExchangeActions(ex({ step: "collected", from_option_based: false, to_option_based: false, to_variant_id: null }), "delivered", true);
  assert.equal(a.reship, false); assert.match(a.reshipBlocked, /옵션이 새로 생겨/);
  a = staffExchangeActions(ex({ step: "collected" }), "delivered", true);
  assert.equal(a.reship, true); assert.equal(a.reshipBlocked, null);
  a = staffExchangeActions(ex({ step: "collected" }), "returned", true);
  assert.equal(a.reship || a.collected || a.fee || a.done, false);
  assert.equal(staffExchangeActions(ex({ step: "reshipped" }), "delivered", true).done, true);
  assert.equal(staffExchangeActions(ex({ step: "done" }), "delivered", true).reject, false);
});

test("재고 표시 — 플래그는 실제 변경 여부", () => {
  assert.equal(exchangeStockNote(ex({ step: "requested" })), "");
  assert.match(exchangeStockNote(ex({ step: "collected", restocked: false })), /회수 재고 그대로/);
  assert.match(exchangeStockNote(ex({ step: "done", restocked: true, reship_deducted: true })), /되돌림 · 발송 재고 차감/);
});

test("돌아갈 주소는 입력을 받지 않고 몰 이름 형식 + 서버 확인 주문 번호로 새로 만든다(QA-20261117-006)", () => {
  const OID = "e0102000-0000-4000-8000-000000000031";
  assert.equal(exchangeReturnPath("aimaster-b2b", "admin", OID), `/s/aimaster-b2b/admin/orders/${OID}`);
  assert.equal(exchangeReturnPath("aimaster-b2b", "shop", OID), `/s/aimaster-b2b/orders/${OID}`);
  // 주문 번호 자리에 우회 글자 → 몰 첫 화면(정규화해도 같은 몰)
  for (const bad of ["%2e%2e/other/admin", "../other", ".%2e", "%252e%252e", "..%5c..%5cevil", "%2F%2Fevil.test", "x?y=1", "x#y", "", null, undefined, OID.toUpperCase()]) {
    const out = exchangeReturnPath("aimaster-b2b", "admin", bad);
    assert.equal(out, "/s/aimaster-b2b", String(bad));
    assert.equal(new URL(out, "https://h.test").pathname, "/s/aimaster-b2b", String(bad));
  }
  // 몰 이름이 형식에 안 맞으면 고정 안전 주소 "/"
  for (const bad of ["../other", "mall/../x", "%2e%2e", "Mall", "a", "ab", "mall--x", "mall-", "-mall", "mall\\x", "mall?x", "a".repeat(31)]) {
    assert.equal(exchangeReturnPath(bad, "shop", OID), "/", bad);
  }
  // 만든 주소는 정규화해도 그대로(다른 몰·로그인 화면으로 빠지지 않음)
  const made = exchangeReturnPath("mall-01", "shop", OID);
  assert.equal(new URL(made, "https://h.test").pathname, made);
});

test("안내 고르기: 신청 불가여도 기간·옵션 없음은 안내, 진행 중·수량 없음은 빈 상태", () => {
  const base = { who: "customer", orderStatus: "delivered", daysLeft: 3, exchanges: [], options: opts };
  const noOpt = { item: item({ id: "a", name_snapshot: "양말" }), s: itemRequestState({ ...base, item: item({ id: "a" }), options: [] }) };
  const window1 = { item: item({ id: "b" }), s: itemRequestState({ ...base, item: item({ id: "b" }), daysLeft: 0 }) };
  const window2 = { item: item({ id: "c" }), s: itemRequestState({ ...base, item: item({ id: "c" }), daysLeft: 0 }) };
  const open = { item: item({ id: "i1" }), s: itemRequestState({ ...base, item: item({ id: "i1" }), exchanges: [ex()] }) };
  const n = exchangeNotices([noOpt, window1, window2, open]);
  assert.deepEqual(n.map((x) => x.key), ["opt-a", "window"]); // 기간 안내는 한 번
  assert.match(n[0].text, /^양말: .*문의/);
  assert.deepEqual(exchangeNotices([open]), []); // 안내할 것 없음 = 빈 상태
  const staff = itemRequestState({ ...base, who: "staff", item: item(), options: [] });
  assert.equal(staff.ok, false); assert.equal(staff.code, "no_option"); assert.match(staff.reason, /접수할 수 없습니다/);
});

test("입력 정리 — 수량·교환비", () => {
  assert.equal(parseExchangeQty("2"), 2);
  assert.equal(parseExchangeQty("0"), null);
  assert.equal(parseExchangeQty("1.5"), null);
  assert.equal(parseExchangeFee("3,000원"), 3000);
  assert.equal(parseExchangeFee("-1"), null);
  assert.equal(parseExchangeFee("10000001"), null);
});

test("서버 동작 접근 경계(소스): DB 함수 전에 이 몰 소속 확인, 돌아갈 주소 입력을 받지 않음, 서버 키 없음", () => {
  const src = readFileSync(new URL("../src/lib/exchange-actions.ts", import.meta.url), "utf8");
  assert.match(src, /^"use server";/);
  assert.doesNotMatch(src, /backPath|safeBackPath/, "돌아갈 주소를 입력으로 받지 않음");
  assert.match(src, /exchangeReturnPath\(slug, view === "admin" \? "admin" : "shop", orderId\)/);
  const fns = src.split(/\nexport async function /).slice(1);
  assert.equal(fns.length, 4);
  for (const f of fns) {
    const name = f.slice(0, f.indexOf("("));
    const guard = f.search(/await (itemOrderInStore|exchangeOrderInStore)\(/);
    const rpc = f.indexOf(".rpc(");
    assert.ok(guard > 0 && rpc > guard, `${name}: 소속 확인이 DB 함수보다 먼저`);
    assert.match(f.slice(guard, rpc), /if \(!orderId\) finish\(/, `${name}: 소속 확인 실패면 DB 함수 전에 끝냄`);
    assert.doesNotMatch(f, /createAdminClient|service_role|SECRET/, `${name}: 서버 키 금지`);
  }
});

test("구매 확정(confirmed)도 교환 가능 상태 — 7일은 실제 배송 시각 기준(0103, D4 유지)", async () => {
  const { isExchangeOrderStatus } = await import("../src/lib/exchanges.ts");
  assert.equal(isExchangeOrderStatus("delivered"), true);
  assert.equal(isExchangeOrderStatus("confirmed"), true);
  for (const s of ["shipping", "returned", "return_requested", "cancelled", "paid"]) assert.equal(isExchangeOrderStatus(s), false, s);
  const base = { who: "customer", daysLeft: 3, item: item(), exchanges: [], options: opts };
  assert.equal(itemRequestState({ ...base, orderStatus: "confirmed" }).ok, true); // 확정됐어도 실제 배송 뒤 7일 안이면 신청
  assert.equal(itemRequestState({ ...base, orderStatus: "confirmed", daysLeft: 0 }).ok, false); // 7일 지나면 유저 막힘
  assert.equal(itemRequestState({ ...base, orderStatus: "confirmed", daysLeft: 0, who: "staff" }).ok, true); // 직원 대리는 기간 없음
  assert.equal(staffExchangeActions(ex({ step: "collected" }), "confirmed", true).reship, true); // 확정 뒤에도 진행
  assert.equal(staffExchangeActions(ex({ step: "collected" }), "returned", true).reship, false);
});
