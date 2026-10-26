// 실행: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { buildFillSteps, normalizeDefaults, managementCode, orderSections, toRegisterMode, EMPTY_DEFAULTS } from "../src/lib/smartstore/fields.ts";

const P = { id: "82deeddc-58c8-4b14-9d59-66728bb876af", name: "스테인리스 텀블러 500ml", price: 19900, sale_price: 15900 };
const D = normalizeDefaults({ asPhone: "010-1234-5678", deliveryTemplate: "기본 배송" });
const O = { mode: "fill_only", categoryKeyword: "텀블러", detailImageCount: 3, mainImage: true };
const keys = (r) => r.steps.map((s) => s.key);

test("기본값 정리: 모르는 칸 버리고 숫자·전화 정리", () => {
  const d = normalizeDefaults({ stock: "1,000", asPhone: "010 1234-5678 ☎", hack: 1, returnFee: -5, originType: "x" });
  assert.equal(d.stock, 1000);
  assert.equal(d.asPhone, "0101234-5678");
  assert.equal(d.returnFee, null);
  assert.equal(d.originType, "domestic");
  assert.equal(d.hack, undefined);
  assert.equal(normalizeDefaults(null).stock, EMPTY_DEFAULTS.stock);
});

test("정상 상품: 오류 없음, 할인 금액 = 정상가 - 할인가, 입력만이면 저장 버튼 없음", () => {
  const r = buildFillSteps(P, D, O);
  assert.deepEqual(r.errors, []);
  assert.equal(r.steps.find((s) => s.key === "discount").value, "4000");
  assert.ok(!keys(r).includes("submit"));
  assert.equal(r.steps.find((s) => s.key === "seller_code").value, managementCode(P.id));
});

test("필수값 빠짐: 상품명·가격·카테고리·대표 이미지·A/S 전화", () => {
  const r = buildFillSteps({ id: "x", name: " ", price: 5, sale_price: null }, normalizeDefaults({}), { ...O, categoryKeyword: "", mainImage: false });
  assert.equal(r.errors.length, 5);
});

test("상품명 100자 넘음, 할인가가 정상가 이상이면 할인 안 넣음", () => {
  const r = buildFillSteps({ ...P, name: "가".repeat(101), sale_price: 20000 }, D, O);
  assert.ok(r.errors.some((e) => e.includes("101자")));
  assert.ok(!keys(r).includes("discount"));
  assert.ok(r.warnings.some((w) => w.includes("할인가")));
});

test("방식별 마지막 단계: 임시저장 / 바로 등록(기본 전시중지)", () => {
  assert.equal(buildFillSteps(P, D, { ...O, mode: "temp_save" }).steps.at(-1).target, "vm.createTempSave");
  const reg = buildFillSteps(P, D, { ...O, mode: "register" });
  assert.equal(reg.steps.at(-1).label, "저장하기");
  assert.equal(reg.steps.find((s) => s.key === "display").value, "SUSPENSION");
  assert.equal(toRegisterMode("anything"), "fill_only");
});

test("섹션 순서: 순서 목록 우선, 나머지는 원래 순서로 뒤에", () => {
  const rows = [{ section_key: "a", section_order: 1 }, { section_key: "b", section_order: 2 }, { section_key: "c", section_order: 3 }];
  assert.deepEqual(orderSections(rows, ["c", "a"]).map((r) => r.section_key), ["c", "a", "b"]);
  assert.deepEqual(orderSections(rows, null).map((r) => r.section_key), ["a", "b", "c"]);
});
