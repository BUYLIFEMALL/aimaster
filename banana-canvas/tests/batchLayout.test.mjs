// E4 「🖼 사진 일괄 손질」 계산 시험 — 높이 맞춤·9곳 위치·크기·파일 이름(그리기는 브라우저에서만)
import test from "node:test";
import assert from "node:assert/strict";
import { anchorPosition, DEFAULT_SETTINGS, logoSize, normalizeSettings, outputNames, outputSize, textFontPx } from "../src/lib/batch/layout.ts";

test("기본 높이 860, 비율 유지, 테두리 포함 크기", () => {
  assert.equal(DEFAULT_SETTINGS.height, 860);
  assert.deepEqual(outputSize(2000, 1000, { height: 860, border: 0 }), { w: 1720, h: 860, totalW: 1720, totalH: 860, tooWide: false });
  assert.deepEqual(outputSize(1000, 2000, { height: 860, border: 10 }), { w: 430, h: 860, totalW: 450, totalH: 880, tooWide: false });
});

test("원본 크기 그대로·4096px 초과 경고", () => {
  assert.equal(outputSize(1234, 567, { height: null, border: 0 }).w, 1234);
  assert.equal(outputSize(10000, 1000, { height: 860, border: 0 }).tooWide, true); // 8600px
  assert.equal(outputSize(4000, 1000, { height: 1000, border: 50 }).tooWide, true); // 4100px
});

test("워터마크 9곳 위치와 여백", () => {
  assert.deepEqual(anchorPosition("tl", 1000, 800, 100, 50, 20), { x: 20, y: 20 });
  assert.deepEqual(anchorPosition("mc", 1000, 800, 100, 50, 20), { x: 450, y: 375 });
  assert.deepEqual(anchorPosition("br", 1000, 800, 100, 50, 20), { x: 880, y: 730 });
  assert.deepEqual(anchorPosition("tr", 1000, 800, 100, 50, 0), { x: 900, y: 0 });
  assert.deepEqual(anchorPosition("bl", 1000, 800, 100, 50, 10), { x: 10, y: 740 });
});

test("로고·문자 크기는 사진 너비의 %", () => {
  assert.deepEqual(logoSize(1000, 400, 200, 20), { w: 200, h: 100 });
  assert.equal(textFontPx(1000, 6), 60);
  assert.equal(textFontPx(50, 1), 8); // 너무 작으면 8px
});

test("파일 이름: 원래 이름 유지·앞붙임 순번·같은 이름 피하기", () => {
  assert.deepEqual(outputNames(["a.png", "b.jpeg"], "", "jpg"), ["a.jpg", "b.jpg"]);
  assert.deepEqual(outputNames(["x.png", "x.jpg"], "", "png"), ["x.png", "x(2).png"]);
  assert.deepEqual(outputNames(["a.png", "b.png"], "상품", "jpg"), ["상품_001.jpg", "상품_002.jpg"]);
});

test("깨진 저장값은 안전한 범위로", () => {
  const s = normalizeSettings({ height: 99999, wmOpacity: 300, wmAnchor: "zz", quality: 5, prefix: "a/b:c" });
  assert.equal(s.height, 4096);
  assert.equal(s.wmOpacity, 100);
  assert.equal(s.wmAnchor, "br");
  assert.equal(s.quality, 60);
  assert.equal(s.prefix, "abc");
  assert.equal(normalizeSettings({ height: null }).height, null);
});
