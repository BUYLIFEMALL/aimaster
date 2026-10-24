import { test } from "node:test";
import assert from "node:assert/strict";
import { NARRATIVE_STRUCTURES, readNarrativeStructure, structureRule, structureOutlineLine } from "../lib/narrativeStructure.ts";
import { outlinePrompt } from "../lib/ai/sectionPrompt.ts";

// D-2 (2026-10-24): 전개 구조 8가지 + 기본. 기본이면 지시문이 v2.16과 같아야 한다(아래 기대값은 v2.16 판 목차 지시문).
const base = { today: "2026-10-24", persona: { name: "정리 전문가", toneDescription: "차분하게" }, rules: { style: "", facts: "\n사실 규칙" }, keyword: "가을 캠핑 준비물" };
const V216_OUTLINE = {"system":"당신은 한국어 네이버 블로그 콘텐츠 편집자입니다. 오늘은 한국 기준 2026-10-24입니다.\n선택한 글쓰기 페르소나는 '정리 전문가'입니다. 다음 톤과 관점을 일관되게 반영하세요: 차분하게\n마크다운 기호(#, *, -, ##)와 HTML은 쓰지 않습니다. 확인되지 않은 수치·기업 사례·개인 경험은 만들지 말고 [확인 필요]로 표시합니다. AI 탐지 회피를 약속하지 않습니다.\n\n사실 규칙\n\nJSON만 반환합니다.","user":"검색어 「가을 캠핑 준비물」로 쓸 블로그 글의 제목 후보와 구성을 만드세요.\n- 제목 후보 3개: 25~40자, 핵심 키워드를 한 번만 넣습니다.\n- 구성 5~6개: 첫 항목은 도입부(heading은 빈 문자열, 검색 의도에 바로 답하는 요약), 나머지는 소제목(자연스러운 질문형 또는 판단 기준형 문장). 각 항목의 goal에 그 부분에 담을 내용을 승인 근거 기준으로 한 문장으로 적습니다.\nJSON: {\"titles\":[\"제목 후보 3개\"],\"sections\":[{\"heading\":\"\",\"goal\":\"\"}]}"};

test("D-2: 9 choices, unique keys, every non-default one has an order instruction", () => {
  assert.equal(NARRATIVE_STRUCTURES.length, 9);
  assert.equal(new Set(NARRATIVE_STRUCTURES.map((x) => x.key)).size, 9);
  assert.equal(NARRATIVE_STRUCTURES[0].key, "default");
  for (const x of NARRATIVE_STRUCTURES.slice(1)) {
    assert.ok(x.order.length > 20, x.key);
    assert.ok(structureRule(x.key).includes(x.label));
    assert.ok(structureOutlineLine(x.key).includes(x.label));
  }
});

test("D-2: default and unknown values change nothing", () => {
  for (const v of ["default", undefined, null, "", "random", 7]) {
    assert.equal(readNarrativeStructure(v), "default");
    assert.equal(structureRule(v), "");
    assert.equal(structureOutlineLine(v), "");
  }
  assert.deepEqual(outlinePrompt(base), V216_OUTLINE);
  assert.deepEqual(outlinePrompt({ ...base, structureLine: structureOutlineLine("default") }), V216_OUTLINE);
});

test("D-2: a chosen structure keeps the strategy/first-summary rules and only adds the order", () => {
  const rule = structureRule("answer-first");
  assert.match(rule, /글쓰기 전략의 방향과 위 규칙\(첫 문단 요약·소제목 수·분량\)은 그대로/);
  assert.match(rule, /결론을 가장 먼저/);
  const out = outlinePrompt({ ...base, structureLine: structureOutlineLine("step-by-step") });
  assert.match(out.user, /전개 구조\(단계별 따라하기\)/);
  assert.equal(out.system, V216_OUTLINE.system);
  assert.match(out.user, /JSON: \{"titles"/);
});

test("D-2: scene and opinion structures forbid presenting invented events or opinions as facts", () => {
  assert.match(structureRule("scene-opening"), /실제 있었던 일처럼 꾸미지 않습니다/);
  assert.match(structureRule("my-view"), /사실처럼 단정하지 않습니다/);
  assert.match(structureRule("fact-expand"), /근거가 있는 내용만/);
});
