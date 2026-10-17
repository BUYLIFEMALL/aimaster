// 공용 기준 코드 youtube-golden-engine 테스트 — 기준: youtube-channel-consultant/tests, 사본: youtube-viral-studio/tests (docs/SHARED_MODULES.md, 2026-10-17).
// 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`로 사본에 반영한다.
// 실제 YouTube를 부르지 않고 가짜 응답으로 검색 → 영상 → 채널 순서·할당량·선별을 확인한다.
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGoldenParams, runGoldenSearch, selectGoldenChannels } from "../src/lib/youtube/goldenEngine.ts";

const DEFAULTS = { maxSubscribers: 10000, minAverageViews: 10000, period: "90d", shortVideosOnly: false, region: "all", pages: 1 };

test("입력 정리: 범위를 넘으면 맞추고, 잘못된 값은 프로그램 기본값", () => {
  const p = normalizeGoldenParams({ keyword: "  캠핑 ", maxSubscribers: 5, minAverageViews: -1, period: "7d", region: "kr", pages: 2 }, DEFAULTS);
  assert.deepEqual(p, { keyword: "캠핑", maxSubscribers: 100, minAverageViews: 0, period: "90d", shortVideosOnly: false, region: "kr", pages: 2 });
  assert.ok("error" in normalizeGoldenParams({ keyword: "" }, DEFAULTS));
  assert.equal(normalizeGoldenParams({ keyword: "a", shortVideosOnly: true }, DEFAULTS).shortVideosOnly, true);
});

test("선별: 비공개 구독자는 0명으로 보지 않고 제외, 파괴력 배수순", () => {
  const c = (id, subs, views, videos) => ({ id, title: id, thumbnailUrl: "", publishedAt: "", subscriberCount: subs, viewCount: views, videoCount: videos, bestVideo: { id: "v", title: "", viewCount: 0, publishedAt: "", thumbnailUrl: "" }, matchedVideos: 1 });
  const r = selectGoldenChannels([c("hidden", null, 9e6, 10), c("a", 1000, 500000, 10), c("b", 5000, 1e6, 10)], { maxSubscribers: 10000, minAverageViews: 10000 });
  assert.deepEqual(r.channels.map((x) => x.id), ["a", "b"]);
  assert.equal(r.hiddenSubscriberExcluded, 1);
  assert.equal(r.channels[0].powerRatio, 50);
});

test("검색 실행: 조건이 YouTube 요청에 반영되고 할당량을 센다", async () => {
  const calls = [];
  const fake = async (endpoint, query, units) => {
    calls.push({ endpoint, query, units });
    if (endpoint === "search") return { items: [{ id: { videoId: "v1" } }, { id: { videoId: "v2" } }, { id: { videoId: "v1" } }] };
    if (endpoint === "videos")
      return {
        items: [
          { id: "v1", snippet: { channelId: "c1", title: "첫 영상" }, statistics: { viewCount: "100" } },
          { id: "v2", snippet: { channelId: "c1", title: "더 많이 본 영상" }, statistics: { viewCount: "900" } },
        ],
      };
    return { items: [{ id: "c1", snippet: { title: "채널1" }, statistics: { subscriberCount: "1000", viewCount: "500000", videoCount: "10" } }] };
  };
  const r = await runGoldenSearch({ ...DEFAULTS, keyword: "캠핑", shortVideosOnly: true, region: "kr" }, fake);
  const search = calls.find((x) => x.endpoint === "search");
  assert.equal(search.query.videoDuration, "short");
  assert.equal(search.query.regionCode, "KR");
  assert.equal(search.query.order, "viewCount");
  assert.equal(r.quotaUsed, 102);
  assert.equal(r.scannedVideos, 2);
  assert.equal(r.channels.length, 1);
  assert.equal(r.channels[0].bestVideo.title, "더 많이 본 영상");
  assert.equal(r.channels[0].matchedVideos, 2);
});
