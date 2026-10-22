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
  assert.match(src, /<CompareSlider before=\{record\.imageUrl\} after=\{result\.image\} \/>/);
});
