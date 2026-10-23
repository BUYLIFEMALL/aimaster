// 병합 B-3: 분량 3단계 — 표·기본값·지시문 반영. 네트워크·AI 없음.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LENGTH_PLANS, DRAFT_LENGTHS, readDraftLength, lengthPlan, headingRule, bodyRangeText, expandTargetText } from "../lib/lengthPlan.ts";
import { outlinePrompt, sectionPrompt } from "../lib/ai/sectionPrompt.ts";

test("unknown or missing length falls back to normal, which equals the old fixed values", () => {
  assert.equal(readDraftLength(undefined), "normal"); assert.equal(readDraftLength("huge"), "normal");
  assert.equal(readDraftLength("short"), "short"); assert.equal(readDraftLength("long"), "long");
  const normal = lengthPlan(null);
  assert.equal(headingRule(normal), "소제목은 4개를 일반 문장으로 작성하고");
  assert.equal(bodyRangeText(normal), "2,000~3,500자"); assert.equal(expandTargetText(normal), "2,300자");
  assert.deepEqual([normal.min, normal.expandTo, normal.outline], [2000, 2300, "5~6개"]);
});

test("plans grow from short to long and the expand target sits inside each range", () => {
  assert.deepEqual(DRAFT_LENGTHS, ["short", "normal", "long"]);
  const [s, n, l] = DRAFT_LENGTHS.map((k) => LENGTH_PLANS[k]);
  assert.ok(s.headings < n.headings && n.headings < l.headings);
  assert.ok(s.max <= n.min && n.max <= l.min + 500);
  for (const p of [s, n, l]) assert.ok(p.min < p.expandTo && p.expandTo < p.max);
  assert.equal(bodyRangeText(l), "3,800~5,000자");
});

test("section prompts use the chosen size; without size they keep the old wording", () => {
  const base = { today: "2026-10-24", persona: { name: "편집자", toneDescription: "차분" }, rules: { facts: [], style: null }, keyword: "가을 캠핑" };
  assert.match(outlinePrompt(base).user, /구성 5~6개/);
  assert.match(outlinePrompt({ ...base, size: LENGTH_PLANS.long }).user, /구성 7~8개/);
  const sections = [{ heading: "", goal: "요약", body: "", status: "empty" }, { heading: "준비물은?", goal: "목록", body: "", status: "empty" }];
  const args = { today: "2026-10-24", persona: base.persona, rules: base.rules, title: "제목", sections };
  assert.match(sectionPrompt({ ...args, index: 1 }).user, /450~650자/);
  assert.match(sectionPrompt({ ...args, index: 1, size: LENGTH_PLANS.short }).user, /300~400자/);
  assert.match(sectionPrompt({ ...args, index: 0, size: LENGTH_PLANS.long }).user, /350~500자/);
});

test("paragraph rules: normal keeps the old wording; long fixes 4 paragraphs per heading", () => {
  assert.equal(LENGTH_PLANS.normal.paragraphs, "2개 이상의 문단을 두고, 각 문단은 3~5문장으로");
  assert.deepEqual([LENGTH_PLANS.normal.keepParagraphs, LENGTH_PLANS.normal.expandAdd], ["2개 이상", "1~2개"]);
  assert.match(LENGTH_PLANS.long.paragraphs, /문단 4개/); assert.equal(LENGTH_PLANS.long.expandAdd, "2~3개");
});
