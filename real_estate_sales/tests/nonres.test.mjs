// RQ-B5 비주거 리포트 요약(2026-11-05)
import { test } from "node:test";
import assert from "node:assert/strict";
import { dongFromPnu, jibunFromPnu, nonResDeal, summarizeNonRes } from "../src/lib/realestate/nonres.ts";

const B = (o) => ({ dealAmount: "50,000", dealYear: 2026, dealMonth: 9, dealDay: 3, umdNm: "역삼동", jibun: "828-10", buildingUse: "업무", buildingType: "집합", buildingAr: 33.0579, floor: 5, cdealType: " ", shareDealingType: " ", ...o });
const L = (o) => ({ dealAmount: "10,000", dealYear: 2026, dealMonth: 8, dealDay: 1, umdNm: "학장동", jibun: "5**", jimok: "공장용지", dealArea: 330.58, cdealType: " ", shareDealingType: " ", ...o });

test("필지 번호에서 지번·동 이름", () => {
  assert.equal(jibunFromPnu("1168010100108280010"), "828-10");
  assert.equal(jibunFromPnu("1168010100201230000"), "산123");
  assert.equal(jibunFromPnu("123"), "");
  assert.equal(dongFromPnu({ 역삼동: "10100", 개포동: "10300" }, "1168010100108280010"), "역삼동");
});

test("취소·지분 거래는 빼고 평당가를 계산", () => {
  assert.equal(nonResDeal(B({ cdealType: "O" }), "building"), null);
  assert.equal(nonResDeal(B({ shareDealingType: "지분" }), "building"), null);
  const d = nonResDeal(B({}), "building");
  assert.equal(d.day, "20260903");
  assert.equal(d.perPyeong, 5000);
});

test("같은 지번 묶기·동 용도별·토지는 동 표본 모자라면 시군구", () => {
  const bld = [B({}), B({ dealDay: 9 }), B({ jibun: "1***", buildingType: "일반", buildingUse: "제2종근린생활" }), B({ umdNm: "논현동" })];
  const land = [L({}), L({ umdNm: "괘법동" }), L({ umdNm: "괘법동" }), L({ umdNm: "모라동" }), L({ umdNm: "엄궁동" }), L({ umdNm: "주례동" })];
  const r = summarizeNonRes(bld, land, "역삼동", "828-10");
  assert.equal(r.sameLot.length, 2);
  assert.equal(r.sameLot[0].day, "20260909", "최신순");
  assert.deepEqual(r.buildingGroups.map((g) => [g.label, g.count]), [["집합 · 업무", 2], ["일반 · 제2종근린생활", 1]]);
  assert.equal(r.buildingGroups[0].median, null, "5건 미만이면 중간값 없음");
  assert.equal(r.landGroups[0].scope, "시군구");
  assert.equal(r.landGroups[0].count, 6);
  assert.equal(r.landGroups[0].median, 100, "1억 ÷ 100평");
  assert.deepEqual(summarizeNonRes(bld, [], "역삼동", "1***").sameLot, [], "가려진 지번은 묶지 않음");
});
