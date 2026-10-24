import { test } from "node:test";
import assert from "node:assert/strict";
import { styleSection } from "../lib/ai/stylePrompt.ts";
import { readStyleStrength, STYLE_STRENGTHS } from "../lib/styleStrength.ts";

// D-1 (2026-10-24): 어조 강도. 「균형」은 v2.16까지의 지시문과 글자까지 같아야 한다(아래 기대값은 v2.16 판이 만든 문장).
const profile = { summary: "s", tone: "친근한 존댓말", sentence: "짧은 문장 위주", structure: "요약 → 소제목 3개 → 정리", reader: "30대 직장인", expressions: ["정리해 보면", "솔직히"], avoid: ["무조건"], strengths: [], cautions: [] };
const style = { name: "생활 정보", profile, ending: "haeyo" };
const V216 = "\n\n사용자가 승인한 「생활 정보」 문체를 따르세요(사실·경험은 지어내지 말고 말투·문장·구성 습관만 따름). 말투·문장 끝맺음(예: ~요/~습니다)은 위 페르소나 톤보다 이 문체를 우선하고, 페르소나는 관점과 내용 구성에만 반영합니다. 자주 쓰는 표현에 보이는 끝맺음을 본문 전체에 일관되게 씁니다:\n어조: 친근한 존댓말\n문장: 짧은 문장 위주\n구성: 요약 → 소제목 3개 → 정리\n독자: 30대 직장인\n자주 쓰는 표현(자연스러울 때만): 정리해 보면, 솔직히\n쓰지 않는 표현: 무조건\n문장 끝맺음(필수): 이 작성자의 글은 해요체입니다. 소제목을 뺀 본문의 모든 평서문을 「~해요」「~이에요」「~거든요」「~더라고요」처럼 「~요」로 끝내고, 「~습니다」「~입니다」로 끝내지 마세요.";

test("D-1: balanced (and default) is identical to v2.16", () => {
  assert.equal(styleSection(style), V216);
  assert.equal(styleSection(style, "balanced"), V216);
});

test("D-1: subtle keeps tone and avoid list only, never pushes favorite expressions", () => {
  const out = styleSection(style, "subtle");
  assert.match(out, /은은하게만/);
  assert.match(out, /어조: 친근한 존댓말/);
  assert.match(out, /쓰지 않는 표현: 무조건/);
  assert.match(out, /~요/); // 끝맺음 규칙은 유지
  assert.doesNotMatch(out, /정리해 보면|솔직히/);
  assert.doesNotMatch(out, /문장: |구성: /);
  assert.match(out, /지어내지 말/);
});

test("D-1: strong is balanced plus an emphasis rule that still forbids invented facts", () => {
  const out = styleSection(style, "strong");
  assert.ok(out.startsWith(V216));
  assert.match(out, /뚜렷하게/);
  assert.match(out, /지어내지 않습니다/);
});

test("D-1: no style means no section at any strength; unknown values fall back to balanced", () => {
  for (const s of ["subtle", "balanced", "strong"]) assert.equal(styleSection(undefined, s), "");
  assert.equal(readStyleStrength("strong"), "strong");
  assert.equal(readStyleStrength("subtle"), "subtle");
  for (const v of [undefined, null, "", "max", 3]) assert.equal(readStyleStrength(v), "balanced");
  assert.deepEqual(STYLE_STRENGTHS.map((x) => x.key), ["subtle", "balanced", "strong"]);
});
