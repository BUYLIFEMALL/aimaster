// RQ-A4 1단계 상권 임대료·공실률(2026-11-06)
import { test } from "node:test";
import assert from "node:assert/strict";
import { geocodeQueries, mergeRentRows, pickNearby, pickPlace, roneRows } from "../src/lib/realestate/commercialRent.ts";

const R = (area, val, q = "202603") => ({ WRTTIME_IDTFR_ID: q, WRTTIME_DESC: "2026년 3분기", CLS_FULLNM: area, DTA_VAL: val });

test("R-ONE 응답에서 줄·건수를 꺼내고 오류 코드는 던진다", () => {
  const ok = { SttsApiTblData: [{ head: [{ list_total_count: 2 }, { RESULT: { CODE: "INFO-000" } }] }, { row: [R("전국", 1), R("서울", 2)] }] };
  assert.deepEqual(roneRows(ok).total, 2);
  assert.equal(roneRows(ok).rows.length, 2);
  assert.throws(() => roneRows({ RESULT: { CODE: "ERROR-290", MESSAGE: "인증키가 유효하지 않습니다." } }), /ERROR-290/);
});

test("표 여러 개를 상권별 한 줄로 합치고 최근 분기만 남긴다, 권역은 leaf 아님", () => {
  const rows = mergeRentRows([
    { kind: "large", item: "rent", rows: [R("전국", 26.73), R("서울>강남", 90), R("서울>강남>강남대로", 130.6), R("서울>강남>강남대로", 99, "202602"), R("부산>사상역", 17.7)] },
    { kind: "large", item: "vacancy", rows: [R("서울>강남>강남대로", 6.404), R("부산>사상역", 19.01)] },
    { kind: "small", item: "rent", rows: [R("부산>사상역", "")] },
  ]);
  const g = Object.fromEntries(rows.map((r) => [r.area, r]));
  assert.equal(g["서울>강남>강남대로"].rent.large, 130.6);
  assert.equal(g["서울>강남>강남대로"].vacancy.large, 6.4);
  assert.equal(g["서울>강남>강남대로"].leaf, true);
  assert.equal(g["서울>강남"].leaf, false);
  assert.equal(g["부산>사상역"].leaf, true);
  assert.equal(g["부산>사상역"].rent.small, undefined); // 빈 값은 넣지 않음
  assert.equal(g["전국"].leaf, false);
});

test("장소 검색어 후보: 나눈 이름·시도 붙이기·옛 시내", () => {
  assert.deepEqual(geocodeQueries("부산>사상역"), ["사상역", "부산 사상역"]);
  assert.deepEqual(geocodeQueries("인천>석남/가정중앙시장"), ["석남/가정중앙시장", "석남", "가정중앙시장", "인천 석남"]);
  assert.deepEqual(geocodeQueries("서울>도심>시청"), ["시청", "서울 시청"]);
  assert.deepEqual(geocodeQueries("전남광주>전남>목포구도심"), ["목포구도심", "전남 목포구도심", "목포역", "전남 목포"]);
});

test("장소 검색은 같은 시·도 주소만 고른다", () => {
  const items = [{ address: "경기도 고양시", x: 126.7, y: 37.6 }, { address: "부산광역시 사상구", x: 128.98, y: 35.16 }];
  assert.deepEqual(pickPlace(items, "부산"), { lat: 35.16, lng: 128.98 });
  assert.equal(pickPlace(items, "서울"), null);
});

test("가까운 상권(1.5km 안)·시도·전국을 고른다", () => {
  const rows = [
    { quarter: "202603", quarter_label: "2026년 3분기", area: "전국", name: "전국", depth: 1, rent: { large: 26.7 }, vacancy: {} },
    { quarter: "202603", quarter_label: "2026년 3분기", area: "부산", name: "부산", depth: 1, rent: { large: 20 }, vacancy: {} },
    { quarter: "202603", quarter_label: "2026년 3분기", area: "부산>사상역", name: "사상역", depth: 2, rent: { large: 17.7 }, vacancy: { large: 19 }, lat: 35.1625, lng: 128.9845 },
    { quarter: "202603", quarter_label: "2026년 3분기", area: "부산>서면", name: "서면", depth: 2, rent: {}, vacancy: {}, lat: 35.1578, lng: 129.0594 },
  ];
  const n = pickNearby(rows, { x: 128.99, y: 35.165 }, "26530");
  assert.equal(n.near.name, "사상역");
  assert.ok(n.near.km < 1);
  assert.equal(n.sido.area, "부산");
  assert.equal(n.nation.rent.large, 26.7);
  assert.equal(n.nearest, null); // 반경 안에 있으면 참고 상권은 비움
  // #20(2026-11-06): 1.5km 밖이지만 10km 안이면 가장 가까운 상권을 참고로(서면 ≈ 4km)
  const far = pickNearby(rows, { x: 129.1, y: 35.17 }, "26530");
  assert.equal(far.near, null);
  assert.equal(far.nearest.name, "서면");
  assert.ok(far.nearest.km > 1.5 && far.nearest.km < 10);
  const veryFar = pickNearby(rows, { x: 129.5, y: 35.6 }, "26530");
  assert.equal(veryFar.near, null);
  assert.equal(veryFar.nearest, null); // 10km 밖이면 없음
  assert.equal(pickNearby(rows, null, "29110")?.sido, null); // 광주는 표에 없음
  assert.equal(pickNearby(rows, null, "29110")?.nearest, null);
});
