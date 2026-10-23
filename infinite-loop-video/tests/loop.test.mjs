import test from "node:test";
import assert from "node:assert/strict";
import { extractFeature, frameSimilarity, buildMatrix, findLoops, qualityLabel } from "../src/lib/loop/analysis.ts";
import { normalize, unitLength, totalLength, buildFilter } from "../src/lib/loop/plan.ts";

function solid(v, size = 64) {
  const a = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < a.length; i += 4) { a[i] = v; a[i + 1] = v; a[i + 2] = v; a[i + 3] = 255; }
  return a;
}

test("같은 프레임은 유사도 1, 다른 밝기는 더 낮다", () => {
  const a = extractFeature(solid(100)), b = extractFeature(solid(100)), c = extractFeature(solid(220));
  assert.ok(frameSimilarity(a, b) > 0.999);
  assert.ok(frameSimilarity(a, c) < 0.8);
});

test("주기 영상에서 한 주기 길이의 루프를 찾는다", () => {
  const fps = 8, period = 16;
  const feats = [];
  for (let i = 0; i < 64; i++) feats.push(extractFeature(solid(Math.round(128 + 100 * Math.sin((2 * Math.PI * i) / period)))));
  const [best] = findLoops(buildMatrix(feats), fps, 1);
  assert.ok(best.score > 0.97);
  assert.equal((best.end - best.start) % period, 0);
});

test("최소 길이를 지킨다", () => {
  const feats = Array.from({ length: 30 }, () => extractFeature(solid(90)));
  for (const c of findLoops(buildMatrix(feats), 8, 2)) assert.ok((c.end - c.start) / 8 >= 2);
});

test("품질 등급", () => {
  assert.equal(qualityLabel(0.97).level, "excellent");
  assert.equal(qualityLabel(0.5).level, "poor");
});

const base = { mode: "smart", start: 1, end: 5, crossfade: 0.6, repeat: 5, duration: 10, hasAudio: true, format: "mp4" };

test("파라미터 보정: 크로스페이드는 구간 절반 이하, 반복 1~200", () => {
  const n = normalize({ ...base, start: 0, end: 0.5, crossfade: 2, repeat: 999 });
  assert.ok(n.crossfade <= 0.25);
  assert.equal(n.repeat, 200);
  assert.equal(normalize({ ...base, repeat: 0 }).repeat, 1);
});

test("길이 계산", () => {
  assert.ok(Math.abs(unitLength(base) - 3.4) < 1e-6);
  assert.ok(Math.abs(totalLength(base) - 17) < 1e-6);
  assert.equal(unitLength({ ...base, mode: "bounce" }), 8);
  assert.equal(normalize({ ...base, mode: "overlap" }).crossfade, 1);
});

test("필터 구성: 소리 유지 / 바운스 / GIF 무음", () => {
  const smart = buildFilter(base);
  assert.match(smart.filter, /xfade/);
  assert.match(smart.filter, /acrossfade/);
  assert.deepEqual(smart.map, ["-map", "[vout]", "-map", "[aout]"]);
  assert.match(buildFilter({ ...base, mode: "bounce" }).filter, /reverse/);
  assert.deepEqual(buildFilter({ ...base, format: "gif" }).map, ["-map", "[vout]"]);
});
