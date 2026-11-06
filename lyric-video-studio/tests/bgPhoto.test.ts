import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeDesign } from "../src/lib/design.ts";

const ok = { url: "https://cdn.pixabay.com/photo/2026/01/01/rain-123_1280.jpg", preview: "https://cdn.pixabay.com/photo/2026/01/01/rain-123_640.jpg", pageUrl: "https://pixabay.com/photos/rain-123/", author: "kim", source: "pixabay" };

test("배경 사진 — 옛 저장값은 없음, 제공처 주소면 그대로", () => {
  assert.equal(normalizeDesign({ presetId: "night-stage" }).bgPhoto, null);
  assert.deepEqual(normalizeDesign({ bgPhoto: ok }).bgPhoto, ok);
  const pexels = { url: "https://images.pexels.com/photos/1/a.jpeg", preview: "https://images.pexels.com/photos/1/b.jpeg", pageUrl: "https://www.pexels.com/photo/1/", author: "lee", source: "pexels" };
  assert.deepEqual(normalizeDesign({ bgPhoto: pexels }).bgPhoto, pexels);
});

test("배경 사진 — 다른 사이트 주소·이상한 값은 버림", () => {
  assert.equal(normalizeDesign({ bgPhoto: { ...ok, url: "https://evil.example/photo/a.jpg" } }).bgPhoto, null);
  assert.equal(normalizeDesign({ bgPhoto: { ...ok, url: "http://cdn.pixabay.com/photo/a.jpg" } }).bgPhoto, null);
  assert.equal(normalizeDesign({ bgPhoto: { ...ok, pageUrl: "https://evil.example/" } }).bgPhoto, null);
  assert.equal(normalizeDesign({ bgPhoto: { ...ok, source: "unsplash" } }).bgPhoto, null);
  assert.equal(normalizeDesign({ bgPhoto: "x" }).bgPhoto, null);
  assert.equal(normalizeDesign({ bgPhoto: { ...ok, author: "a".repeat(300) } }).bgPhoto?.author.length, 100);
});
