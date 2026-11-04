// RQ-B4 위험 점검 순수 함수(2026-11-04)
import { test } from "node:test";
import assert from "node:assert/strict";
import { gapRiskPercent, maskPersonName, riskBand } from "../src/lib/realestate/report.ts";

test("전세가율·깡통 위험 구간", () => {
  assert.equal(riskBand(null), null);
  assert.equal(riskBand(69), "보통");
  assert.equal(riskBand(70), "주의");
  assert.equal(riskBand(79), "주의");
  assert.equal(riskBand(80), "위험");
});

test("(채권최고액 + 보증금) ÷ 시세", () => {
  assert.equal(gapRiskPercent(24000, 30000, 60000), 90);
  assert.equal(gapRiskPercent(0, null, 50000), 0);
  assert.equal(gapRiskPercent(10000, 20000, null), null);
});

test("사람 이름만 가리고 기관 이름은 둔다", () => {
  assert.equal(maskPersonName("김철수"), "김○○");
  assert.equal(maskPersonName("남궁민수"), "남○○○");
  assert.equal(maskPersonName("김철수, 이영희"), "김○○, 이○○");
  assert.equal(maskPersonName("주식회사국민은행"), "주식회사국민은행");
  assert.equal(maskPersonName("서울특별시 강서구청"), "서울특별시 강서구청");
  assert.equal(maskPersonName(""), "");
});
