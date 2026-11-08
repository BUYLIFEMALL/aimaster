import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAiPrefs, usableProvider } from "../src/lib/aiModelChoice.ts";

test("글 AI 설정 다듬기 — 모르는 플랫폼·옛 모델은 기본값", () => {
  const d = normalizeAiPrefs(null);
  assert.equal(d.textProvider, "anthropic");
  assert.equal(d.models.anthropic, "claude-sonnet-5-5");
  const p = normalizeAiPrefs({ textProvider: "gemini", models: { gemini: "gemini-3.5-flash-lite", openai: "gpt-4o", anthropic: 3 } });
  assert.equal(p.textProvider, "gemini");
  assert.equal(p.models.gemini, "gemini-3.5-flash-lite");
  assert.equal(p.models.openai, "gpt-6.1-terra");
  assert.equal(p.models.anthropic, "claude-sonnet-5-5");
  assert.equal(normalizeAiPrefs({ textProvider: "mistral" }).textProvider, "anthropic");
});

test("키 없는 플랫폼을 골라 두었으면 키 있는 첫 플랫폼(Claude → Gemini → OpenAI)", () => {
  const keys = { openai: { registered: true }, anthropic: { registered: false }, gemini: { registered: false } };
  assert.equal(usableProvider("anthropic", keys), "openai");
  assert.equal(usableProvider("openai", keys), "openai");
  assert.equal(usableProvider("gemini", null), "gemini");
  assert.equal(usableProvider("gemini", {}), "gemini");
});
