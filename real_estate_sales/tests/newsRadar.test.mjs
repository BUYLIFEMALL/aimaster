import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNewsMessage, buildQueries, interleaveByRegion, isNewsDue, kstDateHour, mentionsRegion, normalizeLink, pickCandidates, regionTerms } from "../src/lib/news/radarCore.ts";

test("RQ-C 지역 이름: 시+구, 서울 구, 흔한 구 이름", () => {
  assert.deepEqual(regionTerms("41285", "고양시 일산동구"), { query: "고양시 일산동구", anyOf: ["일산동구", "고양"], alsoNeed: null });
  assert.deepEqual(regionTerms("11500", "강서구"), { query: "서울 강서구", anyOf: ["강서구"], alsoNeed: null });
  assert.deepEqual(regionTerms("26110", "중구"), { query: "부산 중구", anyOf: ["중구"], alsoNeed: "부산" });
  assert.equal(regionTerms("36110", "세종시").query, "세종시");
  assert.deepEqual(regionTerms("12110", "목포시").anyOf, ["목포시", "목포"]);
});

test("RQ-C 검색어: 지역 하나에 4분류 × 2 = 8개", () => {
  const q = buildQueries("11500", "강서구");
  assert.equal(q.length, 8);
  assert.equal(q[0].query, "서울 강서구 재개발");
  assert.deepEqual([...new Set(q.map((x) => x.category))], ["개발", "교통", "학교", "규제"]);
});

test("RQ-C 지역 거르기: 사전 검증에서 본 다른 지역 기사는 뺀다", () => {
  const t = regionTerms("11500", "강서구");
  assert.equal(mentionsRegion("IPARK현산, 고양 능곡3구역 재개발 수주", t), false);
  assert.equal(mentionsRegion("서울 강서구 방화동 재건축 조합 설립", t), true);
  const jung = regionTerms("26110", "중구");
  assert.equal(mentionsRegion("서울 중구 재개발", jung), false, "흔한 이름은 시·도 이름도 있어야");
  assert.equal(mentionsRegion("부산 중구 원도심 재개발", jung), true);
});

test("RQ-C 링크 정규화: 추적 꼬리·끝 슬래시·대문자 호스트", () => {
  assert.equal(normalizeLink("https://News.Example.com/a/1/?utm_source=x&id=3#top"), "https://news.example.com/a/1/?id=3");
  assert.equal(normalizeLink("https://news.example.com/a/1/"), "https://news.example.com/a/1");
});

test("RQ-C 후보: 같은 링크·같은 제목·오래된 기사·웹 주소 아닌 것 제외, 먼저 나온 분류 유지", () => {
  const now = new Date("2026-11-09T00:00:00Z");
  const t = regionTerms("11500", "강서구");
  const recent = "Sun, 08 Nov 2026 10:00:00 +0900";
  const out = pickCandidates(
    [
      { category: "개발", items: [
        { title: "강서구 재건축 속도", link: "https://n.news.naver.com/1", originallink: "https://a.com/1?utm_medium=x", description: "", pubDate: recent },
        { title: "[단독] 강서구 재건축 속도", link: "https://b.com/2", description: "", pubDate: recent },
        { title: "강서구 옛 기사", link: "https://c.com/3", description: "", pubDate: "Mon, 01 Nov 2026 10:00:00 +0900" },
        { title: "강서구 이상한 주소", link: "javascript:alert(1)", description: "", pubDate: recent },
      ] },
      { category: "교통", items: [{ title: "강서구 지하철 연장", link: "https://a.com/1", description: "", pubDate: recent }] },
    ],
    t,
    now,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].category, "개발");
  assert.equal(out[0].link, "https://a.com/1");
  assert.equal(out[0].source, "a.com");
});

test("RQ-C 아침 8시 이후 하루 1번", () => {
  assert.deepEqual(kstDateHour(new Date("2026-11-08T23:30:00Z")), { date: "2026-11-09", hour: 8 });
  assert.equal(isNewsDue(null, new Date("2026-11-08T22:59:00Z")), false, "한국 7시 59분");
  assert.equal(isNewsDue(null, new Date("2026-11-08T23:00:00Z")), true, "한국 8시");
  assert.equal(isNewsDue("2026-11-09", new Date("2026-11-09T03:00:00Z")), false, "오늘 이미 보냄");
  assert.equal(isNewsDue("2026-11-08", new Date("2026-11-09T03:00:00Z")), true);
});

test("RQ-C 알림 글: 건수·출처·알림톡 길이", () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ sggNm: "강서구", category: i % 2 ? "교통" : "개발", title: `제목 ${i} `.repeat(15), link: `https://a.com/${i}` }));
  const tg = buildNewsMessage(items, { withLinks: true, pageUrl: "https://x/news" });
  assert.match(tg, /오늘의 지역 소식 10건/);
  assert.match(tg, /개발 5 · 교통 5/);
  assert.match(tg, /…외 2건/);
  assert.match(tg, /출처: 각 언론사, 네이버 검색/);
  const at = buildNewsMessage(items, { withLinks: false, pageUrl: "https://x/news", aiSummary: "- 요약" });
  assert.ok(at.length <= 950);
  assert.doesNotMatch(at, /https:\/\/a\.com/);
});

test("RQ-C 알림은 지역을 번갈아(서초구 몰림 방지)", () => {
  const items = [
    ...Array.from({ length: 5 }, (_, i) => ({ sggNm: "서초구", category: "개발", title: `서초 ${i}`, link: `https://a.com/s${i}` })),
    { sggNm: "종로구", category: "교통", title: "종로 0", link: "https://a.com/j0" },
    { sggNm: "동탄구", category: "규제", title: "동탄 0", link: "https://a.com/d0" },
  ];
  assert.deepEqual(interleaveByRegion(items).map((i) => i.title), ["서초 0", "종로 0", "동탄 0", "서초 1", "서초 2", "서초 3", "서초 4"]);
  const msg = buildNewsMessage(items, { withLinks: false, pageUrl: "https://x/news" });
  assert.match(msg, /종로 0/);
  assert.match(msg, /동탄 0/);
});
