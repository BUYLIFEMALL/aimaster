import { test } from "node:test";
import assert from "node:assert/strict";
import { buildingFacts, jeonseRatio, lotDeals, mainZones, median, summarize } from "../src/lib/realestate/report.ts";

const resp = (items) => ({ response: { body: { items: { item: items } } } });
// 서초구 서초동(법정동 10800) 1487-31
const target = { pnu: "1165010800114870031", name: null, dong: null, area: 59 };
const code = (umd) => (umd === "서초동" ? "10800" : "");

test("B1 같은 지번 거래만 고르고 면적 ±3㎡로 거른다", () => {
  const json = resp([
    { umdNm: "서초동", jibun: "1487-31", mhouseNm: "A빌라", excluUseAr: "59.8", dealAmount: "52,000", dealYear: "2026", dealMonth: "9", dealDay: "3", floor: "2" },
    { umdNm: "서초동", jibun: "1487-31", mhouseNm: "A빌라", excluUseAr: "84", dealAmount: "70,000", dealYear: "2026", dealMonth: "8", dealDay: "1" },
    { umdNm: "서초동", jibun: "1487-32", mhouseNm: "B빌라", excluUseAr: "59", dealAmount: "40,000", dealYear: "2026", dealMonth: "9", dealDay: "1" },
    { umdNm: "서초동", jibun: "1487-31", mhouseNm: "A빌라", excluUseAr: "59", dealAmount: "50,000", dealYear: "2026", dealMonth: "7", dealDay: "9", cdealType: "O" },
  ]);
  const deals = lotDeals([json], target, code, "trade");
  assert.equal(deals.length, 1, "다른 지번·다른 평형·해제 거래는 뺀다");
  assert.equal(deals[0].amount, 52000);
  assert.equal(deals[0].day, "20260903");
});

test("B1 이름·동이 같으면 지번이 달라도 같은 단지로 본다(산 지번은 따로)", () => {
  const json = resp([
    { umdNm: "장지동", jibun: "999", aptNm: "동탄2 아이파크1단지", excluUseAr: "84", deposit: "30,000", monthlyRent: "0", dealYear: "2026", dealMonth: "10", dealDay: "2" },
    { umdNm: "장지동", jibun: "999", aptNm: "동탄2아이파크1단지", excluUseAr: "84", deposit: "5,000", monthlyRent: "90", dealYear: "2026", dealMonth: "10", dealDay: "5" },
  ]);
  const t = { pnu: "4159013000100010000", name: "동탄2아이파크1단지", dong: "장지동", area: null };
  const deals = lotDeals([json], t, () => "13000", "rent");
  assert.equal(deals.length, 2);
  assert.equal(deals[0].rent, 90, "월세는 rent 칸");
  assert.equal(deals[1].rent, null, "전세는 null");
  const mountain = lotDeals([resp([{ umdNm: "서초동", jibun: "산1487-31", mhouseNm: "X", dealAmount: "1", dealYear: "2026", dealMonth: "1", dealDay: "1" }])], target, code, "trade");
  assert.equal(mountain.length, 0, "산 지번은 다른 필지");
});

test("B1 요약·전세가율·용도지역·건물", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 3);
  assert.equal(median([]), null);
  const s = summarize([
    { day: "20260903", amount: 52000 },
    { day: "20260901", amount: 48000 },
    { day: "20260801", amount: 50000 },
  ]);
  assert.equal(s.count, 3);
  assert.equal(s.median, 50000);
  assert.deepEqual(s.byMonth.map((m) => m.ym), ["202608", "202609"]);
  assert.equal(jeonseRatio(50000, 30000), 60);
  assert.equal(jeonseRatio(null, 30000), null);
  assert.deepEqual(mainZones("도시지역, 과밀억제권역, 제2종일반주거지역, 자연녹지지역, 제2종일반주거지역"), ["제2종일반주거지역", "자연녹지지역"]);
  assert.deepEqual(mainZones(null), []);
  const b = buildingFacts(
    [
      { useAprDay: "20031120", vlRat: "249.9", bcRat: "18.2", hhldCnt: "300", indrAutoUtcnt: "350", oudrAutoUtcnt: "20", grndFlrCnt: "15" },
      { useAprDay: "", vlRat: "0", hhldCnt: "100", indrAutoUtcnt: "100", grndFlrCnt: "20" },
    ],
    new Date("2026-11-03"),
  );
  assert.equal(b.approvalDay, "2003-11-20");
  assert.equal(b.ageYears, 23);
  assert.equal(b.floorAreaRatio, 249.9);
  assert.equal(b.parking, 470);
  assert.equal(b.households, 400);
  assert.equal(b.topFloor, 20);
  assert.equal(buildingFacts([], new Date()), null);
});
