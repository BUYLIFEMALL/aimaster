// 협업 크리에이터 찾기(A4) — 가짜 YouTube 응답으로 검색 → 연락처 붙이기·거르기·할당량 확인. 2026-11-10
import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// 앱 코드는 Next 방식(확장자 없는 상대 경로)이라, 시험에서만 `./x` → `./x.ts`로 찾게 한다
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
const { findCreators, normalizeCreatorParams } = await import("../src/lib/youtube/creatorFinder.ts");

const ch = (id, subs, desc) => ({ id, snippet: { title: `채널${id}`, customUrl: `@${id}`, description: desc, thumbnails: { default: { url: "t" } }, publishedAt: "" }, statistics: { subscriberCount: String(subs), viewCount: "1000000", videoCount: "100" } });
const vid = (id, channelId, views, desc) => ({ id, snippet: { channelId, title: `영상${id}`, description: desc, thumbnails: {} }, statistics: { viewCount: String(views) } });

function fakeCall(calls) {
  return async (endpoint, query, units) => {
    calls.push({ endpoint, units });
    if (endpoint === "search") return { items: ["v1", "v2", "v3", "v4"].map((v) => ({ id: { videoId: v } })) };
    if (endpoint === "videos") return { items: [vid("v1", "A", 500, "협찬 a@ch.com"), vid("v2", "B", 400, "그냥 영상"), vid("v3", "C", 300, ""), vid("v4", "D", 200, "인스타 @dee_d")] };
    if (endpoint === "channels") return { items: [ch("A", 5000, "캠핑 채널 📞 010-1234-5678"), ch("B", 8000, "연락처 없음"), ch("C", 300, "biz@c.com"), ch("D", 20000, "")] };
    return { items: [] };
  };
}

test("입력 정리: 기본값·하한·상한 확인", () => {
  const p = normalizeCreatorParams({ keyword: "캠핑", minSubscribers: 1000, contactOnly: true });
  assert.equal(p.maxSubscribers, 100000);
  assert.equal(p.minAverageViews, 0);
  assert.equal(p.minSubscribers, 1000);
  assert.equal(p.contactOnly, true);
  assert.ok("error" in normalizeCreatorParams({ keyword: "캠핑", minSubscribers: 50000, maxSubscribers: 10000 }));
  assert.ok("error" in normalizeCreatorParams({ keyword: "" }));
  assert.equal(normalizeCreatorParams({ keyword: "a", contactOnly: "yes" }).contactOnly, false);
});

test("연락처: 채널 설명 + 영상 설명, 할당량은 엔진과 같음(추가 호출 없음)", async () => {
  const calls = [];
  const p = normalizeCreatorParams({ keyword: "캠핑" });
  const r = await findCreators(p, fakeCall(calls));
  assert.deepEqual(calls.map((c) => c.endpoint), ["search", "videos", "channels"]);
  assert.equal(r.quotaUsed, 102);
  const a = r.items.find((i) => i.id === "A");
  assert.deepEqual(a.contacts.emails, [{ value: "a@ch.com", source: "video", videoTitle: "영상v1" }]);
  assert.deepEqual(a.contacts.phones, [{ value: "010-1234-5678", source: "channel" }]);
  const d = r.items.find((i) => i.id === "D");
  assert.deepEqual(d.contacts.socials.map((s) => s.value), ["@dee_d"]);
});

test("거르기: 구독자 하한·연락처 있는 채널만·연락처 많은 순", async () => {
  const p = normalizeCreatorParams({ keyword: "캠핑", minSubscribers: 1000, contactOnly: true });
  const r = await findCreators(p, fakeCall([]));
  // C(300명)는 하한으로, B는 연락처 없음으로 빠짐
  assert.deepEqual(r.items.map((i) => i.id), ["A", "D"]);
  assert.equal(r.withoutContactExcluded, 1);
});
