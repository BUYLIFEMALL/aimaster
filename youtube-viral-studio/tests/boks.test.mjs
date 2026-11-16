// boks-youtube-finder(MIT, 커밋 3aacecf) 이식 순수 함수 시험 — 2026-11-16 영상 담당.
// 원본에는 시험이 없어 이식하면서 새로 쓴다. 네트워크 없음. 실행: node --test tests/boks.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFinderVideo, calculatePublishedRange, computeChannelBaseline, computeMarketAnalytics, extractTitleKeywords,
  isReligious, isReligiousQuery, mapVideoItem, parseIsoDuration, relevanceIssue, formatMultiplier, formatNumber,
} from "../src/lib/youtube/boks/core.ts";
import { computeTrends } from "../src/lib/youtube/boks/trends.ts";
import { nextResetMs, quotaDay, remainingSearch } from "../src/lib/youtube/boks/quota.ts";
import { buildPlanPrompt, extractJsonObject, normalizeReport, pickPromptVideos } from "../src/lib/youtube/boks/plan.ts";

const NOW = Date.UTC(2026, 10, 16, 3, 0, 0);
const DAY = 86400000;
const row = (id, views, dur, ageDays) => [id, views, dur, NOW - ageDays * DAY];

test("평소 조회수: 같은 형식·48시간 지난 영상만, 최근 15개 중앙값, 자기 자신 제외", () => {
  const uploads = [
    row("self", 999999, 40, 5), // 자기 자신
    row("new", 500000, 40, 1), // 48시간 미만
    row("long1", 800000, 600, 5), // 다른 형식
    row("live", 10, 0, 5), // 길이 0
    ...[1000, 2000, 3000, 4000, 5000].map((v, i) => row(`s${i}`, v, 50, 3 + i)),
  ];
  assert.deepEqual(computeChannelBaseline(uploads, { videoId: "self", isShorts: true, now: NOW }), { median: 3000, sampleSize: 5 });
  // 표본 5개 미만이면 null
  assert.equal(computeChannelBaseline(uploads.slice(0, 7), { videoId: "self", isShorts: true, now: NOW }), null);
  // 짝수 표본은 가운데 두 값 평균
  const six = [...uploads, row("s5", 6000, 50, 9)];
  assert.equal(computeChannelBaseline(six, { videoId: "self", isShorts: true, now: NOW }).median, 3500);
  assert.equal(computeChannelBaseline(null, { videoId: "x", isShorts: true }), null);
});

const raw = (o = {}) => ({
  title: "캠핑 꿀팁", description: "", channelId: "c1", channelTitle: "캠핑채널", categoryId: "19", publishedAt: new Date(NOW - 10 * DAY).toISOString(),
  thumbnails: { medium: { url: "m.jpg" } }, liveBroadcastContent: "none", tags: [], defaultAudioLanguage: "", defaultLanguage: "",
  durationSec: 45, viewCount: 120000, likeCount: 2400, commentCount: 30, isShorts: true, ...o,
});

test("떡상 지표: 평소 대비가 있으면 그것이 기본 점수, 없으면 구독자 대비(하한 1,000) 추정", () => {
  const uploads = { asOf: NOW, uploads: [1000, 2000, 3000, 4000, 5000].map((v, i) => row(`s${i}`, v, 50, 3 + i)) };
  const a = buildFinderVideo("v1", raw(), 500, uploads, NOW);
  assert.equal(a.scoreBasis, "baseline");
  assert.equal(a.score, 40); // 120000 / 3000
  assert.equal(a.channelBaseline, 3000);
  assert.equal(a.subsRatio, 240);
  assert.equal(a.qualifies, true);
  assert.equal(a.categoryName, "여행/이벤트");
  const b = buildFinderVideo("v2", raw(), 500, null, NOW);
  assert.equal(b.scoreBasis, "subs");
  assert.equal(b.score, 120); // 하한 1,000으로 나눔
  const topic = buildFinderVideo("v3", raw({ channelTitle: "가수 - Topic" }), 500, null, NOW);
  assert.equal(topic.score, null);
  assert.equal(topic.qualifies, false);
  const small = buildFinderVideo("v4", raw({ viewCount: 5000 }), 10, null, NOW);
  assert.equal(small.qualifies, false); // 조회수 1만 미만
});

test("관련성: 해시태그 도배·다른 언어·키워드 무관을 거르고 정상 영상은 통과", () => {
  assert.equal(relevanceIssue({ title: "#a #b #c", tags: [] }, "캠핑"), "spam");
  assert.equal(relevanceIssue({ title: "초간단 크림당면 #자취요리 #먹방 #요리 #레시피 #간단", tags: [] }, "자취요리"), null);
  assert.equal(relevanceIssue({ title: "Best camping hacks", channelTitle: "Camper", description: "camping", tags: [] }, "camping", "ko"), "language");
  assert.equal(relevanceIssue({ title: "Best camping hacks", channelTitle: "Camper", description: "camping", tags: [], defaultAudioLanguage: "ko" }, "camping", "ko"), null);
  assert.equal(relevanceIssue({ title: "오늘 저녁 메뉴 추천", channelTitle: "요리왕", description: "", tags: [] }, "캠핑"), "offtopic");
  assert.equal(relevanceIssue({ title: "겨울 캠핑 준비물", channelTitle: "캠퍼", description: "", tags: [] }, "겨울 캠핑"), null);
  // 키워드 없는 인기 탐색은 키워드 검사를 하지 않음
  assert.equal(relevanceIssue({ title: "오늘 저녁 메뉴 추천", channelTitle: "요리왕", tags: [] }, ""), null);
});

test("종교: 확실한 단어 1개 또는 약한 단어 2개, 검색어가 종교면 찾는 것으로 봄", () => {
  assert.equal(isReligious({ title: "은혜로운 찬양 모음", channelTitle: "", tags: [] }), true);
  assert.equal(isReligious({ title: "주님 은혜", channelTitle: "", tags: [] }), true);
  assert.equal(isReligious({ title: "은혜 갚은 까치", channelTitle: "", tags: [] }), false);
  assert.equal(isReligiousQuery("찬양 모음"), true);
  assert.equal(isReligiousQuery("캠핑"), false);
});

const fv = (o) => ({ title: "", viewCount: 50000, subscriberCount: 5000, score: 5, qualifies: true, scoreBasis: "baseline", ...o });

test("기회 지수: 소형 채널 비중×60 + 소형 떡상 비중×2(최대1)×40", () => {
  const vids = [fv({}), fv({}), fv({ subscriberCount: 500000, score: 1 }), fv({ subscriberCount: 900000, score: 1 })];
  const m = computeMarketAnalytics(vids, "");
  // 소형 2/4 = 0.5 → 30, 소형 떡상 2/4=0.5×2=1 → 40 ⇒ 70
  assert.equal(m.opportunityScore, 70);
  assert.equal(m.opportunityLevel, "기회 높음");
  assert.equal(m.outlierCount, 2);
  const none = computeMarketAnalytics([fv({ subscriberCount: null })], "");
  assert.equal(none.opportunityLevel, "데이터 부족");
});

test("제목 키워드: 조사 제거·검색어와 합성어 제외·2회 이상만", () => {
  const vids = ["캠핑장비 추천", "캠핑장비를 고르는 법", "겨울캠핑 난로", "겨울 난로 리뷰"].map((title) => ({ title }));
  const kw = extractTitleKeywords(vids, "겨울");
  assert.deepEqual(kw.map((k) => k.word), ["난로", "캠핑장비"]);
  assert.equal(kw[0].percent, 50);
});

test("기간: 프리셋·직접 지정(한국 시간 날짜)·잘못된 범위", () => {
  assert.equal(calculatePublishedRange("3d", null, NOW).after, new Date(NOW - 3 * DAY).toISOString());
  assert.deepEqual(calculatePublishedRange("all", null, NOW), { after: null, before: null });
  const r = calculatePublishedRange("custom", { from: "2026-11-01", to: "2026-11-02" }, NOW);
  assert.equal(r.after, "2026-10-31T15:00:00.000Z");
  assert.equal(r.before, "2026-11-02T15:00:00.000Z");
  assert.throws(() => calculatePublishedRange("custom", { from: "2026-11-05", to: "2026-11-01" }, NOW), /올바르지/);
  assert.throws(() => calculatePublishedRange("custom", { from: "2026-02-30", to: "2026-03-01" }, NOW), /올바르지/);
});

test("변환·서식", () => {
  assert.equal(parseIsoDuration("PT1M5S"), 65);
  assert.equal(parseIsoDuration("P1DT1H"), 90000);
  assert.equal(parseIsoDuration("bad"), 0);
  assert.equal(formatMultiplier(3), "3배");
  assert.equal(formatMultiplier(123.4), "123배");
  assert.equal(formatNumber(125000), "12.5만");
  const m = mapVideoItem({ snippet: { title: "t", tags: ["a"] }, contentDetails: { duration: "PT30S" }, statistics: { viewCount: "10" } });
  assert.equal(m.durationSec, 30);
  assert.equal(m.viewCount, 10);
  assert.equal(m.likeCount, 0);
});

test("트렌드: 형식 비교·요일·소형 채널 결론 문장", () => {
  const mk = (i, o) => ({ id: `v${i}`, title: `제목 ${i}`, channelId: `c${i % 4}`, channelTitle: `채널${i % 4}`, subscriberCount: 5000, publishedAt: "2026-11-09T01:00:00Z", durationSec: 40, isShorts: true, viewCount: 20000, viewsPerDay: 100, likeRate: 2, commentRate: 0.1, score: 5, qualifies: true, tags: ["캠핑", "꿀팁"], ...o });
  const vids = [0, 1, 2, 3].map((i) => mk(i, {})).concat([4, 5, 6].map((i) => mk(i, { isShorts: false, durationSec: 600, score: 1 })));
  const t = computeTrends(vids, "all", NOW);
  assert.equal(t.totals.count, 7);
  assert.equal(t.totals.outlierCount, 4);
  assert.equal(t.formatSplit.shorts.outlierRate, 100);
  const keys = t.findings.map((f) => f.key);
  assert.ok(keys.includes("format"));
  assert.ok(keys.includes("small"));
  assert.ok(keys.includes("weekday")); // 2026-11-09 10시(KST) 월요일
  assert.match(t.findings.find((f) => f.key === "weekday").text, /^월요일/);
  assert.equal(t.topTags[0].count, 7);
  assert.deepEqual(computeTrends([], "all", NOW).findings, []);
});

test("사용량 날짜: 태평양 자정 기준, 다음 초기화 시각", () => {
  const now = new Date("2026-11-16T07:30:00Z"); // 태평양 표준시 11-15 23:30
  assert.equal(quotaDay(now), "2026-11-15");
  assert.equal(new Date(nextResetMs(now)).toISOString().slice(0, 16), "2026-11-16T08:00");
  assert.equal(remainingSearch({ search: 103, searchLimit: 100 }), 0);
});

const pv = (o) => ({ title: "영상", channelTitle: "채널", isShorts: true, durationFormatted: "0:40", subscriberCountFormatted: "5천", viewCount: 50000, viewCountFormatted: "5만", publishedAtRelative: "3일 전", score: 5, scoreFormatted: "5배", scoreBasis: "baseline", channelBaselineFormatted: "1만", subsRatio: 10, subsRatioFormatted: "10배", viewsPerDayFormatted: "1만", likeRate: 2, qualifies: true, tags: ["a"], ...o });

test("AI 기획안: 떡상 영상 우선 선택·프롬프트에 통계 포함·JSON 정리", () => {
  const vids = [pv({ score: 9 }), pv({ score: 1, qualifies: false, viewCount: 900000 }), pv({ isShorts: false, score: 4 })];
  const p = pickPromptVideos(vids, "all");
  assert.equal(p.supplemented, true);
  assert.equal(p.shortsCount, 2);
  const prompt = buildPlanPrompt("캠핑\u0001", vids, "shorts", { totals: { count: 3, outlierCount: 2, outlierRate: 67, medianViews: 50000, recent30Share: 100 }, formatSplit: { shorts: { count: 2, outlierRate: 50, medianScore: 5 }, long: { count: 1, outlierRate: 100, medianScore: 4 } }, findings: [{ text: "결론 하나" }], topTags: [{ tag: "캠핑" }] });
  assert.match(prompt, /검색 키워드: "캠핑 "/);
  assert.match(prompt, /결론 하나/);
  assert.match(prompt, /쇼츠 기획안 정확히 3개/);
  assert.doesNotMatch(prompt, /"format": "롱폼"/);
  const obj = extractJsonObject('설명\n```json\n{"summary":"요약","recommendations":[{"format":"Shorts","title":"제목","tags":["#태그"]},{"format":"롱폼","title":"긴 영상"}]}\n```');
  const rep = normalizeReport(obj, "shorts");
  assert.equal(rep.recommendations.length, 1);
  assert.equal(rep.recommendations[0].format, "쇼츠");
  assert.deepEqual(rep.recommendations[0].tags, ["태그"]);
  assert.equal(normalizeReport({ summary: "", recommendations: [] }), null);
  assert.equal(extractJsonObject("JSON 없음"), null);
});
