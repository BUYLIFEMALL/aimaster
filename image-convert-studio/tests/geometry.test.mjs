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
  assert.deepEqual(clampFocus({ x: -3, y: 9 }), { x: 0, y: 1, zoom: 1 });
  assert.deepEqual(clampFocus(null), { x: 0.5, y: 0.5, zoom: 1 });
  const p = planTransform(4000, 3000, { rotate: 90, cropRatio: 1, focus: { x: 0.5, y: 0 } });
  assert.deepEqual(p.crop, { x: 0, y: 0, width: 3000, height: 3000 });
});

test("?preset= 은 목록에 있는 규격 이름만", () => {
  assert.equal(presetFromParam("insta-portrait")?.width, 1080);
  assert.equal(presetFromParam("<script>"), null);
  assert.equal(presetFromParam("unknown-size"), null);
  assert.equal(presetFromParam(null), null);
});

test("v1.14 확대: 같은 비율로 영역을 1/배율로 줄이고, 배율은 1~3으로 보정", () => {
  assert.deepEqual(cropAt(4000, 3000, 1, { x: 0.5, y: 0.5, zoom: 2 }), { x: 1250, y: 750, width: 1500, height: 1500 });
  assert.deepEqual(cropAt(4000, 3000, 1, { x: 0, y: 0, zoom: 3 }), { x: 0, y: 0, width: 1000, height: 1000 });
  assert.equal(clampFocus({ zoom: 10 }).zoom, 3);
  assert.equal(clampFocus({ zoom: 0.2 }).zoom, 1);
  const p = planTransform(4000, 3000, { preset: presetById("insta-portrait"), focus: { x: 0.5, y: 0.2, zoom: 2 } });
  assert.deepEqual(p.exact, { width: 1080, height: 1350 });
  assert.equal(Math.round((p.crop.width / p.crop.height) * 1000), 800);
  assert.equal(p.crop.height, 1500);
});

test("v1.16 전후 비교: 공용 compare-slider 사본과 화면 연결", async () => {
  const { percentAt, colorDiffPercent } = await import("../src/lib/imageTools/compare.ts");
  assert.equal(percentAt(150, 100, 200), 25);
  assert.equal(colorDiffPercent([0, 0, 0], [255, 255, 255]), 100);
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/components/tool/ConvertTool.tsx", import.meta.url), "utf8");
  assert.match(src, /<BeforeAfter\s+key=\{comparing\.id\}\s+before=\{comparing\.url\}\s+after=\{comparing\.result\.url\}/);
  const { DICTS } = await import("../src/lib/i18n.ts");
  for (const d of Object.values(DICTS)) assert.ok(d.convert.compare && d.convert.compareGeomNote && d.convert.close);
});

test("v1.17 비교 창 이전/다음", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/components/tool/ConvertTool.tsx", import.meta.url), "utf8");
  assert.match(src, /const comparable = items\.filter\(\(i\) => i\.result\);/);
  assert.match(src, /e\.key === "PageDown"/);
  const { DICTS } = await import("../src/lib/i18n.ts");
  for (const d of Object.values(DICTS)) assert.ok(d.convert.comparePrev && d.convert.compareNext);
});

test("v1.18 비교 창 용량 변화", async () => {
  const { sizeChangeLabel } = await import("../src/lib/imageTools/sizeChange.ts");
  assert.equal(sizeChangeLabel(1000, 280), "\u221272%");
  assert.equal(sizeChangeLabel(1000, 1150), "+15%");
  assert.equal(sizeChangeLabel(1000, 1002), "±0%");
  assert.equal(sizeChangeLabel(0, 10), null);
  const { DICTS, fmt } = await import("../src/lib/i18n.ts");
  assert.equal(fmt(DICTS.ko.convert.compareSize, { a: "1 MB", b: "280 KB", pct: "\u221272%" }), "원본 1 MB → 변환 280 KB (\u221272%)");
  assert.ok(DICTS.en.convert.compareSize.includes("{pct}"));
});

test("v1.18 절감률 3단계", async () => {
  const { savingGrade } = await import("../src/lib/imageTools/sizeChange.ts");
  assert.equal(savingGrade(72), "great");
  assert.equal(savingGrade(30), "great");
  assert.equal(savingGrade(29), "small");
  assert.equal(savingGrade(0), "small");
  assert.equal(savingGrade(-1), "bigger");
});

test("v1.18 용량 늘어남 판정·필터 문구", async () => {
  const { isGrownFile } = await import("../src/lib/imageTools/sizeChange.ts");
  assert.equal(isGrownFile(1000, 1100), true);
  assert.equal(isGrownFile(1000, 1004), false); // 반올림 0% — 배지도 회색
  assert.equal(isGrownFile(1000, 500), false);
  assert.equal(isGrownFile(0, 10), false);
  const { DICTS } = await import("../src/lib/i18n.ts");
  for (const d of Object.values(DICTS)) assert.ok(d.convert.onlyGrown.includes("{n}") && d.convert.showAll);
});

test("v1.18 늘어난 그림 다시 변환 설정·판정", async () => {
  const { shrinkRetryOptions, retryOutcome } = await import("../src/lib/imageTools/sizeChange.ts");
  assert.deepEqual(shrinkRetryOptions(0.9), { format: "webp", quality: 0.8 });
  assert.deepEqual(shrinkRetryOptions(0.6), { format: "webp", quality: 0.6 });
  assert.equal(retryOutcome(1000, 1200, 700), "smaller");
  assert.equal(retryOutcome(1000, 1300, 1100), "stillBigger");
  assert.equal(retryOutcome(1000, 1200, 1250), "noGain");
  assert.equal(retryOutcome(1000, 1200, 1200), "noGain");
  const { DICTS } = await import("../src/lib/i18n.ts");
  for (const d of Object.values(DICTS)) assert.ok(d.convert.retrySmaller && d.convert.retryAll.includes("{n}") && d.convert.retryDone.includes("{pct}") && d.convert.retryStillBigger && d.convert.retryNoGain);
});
