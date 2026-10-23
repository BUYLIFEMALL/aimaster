import test from "node:test";
import assert from "node:assert/strict";
import { pruneSegmentImages } from "../src/lib/sceneImageCleanup.ts";

test("v1.36 장면 이미지 정리: 지운 주소를 이력에서 빼고 선택이면 비움", () => {
  const gone = new Set(["u1", "u2"]);
  assert.deepEqual(pruneSegmentImages({ image_url: "u2", image_urls: ["u1", "u2", "u3"] }, gone), { image_url: null, image_urls: ["u3"] });
  assert.deepEqual(pruneSegmentImages({ image_url: "u3", image_urls: ["u1", "u3"] }, gone), { image_url: "u3", image_urls: ["u3"] });
  assert.equal(pruneSegmentImages({ image_url: "u3", image_urls: ["u3"] }, gone), null);
  assert.deepEqual(pruneSegmentImages({ image_url: "u1", image_urls: null }, gone), { image_url: null, image_urls: [] });
  assert.equal(pruneSegmentImages({ image_url: null, image_urls: [] }, gone), null);
});

test("v1.37 정리 기록: 회원별 개수·장면 묶기", async () => {
  const { countByOwner, cleanupByOwner } = await import("../src/lib/sceneImageCleanup.ts");
  assert.deepEqual(countByOwner(["a/v1/1.mp4", "a/v2/2.mp4", "b/x.png"]), { a: 2, b: 1 });
  const r = cleanupByOwner({ videos: ["a/v/1.mp4"], voices: ["b/v/voice/1.mp3"], covers: [], images: ["a/v-1-x.png", "a/v-2-y.png"] }, { a: ["s1", "s2"] });
  assert.deepEqual(r.a, { videos: 1, voices: 0, covers: 0, images: 2, segments: ["s1", "s2"] });
  assert.deepEqual(r.b, { videos: 0, voices: 1, covers: 0, images: 0, segments: [] });
  assert.deepEqual(cleanupByOwner({ videos: [], voices: [], covers: [], images: [] }, {}), {});
});
