import { test } from "node:test";
import assert from "node:assert/strict";
import { codeError, commissionOf, normalizeCode, parseRate, payoutError, refCookieName, refHeaderFromCookies, withholdingHint, defaultDeduction } from "../src/lib/reseller.ts";

test("코드", () => {
  assert.equal(normalizeCode(" gana01 "), "GANA01");
  assert.equal(codeError("GANA01"), null);
  assert.ok(codeError("AB"));
  assert.ok(codeError("가나다라"));
  assert.ok(codeError("ABCDEFGHIJKLM"));
});

test("수수료율", () => {
  assert.deepEqual(parseRate("5"), { ok: true, value: 5 });
  assert.deepEqual(parseRate("3.456"), { ok: true, value: 3.46 });
  assert.deepEqual(parseRate("0"), { ok: true, value: 0 }); // 0071부터 0% 허용(추가율)
  assert.equal(parseRate("").ok, false);
  assert.equal(parseRate("-1").ok, false);
  assert.equal(parseRate("51").ok, false);
  assert.equal(parseRate("x").ok, false);
});

test("수수료 = (결제 − 배송비) × 율, 내림", () => {
  assert.equal(commissionOf(84600, 3000, 5), 4080);
  assert.equal(commissionOf(3000, 3000, 5), 0);
  assert.equal(commissionOf(1000, 3000, 5), 0);
  assert.equal(commissionOf(33333, 0, 3.3), 1099);
});

test("출금 검사·원천징수 안내·쿠키 이름", () => {
  assert.ok(payoutError(9999, 50000));
  assert.ok(payoutError(60000, 50000));
  assert.equal(payoutError(50000, 50000), null);
  assert.equal(withholdingHint(100000), 3300);
  assert.equal(refCookieName("aimaster-b2b"), "mb_ref_aimaster-b2b");
});

test("refHeaderFromCookies — 몰별 리셀러 쿠키를 머리글 한 줄로(M1-5 0072)", () => {
  assert.equal(refHeaderFromCookies([]), null);
  assert.equal(refHeaderFromCookies([{ name: "sb-x", value: "y" }, { name: "mb_ref_scn", value: "bad code!" }]), null);
  assert.equal(refHeaderFromCookies([{ name: "mb_ref_scn", value: "rslr01" }, { name: "mb_ref_aimaster-b2b", value: "OWNER1" }]), "scn=RSLR01;aimaster-b2b=OWNER1");
  assert.equal(refHeaderFromCookies([{ name: "mb_ref_" + "a".repeat(61), value: "RSLR01" }]), null);
  assert.equal(refHeaderFromCookies([{ name: refCookieName("scn"), value: "RSLR01" }]), "scn=RSLR01");
});

test("defaultDeduction — 개인 3.3% 원천징수, 사업자 0(M1-7 0075)", () => {
  assert.equal(defaultDeduction(40000, "individual"), 1320);
  assert.equal(defaultDeduction(40000, undefined), 1320);
  assert.equal(defaultDeduction(40000, "business"), 0);
});

// ── M4-C3 상품 순위·새 소식
import { rankProducts, recentNews } from "../src/lib/reseller.ts";
const W = (o) => ({ product_id: "p1", name_snapshot: "컵", order_id: "o1", base_amount: 10000, amount: 700, status: "pending", created_at: "2026-11-14T00:00:00Z", decided_at: null, ...o });

test("rankProducts: 상품별 주문 수·금액·리워드, 삭제 제외, 리워드 많은 순", () => {
  const r = rankProducts([
    W({}),
    W({ order_id: "o2", status: "paid" }),
    W({ product_id: "p2", name_snapshot: "티셔츠", amount: 1200 }),
    W({ product_id: "p2", name_snapshot: "티셔츠", order_id: "o3", amount: 999, status: "deleted" }),
  ]);
  assert.deepEqual(r.map((x) => [x.name, x.orders, x.sales, x.reward]), [["컵", 2, 20000, 1400], ["티셔츠", 1, 10000, 1200]]);
});

test("rankProducts: 상품 id가 없으면 이름으로 묶음", () => {
  const r = rankProducts([W({ product_id: null }), W({ product_id: null, order_id: "o9" })]);
  assert.equal(r.length, 1);
  assert.equal(r[0].orders, 2);
});

test("recentNews: 최근 7일 새 리워드·지급 완료·보류, 오래된 것·삭제 제외, 최신순", () => {
  const now = new Date("2026-11-15T00:00:00Z");
  const n = recentNews([
    W({ created_at: "2026-11-14T00:00:00Z" }),
    W({ created_at: "2026-11-01T00:00:00Z", status: "paid", decided_at: "2026-11-13T00:00:00Z" }),
    W({ created_at: "2026-11-12T00:00:00Z", status: "held", decided_at: "2026-11-12T12:00:00Z" }),
    W({ created_at: "2026-10-01T00:00:00Z" }),
    W({ created_at: "2026-11-14T00:00:00Z", status: "deleted" }),
  ], now);
  assert.deepEqual(n.map((x) => x.kind), ["new", "paid", "held"]);
});
