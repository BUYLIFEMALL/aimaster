import test from "node:test";
import assert from "node:assert/strict";
import { rowCutoffIso, pickExpiredVideos, pickExpiredCandidates, bgmStoragePath } from "../src/lib/retentionRows.ts";

const NOW = Date.parse("2026-11-11T00:00:00Z");
const CUT = rowCutoffIso(NOW);
const OLD = "2026-10-01T00:00:00Z", NEW = "2026-11-05T00:00:00Z";

test("기준 시각은 30일 전", () => {
  assert.equal(CUT, "2026-10-12T00:00:00.000Z");
});

test("대본: 오래됨만, 예외 회원·최근 장면 수정은 제외(발행 여부 무관)", () => {
  const videos = [
    { id: "v1", user_id: "a", updated_at: OLD },
    { id: "v2", user_id: "a", updated_at: NEW },
    { id: "v3", user_id: "admin", updated_at: OLD },
    { id: "v4", user_id: "b", updated_at: OLD },
  ];
  const segs = [{ video_id: "v4", updated_at: NEW }, { video_id: "v1", updated_at: OLD }];
  assert.deepEqual(pickExpiredVideos(videos, segs, CUT, new Set(["admin"])).map((v) => v.id), ["v1"]);
});

test("후보: 남은 대본이 쓰는 후보는 보관", () => {
  const cands = [
    { id: "c1", user_id: "a", updated_at: OLD },
    { id: "c2", user_id: "a", updated_at: OLD },
    { id: "c3", user_id: "admin", updated_at: OLD },
    { id: "c4", user_id: "a", updated_at: NEW },
  ];
  assert.deepEqual(pickExpiredCandidates(cands, new Set(["c2"]), CUT, new Set(["admin"])).map((c) => c.id), ["c1"]);
});

test("배경음악 주소: 우리 저장소만 경로로", () => {
  assert.equal(bgmStoragePath("https://x.supabase.co/storage/v1/object/public/shots-bgm/u1/a%20b.mp3"), "u1/a b.mp3");
  assert.equal(bgmStoragePath("https://tempfile.aiquickdraw.com/r/abc.mp3"), null);
  assert.equal(bgmStoragePath(null), null);
});
