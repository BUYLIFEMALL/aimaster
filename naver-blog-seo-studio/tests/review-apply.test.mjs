import { test } from "node:test";
import assert from "node:assert/strict";
import { applyReviewFixes, buildReviewPrompt, REVIEW_AREAS } from "../lib/draftReview.ts";

// D-3 (2026-10-24): 검수 지적 반영. 딱 한 곳일 때만 바꾸고, 여러 곳·없는 문장은 건너뛴다.
const issue = (quote, suggestion, level = "권장") => ({ area: "작성 원칙", level, quote, reason: "r", suggestion });

test("D-3: replaces a quote found exactly once, tolerating spacing differences", () => {
  const body = "첫 문단입니다. 무조건 효과가 있습니다.\n\n둘째 문단입니다.";
  const r = applyReviewFixes(body, [issue("무조건  효과가 있습니다.", "효과를 본 사람도 있습니다.", "필수")], [0]);
  assert.deepEqual(r.applied, [0]);
  assert.equal(r.body, "첫 문단입니다. 효과를 본 사람도 있습니다.\n\n둘째 문단입니다.");
});

test("D-3: skips quotes that appear several times or not at all, and keeps the body unchanged for them", () => {
  const body = "같은 말이 있습니다. 같은 말이 있습니다.\n\n다른 문단입니다.";
  const r = applyReviewFixes(body, [issue("같은 말이 있습니다.", "x"), issue("본문에 없는 문장", "y")], [0, 1]);
  assert.deepEqual(r.applied, []);
  assert.equal(r.skipped.length, 2);
  assert.match(r.skipped[0].reason, /여러 곳/);
  assert.match(r.skipped[1].reason, /찾지 못했습니다/);
  assert.equal(r.body, body);
});

test("D-3: empty suggestion deletes the sentence and tidies spaces; overlapping fixes after the first are skipped", () => {
  const body = "도입 문장입니다. 지울 문장입니다.\n\n  남는 문단입니다.";
  const r = applyReviewFixes(body, [issue("지울 문장입니다.", ""), issue("문장입니다. 지울 문장", "z")], [0, 1]);
  assert.deepEqual(r.applied, [0]);
  assert.equal(r.body, "도입 문장입니다.\n\n남는 문단입니다.");
  assert.equal(r.skipped[0].index, 1);
});

test("D-3: only the requested indexes are applied, regex characters in quotes are literal", () => {
  const body = "가격은 (확인 필요) 1+1 행사입니다. 다른 문장도 있습니다.";
  const r = applyReviewFixes(body, [issue("(확인 필요) 1+1 행사입니다.", "행사 내용은 매장에 확인해 주세요."), issue("다른 문장도 있습니다.", "q")], [0]);
  assert.equal(r.body, "가격은 행사 내용은 매장에 확인해 주세요. 다른 문장도 있습니다.");
});

test("D-3: review prompt now covers 8 areas including search intent and answer clarity", () => {
  assert.equal(REVIEW_AREAS.length, 8);
  const p = buildReviewPrompt({ title: "t", body: "b", year: 2026 });
  assert.match(p.user, /8개 영역/);
  assert.match(p.user, /「검색 의도」: 첫 문단이/);
  assert.match(p.user, /「답변 명료성」: 소제목이/);
});
