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
