import test from "node:test";
import assert from "node:assert/strict";
import { checkReelCoverFile, reelCoverPath, reelCoverRatioNote, REEL_COVER_MAX_BYTES } from "../src/lib/instagram/reelCover.ts";

test("v1.35 릴스 표지: 경로·파일 확인·비율 안내", () => {
  assert.equal(reelCoverPath("u1", "v1"), "u1/covers/v1.jpg");
  assert.equal(checkReelCoverFile({ type: "image/jpeg", size: 500_000 }), null);
  assert.ok(checkReelCoverFile({ type: "image/png", size: 500_000 })?.includes("JPG"));
  assert.ok(checkReelCoverFile({ type: "image/jpeg", size: REEL_COVER_MAX_BYTES + 1 })?.includes("8MB"));
  assert.ok(checkReelCoverFile({ type: "image/jpeg", size: 0 }));
  assert.equal(reelCoverRatioNote(768, 1376), null);
  assert.equal(reelCoverRatioNote(1080, 1920), null);
  assert.ok(reelCoverRatioNote(1280, 720));
});
