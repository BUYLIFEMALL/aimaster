// AI 문서 챗봇(v1.01) 단위 테스트 — 문서 조각, 웹 검색 판단 해석, 지시문, 출처, 파일 형식, Tavily 결과 해석
import test from "node:test";
import assert from "node:assert/strict";
import { chunkText, parseRouteDecision, buildRouterPrompt, buildSystemPrompt, buildSources, roomTitleFrom, fileKind, todayKst, CHUNK_SIZE, MAX_CHUNKS_PER_DOC, MIN_DOC_SIMILARITY } from "../src/lib/chat/core.ts";

test("문서 조각: 크기 제한·겹침·빈 글", () => {
  assert.deepEqual(chunkText("   \n\n "), []);
  assert.deepEqual(chunkText("짧은 글"), ["짧은 글"]);
  const long = Array.from({ length: 60 }, (_, i) => `${i}번째 문단입니다. 내용이 이어집니다.`).join("\n\n");
  const chunks = chunkText(long);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((c) => c.length <= CHUNK_SIZE));
  assert.ok(chunks[1].length > 0);
  const huge = "가".repeat(CHUNK_SIZE * (MAX_CHUNKS_PER_DOC + 50));
  assert.equal(chunkText(huge).length, MAX_CHUNKS_PER_DOC);
});

test("웹 검색 판단 해석: JSON만 믿고, 깨지면 검색 안 함", () => {
  const off = { topic: "general", timeRange: null };
  assert.deepEqual(parseRouteDecision('{"web": true, "query": "2026 AI 뉴스"}', "q"), { web: true, query: "2026 AI 뉴스", ...off });
  assert.deepEqual(parseRouteDecision('설명... {"web": false} 끝', "원래 질문"), { web: false, query: "원래 질문", ...off });
  assert.deepEqual(parseRouteDecision("모르겠어요", "q"), { web: false, query: "q", ...off });
  assert.deepEqual(parseRouteDecision('{"web": "yes"}', "q"), { web: false, query: "q", ...off });
  assert.match(buildRouterPrompt("오늘 날씨", "2026-10-19(월)"), /오늘은 2026-10-19\(월\)/);
});

test("웹 검색 판단: 뉴스·기간 조건 해석(L8), 이상한 값은 버림", () => {
  assert.deepEqual(parseRouteDecision('{"web": true, "query": "AI 뉴스", "topic": "news", "time_range": "week"}', "q"), { web: true, query: "AI 뉴스", topic: "news", timeRange: "week" });
  assert.deepEqual(parseRouteDecision('{"web": true, "query": "x", "topic": "sports", "time_range": "decade"}', "q"), { web: true, query: "x", topic: "general", timeRange: null });
});

test("웹 검색 판단 지시문: 찾은 문서 내용을 보여 주어 문서로 답할 수 있으면 검색 생략(L9)", () => {
  const p = buildRouterPrompt("국내 출장 일비는?", "2026-10-19(월)", [{ document_name: "규정.txt", content: "국내 출장 일비는\n하루 4만 5천 원", similarity: 0.6 }]);
  assert.match(p, /규정\.txt\) 국내 출장 일비는 하루 4만 5천 원/);
  assert.match(p, /web=false/);
  assert.doesNotMatch(buildRouterPrompt("q", "2026-10-19(월)"), /사용자가 올린 문서/);
});

test("오늘 날짜: 한국 시간 기준(L8)", () => {
  assert.equal(todayKst(new Date("2026-10-19T14:59:00Z")), "2026-10-19(월)");
  assert.equal(todayKst(new Date("2026-10-19T15:00:00Z")), "2026-10-20(화)");
});

test("문서 관련도 기준은 0.3보다 높게(L10)", () => {
  assert.ok(MIN_DOC_SIMILARITY > 0.3);
});

test("답변 지시문: 오늘 날짜·당해 연도·문서·웹 근거·발행일 포함", () => {
  const p = buildSystemPrompt("2026-10-19(월)", [{ document_name: "회사소개.pdf", content: "우리는 교육 회사", similarity: 0.8 }], [{ title: "뉴스", url: "https://ex.com", content: "최신", published: "2026-10-18" }]);
  assert.match(p, /오늘은 2026-10-19\(월\)/);
  assert.match(p, /현재 연도는 2026년/);
  assert.match(p, /회사소개\.pdf/);
  assert.match(p, /https:\/\/ex\.com — 발행일 2026-10-18/);
  assert.match(p, /해당 기간의 소식을 찾지 못했습니다/);
  assert.doesNotMatch(buildSystemPrompt("2026-10-19(월)", [], []), /자료에서 찾지 못했습니다/);
});

test("출처: 같은 문서·같은 주소는 한 번만", () => {
  const s = buildSources(
    [{ document_name: "a.pdf", content: "1", similarity: 0.9 }, { document_name: "a.pdf", content: "2", similarity: 0.8 }],
    [{ title: "x", url: "https://x" }, { title: "x2", url: "https://x" }]
  );
  assert.deepEqual(s, [{ type: "doc", title: "a.pdf", score: 0.9 }, { type: "web", title: "x", url: "https://x" }]);
});

test("채팅방 제목·파일 형식", () => {
  assert.equal(roomTitleFrom("  안녕\n하세요  "), "안녕 하세요");
  assert.equal(roomTitleFrom("가".repeat(40)).length, 31);
  assert.equal(fileKind("a.MD"), "text");
  assert.equal(fileKind("보고서.pdf"), "parse");
  assert.equal(fileKind("x.exe"), null);
});

import { parseMcpSearchText } from "../src/lib/chat/core.ts";
test("Tavily MCP 결과 해석: 글 형식·JSON 형식", () => {
  const text = "Title: 첫 기사\nURL: https://a.com/1\nContent: 내용 하나\n\nTitle: 둘째\nURL: https://b.com\nContent: 내용 둘";
  const r = parseMcpSearchText(text);
  assert.equal(r.length, 2);
  assert.deepEqual(r[0], { title: "첫 기사", url: "https://a.com/1", content: "내용 하나" });
  const j = parseMcpSearchText(JSON.stringify({ results: [{ title: "t", url: "https://c.com", content: "c" }] }));
  assert.equal(j[0].url, "https://c.com");
  assert.deepEqual(parseMcpSearchText("결과 없음"), []);
  // 뉴스 검색의 발행일(L8)
  const n = parseMcpSearchText("Title: 뉴스\nURL: https://n.com\nContent: 본문\nPublished Date: 2026-10-18");
  assert.deepEqual(n[0], { title: "뉴스", url: "https://n.com", content: "본문", published: "2026-10-18" });
  const nj = parseMcpSearchText(JSON.stringify({ results: [{ title: "t", url: "https://d.com", content: "c", published_date: "2026-10-17" }] }));
  assert.equal(nj[0].published, "2026-10-17");
});
