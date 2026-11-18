import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHECKOUT_CR_FAIL, CHECKOUT_CR_WITH_INVOICE, checkoutCashReceiptNotice, readCheckoutCashReceipt } from "../src/app/s/[store]/(shop)/order/cash-receipt-checkout.ts";

// S70(B2B-20261119-S70-FRONT) 주문서 현금영수증 — 0105 계약(195f9ba43) 연결의 모의 시험. 실제 RPC·볼타 발급·결제 0.
const fd = (o) => ({ get: (k) => (k in o ? o[k] : null) });
const SECRET = "01098765432";

test("주문 전 판단: 무통장에서 골랐을 때만 — 카드·외상·안 고름은 무시", () => {
  assert.deepEqual(readCheckoutCashReceipt(fd({}), "bank"), { kind: "none" });
  for (const pay of ["card", "credit"]) assert.deepEqual(readCheckoutCashReceipt(fd({ want_cash_receipt: "on", cr_kind: "PHONE:INCOME_DEDUCTION", cr_value: SECRET }), pay), { kind: "none" }, pay);
  assert.deepEqual(readCheckoutCashReceipt(fd({ want_cash_receipt: "on", cr_kind: "PHONE:INCOME_DEDUCTION", cr_value: "010-9876-5432" }), "bank"), { kind: "request", type: "PHONE", value: SECRET, purpose: "INCOME_DEDUCTION" });
  assert.deepEqual(readCheckoutCashReceipt(fd({ want_cash_receipt: "on", cr_kind: "BUSINESS_REGISTRATION_NUMBER:EXPENSE_PROOF", cr_value: "220-81-62517" }), "bank"), { kind: "request", type: "BUSINESS_REGISTRATION_NUMBER", value: "2208162517", purpose: "EXPENSE_PROOF" });
});

test("주문 전 판단: 세금계산서 동시 선택·형식 오류는 주문 전에 고정 문구(입력값 없음)", () => {
  assert.deepEqual(readCheckoutCashReceipt(fd({ want_cash_receipt: "on", want_invoice: "on", cr_kind: "PHONE:INCOME_DEDUCTION", cr_value: SECRET }), "bank"), { kind: "error", error: CHECKOUT_CR_WITH_INVOICE });
  for (const [kind, value] of [["PHONE:INCOME_DEDUCTION", "0212345678"], ["BUSINESS_REGISTRATION_NUMBER:EXPENSE_PROOF", "12345"], ["모름", SECRET]]) {
    const r = readCheckoutCashReceipt(fd({ want_cash_receipt: "on", cr_kind: kind, cr_value: value }), "bank");
    assert.equal(r.kind, "error", kind);
    assert.ok(!r.error.includes(value), "오류 문구에 입력값 없음");
  }
});

test("주문 후 안내: accepted=true만 성공, not_eligible·오류·빈 응답은 같은 고정 안내(원문·번호 없음)", () => {
  assert.equal(checkoutCashReceiptNotice({ data: { accepted: true }, error: null }), null);
  for (const res of [
    { data: { accepted: false, reason: "not_eligible" }, error: null },
    { data: null, error: { message: `휴대폰 번호 ${SECRET} 볼타 원문 500` } },
    { data: { accepted: true }, error: { message: "x" } },
    { data: null, error: null },
    { data: "accepted", error: null },
  ]) {
    const n = checkoutCashReceiptNotice(res);
    assert.equal(n, CHECKOUT_CR_FAIL);
    assert.ok(!n.includes(SECRET) && !n.includes("볼타") && !n.includes("not_eligible"));
  }
});

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const actions = read("../src/app/s/[store]/(shop)/order/actions.ts");
const form = read("../src/app/s/[store]/(shop)/order/order-form.tsx");
const page = read("../src/app/s/[store]/(shop)/order/page.tsx");
const quotePage = read("../src/app/s/[store]/(shop)/quotes/[id]/page.tsx");

test("서버 액션 계약: 주문 전 검사 → 주문 생성 → 0105 1회(0100 직접 호출·재시도·원문 출력 없음) → 고정 안내로 상세", () => {
  const iCheck = actions.indexOf("readCheckoutCashReceipt(form, payMethod)");
  const iPlace = actions.indexOf('rpc("mall_builder_place_order_v2"');
  const iCr = actions.indexOf('rpc("mall_builder_cash_receipt_checkout"');
  assert.ok(iCheck > 0 && iCheck < iPlace && iPlace < iCr, "검사 → 주문 → 접수 순서");
  assert.equal(actions.split('rpc("mall_builder_cash_receipt_checkout"').length, 2, "0105 호출 1곳");
  assert.ok(!actions.includes("mall_builder_cash_receipt_request"), "0100 신청 직접 호출 없음(즉시 발급 경로 금지)");
  assert.ok(!/console\./.test(actions), "로그 출력 없음");
  assert.ok(!/from\("mall_builder_orders"\)/.test(actions), "앱 선조회 없음(판정은 DB 행 잠금 아래)");
  assert.match(actions, /if \(cashReceiptNotice\) redirect\(`\/s\/\$\{slug\}\/orders\/\$\{row\.order_id\}\?done=1&error=\$\{encodeURIComponent\(cashReceiptNotice\)\}`\)/);
  assert.match(actions, /if \(cashReceipt\.kind === "error"\) return \{ \.\.\.values, error: cashReceipt\.error \};/);
});

test("화면: 장바구니 주문·몰 설정·무통장·1원 이상일 때만 칸, 세금계산서와 택1, 견적 주문은 칸 없음", () => {
  assert.match(form, /\{cashReceipt && payMethod === "bank" && t\.total > 0 && \(/);
  assert.match(form, /if \(e\.target\.checked\) setWantInvoice\(false\)/);
  assert.match(form, /if \(e\.target\.checked\) setWantCashReceipt\(false\)/);
  for (const n of ['name="want_cash_receipt"', 'name="cr_kind"', 'name="cr_value"']) assert.ok(form.includes(n), n);
  assert.match(page, /cashReceipt=\{cashReceiptEnabled\(store\.settings\)\}/);
  assert.ok(!quotePage.includes("cashReceipt="), "견적 주문은 다른 액션이라 칸을 넘기지 않음");
});

// Mac 독립 검수 P2(msg_1896ea3cbaa4) — 주문이 만들어진 뒤 0105 호출이 오류 값 대신 예외(reject·throw)를 내도
// 생성된 주문 상세(done=1)로 고정 안내와 함께 가야 한다. 실제 actions.ts를 가짜 next·supabase에 붙여 돌린다(네트워크·DB 0)
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function loadAction() {
  const dir = mkdtempSync(join(tmpdir(), "s70-act-"));
  const stub = (name, body) => { const p = join(dir, name); writeFileSync(p, body); return pathToFileURL(p).href; };
  const nav = stub("nav.mjs", "export function redirect(u) { globalThis.__s70.redirects.push(u); const e = new Error('NEXT_REDIRECT'); e.digest = 'NEXT_REDIRECT;' + u; throw e; }");
  const cache = stub("cache.mjs", "export function revalidatePath() {}");
  const sb = stub("sb.mjs", "export async function createClient() { return globalThis.__s70.client; }");
  const tax = stub("tax.mjs", "export function validateInvoiceEmail(v) { return { ok: true, value: String(v) }; }");
  const helper = new URL("../src/app/s/[store]/(shop)/order/cash-receipt-checkout.ts", import.meta.url).href;
  const src = read("../src/app/s/[store]/(shop)/order/actions.ts")
    .replace('"use server";', "")
    .replace('from "next/navigation"', `from "${nav}"`)
    .replace('from "next/cache"', `from "${cache}"`)
    .replace('from "@/lib/supabase/server"', `from "${sb}"`)
    .replace('from "@/lib/taxInvoice"', `from "${tax}"`)
    .replace('from "./cash-receipt-checkout"', `from "${helper}"`);
  assert.ok(!/from "(@\/|\.\/|next\/)/.test(src), "바꾸지 못한 import 없음");
  return (await import(stub("actions.ts", src))).placeOrderAction;
}

function fakeClient(checkout) {
  const calls = [];
  const chain = (data) => ({ select: () => chain(data), delete: () => chain(data), eq: () => chain(data), maybeSingle: async () => ({ data, error: null }), then: (r) => r({ data: null, error: null }) });
  return {
    calls,
    client: {
      from: (t) => chain(t === "mall_builder_stores" ? { id: "store-1" } : null),
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      rpc: (name, args) => {
        calls.push(name);
        if (name === "mall_builder_place_order_v2") return Promise.resolve({ data: [{ order_id: "ord-1", order_no: "N-1" }], error: null });
        if (name === "mall_builder_cash_receipt_checkout") return checkout(args);
        return Promise.resolve({ data: null, error: null });
      },
    },
  };
}

test("실제 액션: 0105가 reject·throw·오류값·not_eligible이어도 주문 1회 → 생성된 주문 상세 done=1 + 고정 안내(원문·번호 없음), 접수 1회", async () => {
  const placeOrderAction = await loadAction();
  const cases = {
    reject: () => Promise.reject(new Error(`network down ${SECRET}`)),
    throw: () => { throw new Error(`sync ${SECRET}`); },
    errorValue: () => Promise.resolve({ data: null, error: { message: `볼타 ${SECRET}` } }),
    notEligible: () => Promise.resolve({ data: { accepted: false, reason: "not_eligible" }, error: null }),
  };
  const expect = `/s/shop/orders/ord-1?done=1&error=${encodeURIComponent(CHECKOUT_CR_FAIL)}`;
  for (const [name, checkout] of Object.entries(cases)) {
    const f = fakeClient(checkout);
    globalThis.__s70 = { client: f.client, redirects: [] };
    const fdata = new FormData();
    for (const [k, v] of Object.entries({ address_id: "addr-1", expected_total: "33000", pay_method: "bank", depositor: "유저", want_cash_receipt: "on", cr_kind: "PHONE:INCOME_DEDUCTION", cr_value: SECRET })) fdata.set(k, v);
    await assert.rejects(placeOrderAction("shop", { error: null, depositor: "", memo: "" }, fdata), (e) => String(e.digest ?? "").startsWith("NEXT_REDIRECT"), name);
    assert.deepEqual(globalThis.__s70.redirects, [expect], `${name}: 주문 상세로 1번`);
    assert.equal(f.calls.filter((c) => c === "mall_builder_place_order_v2").length, 1, `${name}: 주문 1회`);
    assert.equal(f.calls.filter((c) => c === "mall_builder_cash_receipt_checkout").length, 1, `${name}: 접수 1회(재시도 없음)`);
    assert.ok(!globalThis.__s70.redirects[0].includes(SECRET), `${name}: 번호 없음`);
  }
  // 접수 성공은 안내 없이 done=1
  const ok = fakeClient(() => Promise.resolve({ data: { accepted: true }, error: null }));
  globalThis.__s70 = { client: ok.client, redirects: [] };
  const fd2 = new FormData();
  for (const [k, v] of Object.entries({ address_id: "addr-1", expected_total: "33000", pay_method: "bank", want_cash_receipt: "on", cr_kind: "PHONE:INCOME_DEDUCTION", cr_value: SECRET })) fd2.set(k, v);
  await assert.rejects(placeOrderAction("shop", { error: null, depositor: "", memo: "" }, fd2));
  assert.deepEqual(globalThis.__s70.redirects, ["/s/shop/orders/ord-1?done=1"]);
});
