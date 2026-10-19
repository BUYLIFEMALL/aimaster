// AI 문서 챗봇(v1.01) 단위 테스트 — 문서 조각, 웹 검색 판단 해석, 지시문, 출처, 파일 형식, Tavily 결과 해석
import test from "node:test";
import assert from "node:assert/strict";
import { chunkText, parseRouteDecision, buildRouterPrompt, buildSystemPrompt, buildSources, roomTitleFrom, fileKind, CHUNK_SIZE, MAX_CHUNKS_PER_DOC } from "../src/lib/chat/core.ts";

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
  assert.deepEqual(parseRouteDecision('{"web": true, "query": "2026 AI 뉴스"}', "q"), { web: true, query: "2026 AI 뉴스" });
  assert.deepEqual(parseRouteDecision('설명... {"web": false} 끝', "원래 질문"), { web: false, query: "원래 질문" });
  assert.deepEqual(parseRouteDecision("모르겠어요", "q"), { web: false, query: "q" });
  assert.deepEqual(parseRouteDecision('{"web": "yes"}', "q"), { web: false, query: "q" });
  assert.match(buildRouterPrompt("오늘 날씨", 2026), /2026년/);
});

test("답변 지시문: 당해 연도·문서·웹 근거 포함", () => {
  const p = buildSystemPrompt(2026, [{ document_name: "회사소개.pdf", content: "우리는 교육 회사", similarity: 0.8 }], [{ title: "뉴스", url: "https://ex.com", content: "최신" }]);
  assert.match(p, /현재 연도는 2026년/);
  assert.match(p, /회사소개\.pdf/);
  assert.match(p, /https:\/\/ex\.com/);
  assert.doesNotMatch(buildSystemPrompt(2026, [], []), /자료에서 찾지 못했습니다/);
});

test("출처: 같은 문서·같은 주소는 한 번만", () => {
  const s = buildSources(
    [{ document_name: "a.pdf", content: "1", similarity: 0.9 }, { document_name: "a.pdf", content: "2", similarity: 0.8 }],
    [{ title: "x", url: "https://x" }, { title: "x2", url: "https://x" }]
  );
  assert.deepEqual(s, [{ type: "doc", title: "a.pdf" }, { type: "web", title: "x", url: "https://x" }]);
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
});
