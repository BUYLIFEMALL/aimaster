import { test } from "node:test";
import assert from "node:assert/strict";
import { RenderTrace } from "../lib/edit/renderTrace.ts";

test("장면별 대기·합성·넘기기 시간을 가르고 2초 넘는 장면만 알린다", () => {
  const slow = [];
  const t = new RenderTrace(0, (x) => slow.push(x));
  t.frameStart(0, 0); t.poll(false, 10); t.poll(true, 60); t.composed(100);
  t.frameStart(1, 150); // 0번: 대기 60, 합성 40, 넘기기 50 → 알림 없음
  t.poll(true, 200); t.composed(57_800); // 1번: 합성 57.6초(맥 사례)
  t.frameStart(2, 57_900);
  assert.equal(slow.length, 1);
  assert.deepEqual(slow[0], { frame: 1, waitMs: 50, composeMs: 57_600, encodeMs: 100 });
  assert.equal(t.totals.composeMs, 40 + 57_600);
  assert.equal(t.totals.slowFrames, 1);
});

test("5초 넘게 단계가 안 바뀌면 지금 단계를 알려 준다", () => {
  const t = new RenderTrace(0, () => {});
  t.frameStart(0, 0); t.poll(true, 50);
  assert.equal(t.stuck(4000), null);
  assert.deepEqual(t.stuck(6000), { phase: "compose", frame: 0, sinceMs: 5950 });
  t.end(7000);
  assert.equal(t.stuck(99_000), null);
});

test("대기가 짧아 못 보고 바로 합성이 끝나면 대기 0", () => {
  const slow = [];
  const t = new RenderTrace(0, (x) => slow.push(x));
  t.frameStart(0, 0); t.composed(3000); t.end(3100);
  assert.deepEqual(slow[0], { frame: 0, waitMs: 3000, composeMs: 0, encodeMs: 100 });
});
