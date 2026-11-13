// v1.41 30일 자동 정리 기준(플랜 docs/PLAN_20261113_RETENTION_30D.md)
import test from "node:test";
import assert from "node:assert/strict";
import { RETENTION_DAYS, projectThumbPaths, retentionCutoff } from "../src/lib/retention.ts";

test("정리 기준 = 지금으로부터 정확히 30일 전", () => {
  const now = new Date("2026-11-13T00:00:00Z");
  assert.equal(RETENTION_DAYS, 30);
  assert.equal(retentionCutoff(now).toISOString(), "2026-10-14T00:00:00.000Z");
});

test("썸네일 경로: 회원/프로젝트 폴더의 thumb.jpg, 저장된 경로가 같으면 한 번만", () => {
  const u = "11111111-1111-1111-1111-111111111111";
  const rows = [
    { id: "a", user_id: u, thumb_path: `${u}/a/thumb.jpg` },
    { id: "b", user_id: u, thumb_path: null },
  ];
  assert.deepEqual(projectThumbPaths(rows), [`${u}/a/thumb.jpg`, `${u}/b/thumb.jpg`]);
});
