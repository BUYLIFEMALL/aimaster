import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuickText, parseQuickTable, mergeQuickRows, resolveQuickLine } from "../src/lib/quickOrder.ts";

test("D25 붙여 넣기 — 탭(엑셀 복사)·쉼표·공백, 머리글 건너뜀, 수량 오류", () => {
  const { rows, errors } = parseQuickText("품번\t수량\nP00001\t10\nP00002, 검정, 5\nXT-001 3개\n\nP9\nP8 많이");
  assert.deepEqual(rows.map((r) => [r.line, r.code, r.option, r.qty]), [[2, "P00001", "", 10], [3, "P00002", "검정", 5], [4, "XT-001", "", 3]]);
  assert.deepEqual(errors.map((e) => e.line), [6, 7]);
});

test("D25 엑셀 표 — 머리글(품번·옵션·수량) 순서 상관없음, 머리글 없으면 첫 칸·끝 칸", () => {
  const a = parseQuickTable([["수량", "품번", "옵션"], ["10", "P00002", "검정"], ["", "", ""]]);
  assert.deepEqual(a.rows, [{ line: 2, code: "P00002", option: "검정", qty: 10 }]);
  const b = parseQuickTable([["P00001", "7"]]);
  assert.deepEqual(b.rows, [{ line: 1, code: "P00001", option: "", qty: 7 }]);
});

test("D25 같은 품번·옵션은 합침(대소문자·띄어쓰기·/ 무시)", () => {
  const m = mergeQuickRows([
    { line: 1, code: "p00002", option: "검정 / M", qty: 2 },
    { line: 3, code: "P00002", option: "검정M", qty: 3 },
    { line: 4, code: "P00002", option: "파랑", qty: 1 },
  ]);
  assert.equal(m.length, 2);
  assert.deepEqual(m[0], { lines: [1, 3], code: "p00002", option: "검정 / M", qty: 5 });
});

const catalog = new Map([
  ["plain", { option_groups: [], variants: [] }],
  ["pen", { option_groups: [{ name: "색상", values: ["검정", "파랑"] }, { name: "굵기", values: ["0.5", "0.7"] }], variants: [
    { id: "v1", key: "검정 / 0.5", values: ["검정", "0.5"], extra_price: 0, stock: 1, sku: "PEN-BK5", is_active: true },
    { id: "v2", key: "파랑 / 0.7", values: ["파랑", "0.7"], extra_price: 0, stock: 1, sku: "DUP", is_active: true },
  ] }],
]);
const hits = [
  { code: "P00001", product_id: "plain", variant_id: null, kind: "product" },
  { code: "P00002", product_id: "pen", variant_id: null, kind: "product" },
  { code: "PEN-BK5", product_id: "pen", variant_id: "v1", kind: "variant" },
  { code: "DUP", product_id: "pen", variant_id: "v2", kind: "variant" },
  { code: "DUP", product_id: "pen", variant_id: "v9", kind: "variant" },
];
const L = (code, option = "") => ({ lines: [1], code, option, qty: 1 });

test("D25 찾기 — 품번·품번+옵션·조합 품번", () => {
  assert.deepEqual(resolveQuickLine(L("p00001"), hits, catalog), { ok: true, product_id: "plain", variant_id: null });
  assert.deepEqual(resolveQuickLine(L("P00002", "검정 0.5"), hits, catalog), { ok: true, product_id: "pen", variant_id: "v1" });
  assert.deepEqual(resolveQuickLine(L("P00002", "파랑/0.7"), hits, catalog), { ok: true, product_id: "pen", variant_id: "v2" });
  assert.deepEqual(resolveQuickLine(L("pen-bk5"), hits, catalog), { ok: true, product_id: "pen", variant_id: "v1" });
});

test("D25 찾기 오류 — 옵션 빠짐·없는 옵션·옵션 없는 상품에 옵션·겹치는 조합 품번·없는 품번", () => {
  assert.match(resolveQuickLine(L("P00002"), hits, catalog).error, /옵션\(색상·굵기\)/);
  assert.match(resolveQuickLine(L("P00002", "빨강"), hits, catalog).error, /찾지 못했습니다/);
  assert.match(resolveQuickLine(L("P00001", "검정"), hits, catalog).error, /옵션이 없는 상품/);
  assert.match(resolveQuickLine(L("DUP"), hits, catalog).error, /여러 옵션/);
  assert.match(resolveQuickLine(L("PEN-BK5", "검정"), hits, catalog).error, /따로 적지 않습니다/);
  assert.match(resolveQuickLine(L("NOPE"), hits, catalog).error, /없거나/);
});
