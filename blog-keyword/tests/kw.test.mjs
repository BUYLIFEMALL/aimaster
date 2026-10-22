import test from "node:test";
import assert from "node:assert/strict";
import {
  todayKst, yearGuard, fillTemplate, cleanKeyword, stripHtml, stripCitations, parseJsonLoose,
  num, str, strArr, autocompleteQueries, mergeSuggestions, frequentWords, trendDelta,
} from "../src/lib/kw/util.ts";
import { LIBRARY } from "../src/lib/kw/library.ts";
import { toMarkdown, toCsv } from "../src/lib/kw/export.ts";
import { topicsPrompt, competitionPrompt, recommendPrompt } from "../src/lib/kw/prompts.ts";
import { FEATURE_INFO, isFeature } from "../src/lib/kw/types.ts";

test("한국 시간 기준 날짜와 연도 지침", () => {
  const t = todayKst(new Date("2026-12-31T16:00:00Z")); // 한국은 2027-01-01 01:00
  assert.equal(t.year, 2027);
  assert.equal(t.ymd, "2027-01-01");
  assert.match(yearGuard(new Date("2026-10-14T00:00:00Z")), /2026년/);
  assert.match(yearGuard(new Date("2026-10-14T00:00:00Z")), /과거 연도/);
});

test("모든 프롬프트에 당해 연도가 주입된다", () => {
  const now = new Date("2026-10-14T00:00:00Z");
  for (const p of [topicsPrompt("main", "캠핑", [], now), competitionPrompt("캠핑", {}, now), recommendPrompt(now)]) {
    assert.match(p.system, /2026년/);
  }
});

test("템플릿 치환: 연도·키워드", () => {
  const now = new Date("2026-10-14T00:00:00Z");
  assert.equal(fillTemplate("{YYYY}년 {keyword} → {YYYY+1}", { keyword: "캠핑" }, now), "2026년 캠핑 → 2027");
});

test("키워드 정리", () => {
  assert.equal(cleanKeyword("  캠핑 \n  의자\t"), "캠핑 의자");
  assert.equal(cleanKeyword("a".repeat(100)).length, 60);
});

test("HTML·인용 제거", () => {
  assert.equal(stripHtml("<b>캠핑</b> &amp; 의자 &quot;추천&quot;"), '캠핑 & 의자 "추천"');
  assert.equal(stripCitations("좋은 글입니다 [1] 그리고 [2, 3] 끝"), "좋은 글입니다 그리고 끝");
});

test("느슨한 JSON 추출", () => {
  assert.deepEqual(parseJsonLoose('설명\n```json\n{"a":1,"b":{"c":"}"}}\n```\n끝'), { a: 1, b: { c: "}" } });
  assert.equal(parseJsonLoose("JSON 없음"), null);
  assert.equal(parseJsonLoose('{"a":'), null);
});

test("값 정규화", () => {
  assert.equal(num("85점"), 85);
  assert.equal(num(150), 100);
  assert.equal(num("abc", 0, 100, -1), -1);
  assert.equal(str(12), "12");
  assert.deepEqual(strArr(["a", "", 3, null]), ["a", "3"]);
});

test("자동완성: 자음 확장과 병합", () => {
  const q = autocompleteQueries("캠핑");
  assert.equal(q.length, 15);
  assert.equal(q[0], "캠핑");
  const merged = mergeSuggestions("캠핑 의자", [["캠핑의자", "캠핑 의자 추천"], ["캠핑 의자 추천", "캠핑 의자 접이식", ""]]);
  assert.deepEqual(merged, ["캠핑 의자 추천", "캠핑 의자 접이식"]);
  assert.equal(mergeSuggestions("a", [Array.from({ length: 50 }, (_, i) => `k${i}`)]).length, 20);
});

test("빈출어 계산", () => {
  const titles = ["제주 여행 코스 추천", "제주 맛집 여행 후기", "서울 근교 여행 추천", "부산 여행 코스"];
  const f = frequentWords(titles, ["여행"]);
  assert.ok(f.find((x) => x.word === "제주" && x.count === 2));
  assert.ok(!f.find((x) => x.word === "여행"), "분야명은 제외");
  assert.ok(!f.find((x) => x.word === "추천"), "불용어는 제외");
});

test("검색 추이 변화율", () => {
  const up = [1, 1, 1, 1, 2, 2, 2, 2].map((ratio) => ({ ratio }));
  assert.equal(trendDelta(up), 100);
  assert.equal(trendDelta([{ ratio: 1 }]), null);
});

test("프롬프트 라이브러리: 50개, 3분류, 중복 없음", () => {
  assert.equal(LIBRARY.length, 50);
  assert.equal(new Set(LIBRARY.map((p) => p.id)).size, 50);
  const by = (c) => LIBRARY.filter((p) => p.category === c).length;
  assert.deepEqual([by("research"), by("topics"), by("target")], [15, 20, 15]);
  assert.ok(LIBRARY.every((p) => p.text.includes("{keyword}")));
});

test("기능 목록", () => {
  assert.equal(FEATURE_INFO.length, 9);
  assert.ok(isFeature("trend"));
  assert.ok(!isFeature("nope"));
  assert.equal(FEATURE_INFO.filter((f) => f.needsNaver).length, 3);
});

test("내보내기: Markdown·CSV(수식 주입 방어)", () => {
  const result = {
    kind: "blogs", keyword: "캠핑",
    posts: [{ title: "글1", link: "https://x", description: "", blogger: "b", postdate: "20261001" }],
    analysis: { structure: "구조", characteristics: "특징", commonKeywords: ["가", "나"] },
    suggestions: [{ title: "=HYPERLINK(1)", thumbnailCopy: "문구, 쉼표", strategy: '따옴표 "x"' }],
    real: { blogDocTotal: 12345 },
  };
  const md = toMarkdown(result);
  assert.match(md, /# 상위 블로그 분석 — 캠핑/);
  assert.match(md, /12,345건/);
  const csv = toCsv(result);
  assert.ok(csv.startsWith("﻿"));
  assert.match(csv, /'=HYPERLINK\(1\)/);
  assert.match(csv, /"문구, 쉼표"/);
  assert.match(csv, /"따옴표 ""x"""/);
  assert.equal(toCsv({ kind: "prompt", keyword: "k", promptId: "r01", promptTitle: "t", markdown: "m", sources: [] }), null);
});

test("SEO 스튜디오로 보내기 주소에는 기록 번호만 싣는다", async () => {
  const { seoHandoffUrl } = await import("../src/lib/kw/links.ts");
  assert.equal(seoHandoffUrl("AAAAAAAA-1111-2222-3333-444444444444"), "https://naver-blog-seo-studio.buylife.xyz/dashboard#title&keyword-report=aaaaaaaa-1111-2222-3333-444444444444");
  assert.equal(seoHandoffUrl(null), null);
  assert.equal(seoHandoffUrl("캠핑 의자"), null);
  assert.equal(seoHandoffUrl("1; drop"), null);
});
