import test from "node:test";
import assert from "node:assert/strict";
import {
  formatBytes, outputFileName, dedupeNames, targetSize, exceedsCanvasLimit, usesQuality, clampInt, collageGrid, collageSize, cellOrigin, fitRect,
} from "../src/lib/imageTools/formats.ts";

test("outputFileName: jpeg는 .jpg로, 확장자를 바꾼다", () => {
  assert.equal(outputFileName("a.photo.png", "jpeg"), "a.photo.jpg");
  assert.equal(outputFileName("b", "webp"), "b.webp");
});
test("dedupeNames: 같은 이름에 번호를 붙인다", () => {
  const r = dedupeNames(["a.png", "a.png", "b.png"]);
  assert.equal(new Set(r).size, 3);
});
test("usesQuality: PNG만 품질을 쓰지 않는다", () => {
  assert.equal(usesQuality("png"), false);
  assert.equal(usesQuality("webp"), true);
});
test("clampInt", () => {
  assert.equal(clampInt(999, 1, 10, 3), 10);
  assert.equal(clampInt(NaN, 1, 10, 3), 3);
});
test("targetSize: 배율과 최대 크기", () => {
  assert.deepEqual(targetSize(1000, 500, { scale: 2 }), { width: 2000, height: 1000 });
  const t = targetSize(4000, 2000, { scale: 1, maxWidth: 1000 });
  assert.equal(t.width, 1000);
  assert.equal(t.height, 500);
});
test("exceedsCanvasLimit", () => {
  assert.equal(exceedsCanvasLimit(20000, 10), true);
  assert.equal(exceedsCanvasLimit(1000, 1000), false);
});
test("collage 격자/크기", () => {
  assert.deepEqual(collageGrid("grid", 7, 3), { cols: 3, rows: 3 });
  assert.deepEqual(collageGrid("horizontal", 4, 3), { cols: 4, rows: 1 });
  assert.deepEqual(collageGrid("vertical", 4, 3), { cols: 1, rows: 4 });
});
test("formatBytes", () => {
  assert.match(formatBytes(1536), /KB/);
});
