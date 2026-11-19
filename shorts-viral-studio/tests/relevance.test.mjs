// 쇼츠 검색 관련성·언어·종교 거르기 연결 시험 — 2026-11-20 영상 담당(MOV-SVS-RELEVANCE-FILTER-INTEGRATION).
// 가짜 YouTube 호출로 searchShorts의 순수 본체(runShortsSearch)를 돌려 거르기·제외 수·호출 수·빈 결과를 확인. 네트워크 없음.
// 실행: node --test tests/relevance.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// 앱 코드는 Next 방식(확장자 없는 상대 경로)이라 시험에서만 `./x` → `./x.ts`로 찾게 한다(YVS creatorFinder 시험과 같은 방식)
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (err) {
      if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context);
      throw err;
    }
  },
});
const { runShortsSearch, filterShortsItems, describeExcluded, excludedTotal, emptyResultMessage, RELIGION_TOGGLE_NOTE } = await import("../src/lib/youtube/shortsSearch.ts");

const NOW = new Date("2026-11-20T00:00:00Z");
const vid = (id, title, extra = {}) => ({
  id,
  snippet: { title, channelId: `c${id}`, channelTitle: extra.channelTitle ?? "캠핑채널", publishedAt: "2026-11-10T00:00:00Z", description: extra.description ?? "", tags: extra.tags ?? [], defaultAudioLanguage: extra.lang },
  statistics: { viewCount: "10000", likeCount: "100", commentCount: "10" },
  contentDetails: { duration: "PT30S" },
});

// 10개: 정상 7 + 도배 1 + 외국어 1 + 종교 1
const ITEMS = [
  ...["겨울 캠핑 준비물", "캠핑 요리 꿀팁", "차박 캠핑 브이로그", "캠핑 의자 추천", "캠핑장 추천 5곳", "솔로 캠핑 첫날", "캠핑 텐트 치는 법"].map((t, i) => vid(`ok${i}`, t)),
  vid("spam", "#캠핑 #캠핑용품 #차박 #노지 #감성캠핑"),
  vid("en", "Best camping hacks", { channelTitle: "Camper", description: "camping tips" }),
  vid("rel", "캠핑장에서 부르는 찬양 예배", { channelTitle: "은혜캠핑" }),
];

function fakeCall(items) {
  const calls = [];
  const call = async (path, params) => {
    calls.push({ path, params });
    if (path === "search") return { items: items.map((v) => ({ id: { videoId: v.id } })) };
    if (path === "videos") return { items };
    if (path === "channels") {
      return { items: params.id.split(",").map((id) => ({ id, statistics: { subscriberCount: "1000", viewCount: "100000", videoCount: "10" } })) };
    }
    throw new Error(`unexpected ${path}`);
  };
  return { call, calls };
}

const PARAMS = { query: "캠핑", order: "viewCount" };

test("10개 중 도배·외국어·종교 1개씩 빠지고 7개 남음, 사유별 제외 수", async () => {
  const { call } = fakeCall(ITEMS);
  const r = await runShortsSearch(PARAMS, call, NOW);
  assert.equal(r.videos.length, 7);
  assert.deepEqual(r.excluded, { spam: 1, language: 1, offtopic: 0, religion: 1 });
  assert.ok(r.videos.every((v) => v.id.startsWith("ok")));
  assert.equal(describeExcluded(r.excluded), "제외 3건(해시태그 도배 1 · 다른 언어 1 · 종교 1)");
});

test("호출 수 그대로: search 1 · videos 1 · channels 1, 채널 조회는 남은 영상의 채널만", async () => {
  const { call, calls } = fakeCall(ITEMS);
  await runShortsSearch(PARAMS, call, NOW);
  assert.deepEqual(calls.map((c) => c.path), ["search", "videos", "channels"]);
  // 검색 조건은 거르기 전과 같다
  assert.deepEqual(calls[0].params, { part: "snippet", type: "video", q: "캠핑", maxResults: "50", order: "viewCount", videoDuration: "short", regionCode: "KR", relevanceLanguage: "ko" });
  assert.equal(calls[1].params.part, "snippet,statistics,contentDetails");
  assert.equal(calls[2].params.id.split(",").length, 7);
});

test("종교 토글: includeReligion이면 종교 영상 남김", async () => {
  const { call } = fakeCall(ITEMS);
  const r = await runShortsSearch({ ...PARAMS, includeReligion: true }, call, NOW);
  assert.equal(r.videos.length, 8);
  assert.equal(r.excluded.religion, 0);
});

test("검색어가 종교 단어면 토글을 꺼 둬도 종교 영상 남김", () => {
  const r = filterShortsItems([vid("rel", "찬양 예배 모음", { channelTitle: "은혜" })], "찬양", false);
  assert.equal(r.kept.length, 1);
  assert.equal(r.excluded.religion, 0);
});

test("모두 걸러지면 빈 목록 + 제외 수, 채널 조회 0회(오류 아님)", async () => {
  const { call, calls } = fakeCall([ITEMS[7], ITEMS[8]]);
  const r = await runShortsSearch(PARAMS, call, NOW);
  assert.equal(r.videos.length, 0);
  assert.equal(excludedTotal(r.excluded), 2);
  assert.deepEqual(calls.map((c) => c.path), ["search", "videos"]);
});

test("검색 결과가 0개면 제외 0, videos·channels 호출 없음", async () => {
  const { call, calls } = fakeCall([]);
  const r = await runShortsSearch(PARAMS, call, NOW);
  assert.deepEqual(r, { videos: [], excluded: { spam: 0, language: 0, offtopic: 0, religion: 0 } });
  assert.deepEqual(calls.map((c) => c.path), ["search"]);
  assert.equal(describeExcluded(r.excluded), "");
});

test("빈 결과 안내: 종교 제외가 있을 때만 토글 조언, 제외 0이면 일반 안내 한 가지", () => {
  assert.equal(emptyResultMessage({ spam: 1, language: 0, offtopic: 0, religion: 1 }),
    "조건에 맞는 쇼츠가 없습니다 — 제외 2건(해시태그 도배 1 · 종교 1). 「종교 영상 제외」를 끄고 다시 검색하면 종교 영상도 볼 수 있습니다(검색 할당량 사용).");
  const noReligion = emptyResultMessage({ spam: 2, language: 1, offtopic: 0, religion: 0 });
  assert.equal(noReligion, "조건에 맞는 쇼츠가 없습니다 — 제외 3건(해시태그 도배 2 · 다른 언어 1). 검색어나 기간을 바꿔 보세요.");
  assert.ok(!noReligion.includes("종교 영상 제외"));
  assert.equal(emptyResultMessage({ spam: 0, language: 0, offtopic: 0, religion: 0 }), "검색 결과가 없습니다. 검색어나 기간을 바꿔 보세요.");
  assert.equal(emptyResultMessage(null), "검색 결과가 없습니다. 검색어나 기간을 바꿔 보세요.");
});

test("토글 안내는 다음 검색부터 적용·할당량 사용을 밝힌다", () => {
  assert.match(RELIGION_TOGGLE_NOTE, /다음 검색부터 적용/);
  assert.match(RELIGION_TOGGLE_NOTE, /할당량/);
});
