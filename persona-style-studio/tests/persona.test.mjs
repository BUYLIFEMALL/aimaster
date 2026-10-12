import test from "node:test";
import assert from "node:assert/strict";
import { clampValues, lengthRatio, buildRewritePrompt, buildPersonaPrompt, parsePersonaJson, safeFileName, draftFileName } from "../src/lib/persona/prompt.ts";
import { getPresets, getDefaultPersonas, getSamples, isDefaultPersonaId } from "../src/lib/persona/data.ts";
import { DEFAULT_VALUES } from "../src/lib/persona/types.ts";

test("값 보정: 범위·잘못된 값", () => {
  assert.deepEqual(clampValues({ creativity: 150, clarity: -5, emotionalDepth: "70", length: NaN, professionalism: 49.6 }), {
    creativity: 100, clarity: 0, emotionalDepth: 70, length: 50, professionalism: 50,
  });
  assert.deepEqual(clampValues(null), { creativity: 50, clarity: 50, emotionalDepth: 50, length: 50, professionalism: 50 });
});

test("길이 비율: 0→0.3배, 50→1배, 100→2배", () => {
  assert.equal(lengthRatio(0), 0.3);
  assert.equal(lengthRatio(50), 1);
  assert.equal(lengthRatio(100), 2);
});

test("다시쓰기 프롬프트: 값·페르소나·연도·원문 포함", () => {
  const p = buildRewritePrompt({
    text: "안녕하세요", values: DEFAULT_VALUES, lang: "ko", year: 2026,
    persona: { name: "카엘", role: "기사", context: { lore: "L", voice: "V", style: "S" } },
  });
  assert.match(p, /Creativity: 85/);
  assert.match(p, /ACTIVE PERSONA: 카엘/);
  assert.match(p, /Output language: Korean/);
  assert.match(p, /current year is 2026/);
  assert.match(p, /<original_text>\n안녕하세요\n<\/original_text>/);
  assert.doesNotMatch(buildRewritePrompt({ text: "x", values: DEFAULT_VALUES, lang: "en", year: 2026 }), /ACTIVE PERSONA/);
});

test("페르소나 생성 프롬프트와 JSON 파싱", () => {
  assert.match(buildPersonaPrompt({ name: "A", role: "B", lang: "en", year: 2026 }), /Character name: "A"/);
  const ok = parsePersonaJson("```json\n{\"description\":\"d\",\"lore\":\"l\",\"voice\":\"v\",\"style\":\"s\",\"values\":{\"creativity\":120,\"clarity\":10}}\n```");
  assert.equal(ok.values.creativity, 100);
  assert.equal(ok.values.length, 50);
  assert.equal(parsePersonaJson("not json"), null);
});

test("기본 데이터: 프리셋 8·페르소나 10·샘플 5(두 언어)", () => {
  for (const lang of ["ko", "en"]) {
    assert.equal(getPresets(lang).length, 8);
    assert.equal(getDefaultPersonas(lang).length, 10);
    assert.equal(getSamples(lang).length, 5);
  }
  const ids = getDefaultPersonas("ko").map((p) => p.id);
  assert.equal(new Set(ids).size, 10);
  assert.ok(ids.every(isDefaultPersonaId));
  assert.ok(!isDefaultPersonaId("custom-1"));
  for (const pr of getPresets("ko")) for (const v of Object.values(pr.values)) assert.ok(v >= 0 && v <= 100);
});

test("파일 이름", () => {
  assert.equal(safeFileName('a<b>:c/"d'), "a_b__c__d");
  assert.match(draftFileName(new Date("2026-10-13T01:02:03.456Z")), /^draft_2026-10-13T01-02-03-456Z\.txt$/);
});
