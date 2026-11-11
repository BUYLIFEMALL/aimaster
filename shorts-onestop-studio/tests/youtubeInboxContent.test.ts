import test from "node:test";
import assert from "node:assert/strict";
import { youtubeUploadInboxContent, kstDate } from "../src/lib/youtubeInboxContent.ts";

const now = Date.parse("2026-11-12T03:00:00Z");

test("U10 유튜브: 바로 올린 쇼츠 → 발행됨·발행일(한국 날짜)·채널 이름은 본문에", () => {
  const c = youtubeUploadInboxContent({ videoId: "a", url: "https://youtube.com/shorts/a", title: "오늘의 꿀팁", privacy: "unlisted", publishAt: null, channel: "내 채널", uploadedAt: "2026-11-11T16:30:00Z" }, now);
  assert.equal(c.title, "오늘의 꿀팁");
  assert.deepEqual(c.data, { 채널: "유튜브", 상태: "published", "발행 주소": "https://youtube.com/shorts/a", 발행일: "2026-11-12" });
  assert.match(c.bodyMd, /공개 범위: 일부 공개/);
  assert.match(c.bodyMd, /채널: 내 채널/);
});

test("U10 유튜브: 미래 예약 → 예약됨·예약일만, 지난 예약 → 발행일 = 예약 시각", () => {
  const future = youtubeUploadInboxContent({ videoId: "b", url: "https://youtu.be/b", title: " ", privacy: "private", publishAt: "2027-03-15T00:00:00Z", uploadedAt: "2026-11-01T00:00:00Z" }, now);
  assert.equal(future.title, "제목 없는 영상");
  assert.equal(future.data.상태, "scheduled");
  assert.equal(future.data.예약일, "2027-03-15");
  assert.equal(future.data.발행일, undefined);
  const past = youtubeUploadInboxContent({ videoId: "c", url: "https://youtu.be/c", title: "t", privacy: "private", publishAt: "2026-11-10T00:00:00Z", uploadedAt: "2026-11-01T00:00:00Z" }, now);
  assert.equal(past.data.상태, "published");
  assert.equal(past.data.발행일, "2026-11-10");
  assert.equal(kstDate(null), null);
});
