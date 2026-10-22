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
