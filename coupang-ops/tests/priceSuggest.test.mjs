// 가격 제안 계산(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { floorPrice, suggestPrice } from "../src/lib/coupang/priceSuggest.ts";

const base = { current: 20000, competitor: 19000, cost: 10000, feeRate: 10, margin: 15 };

test("하한가는 10원 단위 올림", () => {
  assert.equal(floorPrice(10000, 10, 15), 13340);
  assert.equal(floorPrice(10000, 60, 40), null);
});

test("경쟁가보다 10원 낮게 제안", () => {
  const r = suggestPrice(base);
  assert.equal(r.price, 18990);
  assert.equal(r.floor, 13340);
  assert.ok(r.marginAtPrice >= 15);
});

test("10원 단위로 내림", () => {
  assert.equal(suggestPrice({ ...base, competitor: 19005 }).price, 18990);
});

test("하한 아래면 제안하지 않음", () => {
  const r = suggestPrice({ ...base, competitor: 13000 });
  assert.equal(r.price, null);
  assert.match(r.message, /최소 이익률/);
});

test("이미 낮으면 제안하지 않음", () => {
  const r = suggestPrice({ ...base, current: 18000 });
  assert.equal(r.price, null);
  assert.match(r.message, /이미/);
});

test("입력 검사", () => {
  assert.equal(suggestPrice({ ...base, competitor: 0 }).ok, false);
  assert.equal(suggestPrice({ ...base, cost: 0 }).ok, false);
  assert.equal(suggestPrice({ ...base, feeRate: NaN }).ok, false);
  assert.equal(suggestPrice({ ...base, feeRate: 60, margin: 40 }).ok, false);
});
