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
  assert.deepEqual(s, [{ type: "doc", title: "a.pdf", score: 0.9, snippet: "1" }, { type: "web", title: "x", url: "https://x" }]);
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

import { pickDocHits, isDuplicateDoc } from "../src/lib/chat/core.ts";
test("근거 조각 고르기: 보통은 관련도 기준, 「이 문서만」은 그 문서만 기준 없이(U4)", () => {
  const hits = [
    { document_id: "a", document_name: "a.pdf", content: "1", similarity: 0.7 },
    { document_id: "b", document_name: "b.pdf", content: "2", similarity: 0.2 },
    { document_id: "b", document_name: "b.pdf", content: "3", similarity: 0.1 },
  ];
  assert.deepEqual(pickDocHits(hits, null).map((h) => h.content), ["1"]);
  assert.deepEqual(pickDocHits(hits, "b").map((h) => h.content), ["2", "3"]);
});

test("같은 문서 중복 판단: 이름과 크기가 모두 같을 때만(L5)", () => {
  const list = [{ name: "규정.pdf", size_bytes: 100 }];
  assert.equal(isDuplicateDoc(list, "규정.pdf", 100), true);
  assert.equal(isDuplicateDoc(list, "규정.pdf", 101), false);
  assert.equal(isDuplicateDoc(list, "규정2.pdf", 100), false);
});

test("출처: 문서는 근거 미리보기(U1), 웹은 검색 경로·발행일(L6)", () => {
  const s = buildSources(
    [{ document_name: "a.pdf", content: "낮은 조각", similarity: 0.5 }, { document_name: "a.pdf", content: "높은   조각\n내용", similarity: 0.8 }],
    [{ title: "x", url: "https://x", published: "2026-10-18" }],
    "rest"
  );
  assert.deepEqual(s[0], { type: "doc", title: "a.pdf", score: 0.8, snippet: "높은 조각 내용" });
  assert.deepEqual(s[1], { type: "web", title: "x", url: "https://x", published: "2026-10-18", via: "rest" });
  assert.ok(buildSources([{ document_name: "c", content: "가".repeat(500), similarity: 0.9 }], [])[0].snippet.length <= 401);
});

import { extractKeywords, mergeHybrid, isSummaryQuestion, joinBatchTexts, textFromParseResult } from "../src/lib/chat/core.ts";
test("키워드 뽑기: 조사 떼기·불용어 제외·안전한 글자만(L4)", () => {
  assert.deepEqual(extractKeywords("국내 출장 일비는 얼마고, Orbit X1 보증 기간도 알려줘?"), ["국내", "출장", "일비", "Orbit", "X1", "보증"]);
  assert.deepEqual(extractKeywords("39,000원 배터리 교체 비용"), ["배터리", "교체", "비용"]);
  assert.ok(extractKeywords("a%b,c(d) 이름").every((k) => /^[0-9A-Za-z가-힣]+$/.test(k)));
});

test("혼합 검색: 키워드가 절반 이상 들어 있으면 관련도가 낮아도 포함, 점수순(L4)", () => {
  const v = [
    { id: "1", document_name: "a", content: "일반 내용", similarity: 0.45 },
    { id: "2", document_name: "a", content: "관련 없음", similarity: 0.2 },
  ];
  const k = [{ id: "3", document_name: "b", content: "Orbit X1 보증 18개월", similarity: 0 }];
  const out = mergeHybrid(v, k, ["Orbit", "X1", "보증"]);
  assert.deepEqual(out.map((h) => h.id), ["1", "3"]);
  assert.ok(mergeHybrid(v, [], []).every((h) => h.id !== "2"));
});

test("요약 질문 판단(L12)", () => {
  assert.equal(isSummaryQuestion("이 문서 내용을 3줄로 요약해 줘"), true);
  assert.equal(isSummaryQuestion("핵심만 정리해줘"), true);
  assert.equal(isSummaryQuestion("국내 출장 일비는?"), false);
});

test("비동기 문서 읽기 결과: 쪽 순서대로 잇기·결과 글 꺼내기(L3)", () => {
  assert.equal(joinBatchTexts([{ start_page: 11, text: "둘" }, { start_page: 1, text: "하나" }]), "하나\n\n둘");
  assert.equal(textFromParseResult({ content: { markdown: "# 제목 \n본문" } }), "# 제목\n본문");
  assert.equal(textFromParseResult({ content: {}, elements: [{ content: { text: "가" } }, { content: { markdown: "나" } }] }), "가\n나");
});

import { wasTruncated, estimateRemainingSec, lastUsedByDoc, webViaStats, RELATIVE_SCORE_GAP } from "../src/lib/chat/core.ts";
test("출처 오탐 줄이기(L13): 흔한 단어 하나 일치는 점수 없음, 상위보다 많이 낮으면 뺌, 키워드 조각은 보호", () => {
  const v = [
    { id: "w", document_name: "복지규정.txt", content: "복지 규정 헬스장 도서", similarity: 0.6 },
    { id: "t", document_name: "출장규정.txt", content: "출장 규정 일비", similarity: 0.44 },
  ];
  // 「규정」 하나만 겹친 출장규정은 가점 없이 0.44 → 0.6-0.15=0.45 미만이라 빠짐
  assert.deepEqual(mergeHybrid(v, [], ["복지", "규정", "핵심"]).map((h) => h.id), ["w"]);
  // 모델명처럼 구체적인 키워드는 하나만 일치해도 가점
  const o = mergeHybrid([{ id: "o", document_name: "a", content: "Orbit 배터리", similarity: 0.3 }], [], ["Orbit", "배터리"]);
  assert.equal(o.length, 1);
  assert.ok(RELATIVE_SCORE_GAP > 0.1 && RELATIVE_SCORE_GAP < 0.3);
});

test("문서 조각 한도(L14): 한도까지 차고 끝이 안 담겼으면 잘린 것", () => {
  assert.equal(wasTruncated("짧은 글", ["짧은 글"]), false);
  // 실제 조각처럼 길게(마지막 조각은 원문 끝 40자를 담음)
  const full = Array.from({ length: MAX_CHUNKS_PER_DOC }, (_, i) => `조각${i} `.repeat(20));
  const text = full.join(" ");
  assert.equal(wasTruncated(text, full), false);
  assert.equal(wasTruncated(text + " 뒤에 더 이어지는 내용이 있어서 한도 밖으로 잘린 문장입니다", full), true);
});

test("큰 문서 예상 남은 시간: 읽은 속도로 계산, 아직 0쪽이면 계산 안 함", () => {
  assert.equal(estimateRemainingSec(0, 60000, 20, 100), 240);
  assert.equal(estimateRemainingSec(0, 60000, 0, 100), null);
  assert.equal(estimateRemainingSec(0, 60000, 100, 100), null);
});

test("문서 마지막 사용: 출처 docId 우선, 없으면 이름으로", () => {
  const docs = [{ id: "d1", name: "a.pdf" }, { id: "d2", name: "b.pdf" }, { id: "d3", name: "c.pdf" }];
  const answers = [
    { created_at: "2026-10-18T00:00:00Z", sources: [{ type: "doc", title: "a.pdf" }] },
    { created_at: "2026-10-19T00:00:00Z", sources: [{ type: "doc", title: "다른이름", docId: "d1" }, { type: "web", title: "x", url: "https://x" }] },
    { created_at: "2026-10-17T00:00:00Z", sources: [{ type: "doc", title: "b.pdf" }] },
  ];
  assert.deepEqual(lastUsedByDoc(docs, answers), { d1: "2026-10-19T00:00:00Z", d2: "2026-10-17T00:00:00Z" });
});

test("웹 검색 경로 통계: 답변 1개 = 검색 1회", () => {
  const st = webViaStats([
    { sources: [{ type: "web", title: "a", url: "https://a", via: "mcp" }, { type: "web", title: "b", url: "https://b", via: "mcp" }] },
    { sources: [{ type: "web", title: "c", url: "https://c", via: "rest" }] },
    { sources: [{ type: "web", title: "d", url: "https://d" }] },
    { sources: [{ type: "doc", title: "e" }] },
    { sources: null },
  ]);
  assert.deepEqual(st, { searches: 3, mcp: 1, rest: 1, unknown: 1 });
});
