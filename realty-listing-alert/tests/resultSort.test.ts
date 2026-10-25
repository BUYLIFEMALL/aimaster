// 수집 결과 표 정렬·거르기·층 표기(v1.29) 시험
import { test } from "node:test";
import assert from "node:assert/strict";
import { floorNum, floorText, pctNum, priceNum, sortFilterRows } from "../lib/resultSort.ts";

test("가격·층·퍼센트 글자를 숫자로", () => {
  assert.equal(priceNum("10억 6,086"), 106086);
  assert.equal(priceNum("8억"), 80000);
  assert.equal(priceNum("6,000 / 190"), 6000);
  assert.equal(priceNum(""), null);
  assert.equal(floorNum("44/58"), 44);
  assert.equal(floorNum("저/57"), 1);
  assert.equal(floorNum("고/57"), 57);
  assert.equal(pctNum("🔥 -12%"), -12);
  assert.equal(pctNum("+8%"), 8);
  assert.equal(pctNum("—"), null);
});

test("층 표기: 해당층 / 전체층", () => {
  assert.equal(floorText("44/58"), "44층 / 58층");
  assert.equal(floorText("저/57"), "저층 / 57층");
  assert.equal(floorText("B1"), "B1");
});

test("거래 종류·급매만 거르고 가격 낮은 순, 값 없는 줄은 뒤로", () => {
  const c = { trade: 0, price: 1, area: 2, floor: 3, gap: 4, bargain: 5 };
  const rows = [["매매", "9억", 84, "10/20", "", ""], ["전세", "5억", 59, "3/20", "", ""], ["매매", "", 84, "", "", ""], ["매매", "8억", 84, "5/20", "-12%", "🔥 -11%"]];
  assert.deepEqual(sortFilterRows(rows, c, { trade: "매매", bargainOnly: false, sort: "priceAsc" }).map((r) => r[1]), ["8억", "9억", ""]);
  assert.deepEqual(sortFilterRows(rows, c, { trade: "전체", bargainOnly: true, sort: "default" }).length, 1);
});
