// 실행: node --test tests/   — M2-12b 교환 화면 순수 함수 + 서버 동작 접근 경계(소스 검사)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  deliveredAtFromEvents, exchangeDaysLeft, exchangeStockNote, itemHadOptions, itemRequestState, parseExchangeFee, parseExchangeQty,
  exchangeNotices, exchangeReturnPath, remainingQty, staffExchangeActions,
  exfeeSuccessTarget, exfeeFailTarget, EXFEE_RETRY_UNVERIFIED_TEXT,
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
  assert.equal(fns.length, 5); // + exchangeFeeCardRecheckAction(단계2)
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

// ── M2-12b 단계2 교환비 카드 결제 화면(0104 계약 37fdcabb4) ──
test("feePayState — 결제 기록 상태 8종 × 카드 설정 × 단계", async () => {
  const { feePayState } = await import("../src/lib/exchanges.ts");
  const w = { fee: 3000, fee_status: "waiting", step: "requested" };
  const P = (status, needs_review = false) => ({ status, needs_review });
  // 기록 없음
  assert.equal(feePayState(w, null, true).kind, "pay");
  assert.equal(feePayState(w, null, true).canPay, true);
  assert.equal(feePayState(w, null, false).kind, "none"); // 카드 미설정 몰
  assert.equal(feePayState({ ...w, step: "reshipped" }, null, true).kind, "none"); // 재발송 뒤 결제 없음
  assert.equal(feePayState({ ...w, fee_status: "paid" }, null, true).kind, "none"); // 무통장 확인됨
  assert.equal(feePayState({ ...w, fee: 0, fee_status: "none" }, null, true).kind, "none");
  // 확인 중 3종
  for (const s of ["prepared", "requested", "unknown"]) {
    const st = feePayState(w, P(s), true);
    assert.deepEqual([st.kind, st.canPay, st.canRecheck, st.lockReship, st.cardActive], ["checking", false, true, true, true], s);
    assert.match(st.customerText, /다시 결제하지 마세요/);
  }
  // 완료 정상 / 완료 + 확인 필요(hold)
  const d = feePayState({ ...w, fee_status: "paid" }, P("done"), true);
  assert.deepEqual([d.kind, d.canPay, d.canRecheck, d.lockReship, d.approvalRecorded], ["done", false, true, false, true]); // QA014 ②: 정상 완료도 직원 다시 확인(승인 뒤 취소 찾기)
  const h = feePayState({ ...w, fee_status: "paid" }, P("done", true), true);
  assert.deepEqual([h.kind, h.canPay, h.canRecheck, h.lockReship, h.approvalRecorded], ["hold", false, true, true, true]);
  assert.doesNotMatch(h.customerText, /완료/, "확인 필요면 유저에게 완료로 보이지 않음");
  assert.match(h.staffText, /재발송 잠김/);
  // 취소 보류: 결제·다시 확인 없음, 재발송 잠금
  const c = feePayState(w, P("canceled"), true);
  assert.deepEqual([c.kind, c.canPay, c.canRecheck, c.lockReship], ["canceled", false, false, true]);
  // 실패: 다시 결제는 보이되 「미확인」 표시(정상 단정 0)
  const f = feePayState(w, P("failed"), true);
  assert.deepEqual([f.kind, f.canPay, f.retryUnverified, f.lockReship], ["failed", true, true, false]);
  assert.equal(feePayState(w, P("failed"), false).canPay, false);
});

test("feePayState는 사유 글자(error)와 상관없음 — 칸 값이 같으면 결과 같음", async () => {
  const { feePayState } = await import("../src/lib/exchanges.ts");
  const w = { fee: 3000, fee_status: "paid", step: "collected" };
  const a = feePayState(w, { status: "done", needs_review: true, error: "" }, true);
  const b = feePayState(w, { status: "done", needs_review: true, error: "토스 상태 DONE — 정상" }, true);
  const c = feePayState(w, { status: "done", needs_review: false, error: "토스에서 취소됨 확인 필요" }, true);
  assert.deepEqual(a, b);
  assert.equal(c.kind, "done");
  const src = readFileSync(new URL("../src/lib/exchanges.ts", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("export function feePayState("), src.indexOf("/** 교환비 결제 화면 주소"));
  assert.doesNotMatch(fn, /\.error\b|error:/, "feePayState 안에서 error를 읽지 않음");
});

test("직원 단추 — 카드 결제가 있으면 금액 변경·무통장 확인·거절 숨김, 확인 필요·취소 보류면 재발송 막힘", async () => {
  const { feePayState } = await import("../src/lib/exchanges.ts");
  const x = ex({ step: "collected", fee: 3000, fee_status: "paid" });
  const hold = staffExchangeActions(x, "delivered", true, feePayState(x, { status: "done", needs_review: true }, true));
  assert.deepEqual([hold.reship, hold.fee, hold.feePaid, hold.reject], [false, false, false, false]);
  assert.match(hold.reshipBlocked ?? "", /재발송할 수 없습니다/);
  const ok = staffExchangeActions(x, "delivered", true, feePayState(x, { status: "done", needs_review: false }, true));
  assert.equal(ok.reship, true);
  const w = ex({ step: "requested", fee: 3000, fee_status: "waiting" });
  const chk = staffExchangeActions(w, "delivered", true, feePayState(w, { status: "unknown", needs_review: false }, true));
  assert.deepEqual([chk.fee, chk.feePaid, chk.reject], [false, false, false]);
  const none = staffExchangeActions(w, "delivered", true, feePayState(w, null, true));
  assert.deepEqual([none.fee, none.feePaid, none.reject], [true, true, true]); // 카드 결제 없으면 기존 그대로
});

test("성공 주소 응답 → 다음 할 일: 정확히 prepared일 때만 승인, 완료여도 중립 returned", async () => {
  const { exfeeAfterPrepare, exfeeAfterConfirm, exfeeReturnText, exchangePayPath, exchangeTossOrderId } = await import("../src/lib/exchanges.ts");
  assert.equal(exfeeAfterPrepare({ ok: true, prepared: true, status: "prepared" }), "confirm");
  assert.equal(exfeeAfterPrepare({ ok: true, prepared: true, status: "requested" }), "checking"); // 불확실 재진입 — 승인 0
  assert.equal(exfeeAfterPrepare({ ok: true, prepared: true, status: "unknown" }), "checking");
  assert.equal(exfeeAfterPrepare({ ok: false, unknown: true }), "checking");
  assert.equal(exfeeAfterPrepare({ ok: true, already: true, status: "done", needs_review: false }), "returned");
  assert.equal(exfeeAfterPrepare({ ok: false, already: true, status: "done", needs_review: true, unknown: true }), "checking");
  assert.equal(exfeeAfterPrepare(null), "returned");
  assert.equal(exfeeAfterConfirm({ ok: true }), "returned");
  assert.equal(exfeeAfterConfirm({ ok: true, already: true }), "returned");
  assert.equal(exfeeAfterConfirm({ ok: false, unknown: true, expired: true }), "checking");
  assert.equal(exfeeAfterConfirm({ ok: false }), "failed");
  assert.equal(exfeeReturnText("returned")?.length > 0, true);
  assert.equal(exfeeReturnText("<script>"), null);
  assert.equal(exfeeReturnText("toString"), null);
  const O = "11111111-1111-4111-8111-111111111111", X = "22222222-2222-4222-8222-222222222222";
  assert.equal(exchangePayPath("my-mall", O, X), `/s/my-mall/orders/${O}/exchange-pay/${X}`);
  assert.equal(exchangePayPath("../x", O, X), null);
  assert.equal(exchangePayPath("my-mall", "x", X), null);
  assert.equal(exchangeTossOrderId(X), `exfee-${X}`);
});

const page = (p) => readFileSync(new URL(`../src/app/s/[store]/(shop)/orders/[id]/exchange-pay/[exchangeId]/${p}`, import.meta.url), "utf8");
// QA014 ①: 성공·실패 흐름을 가짜 의존성으로 실제 실행 — 다른 몰·다른 주문·다른 회원·다른 주문의 교환이면 rpc 0
const FO = "11111111-1111-4111-8111-111111111111", FX = "22222222-2222-4222-8222-222222222222", FS = "33333333-3333-4333-8333-333333333333";
const OTHER_ORDER = "44444444-4444-4444-8444-444444444444";
function fakeDeps(o = {}) {
  const calls = [];
  const d = {
    calls,
    rpcArgs: [],
    userId: async () => { calls.push("user"); return o.uid ?? "u1"; },
    storeId: async (slug) => { calls.push(`store:${slug}`); return slug === "my-mall" ? FS : null; },
    orderOwner: async (sid, oid) => { calls.push(`owner:${oid}`); return sid === FS && oid === FO ? (o.owner ?? "u1") : null; },
    exchangeOrder: async (xid) => { calls.push(`ex:${xid}`); return xid === FX ? (o.exOrder ?? FO) : null; },
    parse: (expectId, q) => { calls.push(`parse:${expectId}`); return q.orderId === expectId && q.paymentKey ? { ok: true, paymentKey: q.paymentKey, amount: Number(q.amount) } : { ok: false, error: "x" }; },
    rpc: async (fn, args) => { calls.push(`rpc:${fn}`); d.rpcArgs.push(args); return (o.rpc ?? {})[fn] ?? { data: null, error: { message: "raw" } }; },
  };
  return d;
}
const goodQ = { paymentKey: "pk_test_secret", orderId: `exfee-${FX}`, amount: "3000" };
const rpcs = (d) => d.calls.filter((c) => c.startsWith("rpc:"));
const PREP = "mall_builder_exchange_fee_card_prepare", CONF = "mall_builder_exchange_fee_card_confirm";
const preparedOk = { data: { ok: true, prepared: true, status: "prepared" }, error: null };
const denied = [["다른 몰", {}, "other-mall"], ["다른 회원", { owner: "u2" }, "my-mall"], ["다른 주문의 교환", { exOrder: OTHER_ORDER }, "my-mall"]];

test("성공 흐름(실행): 회원 → 몰 → 주문 주인 → 교환 소속 확인 전엔 rpc 0, 하나라도 아니면 null(404)", async () => {
  for (const [name, o, slug] of denied) {
    const d = fakeDeps(o);
    assert.equal(await exfeeSuccessTarget(d, slug, FO, FX, goodQ), null, name);
    assert.equal(rpcs(d).length, 0, `${name}: rpc 0`);
    assert.ok(!d.calls.some((c) => c.startsWith("parse:")), `${name}: 쿼리 해석 0`);
  }
  const bad = fakeDeps();
  assert.equal(await exfeeSuccessTarget(bad, "my-mall", "not-uuid", FX, goodQ), null);
  assert.equal(bad.calls.length, 0, "형식이 틀리면 아무것도 안 부름");
  const seq = fakeDeps({ rpc: { [PREP]: preparedOk, [CONF]: { data: { ok: true }, error: null } } });
  await exfeeSuccessTarget(seq, "my-mall", FO, FX, goodQ);
  assert.deepEqual(seq.calls.slice(0, 4), ["user", "store:my-mall", `owner:${FO}`, `ex:${FX}`], "회원 → 몰 → 주인 → 소속 순서");
});

test("성공 흐름(실행): 준비가 정확히 prepared일 때만 별도 승인, 결제 키는 돌아갈 주소에 0", async () => {
  const ok = fakeDeps({ rpc: { [PREP]: preparedOk, [CONF]: { data: { ok: true }, error: null } } });
  const t = await exfeeSuccessTarget(ok, "my-mall", FO, FX, goodQ);
  assert.equal(t, `/s/my-mall/orders/${FO}?pay=returned`);
  assert.deepEqual(rpcs(ok), [`rpc:${PREP}`, `rpc:${CONF}`]);
  assert.deepEqual(ok.rpcArgs[0], { p_exchange_id: FX, p_payment_key: "pk_test_secret", p_amount: 3000 });
  assert.doesNotMatch(t, /pk_test|paymentKey/);
  for (const st of ["requested", "unknown"]) {
    const d = fakeDeps({ rpc: { [PREP]: { data: { ok: true, prepared: true, status: st }, error: null } } });
    assert.equal(await exfeeSuccessTarget(d, "my-mall", FO, FX, goodQ), `/s/my-mall/orders/${FO}?pay=checking`, st);
    assert.deepEqual(rpcs(d), [`rpc:${PREP}`], `${st}: 승인 0`);
  }
  const pe = fakeDeps();
  assert.equal(await exfeeSuccessTarget(pe, "my-mall", FO, FX, goodQ), `/s/my-mall/orders/${FO}?pay=error`);
  assert.deepEqual(rpcs(pe), [`rpc:${PREP}`], "준비 오류면 승인 0");
  const ce = fakeDeps({ rpc: { [PREP]: preparedOk } });
  assert.equal(await exfeeSuccessTarget(ce, "my-mall", FO, FX, goodQ), `/s/my-mall/orders/${FO}?pay=checking`, "승인 요청 오류 = 결과 모름");
  const pf = fakeDeps();
  assert.equal(await exfeeSuccessTarget(pf, "my-mall", FO, FX, { ...goodQ, orderId: "other" }), `/s/my-mall/orders/${FO}?pay=error`);
  assert.equal(rpcs(pf).length, 0, "결제 정보가 다른 주문 번호면 rpc 0");
});

test("실패 흐름(실행): 소유·소속 확인 전엔 안내 0, 토스 원문 0", async () => {
  for (const [name, o, slug] of denied) {
    const d = fakeDeps(o);
    assert.equal(await exfeeFailTarget(d, slug, FO, FX, "PAY_PROCESS_CANCELED"), null, name);
    assert.equal(rpcs(d).length, 0, name);
  }
  assert.equal(await exfeeFailTarget(fakeDeps(), "my-mall", FO, FX, "PAY_PROCESS_CANCELED"), `/s/my-mall/orders/${FO}?pay=user_canceled`);
  assert.equal(await exfeeFailTarget(fakeDeps(), "my-mall", FO, FX, "REJECT_CARD_COMPANY<script>"), `/s/my-mall/orders/${FO}?pay=failed`);
});

test("성공·실패 주소(소스): 흐름 함수에만 맡기고 직접 쿼리·rpc·원문 0, 실제 의존성은 로그인 세션(서버 키 0)", () => {
  const s = page("success/page.tsx"), f = page("fail/page.tsx");
  assert.match(s, /exfeeSuccessTarget\(deps, slug, id, exchangeId, await searchParams\)/);
  assert.match(f, /exfeeFailTarget\(deps, slug, id, exchangeId, \(await searchParams\)\.code\)/);
  for (const x of [s, f]) {
    assert.match(x, /if \(!target\) notFound\(\)/);
    assert.doesNotMatch(x, /\.rpc\(|\.from\(|console\.|\.message\b|\?ok=1/);
  }
  const srv = readFileSync(new URL("../src/lib/exchanges-server.ts", import.meta.url), "utf8");
  const fn = srv.slice(srv.indexOf("export async function exfeeFlowDeps"), srv.indexOf("export async function getFeePayments"));
  assert.match(fn, /requireUser\(loginNext\)/);
  assert.match(fn, /parse: parseSuccessParams/);
  assert.doesNotMatch(srv, /createAdminClient|SERVICE_ROLE|SECRET_KEY/);
});

test("결제 화면(소스): 교환 모드 위젯, 실패 뒤 다시 결제는 위젯 앞에 미확인 안내(정상 재결제 보장 문구 0)", () => {
  const s = page("page.tsx");
  assert.match(s, /mode="exchange"/);
  const note = s.indexOf("EXFEE_RETRY_UNVERIFIED_TEXT}"), widget = s.indexOf("<PayWidget");
  assert.ok(note > 0 && widget > note, "미확인 안내가 위젯 앞");
  assert.match(EXFEE_RETRY_UNVERIFIED_TEXT, /확인되지 않았습니다/);
  assert.doesNotMatch(EXFEE_RETRY_UNVERIFIED_TEXT, /완료|정상|보장/);
});

test("결제 화면(소스): 주인·교환 소속 확인, 결제 가능할 때만 위젯, 토스 주문 번호 exfee-<교환 id>, 결제 키·이력 미사용", () => {
  const s = page("page.tsx");
  assert.match(s, /found\.order\.user_id !== user\.id\) notFound\(\)/);
  assert.match(s, /\.eq\("id", exchangeId\)\.eq\("order_id", order\.id\)/);
  assert.match(s, /!st\.canPay\) redirect\(/);
  assert.match(s, /orderId=\{exchangeTossOrderId\(x\.id\)\}/);
  assert.match(s, /from "\.\.\/\.\.\/pay\/pay-widget"/); // 기존 위젯 재사용
});

test("서버 읽기·패널(소스): 결제 키·멱등키·시도 이력 문자열 0, 결제 기록은 칸 나열로 읽음", () => {
  for (const f of ["../src/lib/exchanges-server.ts", "../src/app/exchange-panels.tsx", "../src/lib/exchange-actions.ts"]) {
    const s = readFileSync(new URL(f, import.meta.url), "utf8");
    assert.doesNotMatch(s, /payment_key|idempotency_key|payment_attempts|paymentKey/, f);
  }
  for (const p of ["page.tsx", "fail/page.tsx"]) assert.doesNotMatch(page(p), /payment_key|idempotency_key|payment_attempts/, p);
  // 성공 주소는 rpc 인자 p_payment_key로만 결제 키를 넘긴다(칸 읽기·이력 0)
  assert.doesNotMatch(page("success/page.tsx").replace(/p_payment_key/g, ""), /payment_key|idempotency_key|payment_attempts/);
  const srv = readFileSync(new URL("../src/lib/exchanges-server.ts", import.meta.url), "utf8");
  assert.match(srv, /from\("mall_builder_exchange_fee_payments"\)\.select\(FEE_PAYMENT_COLUMNS\)/);
  assert.doesNotMatch(srv, /select\("\*"\)/);
  const cols = readFileSync(new URL("../src/lib/exchanges.ts", import.meta.url), "utf8").match(/FEE_PAYMENT_COLUMNS = "([^"]+)"/)[1];
  assert.doesNotMatch(cols, /payment_key|idempotency/);
});

test("다시 확인 동작(소스): 소속 확인이 rpc보다 먼저, 결과·오류는 고정 문구(DB·토스 원문 0)", () => {
  const s = readFileSync(new URL("../src/lib/exchange-actions.ts", import.meta.url), "utf8");
  const f = s.slice(s.indexOf("export async function exchangeFeeCardRecheckAction"), s.indexOf("/** 운영사: 교환비 무통장 입금 확인"));
  assert.ok(f.indexOf("await exchangeOrderInStore(") < f.indexOf(".rpc("));
  assert.doesNotMatch(f, /error\.message|\.message\b/);
});
