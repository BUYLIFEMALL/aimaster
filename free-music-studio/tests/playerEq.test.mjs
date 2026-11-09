import test from "node:test";
import assert from "node:assert/strict";
import { EQ_FREQUENCIES, EQ_PRESETS, clampGain, normalizeGains, hzLabel } from "../src/lib/playerEq.ts";

test("이퀄라이저(D-10, 뮤직 플레이어 사본): 8밴드, 프리셋은 모두 8칸, 값은 ±15로 자르고 0.1 단위", () => {
  assert.equal(EQ_FREQUENCIES.length, 8);
  for (const p of EQ_PRESETS) assert.equal(p.gains.length, 8, p.name);
  assert.equal(clampGain(99), 15);
  assert.equal(clampGain(-99), -15);
  assert.equal(clampGain(Number.NaN), 0);
  assert.deepEqual(normalizeGains([1, "2", null]), [1, 2, 0, 0, 0, 0, 0, 0]);
  assert.equal(hzLabel(12000), "12k");
  assert.equal(hzLabel(600), "600");
});
