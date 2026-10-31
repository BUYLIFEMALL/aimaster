// 카테고리 추천·메타 응답 정리(문서 응답 모양 기준, 외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { fillNotices, metaPath, metaWarnings, normalizeMeta, normalizePredict, predictBody } from "../src/lib/coupang/category.ts";

test("추천 성공·실패 정리", () => {
  assert.deepEqual(normalizePredict({ data: { autoCategorizationPredictionResultType: "SUCCESS", predictedCategoryId: "56137", predictedCategoryName: "백팩" } }), { ok: true, code: 56137, name: "백팩" });
  assert.deepEqual(normalizePredict({ data: { autoCategorizationPredictionResultType: "INSUFFICIENT_INFORMATION", comment: null } }), { ok: false, reason: "INSUFFICIENT_INFORMATION", comment: "" });
  assert.equal(normalizePredict(null).ok, false);
});

test("추천 요청 본문은 빈 값을 빼고 보낸다", () => {
  assert.deepEqual(predictBody({ name: " 노트북 백팩 ", brand: "" }), { productName: "노트북 백팩" });
});

const meta = normalizeMeta({
  code: "SUCCESS",
  data: {
    isAllowSingleItem: true,
    attributes: [
      { attributeTypeName: "색상", dataType: "STRING", required: "MANDATORY", exposed: "EXPOSED", groupNumber: "NONE" },
      { attributeTypeName: "수량", dataType: "NUMBER", basicUnit: "개", usableUnits: ["개"], required: "OPTIONAL", exposed: "EXPOSED", groupNumber: "1" },
      { attributeTypeName: "소재", required: "OPTIONAL", exposed: "NONE" },
    ],
    noticeCategories: [{ noticeCategoryName: "가방", noticeCategoryDetailNames: [
      { noticeCategoryDetailName: "종류", required: "MANDATORY" },
      { noticeCategoryDetailName: "소재", required: "MANDATORY" },
    ] }],
    requiredDocumentNames: [{ templateName: "수입신고필증", required: "MANDATORY_PARALLEL_IMPORTED" }],
    certifications: [{ certificationType: "KC_KID_CERTIFICATION", name: "어린이제품 인증", dataType: "CODE", required: "MANDATORY" }],
    allowedOfferConditions: ["NEW", "USED_BEST"],
  },
});

test("메타: 구매옵션/검색옵션·필수·그룹 구분", () => {
  assert.equal(meta.attributes.length, 3);
  assert.deepEqual(meta.attributes[0], { name: "색상", dataType: "STRING", required: true, purchase: true, basicUnit: "", units: [], group: null, inputType: "INPUT", values: [] });
  assert.equal(meta.attributes[1].group, "1");
  assert.equal(meta.attributes[2].purchase, false);
});

test("고시정보: 회원 값 우선, 없으면 상세페이지 참조", () => {
  assert.deepEqual(fillNotices(meta, "가방", { 종류: "백팩" }), [
    { category: "가방", detail: "종류", content: "백팩" },
    { category: "가방", detail: "소재", content: "상세페이지 참조" },
  ]);
});

test("필수 안내: 빠진 구매옵션·필수 인증(병행수입 서류는 해당 없음)", () => {
  const w = metaWarnings(meta, []);
  assert.ok(w.some((x) => x.includes("「색상」")));
  assert.ok(w.some((x) => x.includes("어린이제품 인증")));
  assert.ok(!w.some((x) => x.includes("수입신고필증")));
  assert.equal(metaWarnings(meta, ["색상"]).filter((x) => x.includes("색상")).length, 0);
});

test("메타 경로", () => {
  assert.equal(metaPath(56137), "/v2/providers/seller_api/apis/api/v1/marketplace/meta/category-related-metas/display-category-codes/56137");
});

test("A4 카테고리 찾아보기와 브랜드 이름", async () => {
  const { browsePath, normalizeBrowse } = await import("../src/lib/coupang/category.ts");
  const { brandNames } = await import("../src/lib/coupang/brand.ts");
  assert.match(browsePath(0), /display-categories\/0$/);
  assert.deepEqual(normalizeBrowse({ data: { child: [{ displayItemCategoryCode: 1, name: "가", status: "ACTIVE" }, { displayItemCategoryCode: 2, name: "나", status: "DISABLED" }] } }), [{ code: 1, name: "가" }]);
  assert.deepEqual(normalizeBrowse({ data: { child: null } }), []);
  assert.deepEqual(brandNames({ data: { items: [{ brandName: "A" }, { brandName: "A" }, { brandName: "" }] } }), ["A"]);
});
