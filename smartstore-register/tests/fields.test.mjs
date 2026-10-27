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

test("상품 주요정보: 브랜드·제조사·모델명은 실제 칸 이름으로, 중고면 상품상태 choose, 비우면 단계 없음", async () => {
  const { normalizeMainInfo } = await import("../src/lib/smartstore/fields.ts");
  const mi = normalizeMainInfo({ brand: " 스위스톤 ", manufacturer: "바이라이프", model: "ST4D18", used: "used" });
  assert.deepEqual(mi, { brand: "스위스톤", manufacturer: "바이라이프", model: "ST4D18", used: true });
  const r = buildFillSteps(P, D, { ...O, mainInfo: mi });
  const by = (k) => r.steps.find((s) => s.key === k);
  assert.equal(by("brand").target, "vm.product.detailAttribute.naverShoppingSearchInfo.brandName");
  assert.equal(by("manufacturer").target, "vm.product.detailAttribute.naverShoppingSearchInfo.manufacturerName");
  assert.equal(by("model_name").value, "ST4D18");
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
