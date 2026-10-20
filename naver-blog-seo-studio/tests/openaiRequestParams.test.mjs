// 공용 기준 코드 「openai-request-params」 테스트 — 기준: naver-blog-seo-studio/tests/openaiRequestParams.test.mjs. 사본은 직접 고치지 않는다.
import test from "node:test";
import assert from "node:assert/strict";
import { isOpenAIReasoningModel, openAIGenerationParams, openAIModelNotice, openAIModelTier, openAIModelTierHint, openAIErrorReason, REASONING_MIN_COMPLETION_TOKENS } from "../lib/ai/openaiRequestParams.ts";

const reasoning = ["gpt-5", "gpt-5.6-luna", "gpt-5.6-sol", "gpt-6-luna", "gpt-6-astra", "o4-mini", "o3"];
const classic = ["gpt-4o-mini", "gpt-4o", "gpt-4.1", "gpt-4.1-mini"];

test("추론 모델 판정", () => {
  for (const model of reasoning) assert.equal(isOpenAIReasoningModel(model), true, model);
  for (const model of classic) assert.equal(isOpenAIReasoningModel(model), false, model);
});

test("온도: 추론 모델은 빼고, 기존 모델은 그대로", () => {
  for (const model of reasoning) assert.deepEqual(openAIGenerationParams(model, { temperature: 0.7 }), {}, model);
  assert.deepEqual(openAIGenerationParams("gpt-4.1", { temperature: 0.8 }), { temperature: 0.8 });
  assert.deepEqual(openAIGenerationParams("gpt-4o-mini"), {});
});

test("출력 한도: 추론 모델은 max_completion_tokens(최소 4000), 기존 모델은 max_tokens", () => {
  assert.deepEqual(openAIGenerationParams("gpt-4.1", { temperature: 0.8, maxTokens: 600 }), { temperature: 0.8, max_tokens: 600 });
  assert.deepEqual(openAIGenerationParams("gpt-5.6-luna", { temperature: 0.8, maxTokens: 600 }), { max_completion_tokens: REASONING_MIN_COMPLETION_TOKENS });
  assert.deepEqual(openAIGenerationParams("gpt-6-astra", { maxTokens: 12000 }), { max_completion_tokens: 12000 });
});

test("모델 안내 문구", () => {
  assert.match(openAIModelNotice("gpt-5.6-luna"), /느릴 수 있습니다/);
  assert.equal(openAIModelNotice("gpt-4.1"), "");
});

test("모델 성격 표시", () => {
  for (const model of ["gpt-4o-mini", "gpt-4.1-mini", "gpt-5.6-luna", "gpt-6-luna", "o3-mini"]) assert.equal(openAIModelTier(model), "⚡ 빠름", model);
  for (const model of ["gpt-4o", "gpt-4.1", "gpt-5.6-terra", "gpt-5.4"]) assert.equal(openAIModelTier(model), "⚖️ 균형", model);
  for (const model of ["gpt-5", "gpt-5.6-sol", "gpt-6-astra", "gpt-6.1-sol", "o3", "o1"]) assert.equal(openAIModelTier(model), "💎 고품질", model);
  for (const model of ["claude-opus-5", "gemini-3.8-flash", ""]) assert.equal(openAIModelTier(model), "", model);
});

test("모델 성격 설명", () => {
  assert.match(openAIModelTierHint("gpt-5.6-luna"), /빠른 응답/);
  assert.match(openAIModelTierHint("gpt-4.1"), /무난한/);
  assert.match(openAIModelTierHint("gpt-6-astra"), /복잡한 주제/);
  assert.equal(openAIModelTierHint("claude-opus-5"), "");
});

test("OpenAI 거부 이유", async () => {
  const reason = await openAIErrorReason(new Response(JSON.stringify({ error: { message: "Unsupported parameter: 'max_tokens'" } }), { status: 400 }));
  assert.equal(reason, " — OpenAI 안내: Unsupported parameter: 'max_tokens'");
  assert.equal(await openAIErrorReason(new Response("not json", { status: 500 })), "");
});
