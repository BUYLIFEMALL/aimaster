// 🔥 급매 표시(v1.28) 판정 시험
import { test } from "node:test";
import assert from "node:assert/strict";
import { findBargains } from "../extension/lib/bargain.js";

const it = (no: string, price: number, area = 84, tradeName = "매매", complexNo = "1") => ({ no, price, area, tradeName, complexNo });

test("같은 단지·면적 중간값보다 10% 이상 싼 매매만 급매", () => {
  const b = findBargains([it("a", 100000), it("b", 100000), it("c", 98000), it("d", 88000), it("e", 91000)]);
  assert.deepEqual(b, { d: "🔥 -10%" }); // 중간값 98000 → 88000은 -10%, 91000은 -7%
});

test("3건 미만 묶음·전세·다른 면적은 판정하지 않음", () => {
  assert.deepEqual(findBargains([it("a", 100000), it("b", 50000)]), {});
  assert.deepEqual(findBargains([it("a", 100000, 84, "전세"), it("b", 100000, 84, "전세"), it("c", 50000, 84, "전세")]), {});
  assert.deepEqual(findBargains([it("a", 100000, 84), it("b", 100000, 59), it("c", 50000, 127)]), {});
});
