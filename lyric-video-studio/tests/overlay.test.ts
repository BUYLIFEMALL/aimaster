import { test } from "node:test";
import assert from "node:assert/strict";
import { filmBarHeight, logoRect } from "../src/lib/overlay.ts";
import { normalizeDesign } from "../src/lib/design.ts";

test("로고 자리 — 비율 유지, 3×3 칸, 화면 밖으로 나가지 않음", () => {
  const W = 1920, H = 1080;
  const tl = logoRect(W, H, 400, 200, 0, 0.1)!;
  assert.equal(Math.round(tl.w), 108); assert.equal(Math.round(tl.h), 54); // 긴 변 = 짧은 변 1080의 10%
  assert.equal(Math.round(tl.x), 43); assert.equal(Math.round(tl.y), 43); // 여백 4%
  const br = logoRect(W, H, 400, 200, 8, 0.1)!;
  assert.equal(Math.round(br.x + br.w), W - 43); assert.equal(Math.round(br.y + br.h), H - 43);
  const c = logoRect(W, H, 200, 200, 4, 0.2)!;
  assert.equal(c.x, (W - c.w) / 2); assert.equal(c.y, (H - c.h) / 2);
  assert.equal(logoRect(W, H, 0, 100, 0, 0.1), null);
});

test("로고 — 필름 띠가 있으면 띠 안쪽으로, 크기는 5~30%로 제한", () => {
  const H = 1080, bar = filmBarHeight("film", H);
  assert.equal(bar, 49); assert.equal(filmBarHeight("line", H), 0);
  assert.equal(Math.round(logoRect(1920, H, 100, 100, 0, 0.1, "film")!.y), 43 + bar);
  assert.equal(Math.round(logoRect(1920, H, 100, 100, 0, 9)!.w), 324);
  assert.equal(Math.round(logoRect(1080, 1920, 100, 100, 0, 0)!.w), 54);
});

test("디자인 — 옛 저장값은 프레임 없음·기본 로고 값, 잘못된 값은 고침", () => {
  const d = normalizeDesign({ presetId: "night-stage" });
  assert.equal(d.frame, "none"); assert.equal(d.logoPos, 2); assert.equal(d.frameWidth, 4);
  const x = normalizeDesign({ frame: "film", frameColor: "red", frameWidth: 99, logoPos: 12, logoSize: 5, logoOpacity: 0 });
  assert.deepEqual([x.frame, x.frameColor, x.frameWidth, x.logoPos, x.logoSize, x.logoOpacity], ["film", "#ffffff", 12, 8, 0.3, 0.2]);
  assert.equal(normalizeDesign({ frame: "neon" }).frame, "none");
});
