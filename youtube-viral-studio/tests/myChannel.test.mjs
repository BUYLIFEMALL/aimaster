// V6 내 채널 진짜 지표(v1.27) — 분석 API 응답 정리·기간·힌트 시험(네트워크 없음). 2026-11-11
import test from "node:test";
import assert from "node:assert/strict";
import { pickPeriod, dateRange, toRecords, toSummary, toDaily, toTopVideos, toTraffic, toDemographics, toCountries, toContentTypes, buildHints, MY_CHANNEL_NEED_SCOPES, MY_CHANNEL_CONNECT_SCOPES } from "../src/lib/youtube/analytics.ts";

const table = (names, rows) => ({ columnHeaders: names.map((name) => ({ name })), rows });

test("기간: 7·28·90만, 그 밖은 28 / 한국 날짜 기준 N일", () => {
  assert.equal(pickPeriod("7"), 7);
  assert.equal(pickPeriod(90), 90);
  assert.equal(pickPeriod("30"), 28);
  assert.equal(pickPeriod(undefined), 28);
  // UTC 2026-11-10 20:00 = 한국 11-11 05:00
  assert.deepEqual(dateRange(7, new Date("2026-11-10T20:00:00Z")), { startDate: "2026-11-05", endDate: "2026-11-11" });
});

test("열 이름으로 행 읽기(순서 무관) · rows 없으면 빈 배열", () => {
  assert.deepEqual(toRecords(table(["views", "day"], [[5, "2026-11-01"]])), [{ views: 5, day: "2026-11-01" }]);
  assert.deepEqual(toRecords({ columnHeaders: [{ name: "views" }] }), []);
  assert.deepEqual(toRecords(null), []);
});

test("요약: 시청 시간은 시간 단위, 구독 순증 = 얻음 − 잃음", () => {
  const s = toSummary(table(["views", "estimatedMinutesWatched", "averageViewDuration", "averageViewPercentage", "subscribersGained", "subscribersLost", "likes", "comments", "shares"], [[1000, 1500, 95.4, 41.26, 12, 3, 40, 5, 2]]));
  assert.equal(s.watchHours, 25);
  assert.equal(s.avgViewSeconds, 95);
  assert.equal(s.avgViewPercent, 41.3);
  assert.equal(s.subscribersNet, 9);
  assert.equal(toSummary(null).views, 0);
});

test("날짜별: 날짜순 정렬·형식 아닌 값 버림", () => {
  const d = toDaily(table(["day", "views", "estimatedMinutesWatched", "subscribersGained", "subscribersLost"], [["2026-11-02", 5, 60, 1, 0], ["2026-11-01", 3, 30, 0, 1], ["bad", 1, 1, 0, 0]]));
  assert.deepEqual(d.map((x) => x.day), ["2026-11-01", "2026-11-02"]);
  assert.equal(d[0].subscribersNet, -1);
});

test("잘 된 영상·유입·국가·유형 비율", () => {
  assert.equal(toTopVideos(table(["video", "views", "estimatedMinutesWatched", "averageViewPercentage"], [["dQw4w9WgXcQ", 10, 60, 22.2], ["<script>", 1, 1, 1]])).length, 1);
  const t = toTraffic(table(["insightTrafficSourceType", "views"], [["YT_SEARCH", 30], ["RELATED_VIDEO", 70], ["EXT_URL", 0]]));
  assert.deepEqual(t.map((x) => [x.label, x.percent]), [["추천 영상", 70], ["유튜브 검색", 30]]);
  assert.equal(toCountries(table(["country", "views"], [["KR", 9], ["ZZ", 1]]))[1].label, "알 수 없음");
  const c = toContentTypes(table(["day", "creatorContentType", "views"], [["2026-11-01", "SHORTS", 8], ["2026-11-02", "SHORTS", 1], ["2026-11-01", "VIDEO_ON_DEMAND", 1]]));
  assert.deepEqual(c.map((x) => [x.label, x.percent]), [["쇼츠", 90], ["일반 영상", 10]]);
  // 실제 응답은 shorts·videoOnDemand(소문자 낙타 표기)
  const c2 = toContentTypes(table(["day", "creatorContentType", "views"], [["2026-11-01", "videoOnDemand", 781], ["2026-11-01", "shorts", 50]]));
  assert.deepEqual(c2.map((x) => [x.key, x.label]), [["VIDEO_ON_DEMAND", "일반 영상"], ["SHORTS", "쇼츠"]]);
});

test("시청자: 나이는 나이 순, 성별 합계", () => {
  const d = toDemographics(table(["ageGroup", "gender", "viewerPercentage"], [["age25-34", "male", 30], ["age18-24", "female", 20], ["age25-34", "female", 50]]));
  assert.deepEqual(d.ages.map((x) => [x.label, x.value]), [["18~24세", 20], ["25~34세", 80]]);
  assert.deepEqual(d.genders.map((x) => [x.label, x.value]), [["여성", 70], ["남성", 30]]);
});

test("힌트: 조회 0이면 안내 한 줄, 낮은 시청 비율·구독 감소 신호", () => {
  const zero = buildHints({ summary: toSummary(null), top: [], traffic: [], contentTypes: [], days: 28 });
  assert.equal(zero.length, 1);
  const s = { ...toSummary(null), views: 1000, likes: 5, subscribersGained: 1, subscribersLost: 4, subscribersNet: -3 };
  const h = buildHints({ summary: s, top: [{ videoId: "abcdefg", views: 1, watchHours: 0, avgViewPercent: 20 }], traffic: [], contentTypes: [], days: 28 });
  assert.ok(h.some((x) => x.includes("30% 미만")));
  assert.ok(h.some((x) => x.includes("구독 취소")));
  assert.ok(h.some((x) => x.includes("좋아요 비율")));
  assert.ok(h.length <= 5);
});

test("권한: 분석·읽기 필수, 연결 때 댓글·업로드 권한도 함께(공용 연결 재사용)", () => {
  assert.ok(MY_CHANNEL_NEED_SCOPES.includes("https://www.googleapis.com/auth/yt-analytics.readonly"));
  for (const s of MY_CHANNEL_NEED_SCOPES) assert.ok(MY_CHANNEL_CONNECT_SCOPES.includes(s));
  assert.ok(MY_CHANNEL_CONNECT_SCOPES.includes("https://www.googleapis.com/auth/youtube.force-ssl"));
});
