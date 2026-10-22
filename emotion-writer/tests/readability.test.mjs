// v1.24 배경 어둡기 추천 — 무료 시험
import test from "node:test";
import assert from "node:assert/strict";
import { adviseOverlay, contrastRatio, darken, hexToRgb, textBand } from "../src/lib/studio/readability.ts";

test("대비·어둡게 계산", () => {
  assert.equal(Math.round(contrastRatio([255, 255, 255], [0, 0, 0])), 21);
  assert.deepEqual(darken([200, 100, 50], 50), [100, 50, 25]);
  assert.deepEqual(hexToRgb("#ffffff"), [255, 255, 255]);
  assert.equal(hexToRgb("white"), null);
  assert.deepEqual(textBand("top"), [0.12, 0.45]);
});

test("흰 글자 + 밝은 하늘 배경 → 어둡기 추천", () => {
  const a = adviseOverlay([200, 220, 240], "#ffffff", 35);
  assert.equal(a.ok, false);
  assert.ok(a.recommended > 35 && a.recommended % 5 === 0);
  assert.ok(contrastRatio([255, 255, 255], darken([200, 220, 240], a.recommended)) >= 4.5);
  assert.ok(contrastRatio([255, 255, 255], darken([200, 220, 240], a.recommended - 5)) < 4.5);
});

test("이미 충분하면 ok, 어두운 글자는 어둡기 대신 글자색 안내", () => {
  assert.equal(adviseOverlay([30, 30, 30], "#ffffff", 35).ok, true);
  const d = adviseOverlay([60, 60, 60], "#222222", 35);
  assert.equal(d.ok, false);
  assert.equal(d.darkText, true);
  assert.equal(d.recommended, null);
  assert.equal(adviseOverlay([200, 200, 200], "nope", 35), null);
});

test("v1.24 전체 ZIP 전 확인 계획", async () => {
  const { zipOverlayPlan } = await import("../src/lib/studio/readability.ts");
  const ok = { contrast: 6, ok: true, recommended: null, darkText: false };
  const a = { contrast: 3, ok: false, recommended: 50, darkText: false };
  const b = { contrast: 2.5, ok: false, recommended: 60, darkText: false };
  const dark = { contrast: 2, ok: false, recommended: null, darkText: true };
  assert.deepEqual(zipOverlayPlan([ok, null, ok]), { weak: 0, raiseTo: null });
  assert.deepEqual(zipOverlayPlan([ok, a, b]), { weak: 2, raiseTo: 60 });
  assert.deepEqual(zipOverlayPlan([dark, ok]), { weak: 1, raiseTo: null });
});

test("v1.24 글자 자리 바꿔 받기", async () => {
  const { bestPosition } = await import("../src/lib/studio/readability.ts");
  const bands = { top: [230, 230, 240], center: [200, 200, 200], bottom: [40, 40, 50] };
  const r = bestPosition(bands, "#ffffff", 35, "top");
  assert.equal(r.position, "bottom");
  assert.ok(r.contrast >= 4.5);
  assert.equal(bestPosition(bands, "#ffffff", 35, "bottom"), null); // 이미 가장 좋음
  assert.equal(bestPosition({ top: [100, 100, 100] }, "#ffffff", 35, "top"), null); // 다른 자리 정보 없음
});

test("v1.24 자리 옮기고 어둡기도 올리기", async () => {
  const { fixPlan, contrastRatio, darken } = await import("../src/lib/studio/readability.ts");
  // 아래로 옮기면 바로 충분
  const r1 = fixPlan({ top: [235, 235, 240], center: [210, 210, 210], bottom: [40, 40, 50] }, "#ffffff", 35, "top");
  assert.deepEqual([r1.position, r1.overlay], ["bottom", 35]);
  // 모든 자리가 밝음 → 가장 나은 자리로 옮기고 어둡기도 올림
  const r2 = fixPlan({ top: [240, 240, 240], center: [200, 200, 205], bottom: [230, 230, 230] }, "#ffffff", 35, "top");
  assert.equal(r2.position, "center");
  assert.ok(r2.overlay > 35 && r2.overlay % 5 === 0);
  assert.ok(contrastRatio([255, 255, 255], darken([200, 200, 205], r2.overlay)) >= 4.5);
  // 이미 충분하고 옮길 곳도 없으면 null
  assert.equal(fixPlan({ top: [20, 20, 20], center: [30, 30, 30], bottom: [40, 40, 40] }, "#ffffff", 35, "top"), null);
});
