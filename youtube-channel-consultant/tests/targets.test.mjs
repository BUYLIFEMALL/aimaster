import test from "node:test";
import assert from "node:assert/strict";
// 2026-10-17 v1.08: 선별 계산은 공용 엔진으로 이동(targets.ts는 같은 함수를 다시 내보냄)
import { selectGoldenChannels as selectTargetChannels } from "../src/lib/youtube/goldenEngine.ts";

const cand = (id, subs, views, videos, over = {}) => ({
  id, title: id, thumbnailUrl: "", publishedAt: "2025-01-01T00:00:00Z",
  subscriberCount: subs, viewCount: views, videoCount: videos,
  bestVideo: { id: "v" + id, title: "t", viewCount: 1, publishedAt: "2026-01-01T00:00:00Z", thumbnailUrl: "" },
  matchedVideos: 1, ...over,
});

test("구독자 상한·평균 조회수 하한으로 거르고 파괴력 배수순으로 정렬", () => {
  const { channels } = selectTargetChannels(
    [
      cand("big", 500000, 1_000_000_000, 100),   // 구독자 초과
      cand("low", 1000, 10_000, 10),             // 평균 1천 < 하한
      cand("a", 1000, 500_000, 10),              // 평균 5만, 50배
      cand("b", 5000, 1_000_000, 10),            // 평균 10만, 20배
    ],
    { maxSubscribers: 10000, minAverageViews: 10000 }
  );
  assert.deepEqual(channels.map((c) => c.id), ["a", "b"]);
  assert.equal(channels[0].averageViews, 50000);
  assert.equal(channels[0].powerRatio, 50);
  assert.equal(channels[1].powerRatio, 20);
});

test("구독자 비공개 채널은 0명으로 보지 않고 제외하며 개수를 센다", () => {
  const r = selectTargetChannels(
    [cand("hidden", null, 9_000_000, 10), cand("ok", 100, 100_000, 10)],
    { maxSubscribers: 10000, minAverageViews: 1000 }
  );
  assert.deepEqual(r.channels.map((c) => c.id), ["ok"]);
  assert.equal(r.hiddenSubscriberExcluded, 1);
});

test("영상 수 0, 구독자 0명, 개수 제한 처리", () => {
  const r = selectTargetChannels(
    [cand("nov", 10, 100, 0), cand("zero", 0, 20_000, 2), ...Array.from({ length: 40 }, (_, i) => cand("c" + i, 100, 1_000_000 + i, 10))],
    { maxSubscribers: 10000, minAverageViews: 1000 },
    30
  );
  assert.equal(r.channels.length, 30);
  assert.ok(!r.channels.some((c) => c.id === "nov"));
  // 구독자 0명도 배수 계산이 터지지 않는다(1명으로 보정)
  const z = selectTargetChannels([cand("zero", 0, 20_000, 2)], { maxSubscribers: 10000, minAverageViews: 1000 });
  assert.equal(z.channels[0].powerRatio, 10000);
});
