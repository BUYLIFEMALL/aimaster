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

test("만든 세대 표시: 저장할 때 붙고, 확장에 넘길 때 빠지며, 표시 없는 옛 작업은 막는다", async () => {
  const { withBuilderMark, withoutBuilderMark, isCurrentBuild } = await import("../src/lib/smartstore/fields.ts");
  const r = buildFillSteps(P, D, O);
  const saved = withBuilderMark(r.steps);
  assert.equal(isCurrentBuild(saved), true);
  assert.equal(isCurrentBuild(r.steps), false);
  assert.deepEqual(withoutBuilderMark(saved).map((s) => s.key), keys(r));
  assert.equal(extCanRun(saved, "v1.10"), true);
});

test("옵션: 단독형 표·조합형 조합·0원 규칙·10원 단위·엑셀 머리글", async () => {
  const { normalizeOptions, optionSheetRows, optionRowCount } = await import("../src/lib/smartstore/options.ts");
  const XLSX = (await import("xlsx")).default;
  assert.equal(normalizeOptions(null, 99).spec, null);
  const s = normalizeOptions({ type: "simple", groups: [{ name: "컬러", values: ["빨강", "파랑"] }, { name: "사이즈", values: ["S"] }] }, 99);
  assert.deepEqual(s.errors, []);
  assert.deepEqual(optionSheetRows(s.spec), [["옵션명", "옵션값", "사용여부"], ["컬러", "빨강", "Y"], ["컬러", "파랑", "Y"], ["사이즈", "S", "Y"]]);
  assert.equal(optionRowCount(s.spec), 3);
  const c = normalizeOptions({ type: "combination", groups: [{ name: "색상", values: ["레드", "블랙"] }, { name: "사이즈", values: ["S", "M"] }], combos: [{ values: ["블랙", "M"], price: 500, stock: 3 }] }, 7);
  assert.deepEqual(c.errors, []);
  const rows = optionSheetRows(c.spec);
  assert.deepEqual(rows[0], ["색상", "사이즈", "옵션가", "재고수량", "관리코드", "사용여부"]);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[4], ["블랙", "M", 500, 3, "", "Y"]);
  assert.deepEqual(rows[1], ["레드", "S", 0, 7, "", "Y"]);
  assert.match(normalizeOptions({ type: "combination", groups: [{ name: "색상", values: ["A"] }], combos: [{ values: ["A"], price: 100, stock: 1 }] }, 1).errors[0], /0원/);
  assert.match(normalizeOptions({ type: "combination", groups: [{ name: "색상", values: ["A", "B"] }], combos: [{ values: ["B"], price: 105, stock: 1 }] }, 1).errors[0], /10원/);
  assert.match(normalizeOptions({ type: "simple", groups: [{ name: "", values: ["A"] }] }, 1).errors[0], /옵션명/);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Sheet0");
  const back = XLSX.read(XLSX.write(wb, { bookType: "biff8", type: "buffer" }));
  assert.deepEqual(XLSX.utils.sheet_to_json(back.Sheets.Sheet0, { header: 1 })[0], rows[0]);
});

test("배송 직접 입력 확장: 수량별·구간별·결제방식·묶음·제주 3권역·지역별·설치비, 템플릿이 있으면 안 넣음", () => {
  const base = { asPhone: "010-1234-5678", deliveryCompany: "CJ대한통운", baseFee: 3000 };
  const q = buildFillSteps(P, normalizeDefaults({ ...base, deliveryFeeType: "QUANTITY", qtyEvery: 3, payType: "선결제", bundle: "불가", jejuMode: "3", jejuFee: 5000, islandFee: 7000, regionFee: "산간 3000원", installFee: "없음" }), O);
  assert.deepEqual(q.errors, []);
  const by = (k) => q.steps.find((s) => s.key === k);
  assert.equal(by("delivery_fee_type").value, "수량별");
  assert.equal(by("delivery_qty").target, "vm.modelData.deliveryFee.repeatQuantity");
  assert.equal(by("delivery_qty").value, "3");
  assert.equal(by("delivery_pay").value, "선결제");
  assert.equal(by("delivery_bundle").value, "불가(개별계산)");
  assert.equal(by("delivery_jeju").value, "설정함");
  assert.equal(by("delivery_jeju_zone").value, "3권역");
  assert.equal(by("delivery_jeju_fee").target, "vm.modelData.deliveryFee.deliveryFeeByArea.area2extraFee");
  assert.equal(by("delivery_island_fee").value, "7000");
  assert.equal(by("delivery_install").value, "없음");
  assert.equal(extCanRun(q.steps, "v1.13"), true); // 새 칸은 기존 동작(type·choose)만 씀
  const r = buildFillSteps(P, normalizeDefaults({ ...base, deliveryFeeType: "RANGE", rangeUpTo: 5 }), O);
  assert.match(r.errors.join(" "), /구간별/);
  const r2 = buildFillSteps(P, normalizeDefaults({ ...base, deliveryFeeType: "RANGE", rangeUpTo: 5, rangeExtraFee: 2500, jejuMode: "2", jejuFee: 4000 }), O);
  assert.equal(r2.steps.find((s) => s.key === "delivery_range_fee").value, "2500");
  assert.equal(r2.steps.find((s) => s.key === "delivery_jeju_fee").target, "vm.modelData.deliveryFee.deliveryFeeByArea.area2extraFee");
  const tpl = buildFillSteps(P, normalizeDefaults({ ...base, deliveryTemplate: "바이라이프", payType: "착불", jejuMode: "off" }), O);
  assert.ok(!tpl.steps.some((s) => s.key.startsWith("delivery_") && s.key !== "delivery_tpl"));
});

test("검색 태그: 쉼표·#·중복 정리, 최대 10개, 태그 단계(확장 v1.14+), 없으면 단계 없음", async () => {
  const { normalizeTags } = await import("../src/lib/smartstore/fields.ts");
  assert.deepEqual(normalizeTags("#여행백팩, 노트북가방,,여행백팩\n 출장 가방 "), ["여행백팩", "노트북가방", "출장 가방"]);
  assert.equal(normalizeTags(Array.from({ length: 15 }, (_, i) => "태그" + i).join(",")).length, 10);
  assert.ok(!keys(buildFillSteps(P, D, O)).includes("tags"));
  const r = buildFillSteps(P, D, { ...O, tags: ["여행백팩", "노트북가방"] });
  const s = r.steps.find((x) => x.key === "tags");
  assert.equal(s.section, "검색설정");
  assert.deepEqual(JSON.parse(s.value), ["여행백팩", "노트북가방"]);
  assert.ok(keys(r).indexOf("tags") < keys(r).indexOf("seller_code"));
  assert.equal(extCanRun(r.steps, "v1.13"), false);
  assert.equal(extCanRun(r.steps, "v1.14"), true);
});

test("상품 주요정보: 브랜드·제조사는 brand_input(모델명은 자동 입력 안 함), 중고면 상품상태 choose, 비우면 단계 없음", async () => {
  const { normalizeMainInfo } = await import("../src/lib/smartstore/fields.ts");
  const mi = normalizeMainInfo({ brand: " 스위스톤 ", manufacturer: "바이라이프", model: "ST4D18", used: "used" });
  assert.deepEqual(mi, { brand: "스위스톤", manufacturer: "바이라이프", model: "ST4D18", used: true });
  const r = buildFillSteps(P, D, { ...O, mainInfo: mi });
  const by = (k) => r.steps.find((s) => s.key === k);
  assert.equal(by("brand").action, "brand_input");
  assert.equal(by("brand").target, "brand");
  assert.equal(by("manufacturer").target, "manufacturer");
  assert.equal(by("model_name").action, "model_text");
  assert.equal(by("model_name").value, "ST4D18");
  assert.equal(extCanRun(r.steps, "v1.18"), false);
  assert.equal(by("sale_type").value, "중고상품");
  const none = buildFillSteps(P, D, { ...O, mainInfo: normalizeMainInfo({ used: "new" }) });
  assert.ok(!["brand", "manufacturer", "model_name", "sale_type"].some((k) => keys(none).includes(k)));
});

test("상품속성: 「이름: 값」 줄 정리(전각 콜론·중복·빈 줄), 단계(확장 v1.14+)", async () => {
  const { normalizeAttributes } = await import("../src/lib/smartstore/fields.ts");
  const pairs = normalizeAttributes("소재: 폴리에스터\n\n성별：남녀공용\n소재: 면\n잘못된 줄\n색상: 블랙, 그레이");
  assert.deepEqual(pairs, [{ name: "소재", value: "폴리에스터" }, { name: "성별", value: "남녀공용" }, { name: "색상", value: "블랙, 그레이" }]);
  const r = buildFillSteps(P, D, { ...O, attributes: pairs });
  const s = r.steps.find((x) => x.key === "attributes");
  assert.equal(JSON.parse(s.value).length, 3);
  assert.equal(extCanRun(r.steps, "v1.13"), false);
  assert.ok(!keys(buildFillSteps(P, D, O)).includes("attributes"));
});

test("반품 택배사: 값이 있으면 select 단계, 반품·교환 배송비와 함께", () => {
  const r = buildFillSteps(P, normalizeDefaults({ asPhone: "010-1234-5678", returnCompany: "CJ대한통운", returnFee: 3000, exchangeFee: 6000 }), O);
  const k = keys(r);
  assert.ok(k.indexOf("return_company") >= 0 && k.indexOf("return_company") < k.indexOf("return_fee"));
  assert.equal(r.steps.find((s) => s.key === "return_company").action, "select");
});

test("구매/리뷰 혜택: 비우면 단계 없음, 넣으면 켜기 → 단위 → 금액 순서", () => {
  assert.ok(!keys(buildFillSteps(P, D, O)).some((k) => k.startsWith("point_") || k.startsWith("review_") || k.startsWith("multi_")));
  const r = buildFillSteps(P, normalizeDefaults({ asPhone: "010-1234-5678", purchasePoint: "500", reviewText: 100, reviewPhoto: "300", multiQty: 2, multiDiscount: 1000 }), O);
  const k = keys(r);
  assert.ok(k.indexOf("point_on") < k.indexOf("point_unit") && k.indexOf("point_unit") < k.indexOf("point_value"));
  assert.ok(k.indexOf("multi_on") < k.indexOf("multi_qty") && k.indexOf("multi_unit") < k.indexOf("multi_discount"));
  assert.equal(r.steps.find((s) => s.key === "review_photo").value, "300");
  assert.ok(k.indexOf("multi_discount") < k.indexOf("seller_code"));
  // 복수구매는 개수·금액이 둘 다 있어야
  assert.ok(!keys(buildFillSteps(P, normalizeDefaults({ asPhone: "010-1234-5678", multiQty: 2 }), O)).includes("multi_on"));
});

test("추가상품: 「이름 | 값 | 가격」 정리와 오류", async () => {
  const { normalizeSupplements } = await import("../src/lib/smartstore/fields.ts");
  const ok = normalizeSupplements("파우치 | 블랙,그레이 | 3000,3000\n\n스트랩 | 레드 | 0");
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.groups.length, 2);
  assert.match(normalizeSupplements("파우치 | 블랙,그레이 | 3000").errors[0], /가격 수/);
  assert.match(normalizeSupplements("파우치 | 블랙 | 3005").errors[0], /10원/);
  const r = buildFillSteps(P, D, { ...O, supplements: ok.groups });
  assert.match(r.steps.find((s) => s.key === "supplements").label, /3개/);
  assert.equal(extCanRun(r.steps, "v1.13"), false);
});

test("예약구매: 꺼져 있으면 없음, 날짜 검사, 단계는 상품명 앞", async () => {
  const { normalizePreOrder } = await import("../src/lib/smartstore/fields.ts");
  assert.equal(normalizePreOrder({}).preOrder, null);
  assert.match(normalizePreOrder({ on: "on", start: "2026-11-01" }).error, /주문기간/);
  assert.match(normalizePreOrder({ on: "on", start: "2026-11-05", end: "2026-11-01" }).error, /빠릅니다/);
  const { preOrder } = normalizePreOrder({ on: "on", start: "2026-11-01", end: "2026-11-10", after: "SALE" });
  const k = keys(buildFillSteps(P, D, { ...O, preOrder }));
  assert.ok(k.indexOf("preorder") >= 0 && k.indexOf("preorder") < k.indexOf("name"));
});

test("조합형 옵션이면 상품 재고 = 조합 재고 합계(다르면 바로 등록 거절)", async () => {
  const { normalizeOptions } = await import("../src/lib/smartstore/options.ts");
  const options = normalizeOptions({ type: "combination", groups: [{ name: "색상", values: ["블랙", "그레이"] }], combos: [{ values: ["블랙"], price: 0, stock: 99 }, { values: ["그레이"], price: 0, stock: 50 }] }, 99).spec;
  const r = buildFillSteps(P, D, { ...O, options });
  assert.equal(r.steps.find((s) => s.key === "stock").value, "149");
  const simple = normalizeOptions({ type: "simple", groups: [{ name: "색상", values: ["A", "B"] }] }, 99).spec;
  assert.equal(buildFillSteps(P, D, { ...O, options: simple }).steps.find((s) => s.key === "stock").value, String(D.stock));
  assert.equal(buildFillSteps(P, D, O).steps.find((s) => s.key === "stock").value, String(D.stock));
});

test("상품속성 불러오기: 결과 정리·글 변환", async () => {
  const { normalizeLookupResult, parseAttrText, attrsToText } = await import("../src/lib/smartstore/attributes.ts");
  assert.equal(normalizeLookupResult(null), null);
  assert.equal(normalizeLookupResult({ category: { id: "abc" } }), null);
  const r = normalizeLookupResult({
    category: { id: "50000651", path: "패션잡화>남성가방>백팩" },
    candidates: [{ id: "50004203", path: "출산/육아>유아동잡화>가방>백팩" }, { id: "x" }],
    attributes: [
      { name: "주요소재", type: "MULTI_SELECT", max: 3, required: false, values: ["가죽", "폴리에스테르", "가죽", ""] },
      { name: "용도", type: "SINGLE_SELECT", max: 0, values: ["여행용"] },
      { name: "용도", type: "SINGLE_SELECT", values: ["중복"] },
      { name: "메모", type: "WEIRD", values: [] },
    ],
  });
  assert.deepEqual(r.candidates.map((c) => c.id), ["50000651", "50004203"]);
  assert.deepEqual(r.attributes.map((a) => [a.name, a.type, a.max, a.values.length]), [["주요소재", "MULTI_SELECT", 3, 2], ["용도", "SINGLE_SELECT", 0, 1], ["메모", "TEXT", 0, 0]]);
  const picked = parseAttrText("주요소재: 폴리에스테르, 나일론\n용도：여행용\n잘못된 줄\n제품특징: 노트북수납, 방수");
  assert.deepEqual(picked, { 주요소재: ["폴리에스테르", "나일론"], 용도: ["여행용"], 제품특징: ["노트북수납", "방수"] });
  assert.equal(attrsToText(picked, ["용도", "주요소재"]), "용도: 여행용\n주요소재: 폴리에스테르, 나일론\n제품특징: 노트북수납, 방수");
  assert.equal(attrsToText({ 패턴: [] }), "");
});

test("상품속성 AI 추천 거르기: 보기 안 값만·한 개·최대 개수", async () => {
  const { sanitizeSuggestion } = await import("../src/lib/smartstore/attributes.ts");
  const attrs = [
    { name: "주요소재", type: "MULTI_SELECT", max: 2, required: true, values: ["가죽", "폴리에스테르", "나일론"] },
    { name: "용도", type: "SINGLE_SELECT", max: 0, required: true, values: ["여행용", "학생용"] },
  ];
  const out = sanitizeSuggestion([
    { name: "주요소재", values: ["폴리에스테르", "폴리에스터", "나일론", "가죽"] },
    { name: "용도", values: ["여행용", "학생용"] },
    { name: "없는속성", values: ["x"] },
    { name: "주요소재", values: ["가죽"] },
  ], attrs);
  assert.deepEqual(out, { 주요소재: ["폴리에스테르", "나일론"], 용도: ["여행용"] });
});

test("화면 점검 칸 표 = fields.ts가 쓰는 칸(칸을 바꾸면 health.ts도 고칠 것)", async () => {
  const fs = await import("node:fs");
  const { HEALTH_TARGETS, HEALTH_CONDITIONAL, normalizeHealthResult } = await import("../src/lib/smartstore/health.ts");
  const src = fs.readFileSync(new URL("../src/lib/smartstore/fields.ts", import.meta.url), "utf8");
  const used = [...new Set([...src.matchAll(/target: "([^"]+)"/g)].map((m) => m[1]))].sort();
  assert.deepEqual([...HEALTH_TARGETS, ...HEALTH_CONDITIONAL].sort(), used);
  const r = normalizeHealthResult({ missing: ["vm.product.name", "없는칸"], conditional: ["image.add", "vm.product.name"], storeName: "  바이라이프몰  " });
  assert.deepEqual(r, { missing: ["vm.product.name"], conditional: ["image.add"], storeName: "바이라이프몰" });
});
