import { test } from "node:test";
import assert from "node:assert/strict";
import { AI_ENGINES, aiModelName, resolveAiModel, toAiProvider } from "../src/lib/ai/engines.ts";

test("엔진 3개·플랫폼마다 모델 3개, 맨 앞이 기본(중가)", () => {
  assert.deepEqual(AI_ENGINES.map((e) => e.id), ["openai", "claude", "gemini"]);
  for (const e of AI_ENGINES) assert.equal(e.models.length, 3);
  assert.equal(resolveAiModel("claude", ""), "claude-sonnet-5-5");
  assert.equal(resolveAiModel("openai", "gpt-6-astra"), "gpt-6-astra");
  assert.equal(resolveAiModel("gemini", "gemini-2.0-flash"), "gemini-3.8-flash"); // 목록에 없는 값은 기본
  assert.equal(toAiProvider("x"), "claude");
  assert.equal(aiModelName("gemini", "gemini-3.5-flash-lite"), "Gemini 3.5 Flash Lite");
});

test("키 모양", () => {
  const e = Object.fromEntries(AI_ENGINES.map((x) => [x.id, x]));
  assert.ok(e.openai.keyPattern.test("sk-" + "a".repeat(30)));
  assert.ok(e.claude.keyPattern.test("sk-ant-" + "a".repeat(30)));
  assert.ok(e.gemini.keyPattern.test("AIza" + "a".repeat(30)));
  assert.ok(!e.gemini.keyPattern.test("sk-" + "a".repeat(30)));
});