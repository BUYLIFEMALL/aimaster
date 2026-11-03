import { test } from "node:test";
import assert from "node:assert/strict";
import { REGIONS, brokerFee, dealBase, regionNote } from "../src/lib/desk/fee.ts";

test("월세 거래금액: 보증금+월세×100, 5천만 미만이면 ×70", () => {
  assert.equal(dealBase("월세", 1000, 50), 6000);   // 1천 + 50×100 = 6천
  assert.equal(dealBase("월세", 500, 30), 2600);    // 500+3000=3500 < 5천 → 500+2100
  assert.equal(dealBase("전세", 30000), 30000);
});

test("주택 매매 구간·한도", () => {
  assert.equal(brokerFee("주택", "매매", 4000).feeWon, 240_000);       // 0.6% = 24만(한도 25만 안)
  assert.equal(brokerFee("주택", "매매", 19000).feeWon, 800_000);      // 0.5% = 95만 → 한도 80만
  assert.equal(brokerFee("주택", "매매", 50000).feeWon, 2_000_000);    // 0.4%
  assert.equal(brokerFee("주택", "매매", 100000).rate, 0.005);          // 9~12억
  assert.equal(brokerFee("주택", "매매", 150000).rate, 0.007);          // 15억 이상
});

test("주택 임대 구간·한도, 부가세", () => {
  assert.equal(brokerFee("주택", "전세", 8000).feeWon, 300_000);       // 0.4% = 32만 → 한도 30만
  const r = brokerFee("주택", "전세", 40000);                           // 0.3% = 120만
  assert.equal(r.feeWon, 1_200_000);
  assert.equal(r.vatWon, 120_000);
  assert.equal(brokerFee("주택", "월세", 1000, 50).feeWon, 240_000);   // 6천만 × 0.4% = 24만(한도 30만 안)
});

test("오피스텔·그 외, 협의 요율은 상한보다 낮을 때만", () => {
  assert.equal(brokerFee("오피스텔", "매매", 30000).feeWon, 1_500_000); // 0.5%
  assert.equal(brokerFee("오피스텔", "월세", 1000, 50).rate, 0.004);
  assert.equal(brokerFee("그 외(상가·토지 등)", "매매", 100000).feeWon, 9_000_000); // 0.9%
  assert.equal(brokerFee("그 외(상가·토지 등)", "매매", 100000, 0, 0.005).feeWon, 5_000_000);
  assert.equal(brokerFee("그 외(상가·토지 등)", "매매", 100000, 0, 0.02).rate, 0.009); // 상한 넘는 협의는 무시
});

test("시·도 17곳, 대조한 곳은 ✅ 표시·나머지는 조례 이름 안내", () => {
  assert.equal(REGIONS.length, 17);
  assert.ok(regionNote("서울특별시").startsWith("✅"));
  assert.ok(regionNote("부산광역시").includes("부산광역시 주택 중개보수 등에 관한 조례"));
});