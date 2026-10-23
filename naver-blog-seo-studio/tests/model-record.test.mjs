import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// 2026-10-23: 원고 기록(seo_report.generatedModel)에 실제로 쓴 「회사 · 모델」을 남긴다 — 생성·기존 글 최적화 저장 둘 다.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("draft generation records the provider and the model it actually used", () => {
  const route = read("app/api/drafts/generate/route.ts");
  assert.match(route, /const model = resolveContentModel\(provider, input\?\.model\);/);
  assert.match(route, /generateSeoDraft\(\{[^}]*\bmodel, grounding/);
  assert.match(route, /generatedModel: generatedModelRecord\(provider, model\)/);
});

test("saving an optimized draft records the OpenAI model with the optimize route's rule", () => {
  const route = read("app/api/drafts/save-optimized/route.ts");
  const optimize = read("app/api/drafts/optimize/route.ts");
  assert.match(optimize, /getUserOpenAIContentModel\(access\.user\.user_metadata, input\?\.openaiModel\)/);
  assert.match(route, /getUserOpenAIContentModel\(access\.user\.user_metadata, input\?\.openaiModel\)/);
  assert.match(route, /generatedModel: generatedModelRecord\("openai", model\)/);
  assert.match(read("components/studio/useStudio.ts"), /save-optimized"[^\n]*openaiModel: activeOpenAIModel/);
});

test("the record reads as 「회사 · 모델」 and shows under its own label", () => {
  const models = read("lib/ai/contentModels.ts");
  assert.match(models, /return `\$\{CONTENT_PROVIDER_LABELS\[provider\]\} · \$\{model\}`;/);
  assert.match(read("components/studio/shared.ts"), /generatedModel: "생성 모델"/);
});
