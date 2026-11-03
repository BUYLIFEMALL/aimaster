// 네이버 화면 필터로 거래 종류가 좁혀졌을 때(2026-11-03: 「월세」만 읽혀 매매·전세 1,160건이 「사라짐」으로 잡힘)
import { test } from "node:test";
import assert from "node:assert/strict";
import { compareComplex } from "../extension/lib/compare.js";
import { pruneStateToTarget, tradeParamCovers, withTradeTypes } from "../extension/lib/listing.js";

const LIST = "https://new.land.naver.com/api/articles/complex/111515?realEstateType=APT&tradeType=B2&page=1&complexNo=111515";
const ALL = ["A1", "B1", "B2"];

test("좁혀진 tradeType은 감시 조건을 못 담는다 · 비었거나 칸이 없으면 담는다", () => {
  assert.equal(tradeParamCovers(LIST, ALL), false);
  assert.equal(tradeParamCovers(LIST, ["B2"]), true);
  assert.equal(tradeParamCovers(LIST.replace("tradeType=B2", "tradeType="), ALL), true);
  assert.equal(tradeParamCovers(LIST.replace("tradeType=B2", "tradeType=A1:B1:B2"), ALL), true);
  assert.equal(tradeParamCovers("https://new.land.naver.com/api/articles/complex/1?page=1", ALL), true);
  assert.equal(tradeParamCovers(LIST, undefined), true);
});

test("다시 부를 주소는 감시 조건 값으로 바꾸고, 칸이 없으면 그대로 둔다", () => {
  const fixed = new URL(withTradeTypes(LIST, ALL));
  assert.equal(fixed.searchParams.get("tradeType"), "A1:B1:B2");
  assert.equal(fixed.searchParams.get("page"), "1");
  const plain = "https://new.land.naver.com/api/articles/complex/1?page=1";
  assert.equal(withTradeTypes(plain, ALL), plain);
});

test("조건에서 빠진 매물은 「사라짐」이 아니라 기록에서 빠진다", () => {
  const it = (no: string, tradeType: string) => ({ no, tradeType, price: 50000, rent: null, priceText: "5억", area: 84 });
  const prev = compareComplex(null, [it("1", "A1"), it("2", "B1"), it("3", "B2")]).state;
  const target = { trade_types: ["B2"] };
  const cmp = compareComplex(pruneStateToTarget(prev, target), [it("3", "B2")], { complete: true });
  assert.equal(cmp.events.filter((e: { type: string }) => e.type === "gone").length, 0);
  assert.deepEqual(Object.keys(cmp.state.items), ["3"]);
  // 조건 안의 매물이 실제로 빠지면 그대로 「사라짐」
  const cmp2 = compareComplex(pruneStateToTarget(prev, { trade_types: ALL }), [it("3", "B2")], { complete: true });
  assert.equal(cmp2.events.filter((e: { type: string }) => e.type === "gone").length, 2);
});
