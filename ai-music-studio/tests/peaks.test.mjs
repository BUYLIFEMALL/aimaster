import { test } from "node:test";
import assert from "node:assert/strict";
import { peaksFromChannels, peakToHeight } from "../lib/peaks.ts";

test("조용한 앞부분·큰 뒷부분이 막대에 그대로 나타남", () => {
  const c = new Float32Array(1000);
  for (let i = 500; i < 1000; i++) c[i] = i % 2 ? 0.8 : -0.8;
  for (let i = 0; i < 500; i++) c[i] = i % 2 ? 0.1 : -0.1;
  const p = peaksFromChannels([c], 4);
  assert.equal(p.length, 4);
  assert.equal(p[3], 1);
  assert.ok(p[0] < 0.2 && p[1] < 0.2);
  assert.ok(p[2] > 0.9);
});

test("두 채널은 평균으로 합침", () => {
  const l = new Float32Array([1, 1, 1, 1]);
  const r = new Float32Array([0, 0, 0, 0]);
  assert.deepEqual(peaksFromChannels([l, r], 2), [1, 1]);
});

test("소리 없음·빈 입력", () => {
  assert.deepEqual(peaksFromChannels([new Float32Array(10)], 3), [0, 0, 0]);
  assert.deepEqual(peaksFromChannels([], 5), []);
  assert.deepEqual(peaksFromChannels([new Float32Array(10)], 0), []);
});

test("막대 높이는 12~100%", () => {
  assert.equal(peakToHeight(0), 12);
  assert.equal(peakToHeight(1), 100);
  assert.equal(peakToHeight(2), 100);
  assert.equal(peakToHeight(0.5), 56);
});
