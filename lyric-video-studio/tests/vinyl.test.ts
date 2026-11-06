import { test } from "node:test";
import assert from "node:assert/strict";
import { vinylAngle } from "../src/lib/vinyl.ts";
import { normalizeDesign } from "../src/lib/design.ts";

const TAU = Math.PI * 2;
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test("LP판 각도 — 33⅓ RPM, 1.8초에 한 바퀴", () => {
  close(vinylAngle(0), 0);
  close(vinylAngle(0.45), TAU / 4);
  close(vinylAngle(1.8), 0);
  close(vinylAngle(2.7), TAU / 2);
});

test("LP판 각도 — 같은 시각은 늘 같은 값(미리보기·MP4 일치), 범위 0~2π", () => {
  for (const t of [0.1, 3.33, 61.7, 299.99]) {
    assert.equal(vinylAngle(t), vinylAngle(t));
    const a = vinylAngle(t);
    assert.ok(a >= 0 && a < TAU);
  }
  close(vinylAngle(-5), 0);
  close(vinylAngle(Number.NaN), 0);
});

test("디자인 — 옛 저장값은 LP판 꺼짐, 켠 값은 그대로", () => {
  assert.equal(normalizeDesign({ presetId: "night-stage" }).vinyl, false);
  assert.equal(normalizeDesign({ presetId: "night-stage", vinyl: true }).vinyl, true);
  assert.equal(normalizeDesign({ vinyl: "yes" }).vinyl, false);
});
