import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPopularity,
  calculateUploadStats,
  formatHours,
  formatNumber,
  isShortsVideo,
  parseDuration,
} from "../src/lib/youtube/metrics.ts";

const video = (id, viewCount, likeCount, commentCount, publishedAt = "2026-01-01T00:00:00Z") => ({
  id, title: id, description: "", thumbnailUrl: "", publishedAt, channelId: "c", channelTitle: "c",
  viewCount, likeCount, commentCount, durationSeconds: 100, isShort: false, tags: [],
});

test("parseDuration: ISO 8601 길이를 초로 바꾼다", () => {
  assert.equal(parseDuration("PT45S"), 45);
  assert.equal(parseDuration("PT1M15S"), 75);
  assert.equal(parseDuration("PT1H2M3S"), 3723);
  assert.equal(parseDuration(undefined), 0);
});

test("isShortsVideo: 60초 이하이거나 3분 이하+#shorts만 쇼츠", () => {
  assert.equal(isShortsVideo(45, ""), true);
  assert.equal(isShortsVideo(120, "일반 영상"), false);
  assert.equal(isShortsVideo(120, "제목 #Shorts"), true);
  assert.equal(isShortsVideo(200, "#shorts"), false);
  assert.equal(isShortsVideo(0, "#shorts"), false);
});

test("applyPopularity: 모든 항목 최고인 영상은 100점, 나머지는 상대 점수", () => {
  const out = applyPopularity([video("a", 1000, 100, 10), video("b", 500, 50, 5)]);
  assert.equal(out[0].popularity, 100);
  assert.equal(out[1].popularity, 50);
});

test("applyPopularity: 좋아요·댓글이 모두 비공개면 조회수만으로 계산(0점 처리 아님)", () => {
  const out = applyPopularity([video("a", 1000, null, null), video("b", 250, null, null)]);
  assert.equal(out[0].popularity, 100);
  assert.equal(out[1].popularity, 25);
});

test("applyPopularity: 빈 목록과 전부 0 조회수도 안전", () => {
  assert.deepEqual(applyPopularity([]), []);
  assert.equal(applyPopularity([video("z", 0, 0, 0)])[0].popularity, 0);
});

test("calculateUploadStats: 평균 간격과 최초 업로드", () => {
  const stats = calculateUploadStats([
    { publishedAt: "2026-01-01T00:00:00Z" },
    { publishedAt: "2026-01-03T00:00:00Z" },
    { publishedAt: "2026-01-05T00:00:00Z" },
  ]);
  assert.equal(stats.averageIntervalHours, 48);
  assert.equal(stats.oldestPublishedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(calculateUploadStats([]).averageIntervalHours, null);
  assert.equal(calculateUploadStats([{ publishedAt: "2026-01-01T00:00:00Z" }]).averageIntervalHours, null);
});

test("포맷터", () => {
  assert.equal(formatNumber(null), "비공개");
  assert.equal(formatNumber(3500), "3.5천");
  assert.equal(formatNumber(160000), "16.0만");
  assert.equal(formatHours(88), "3일 16시간");
  assert.equal(formatHours(null), "-");
});
