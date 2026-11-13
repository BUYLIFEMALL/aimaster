import { test } from "node:test";
import assert from "node:assert/strict";
import { sourceImageOrigin, usesCollectedPhoto } from "../lib/collectedPhoto.ts";

test("출처 값 정리 — collected만 수집, 나머지는 회원 사진", () => {
  assert.equal(sourceImageOrigin("collected"), "collected");
  assert.equal(sourceImageOrigin("member"), "member");
  assert.equal(sourceImageOrigin(null), "member");
  assert.equal(sourceImageOrigin("other"), "member");
});

test("수집 원본이고 합성 대표사진이 없을 때만 경고 대상", () => {
  assert.equal(usesCollectedPhoto({ source_image_origin: "collected", main_image_url: null }), true);
  assert.equal(usesCollectedPhoto({ source_image_origin: "collected", main_image_url: "https://x/main.jpg" }), false);
  assert.equal(usesCollectedPhoto({ source_image_origin: "member", main_image_url: null }), false);
  assert.equal(usesCollectedPhoto({}), false);
});
