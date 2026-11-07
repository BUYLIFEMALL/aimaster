import test from "node:test";
import assert from "node:assert/strict";
import { groupStorageItems, storageGroupOf } from "../src/lib/storageGroups.ts";

test("저장 공간 묶음: 항목 번호로 음악·편집 도구·그림·보관 파일", () => {
  assert.equal(storageGroupOf("ace:xl-turbo"), "music");
  assert.equal(storageGroupOf("ace-runtime"), "music");
  assert.equal(storageGroupOf("yue2"), "music");
  assert.equal(storageGroupOf("py:minimax"), "music");
  assert.equal(storageGroupOf("py:stems-models"), "tools");
  assert.equal(storageGroupOf("py:lyrics-cpu"), "tools");
  assert.equal(storageGroupOf("py:vocal-cache"), "tools");
  assert.equal(storageGroupOf("py:image-sdcpp"), "image");
  assert.equal(storageGroupOf("uv-cache"), "cache");
  assert.equal(storageGroupOf("mp3-cache"), "cache");
});

test("저장 공간 묶음: 정해진 순서, 묶음 안은 큰 것부터, 빈 묶음 빼기, 합계", () => {
  const g = groupStorageItems([
    { id: "uv-cache", bytes: 35 },
    { id: "py:image-sdcpp", bytes: 12 },
    { id: "ace:base", bytes: 4 },
    { id: "py:heartmula", bytes: 28 },
  ]);
  assert.deepEqual(g.map((x) => x.key), ["music", "image", "cache"]);
  assert.deepEqual(g[0].items.map((x) => x.id), ["py:heartmula", "ace:base"]);
  assert.equal(g[0].bytes, 32);
});
