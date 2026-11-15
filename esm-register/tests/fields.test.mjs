// 실행: npm test — ESM+ 칸 변환(src/lib/esm/fields.ts)·화면 점검 표(health.ts) 시험
import test from "node:test";
import assert from "node:assert/strict";
import { buildFillSteps, normalizeDefaults, normalizeOption, managementCode, orderSections, toRegisterMode, nameUnits, withBuilderMark, isCurrentBuild, withoutBuilderMark } from "../src/lib/esm/fields.ts";
import { HEALTH_TARGETS, HEALTH_CONDITIONAL } from "../src/lib/esm/health.ts";

const P = { id: "82deeddc-58c8-4b14-9d59-66728bb876af", name: "스테인리스 텀블러 500ml", price: 19900, sale_price: 15900, category: "리빙 > 주방용품 > 텀블러" };
const D = normalizeDefaults({ deliveryCompany: "CJ택배", shipPolicy: "순차발송", shipOrigin: "바이라이프", feePolicyNo: "(37246700)", returnFee: "3000" });
const O = { mode: "fill_only", categoryKeyword: "텀블러", detailImageCount: 3, mainImage: true, extraImageCount: 2 };

test("순서: 판매사이트·상품명 다음 카테고리, 옵션·고시보다 카테고리가 먼저", () => {
  const { steps, errors } = buildFillSteps(P, D, O);
  assert.deepEqual(errors, []);
  const keys = steps.map((s) => s.key);
  assert.deepEqual(keys.slice(0, 4), ["sites", "name", "seller_code", "category"]);
  for (const k of ["option_off", "cert", "notice_group", "delivery_company"]) assert.ok(keys.indexOf("category") < keys.indexOf(k), k);
  assert.equal(steps.find((s) => s.key === "category").path, "리빙>주방용품>텀블러");
});

test("판매가: 할인가가 있으면 할인가, 10원 단위가 아니면 오류", () => {
  assert.equal(buildFillSteps(P, D, O).steps.find((s) => s.key === "price").value, "15900");
  assert.equal(buildFillSteps({ ...P, sale_price: null }, D, O).steps.find((s) => s.key === "price").value, "19900");
  assert.match(buildFillSteps({ ...P, sale_price: null, price: 19905 }, D, O).errors[0], /10원 단위/);
});

test("필수값 없으면 오류(카테고리·대표 사진·상세 이미지)", () => {
  const r = buildFillSteps(P, D, { ...O, categoryKeyword: " ", mainImage: false, detailImageCount: 0 });
  assert.equal(r.errors.length, 3);
});

test("상품명 길이: 한글 2·그 밖 1로 세어 100까지", () => {
  assert.equal(nameUnits("가나a1"), 6);
  assert.match(buildFillSteps({ ...P, name: "가".repeat(51) }, D, O).errors[0], /한글 50자/);
  assert.deepEqual(buildFillSteps({ ...P, name: "가".repeat(50) }, D, O).errors, []);
});

test("기본값 정리: 배송비 정책 번호는 숫자만, 모르는 값은 기본", () => {
  assert.equal(D.feePolicyNo, "37246700");
  assert.equal(D.returnFee, 3000);
  const x = normalizeDefaults({ sites: "naver", shipPolicy: "로켓", vat: "?" });
  assert.deepEqual([x.sites, x.shipPolicy, x.vat, x.certNotTarget], ["both", "", "과세상품", true]);
});

test("판매사이트에 따라 재고 칸", () => {
  const g = buildFillSteps(P, normalizeDefaults({ ...D, sites: "gmarket" }), O).steps.map((s) => s.key);
  assert.ok(g.includes("stock_g") && !g.includes("stock_a"));
});

test("배송: 템플릿 이름이 있으면 템플릿만, 없으면 칸마다", () => {
  const t = buildFillSteps(P, normalizeDefaults({ deliveryTemplate: "기본 배송" }), O).steps.map((s) => s.key);
  assert.ok(t.includes("delivery_tpl") && !t.includes("delivery_company"));
  const c = buildFillSteps(P, D, O).steps.map((s) => s.key);
  assert.ok(["delivery_company", "ship_policy", "ship_origin", "fee_policy"].every((k) => c.includes(k)));
  assert.ok(buildFillSteps(P, normalizeDefaults({}), O).warnings.some((w) => w.includes("배송")));
});

test("옵션: 단독형 정리·오류, 없으면 설정안함", () => {
  assert.deepEqual(normalizeOption({ name: "색상", values: "블랙, 화이트, 블랙" }).option, { name: "색상", values: ["블랙", "화이트"] });
  assert.match(normalizeOption({ name: "색상", values: "블랙" }).error, /2개 이상/);
  assert.match(normalizeOption({ name: "", values: "a,b" }).error, /옵션명/);
  assert.equal(normalizeOption({ name: "", values: "" }).option, null);
  const keys = buildFillSteps(P, D, { ...O, option: { name: "색상", values: ["블랙", "화이트"] } }).steps.map((s) => s.key);
  assert.ok(keys.includes("option") && !keys.includes("option_off"));
});

test("등록 방식별 마지막 단계", () => {
  assert.equal(buildFillSteps(P, D, O).steps.at(-1).action, "choose");
  assert.equal(buildFillSteps(P, D, { ...O, mode: "temp_save" }).steps.at(-1).value, "temp_save");
  assert.equal(buildFillSteps(P, D, { ...O, mode: "register" }).steps.at(-1).target, "등록하기");
  assert.equal(toRegisterMode("x"), "fill_only");
});

test("관리코드·세대 표시·섹션 순서", () => {
  assert.equal(managementCode(P.id), "AIM-82DEEDDC58");
  const marked = withBuilderMark(buildFillSteps(P, D, O).steps);
  assert.ok(isCurrentBuild(marked) && !isCurrentBuild(withoutBuilderMark(marked)));
  const rows = [{ section_key: "a", section_order: 1 }, { section_key: "b", section_order: 2 }, { section_key: "c", section_order: 3 }];
  assert.deepEqual(orderSections(rows, ["c", "a"]).map((r) => r.section_key), ["c", "a", "b"]);
});

test("화면 점검 표: 확장이 쓰는 「구역|칸」이 모두 점검 표에 있다", () => {
  const all = buildFillSteps(P, D, { ...O, mode: "register", option: { name: "색상", values: ["a", "b"] }, brand: "x" }).steps;
  const tpl = buildFillSteps(P, normalizeDefaults({ deliveryTemplate: "t", noticeReference: true }), O).steps;
  const known = new Set([...HEALTH_TARGETS, ...HEALTH_CONDITIONAL]);
  for (const s of [...all, ...tpl]) assert.ok(known.has(`${s.section}|${s.target}`), `${s.section}|${s.target}`);
});
