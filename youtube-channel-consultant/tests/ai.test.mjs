import test from "node:test";
import assert from "node:assert/strict";
import { AI_ENGINES, defaultModel, findEngine, isKnownModel } from "../src/lib/ai/models.ts";
import { buildPrompt } from "../src/lib/ai/prompts.ts";
import { callLlm, LlmError } from "../src/lib/ai/llm.ts";

const digest = (over = {}) => ({
  id: "abcdefghijk", title: "테스트 영상", publishedAt: "2026-09-01T00:00:00Z", channelTitle: "채널",
  viewCount: 1000, likeCount: 50, commentCount: null, durationSeconds: 45, isShort: true, popularity: 80,
  tags: ["ai"], description: "설명", channelSubscriberCount: 3500, ...over,
});

const okJson = (data) => ({ ok: true, status: 200, json: async () => data });
const errJson = (status, message) => ({ ok: false, status, json: async () => ({ error: { message } }) });

test("모델 레지스트리: 기본값은 stable, 알 수 없는 모델은 거절", () => {
  for (const e of AI_ENGINES) {
    const def = e.models.find((m) => m.value === defaultModel(e.provider));
    assert.equal(def?.lifecycle, "stable", `${e.provider} 기본 모델은 stable`);
  }
  assert.equal(isKnownModel("gemini", "gemini-3.7-flash"), true);
  assert.equal(isKnownModel("gemini", "gpt-4.1"), false);
  assert.equal(isKnownModel("nope", "x"), false);
  assert.equal(findEngine("gemini").watchesVideo, true);
  assert.equal(findEngine("openai").watchesVideo, false);
});

test("프롬프트: 현재 연도·확인 불가 규칙이 항상 들어간다", () => {
  const b = buildPrompt("channel-diagnosis", {
    channel: { title: "채널", handle: "@c", subscriberCount: null, viewCount: 10, videoCount: 2, publishedAt: "2025-01-01", averageIntervalHours: 48, sinceLastUploadHours: 3 },
    videos: [digest()],
  }, { year: 2026 });
  assert.match(b.system, /현재 연도는 2026년/);
  assert.match(b.system, /확인 불가/);
  assert.match(b.user, /구독자: 비공개/);
  assert.match(b.user, /최근 업로드 영상만/);
  assert.equal(b.mode, "data-only");
});

test("영상 요약: Gemini+15분 이하만 직접 분석, 그 외는 추정 모드", () => {
  const direct = buildPrompt("video-summary", digest(), { canWatchVideo: true });
  assert.equal(direct.mode, "direct-video");
  assert.equal(direct.videoUrl, "https://www.youtube.com/watch?v=abcdefghijk");
  const long = buildPrompt("video-summary", digest({ durationSeconds: 1200 }), { canWatchVideo: true });
  assert.equal(long.mode, "data-only");
  assert.equal(long.videoUrl, undefined);
  assert.match(long.user, /추정/);
  const gpt = buildPrompt("video-summary", digest(), { canWatchVideo: false });
  assert.equal(gpt.mode, "data-only");
});

test("키워드 경쟁 전략: 채널 점유율과 상위 영상이 프롬프트에 들어간다", () => {
  const b = buildPrompt("keyword-competition", {
    keyword: "AI자동화", region: "kr", order: "viewCount",
    totals: { views: 100, likes: 10, comments: 1 },
    channelShare: [{ title: "A채널", videoCount: 3, viewCount: 90 }],
    videos: [digest()],
  }, { year: 2026 });
  assert.match(b.user, /AI자동화/);
  assert.match(b.user, /A채널 — 영상 3개/);
  assert.match(b.user, /채널 채널\(구독자 3,500\)/);
});

test("callLlm(Gemini): 키는 헤더로, 영상은 fileData로 보낸다", async () => {
  let seen;
  const out = await callLlm(
    { provider: "gemini", model: "gemini-3.7-flash", apiKey: "SECRET-KEY", system: "S", user: "U", videoUrl: "https://www.youtube.com/watch?v=abcdefghijk" },
    async (url, init) => { seen = { url, init }; return okJson({ candidates: [{ content: { parts: [{ text: "결과" }] } }] }); }
  );
  assert.equal(out, "결과");
  assert.ok(!seen.url.includes("SECRET-KEY"), "키가 URL에 없어야 함");
  assert.equal(seen.init.headers["x-goog-api-key"], "SECRET-KEY");
  const body = JSON.parse(seen.init.body);
  assert.equal(body.contents[0].parts[0].fileData.fileUri, "https://www.youtube.com/watch?v=abcdefghijk");
  assert.equal(body.contents[0].parts[1].text, "U");
});

test("callLlm(OpenAI·Claude): 요청 형식과 응답 파싱", async () => {
  let openaiBody;
  const a = await callLlm({ provider: "openai", model: "gpt-4.1", apiKey: "k", system: "S", user: "U" },
    async (_u, init) => { openaiBody = JSON.parse(init.body); return okJson({ choices: [{ message: { content: "GPT" } }] }); });
  assert.equal(a, "GPT");
  assert.equal(openaiBody.temperature, 0.6);
  const noTemp = await callLlm({ provider: "openai", model: "gpt-6-luna", apiKey: "k", system: "S", user: "U" },
    async (_u, init) => { openaiBody = JSON.parse(init.body); return okJson({ choices: [{ message: { content: "x" } }] }); });
  assert.equal(noTemp, "x");
  assert.equal("temperature" in openaiBody, false);

  let claudeHeaders;
  const c = await callLlm({ provider: "anthropic", model: "claude-sonnet-5", apiKey: "k", system: "S", user: "U" },
    async (_u, init) => { claudeHeaders = init.headers; return okJson({ content: [{ type: "text", text: "클로드" }] }); });
  assert.equal(c, "클로드");
  assert.equal(claudeHeaders["x-api-key"], "k");
});

test("callLlm 오류: 키 값이 메시지에 남지 않고 상태별로 안내", async () => {
  await assert.rejects(
    callLlm({ provider: "openai", model: "gpt-4.1", apiKey: "sk-SECRET", system: "S", user: "U" },
      async () => errJson(401, "Incorrect API key provided: sk-SECRET")),
    (e) => e instanceof LlmError && e.status === 400 && !e.message.includes("sk-SECRET") && /키가 올바르지 않/.test(e.message)
  );
  await assert.rejects(
    callLlm({ provider: "gemini", model: "m", apiKey: "k", system: "S", user: "U" }, async () => errJson(429, "quota")),
    (e) => e.status === 429
  );
  await assert.rejects(
    callLlm({ provider: "gemini", model: "m", apiKey: "k", system: "S", user: "U" }, async () => okJson({ candidates: [] })),
    (e) => /빈 응답/.test(e.message)
  );
});
