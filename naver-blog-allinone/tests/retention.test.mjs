// BC-05 (2026-10-22): 보관함 글·이미지 30일 보관 규칙
import test from "node:test";
import assert from "node:assert/strict";
import { RETENTION_DAYS, retentionCutoff, isExpired, expiredOrphanFiles } from "../src/lib/blog/retention.ts";

const NOW = new Date("2026-10-22T00:00:00Z");

test("만든 지 30일이 지난 것만 만료", () => {
  assert.equal(RETENTION_DAYS, 30);
  assert.equal(retentionCutoff(NOW), "2026-09-22T00:00:00.000Z");
  assert.equal(isExpired("2026-09-22T00:00:00Z", NOW), true);
  assert.equal(isExpired("2026-09-22T00:00:01Z", NOW), false);
  assert.equal(isExpired(null, NOW), false);
});

test("이미지는 30일이 지났고 남은 글이 쓰지 않을 때만 지운다", () => {
  const files = [
    { path: "u/old-unused.webp", createdAt: "2026-09-01T00:00:00Z" },
    { path: "u/old-used.webp", createdAt: "2026-09-01T00:00:00Z" },
    { path: "u/new-unused.webp", createdAt: "2026-10-20T00:00:00Z" },
    { path: "u/unknown.webp", createdAt: undefined },
  ];
  assert.deepEqual(expiredOrphanFiles(files, new Set(["u/old-used.webp"]), NOW), ["u/old-unused.webp"]);
});
