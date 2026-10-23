import test from "node:test";
import assert from "node:assert/strict";
import { nudgeTrim, trimFromRatio } from "../lib/edit/trim.ts";

test("v1.09 자르기 막대 끌기: 비율 → 앞·뒤 자르기(0.1초 단위, 남는 구간 0.5초 이상)", () => {
  // 10초 영상, 왼쪽 손잡이를 25% 지점으로 → 앞 2.5초
  assert.deepEqual(trimFromRatio(10, 0, 0, "start", 0.25), { trimStart: 2.5, trimEnd: 0 });
  // 오른쪽 손잡이를 80% 지점으로 → 뒤 2초
  assert.deepEqual(trimFromRatio(10, 2.5, 0, "end", 0.8), { trimStart: 2.5, trimEnd: 2 });
  // 0.1초 단위로 맞춤
  assert.deepEqual(trimFromRatio(10, 0, 0, "start", 0.1234), { trimStart: 1.2, trimEnd: 0 });
  // 손잡이가 서로 넘어가지 않고 남는 구간 0.5초 유지
  assert.deepEqual(trimFromRatio(10, 0, 3, "start", 0.99), { trimStart: 6.5, trimEnd: 3 });
  assert.deepEqual(trimFromRatio(10, 4, 0, "end", 0.1), { trimStart: 4, trimEnd: 5.5 });
  // 막대 밖으로 끌어도 0~끝
  assert.deepEqual(trimFromRatio(10, 1, 1, "start", -0.5), { trimStart: 0, trimEnd: 1 });
  assert.deepEqual(trimFromRatio(10, 1, 1, "end", 1.7), { trimStart: 1, trimEnd: 0 });
  // 너무 짧은 영상·잘못된 값
  assert.deepEqual(trimFromRatio(0.4, 0, 0, "start", 0.5), { trimStart: 0, trimEnd: 0 });
  assert.deepEqual(trimFromRatio(Number.NaN, 0, 0, "end", 0.5), { trimStart: 0, trimEnd: 0 });
});

test("v1.09 ←→ 키로 0.1초씩", () => {
  assert.deepEqual(nudgeTrim(10, 1, 0, "start", 1), { trimStart: 1.1, trimEnd: 0 });
  assert.deepEqual(nudgeTrim(10, 1, 0, "start", -1), { trimStart: 0.9, trimEnd: 0 });
  // 뒤 손잡이를 왼쪽으로 = 뒤 자르기 늘림
  assert.deepEqual(nudgeTrim(10, 0, 2, "end", -1), { trimStart: 0, trimEnd: 2.1 });
  assert.deepEqual(nudgeTrim(10, 0, 0, "end", 1), { trimStart: 0, trimEnd: 0 });
});
