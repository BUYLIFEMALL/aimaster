// v1.12 (BC-05): 회원 생성물 30일 보관 규칙
import test from "node:test";
import assert from "node:assert/strict";
import { RETENTION_DAYS, isRetained, isKeptKind, retainedFilter, retentionCutoff, orphanJobFolders } from "../src/lib/retention.ts";

const NOW = new Date("2026-10-22T00:00:00Z");

test("설정·내 블로그는 기간과 상관없이 보관, 나머지는 30일 뒤 삭제", () => {
  assert.equal(RETENTION_DAYS, 30);
  assert.equal(retentionCutoff(NOW), "2026-09-22T00:00:00.000Z");
  assert.ok(isKeptKind("settings") && isKeptKind("blog") && !isKeptKind("draft"));
  assert.equal(isRetained({ kind: "blog", created_at: "2025-01-01T00:00:00Z" }, NOW), true);
  assert.equal(isRetained({ kind: "settings", created_at: "2025-01-01T00:00:00Z" }, NOW), true);
  for (const kind of ["keyword", "brief", "bench", "research", "draft", "final", "image_job"]) {
    assert.equal(isRetained({ kind, created_at: "2026-09-22T00:00:01Z" }, NOW), true, kind);
    assert.equal(isRetained({ kind, created_at: "2026-09-22T00:00:00Z" }, NOW), false, kind);
  }
});

test("조회 조건과 남은 작업이 없는 이미지 폴더 고르기", () => {
  assert.equal(retainedFilter(NOW), "kind.in.(settings,blog),created_at.gt.2026-09-22T00:00:00.000Z");
  assert.deepEqual(orphanJobFolders(["a", "b", "c"], new Set(["b"])), ["a", "c"]);
});

test("2026-10-23: 옛 이미지 경로는 이 회원·이 작업 폴더 것만 고른다", async () => {
  const { jobImagePath } = await import("../src/lib/retention.ts");
  const base = "https://x.supabase.co/storage/v1/object/public/blog-workroom/";
  assert.equal(jobImagePath(`${base}u1/j1/n1-1.png`, "blog-workroom", "u1", "j1"), "u1/j1/n1-1.png");
  assert.equal(jobImagePath(`${base}u2/j1/n1-1.png`, "blog-workroom", "u1", "j1"), null);
  assert.equal(jobImagePath(`${base}u1/j2/n1-1.png`, "blog-workroom", "u1", "j1"), null);
  assert.equal(jobImagePath("https://other.com/a.png", "blog-workroom", "u1", "j1"), null);
  assert.equal(jobImagePath(null, "blog-workroom", "u1", "j1"), null);
});
