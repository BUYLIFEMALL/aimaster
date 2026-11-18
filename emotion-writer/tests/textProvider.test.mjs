// ECOM-20261118-01 글귀 생성 AI 3사 선택 — 모의 응답만(실제 키·실호출 없음).
import test from "node:test";
import assert from "node:assert/strict";
import { validateCopy } from "../src/lib/studio/validation.ts";
import { generateCopy } from "../src/lib/studio/services.ts";
import {
  TEXT_MODELS,
  DEFAULT_TEXT_MODEL,
  currentTextModel,
  textModelProvider,
  textModelGroups,
  missingTextKeyMessage,
} from "../src/lib/studio/textModels.ts";
import { PROVIDERS, isProvider } from "../src/lib/studio/config.ts";

const QUOTES = ["하나", "둘", "셋", "넷", "다섯"];
const input = (model) => validateCopy({ topic: "가을 위로", style: "시", lines: 5, model });

test("모델 목록 9개(3사×3등급), 기본 순서는 OpenAI(GPT) > Claude > Gemini", () => {
  assert.equal(TEXT_MODELS.length, 9);
  assert.equal(DEFAULT_TEXT_MODEL, "gpt-6.1-terra");
  assert.equal(TEXT_MODELS[0].id, DEFAULT_TEXT_MODEL);
  const groups = textModelGroups();
  assert.deepEqual(groups.map((g) => g.provider), ["openai", "anthropic", "gemini"]);
  assert.ok(groups.every((g) => g.models.length === 3));
});

test("모델 → 플랫폼 판정과 옛 모델 이름 바꾸기", () => {
  assert.equal(textModelProvider("gpt-6-luna"), "openai");
  assert.equal(textModelProvider("claude-haiku-5-5"), "anthropic");
  assert.equal(textModelProvider("gemini-3.5-flash-lite"), "gemini");
  assert.equal(currentTextModel("gemini-2.5-flash"), "gemini-3.8-flash");
  assert.equal(input("gemini-2.5-flash").model, "gemini-3.8-flash");
});

test("서버 검사: 목록에 없는 모델·제공사는 거절", () => {
  assert.equal(input("claude-sonnet-5-5").model, "claude-sonnet-5-5");
  assert.throws(() => input("gpt-4o"), /지원하지 않는 글귀 모델/);
  assert.throws(() => input("claude-3-opus"), /지원하지 않는 글귀 모델/);
  assert.ok(isProvider("openai") && isProvider("anthropic"));
  assert.ok(!isProvider("openrouter"));
  assert.ok(PROVIDERS.includes("gemini"));
});

test("키 없음 안내는 고른 플랫폼 이름을 말한다", () => {
  assert.match(missingTextKeyMessage("anthropic"), /Claude \(Anthropic\)/);
  assert.match(missingTextKeyMessage("openai"), /API키등록·플랫폼연동/);
});

test("OpenAI: 본인 키는 머리글로만, JSON 모드, 추론 모델은 temperature 없이 max_completion_tokens", async () => {
  let calls = 0;
  const quotes = await generateCopy("sk-openai-test", input("gpt-6-luna"), undefined, async (url, opts) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/chat/completions");
    assert.ok(!String(url).includes("sk-openai-test"));
    assert.equal(opts.headers.Authorization, "Bearer sk-openai-test");
    const body = JSON.parse(opts.body);
    assert.equal(body.model, "gpt-6-luna");
    assert.deepEqual(body.response_format, { type: "json_object" });
    assert.equal(body.temperature, undefined);
    assert.ok(body.max_completion_tokens >= 4000);
    assert.ok(body.messages[1].content.includes(String(new Date().getFullYear())));
    return Response.json({ choices: [{ message: { content: JSON.stringify({ quotes: QUOTES }) }, finish_reason: "stop" }] });
  });
  assert.deepEqual(quotes, QUOTES);
  assert.equal(calls, 1);
});

test("Claude: x-api-key·버전 머리글, 구조화 응답 스키마, text 조각만 읽기", async () => {
  const quotes = await generateCopy("sk-ant-test", input("claude-haiku-5-5"), undefined, async (url, opts) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    assert.equal(opts.headers["x-api-key"], "sk-ant-test");
    assert.equal(opts.headers["anthropic-version"], "2023-06-01");
    const body = JSON.parse(opts.body);
    assert.equal(body.model, "claude-haiku-5-5");
    assert.equal(body.output_config.format.type, "json_schema");
    assert.deepEqual(body.output_config.format.schema.required, ["quotes"]);
    assert.equal(typeof body.system, "string");
    return Response.json({ stop_reason: "end_turn", content: [{ type: "thinking", thinking: "x" }, { type: "text", text: JSON.stringify({ quotes: QUOTES }) }] });
  });
  assert.deepEqual(quotes, QUOTES);
});

test("Gemini: 머리글 키·시스템 지시·JSON 응답 형식", async () => {
  const quotes = await generateCopy("gm-test", input("gemini-3.8-flash"), undefined, async (url, opts) => {
    assert.ok(String(url).endsWith("/models/gemini-3.8-flash:generateContent"));
    assert.ok(!String(url).includes("gm-test"));
    assert.equal(opts.headers["x-goog-api-key"], "gm-test");
    const body = JSON.parse(opts.body);
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    assert.ok(body.systemInstruction.parts[0].text.length > 0);
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ quotes: QUOTES }) }] }, finishReason: "STOP" }] });
  });
  assert.deepEqual(quotes, QUOTES);
});

test("오류: 키 권한(401)·한도(429)·거절·잘림은 한국어 안내, 자동 재시도 없음", async () => {
  for (const [model, status, re] of [
    ["gpt-6-luna", 401, /OpenAI \(GPT\) 본인 API 키/],
    ["claude-haiku-5-5", 429, /Claude \(Anthropic\) 호출 한도/],
  ]) {
    let calls = 0;
    await assert.rejects(
      generateCopy("k", input(model), undefined, async () => {
        calls++;
        return new Response("no", { status });
      }),
      re,
    );
    assert.equal(calls, 1);
  }
  await assert.rejects(
    generateCopy("k", input("claude-haiku-5-5"), undefined, async () => Response.json({ stop_reason: "refusal", content: [] })),
    /거절했습니다/,
  );
  await assert.rejects(
    generateCopy("k", input("gemini-3.8-flash"), undefined, async () =>
      Response.json({ candidates: [{ content: { parts: [{ text: '{"quotes":["a"' }] }, finishReason: "MAX_TOKENS" }] }),
    ),
    /잘렸습니다/,
  );
});

test("요청 취소 신호가 호출까지 전달된다", async () => {
  const ac = new AbortController();
  await generateCopy("k", input("gpt-6-luna"), ac.signal, async (_url, opts) => {
    assert.ok(opts.signal instanceof AbortSignal);
    ac.abort();
    assert.equal(opts.signal.aborted, true);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ quotes: QUOTES }) } }] });
  });
});

test("QA046 P2: OpenAI 거절(message.refusal)은 정상 글귀가 함께 와도 거절로 처리", async () => {
  await assert.rejects(
    generateCopy("k", input("gpt-6-luna"), undefined, async () =>
      Response.json({ choices: [{ message: { refusal: "I can't help with that.", content: JSON.stringify({ quotes: QUOTES }) }, finish_reason: "stop" }] }),
    ),
    /OpenAI \(GPT\)가 이 요청을 거절했습니다/,
  );
});

test("QA046 P3: 취소·시간초과는 AppError(502)로 바꾸지 않고 AbortError/TimeoutError 그대로 전파(guard가 408)", async () => {
  for (const name of ["AbortError", "TimeoutError"]) {
    await assert.rejects(
      generateCopy("k", input("claude-haiku-5-5"), undefined, async () => {
        throw new DOMException("stopped", name);
      }),
      (e) => e.name === name && e.status === undefined,
    );
  }
  // 그 밖의 연결 실패는 기존처럼 한국어 안내(502)
  await assert.rejects(
    generateCopy("k", input("gemini-3.8-flash"), undefined, async () => {
      throw new TypeError("fetch failed");
    }),
    (e) => /연결에 실패했습니다/.test(e.message) && e.status === 502,
  );
});
