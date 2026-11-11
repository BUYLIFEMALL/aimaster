// 실행: node --test lib/eta.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { etaSeconds, etaText } from "./eta.ts";

test("시작 직후·5% 전·완료는 어림하지 않는다", () => {
  assert.equal(etaSeconds(undefined, 50, 10_000), null);
  assert.equal(etaSeconds(0 + 1, 50, 2_000), null);
  assert.equal(etaSeconds(1_000, 4, 60_000), null);
  assert.equal(etaSeconds(1_000, 100, 60_000), null);
});

test("걸린 시간 × 남은 비율로 계산한다", () => {
  assert.equal(etaSeconds(1_000, 25, 11_000), 30); // 10초에 25% → 남은 75%는 30초
  assert.equal(etaSeconds(1_000, 50, 21_000), 20);
  assert.equal(etaSeconds(1_000, 99, 100_000), 1);
});

test("표시 문구", () => {
  assert.equal(etaText(null), "남은 시간 계산 중");
  assert.equal(etaText(12), "약 12초 남음");
  assert.equal(etaText(60), "약 1분 남음");
  assert.equal(etaText(65), "약 1분 5초 남음");
});
