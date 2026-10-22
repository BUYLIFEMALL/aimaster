// F3(v1.12) 게시처 규격·회전·반전·비율 자르기 — 순수 계산 시험(무료)
import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { centerCrop, normalizeRotation, planTransform, presetById, rotatedSize, POST_PRESETS, CROP_RATIOS } from "../src/lib/imageTools/geometry.ts";

test("회전 각도 정리와 회전 후 크기", () => {
  assert.equal(normalizeRotation(-90), 270);
  assert.equal(normalizeRotation(450), 90);
  assert.equal(normalizeRotation(360), 0);
  assert.deepEqual(rotatedSize(4000, 3000, 90), { width: 3000, height: 4000 });
  assert.deepEqual(rotatedSize(4000, 3000, 180), { width: 4000, height: 3000 });
});

test("가운데 비율 자르기", () => {
  assert.deepEqual(centerCrop(4000, 3000, 1), { x: 500, y: 0, width: 3000, height: 3000 });
  assert.deepEqual(centerCrop(1000, 2000, 1), { x: 0, y: 500, width: 1000, height: 1000 });
  assert.deepEqual(centerCrop(1080, 1920, null), { x: 0, y: 0, width: 1080, height: 1920 });
  const c = centerCrop(4000, 3000, 9 / 16);
  assert.equal(c.height, 3000);
  assert.equal(Math.round((c.width / c.height) * 100), 56);
});

test("규격 프리셋: 비율로 자르고 정확한 크기", () => {
  assert.equal(POST_PRESETS.length, 6);
  assert.equal(CROP_RATIOS.length, 6);
  const p = planTransform(4000, 3000, { preset: presetById("insta-portrait") });
  assert.deepEqual(p.exact, { width: 1080, height: 1350 });
  assert.equal(Math.round((p.crop.width / p.crop.height) * 1000), 800);
  assert.equal(p.identity, false);
  assert.equal(presetById("없음"), null);
});

test("회전 뒤 좌표계에서 자르고, 아무 변경이 없으면 원본 그대로", () => {
  const p = planTransform(4000, 3000, { rotate: 90, cropRatio: 1 });
  assert.equal(p.rotW, 3000);
  assert.deepEqual(p.crop, { x: 0, y: 500, width: 3000, height: 3000 });
  assert.equal(planTransform(800, 600, {}).identity, true);
  assert.equal(planTransform(800, 600, { flipH: true }).identity, false);
});

test("반전은 회전보다 먼저(화면 기준 좌우) — 캔버스 변환 순서", () => {
  const e = readFileSync(new URL("../src/lib/imageTools/engine.ts", import.meta.url), "utf8");
  assert.ok(e.indexOf("rc.scale(") < e.indexOf("rc.rotate("), "scale이 rotate보다 앞이어야 함");
});

// v1.13 자를 위치(초점) · ?preset 받기
import { cropAt, clampFocus, presetFromParam } from "../src/lib/imageTools/geometry.ts";

test("자를 위치: 0이면 왼쪽/위 끝, 1이면 오른쪽/아래 끝, 범위 밖은 보정", () => {
  assert.deepEqual(cropAt(4000, 3000, 1, { x: 0, y: 0.5 }), { x: 0, y: 0, width: 3000, height: 3000 });
  assert.deepEqual(cropAt(4000, 3000, 1, { x: 1, y: 0.5 }), { x: 1000, y: 0, width: 3000, height: 3000 });
  assert.deepEqual(cropAt(1000, 2000, 1, { x: 0.5, y: 0.25 }), { x: 0, y: 250, width: 1000, height: 1000 });
  assert.deepEqual(clampFocus({ x: -3, y: 9 }), { x: 0, y: 1 });
  assert.deepEqual(clampFocus(null), { x: 0.5, y: 0.5 });
  const p = planTransform(4000, 3000, { rotate: 90, cropRatio: 1, focus: { x: 0.5, y: 0 } });
  assert.deepEqual(p.crop, { x: 0, y: 0, width: 3000, height: 3000 });
});

test("?preset= 은 목록에 있는 규격 이름만", () => {
  assert.equal(presetFromParam("insta-portrait")?.width, 1080);
  assert.equal(presetFromParam("<script>"), null);
  assert.equal(presetFromParam("unknown-size"), null);
  assert.equal(presetFromParam(null), null);
});
