// 📉 여러 번 내린 매물(v1.29) 시험
import { test } from "node:test";
import assert from "node:assert/strict";
import { findRepeatDrops } from "../lib/repeatDrops.ts";

const cols = ["단지명", "동", "전용면적(㎡)", "층", "가격(만 원)", "이전 가격", "네이버 매물 주소"];
const ev = (at: string, type: string, price: string, prev: string, url = "u1") => ({ at, type, row: ["요진", "101동", 84, "10/20", price, prev, url] });

test("같은 매물 가격 내림 2번 이상만, 처음 가격·지금 가격·횟수", () => {
  const r = findRepeatDrops([
    ev("2026-10-01", "priceDown", "10억", "10억 5,000"),
    ev("2026-10-10", "priceUp", "10억 2,000", "10억"),
    ev("2026-10-20", "priceDown", "9억 8,000", "10억 2,000"),
    ev("2026-10-05", "priceDown", "8억", "8억 5,000", "u2"),
  ], cols);
  assert.equal(r.length, 1);
  assert.deepEqual([r[0].firstPrice, r[0].nowPrice, r[0].drops, r[0].lastAt], ["10억 5,000", "9억 8,000", 2, "2026-10-20"]);
});

test("주소 칸이 없으면 빈 목록", () => {
  assert.deepEqual(findRepeatDrops([ev("2026-10-01", "priceDown", "1", "2")], ["단지명"]), []);
});
