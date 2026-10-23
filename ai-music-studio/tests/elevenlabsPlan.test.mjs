import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCompositionPlan, planSeconds, stylesFrom } from "../lib/providers/elevenlabsPlan.ts";

const lyrics = "[Verse]\n창밖으로 적시는 빗소리\n오늘따라 네 생각이 깊어져\n식어버린 커피 컵\n문득 네가 떠오르는 밤\n\n[Chorus]\n비가 내리면 네가 오려나\n가만히 눈을 감아";

test("구간마다 청크 하나, 길이는 줄 수 비례(합계 ≈ 요청 길이)", () => {
  const plan = buildCompositionPlan(lyrics, "잔잔한 어쿠스틱 발라드, 여성 보컬", 60);
  assert.equal(plan.chunks.length, 2);
  assert.equal(plan.chunks[0].text.split("\n")[0], "[Verse]");
  assert.equal(plan.chunks[0].duration_ms, 40000); // 4줄 : 2줄
  assert.equal(plan.chunks[1].duration_ms, 20000);
  assert.equal(planSeconds(plan), 60);
  assert.deepEqual(plan.chunks[0].positive_styles, ["잔잔한 어쿠스틱 발라드", "여성 보컬"]);
});

test("구간 길이는 3~120초로 맞춘다", () => {
  const short = buildCompositionPlan("[Intro]\n[Verse]\n한 줄\n[Outro]", "pop", 5);
  for (const c of short.chunks) assert.ok(c.duration_ms >= 3000 && c.duration_ms <= 120000);
  const long = buildCompositionPlan("[Verse]\n한 줄", "pop", 300);
  assert.equal(long.chunks[0].duration_ms, 120000);
});

test("구간 표시가 없거나 가사 줄이 없으면 null(설명 방식)", () => {
  assert.equal(buildCompositionPlan("그냥 가사\n둘째 줄", "pop", 60), null);
  assert.equal(buildCompositionPlan("[Intro]\n[Outro]", "pop", 60), null);
});

test("스타일 문구는 최대 6개·빈 설명이면 기본값", () => {
  assert.equal(stylesFrom("a1, b2, c3, d4, e5, f6, g7, h8").length, 6);
  assert.deepEqual(stylesFrom(""), ["pop"]);
});
