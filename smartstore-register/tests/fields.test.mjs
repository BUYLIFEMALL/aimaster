// 실행: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { buildFillSteps, normalizeDefaults, managementCode, orderSections, toRegisterMode, EMPTY_DEFAULTS, extCanRun, extVersionNumber } from "../src/lib/smartstore/fields.ts";

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

test("배송: 템플릿 이름이 있으면 목록 창 고르기, 「템플릿 추가」 체크 상자는 건드리지 않음", () => {
  const r = buildFillSteps(P, D, O);
  const s = r.steps.find((x) => x.key === "delivery_tpl");
  assert.equal(s.action, "template");
  assert.equal(s.value, "기본 배송");
  assert.ok(!r.steps.some((x) => x.target.includes("savedTemplate")));
  assert.ok(!keys(r).includes("delivery_fee_type"));
});

test("배송: 템플릿 없이 조건부 무료 직접 입력, 금액 빠지면 오류", () => {
  const base = { asPhone: "010-1234-5678", deliveryCompany: "CJ대한통운", deliveryFeeType: "CONDITIONAL_FREE" };
  const ok = buildFillSteps(P, normalizeDefaults({ ...base, baseFee: "3,000", freeOver: 30000 }), O);
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.steps.filter((x) => x.section === "배송").map((x) => [x.key, x.action, x.value]), [
    ["delivery_company", "select", "CJ대한통운"],
    ["delivery_fee_type", "select", "조건부 무료"],
    ["delivery_base_fee", "type", "3000"],
    ["delivery_free_over", "type", "30000"],
  ]);
  const bad = buildFillSteps(P, normalizeDefaults(base), O);
  assert.equal(bad.errors.length, 2);
  const free = buildFillSteps(P, normalizeDefaults({ asPhone: "010-1", deliveryFeeType: "FREE" }), O);
  assert.deepEqual(free.steps.filter((x) => x.section === "배송").map((x) => x.key), ["delivery_fee_type"]);
  assert.equal(normalizeDefaults({ deliveryFeeType: "HACK" }).deliveryFeeType, "");
});

test("확장 버전: 새 동작이 든 작업은 v1.04 이상만", () => {
  assert.equal(extVersionNumber("v1.04"), 104);
  assert.equal(extVersionNumber("1.3"), 0);
  assert.equal(extCanRun([{ action: "type" }], null), true);
  assert.equal(extCanRun([{ action: "template" }], null), false);
  assert.equal(extCanRun([{ action: "select" }], "v1.03"), false);
  assert.equal(extCanRun([{ action: "select" }], "v1.04"), true);
  assert.equal(extCanRun([{ action: "select" }], "v2.00"), true);
});

test("어린이제품인증: 기본은 건드리지 않음, 「인증대상 아님」이면 choose 단계(확장 v1.06 필요)", () => {
  assert.ok(!keys(buildFillSteps(P, D, O)).includes("child_cert"));
  const r = buildFillSteps(P, normalizeDefaults({ asPhone: "010-1", childCert: "not_target" }), O);
  const s = r.steps.find((x) => x.key === "child_cert");
  assert.equal(s.action, "choose");
  assert.equal(s.value, "어린이제품 인증대상 아님");
  assert.equal(extCanRun(r.steps, "v1.05"), false);
  assert.equal(extCanRun(r.steps, "v1.06"), true);
  assert.equal(normalizeDefaults({ childCert: "x" }).childCert, "");
});

test("추가 이미지: 0장이면 단계 없음, 3장은 3장, 12장은 9장까지, 확장 v1.10 이상", () => {
  assert.ok(!keys(buildFillSteps(P, D, O)).includes("extra_images"));
  const r3 = buildFillSteps(P, D, { ...O, extraImageCount: 3 });
  const s3 = r3.steps.find((s) => s.key === "extra_images");
  assert.equal(s3.value, "3");
  assert.ok(keys(r3).indexOf("extra_images") > keys(r3).indexOf("images"));
  assert.equal(buildFillSteps(P, D, { ...O, extraImageCount: 12 }).steps.find((s) => s.key === "extra_images").value, "9");
  assert.equal(extCanRun(r3.steps, "v1.09"), false);
  assert.equal(extCanRun(r3.steps, "v1.10"), true);
});
