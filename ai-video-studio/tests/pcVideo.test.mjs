import { test } from "node:test";
import assert from "node:assert/strict";
import { compressCommand, normalizeCommand, SHRINK_QUALITIES, toMb } from "../lib/edit/pcVideo.ts";
import { FPS } from "../lib/edit/timeline.ts";

test("normalize 명령은 실행기 값 범위 안의 낱말·숫자만", () => {
  const c = normalizeCommand(7.12345);
  assert.deepEqual(c, { type: "normalize", fps: FPS, maxSide: 1920, duration: 7.123 });
  assert.ok(Number.isInteger(c.fps) && c.fps >= 24 && c.fps <= 60);
  assert.ok(Number.isInteger(c.maxSide) && c.maxSide >= 360 && c.maxSide <= 3840);
});

test("길이를 모르면 duration을 넣지 않고, 범위를 넘으면 자른다", () => {
  assert.equal(normalizeCommand(NaN).duration, undefined);
  assert.equal(normalizeCommand(0).duration, undefined);
  assert.equal(normalizeCommand(0.01).duration, 0.05);
  assert.equal(normalizeCommand(99999).duration, 36000);
});

test("compress 명령은 정해진 품질 낱말만", () => {
  for (const q of SHRINK_QUALITIES) assert.equal(compressCommand(q.id, 10).quality, q.id);
  assert.equal(SHRINK_QUALITIES[0].id, "balanced");
  assert.throws(() => compressCommand("huge", 10));
  assert.throws(() => compressCommand("small -f null", 10));
});

test("MB 표시는 소수 첫째 자리", () => {
  assert.equal(toMb(52428800), 50);
  assert.equal(toMb(1572864), 1.5);
});
