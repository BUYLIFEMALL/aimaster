// v1.14 인스타 자동 포스팅 1차 — 피드 비율 자르기·사진 고르기·임시 경로 검사
import test from "node:test";
import assert from "node:assert/strict";
import { MAX_INSTA_PHOTOS, feedCrop, togglePick, validInstaPaths } from "../src/lib/instagram/feedImage.ts";

test("피드 비율 안(정사각·4:5·가로 1.5)은 그대로", () => {
  assert.deepEqual(feedCrop(1000, 1000), { sx: 0, sy: 0, sw: 1000, sh: 1000 });
  assert.deepEqual(feedCrop(800, 1000), { sx: 0, sy: 0, sw: 800, sh: 1000 });
  assert.deepEqual(feedCrop(1500, 1000), { sx: 0, sy: 0, sw: 1500, sh: 1000 });
});

test("9:16 세로는 가운데 4:5로, 아주 넓은 가로는 1.91:1로 자른다", () => {
  assert.deepEqual(feedCrop(900, 1600), { sx: 0, sy: 238, sw: 900, sh: 1125 });
  const wide = feedCrop(3000, 1000);
  assert.equal(wide.sh, 1000);
  assert.equal(wide.sw, 1910);
  assert.equal(wide.sx, 545);
});

test("사진 고르기: 누른 순서대로, 다시 누르면 빠지고, 10장 넘게는 안 담김", () => {
  let p = togglePick([], "a");
  p = togglePick(p, "b");
  assert.deepEqual(p, ["a", "b"]);
  assert.deepEqual(togglePick(p, "a"), ["b"]);
  const full = Array.from({ length: MAX_INSTA_PHOTOS }, (_, i) => `x${i}`);
  assert.deepEqual(togglePick(full, "y"), full);
});

test("임시 경로는 회원 본인 influencer-insta 폴더의 .jpg 1~10장만", () => {
  const u = "11111111-2222-3333-4444-555555555555";
  assert.equal(validInstaPaths(u, [`${u}/influencer-insta/b1/01.jpg`]), true);
  assert.equal(validInstaPaths(u, []), false);
  assert.equal(validInstaPaths(u, [`other/influencer-insta/b1/01.jpg`]), false, "다른 회원 폴더");
  assert.equal(validInstaPaths(u, [`${u}/insta/b1/01.jpg`]), false, "다른 용도 폴더");
  assert.equal(validInstaPaths(u, [`${u}/influencer-insta/../x/01.jpg`]), false);
  assert.equal(validInstaPaths(u, [`${u}/influencer-insta/b1/01.png`]), false);
  assert.equal(validInstaPaths(u, Array.from({ length: 11 }, (_, i) => `${u}/influencer-insta/b/${i}.jpg`)), false);
});
