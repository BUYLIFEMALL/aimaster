// F5(v1.27) 비교 슬라이더 위치 계산 — 무료 시험
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { percentAt, percentForKey } from "../src/lib/dna/compare.ts";

test("화면 좌표 → 비율, 상자 밖은 끝에 붙음", () => {
  assert.equal(percentAt(150, 100, 200), 25);
  assert.equal(percentAt(50, 100, 200), 0);
  assert.equal(percentAt(999, 100, 200), 100);
  assert.equal(percentAt(10, 0, 0), 50);
  assert.equal(percentAt(1, 0, 3), 33.3);
});
test("키보드 이동", () => {
  assert.equal(percentForKey(50, "ArrowLeft"), 48);
  assert.equal(percentForKey(50, "ArrowRight", true), 60);
  assert.equal(percentForKey(1, "ArrowLeft"), 0);
  assert.equal(percentForKey(99, "ArrowRight", true), 100);
  assert.equal(percentForKey(40, "Home"), 0);
  assert.equal(percentForKey(40, "End"), 100);
  assert.equal(percentForKey(40, "a"), null);
});
test("결과 테스트 화면이 비교 슬라이더를 쓴다", () => {
  const src = readFileSync(new URL("../src/app/(dashboard)/test/page.tsx", import.meta.url), "utf8");
  assert.match(src, /<CompareSlider before=\{record\.imageUrl\} after=\{result\.image\} maxHeight=\{640\} \/>/);
  assert.match(src, /result && !showSingles \? "hidden"/);
});

test("v1.29 색 집게: 틀 좌표 → 이미지 좌표, 여백은 null", async () => {
  const { containPoint } = await import("../src/lib/dna/compare.ts");
  // 정사각 틀 480 안에 1600×900 그림 → 가로로 꽉, 위아래 여백
  assert.deepEqual(containPoint(480, 480, 1600, 900, 50, 50), { x: 800, y: 450 });
  assert.equal(containPoint(480, 480, 1600, 900, 50, 5), null);
  assert.deepEqual(containPoint(480, 480, 492, 492, 0, 0), { x: 0, y: 0 });
  assert.deepEqual(containPoint(480, 480, 492, 492, 100, 100), { x: 491, y: 491 });
  assert.equal(containPoint(0, 480, 10, 10, 50, 50), null);
});
test("v1.29 HEX와 색 차이", async () => {
  const { toHex, colorDiffPercent } = await import("../src/lib/dna/compare.ts");
  assert.equal(toHex(255, 0, 204), "#FF00CC");
  assert.equal(toHex(-3, 300, 15.6), "#00FF10");
  assert.equal(colorDiffPercent([0, 0, 0], [255, 255, 255]), 100);
  assert.equal(colorDiffPercent([10, 20, 30], [10, 20, 30]), 0);
});
