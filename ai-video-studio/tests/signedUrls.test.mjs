import { test } from "node:test";
import assert from "node:assert/strict";
import { uniquePaths, urlMap, withDownload } from "../lib/signedUrls.ts";

test("내려받기 주소는 서명 주소 뒤에 download 이름만 붙임", () => {
  assert.equal(withDownload("https://x/storage/v1/object/sign/b/a.mp4?token=abc", "ai-video-1234abcd.mp4"), "https://x/storage/v1/object/sign/b/a.mp4?token=abc&download=ai-video-1234abcd.mp4");
  assert.equal(withDownload(null, "a.mp4"), null);
});

test("경로는 빈 값·중복 빼고 한 번에", () => {
  assert.deepEqual(uniquePaths(["u/1.mp4", null, "u/1.mp4", undefined, "u/s.jpg", ""]), ["u/1.mp4", "u/s.jpg"]);
});

test("실패한 경로는 주소 없음", () => {
  const m = urlMap([{ path: "a", signedUrl: "https://a" }, { path: "b", signedUrl: null, error: "Not found" }, { path: "c", signedUrl: "https://c", error: "x" }]);
  assert.equal(m.get("a"), "https://a");
  assert.equal(m.has("b"), false);
  assert.equal(m.has("c"), false);
});
