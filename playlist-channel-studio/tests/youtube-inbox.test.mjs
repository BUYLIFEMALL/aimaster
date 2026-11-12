// U10 유튜브(2026-11-13): 올리기 기록 → 받은 업무 내용(플랜 §5)
import test from "node:test";
import assert from "node:assert/strict";
import { playlistUploadInboxContent } from "../src/lib/youtubeInboxContent.ts";

const now = Date.parse("2026-11-13T03:00:00Z");
test("바로 올린 영상 → 발행됨·발행일 = 올린 시각(한국 날짜)", () => {
  const c = playlistUploadInboxContent({ video_id: "abc123", url: "https://youtu.be/abc123", title: "새벽 감성 플리", privacy: "public", publish_at: null, uploaded_at: "2026-11-12T16:30:00Z" }, now);
  assert.equal(c.title, "새벽 감성 플리");
  assert.deepEqual(c.data, { 채널: "유튜브", 상태: "published", "발행 주소": "https://youtu.be/abc123", 발행일: "2026-11-13" });
});
test("미래 예약 → 예약됨·예약일만, 지난 예약 → 발행일 = 예약 시각", () => {
  const f = playlistUploadInboxContent({ video_id: "x12345", url: "u", title: "", privacy: "private", publish_at: "2027-01-01T00:00:00Z", uploaded_at: "2026-11-01T00:00:00Z" }, now);
  assert.equal(f.title, "제목 없는 영상");
  assert.equal(f.data.상태, "scheduled");
  assert.equal(f.data.예약일, "2027-01-01");
  assert.equal(f.data.발행일, undefined);
  const p = playlistUploadInboxContent({ video_id: "y12345", url: "u", title: "t", privacy: "private", publish_at: "2026-11-10T00:00:00Z", uploaded_at: "2026-11-01T00:00:00Z" }, now);
  assert.equal(p.data.상태, "published");
  assert.equal(p.data.발행일, "2026-11-10");
});
