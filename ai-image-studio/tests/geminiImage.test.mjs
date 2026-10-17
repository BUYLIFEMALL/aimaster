// 공용 기준 코드 gemini-image-client 테스트 — 기준: ai-image-studio/tests (docs/SHARED_MODULES.md, 2026-10-17).
// 실제 Gemini는 부르지 않는다(가짜 응답). 실행: npm run test:gemini-image
import test from "node:test";
import assert from "node:assert/strict";
import { GeminiImageError, extractGeminiImage, generateGeminiImage, maskGeminiKey, toGeminiImageError } from "../lib/providers/geminiImage.ts";

const res = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const img = (data = "QUJD", mimeType = "image/png") => ({ candidates: [{ content: { parts: [{ text: "설명" }, { inlineData: { mimeType, data } }] } }] });
const noSleep = async () => {};

test("성공: 키는 머리글로, 생성 설정은 넘긴 값 그대로", async () => {
  const calls = [];
  const out = await generateGeminiImage({
    apiKey: "AIzaSECRETKEYVALUE1234567890",
    modelName: "gemini-nano-banana-2.1",
    prompt: "비 오는 창가",
    aspectRatio: "16:9",
    imageSize: "2K",
    temperature: 0.7,
    responseModalities: ["Image"],
    fetchImpl: async (url, init) => (calls.push({ url, init }), res(200, img("Q U J D\n"))),
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent");
  assert.ok(!calls[0].url.includes("key="));
  assert.equal(calls[0].init.headers["x-goog-api-key"], "AIzaSECRETKEYVALUE1234567890");
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.generationConfig, { responseModalities: ["Image"], imageConfig: { aspectRatio: "16:9", imageSize: "2K" }, temperature: 0.7 });
  assert.equal(body.contents[0].parts[0].text, "비 오는 창가");
  assert.equal(out.base64, "QUJD");
  assert.equal(out.mimeType, "image/png");
  assert.equal(out.text, "설명");
});

test("참고 이미지 조각(parts)을 그대로 보낸다", async () => {
  let body;
  await generateGeminiImage({ apiKey: "K", modelName: "m", parts: [{ inlineData: { mimeType: "image/jpeg", data: "X" } }, { text: "합성" }], fetchImpl: async (_u, init) => ((body = JSON.parse(init.body)), res(200, img())) });
  assert.equal(body.contents[0].parts.length, 2);
  assert.equal(body.generationConfig.imageConfig, undefined);
});

test("이미지 꺼내기: 둘째 후보에 있어도 찾고, 안전 차단은 이유를 알린다", () => {
  const two = { candidates: [{ content: { parts: [{ text: "x" }] } }, { content: { parts: [{ inlineData: { data: "Z" } }] } }] };
  assert.equal(extractGeminiImage(two).base64, "Z");
  assert.throws(() => extractGeminiImage({ promptFeedback: { blockReason: "SAFETY" } }), (e) => e.code === "SAFETY_BLOCKED");
  assert.throws(() => extractGeminiImage({ candidates: [{ finishReason: "IMAGE_SAFETY", content: { parts: [] } }] }), (e) => e.code === "SAFETY_BLOCKED");
  assert.throws(() => extractGeminiImage({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "글만" }] } }] }, "m"), (e) => e.code === "NO_IMAGE" && /m/.test(e.message));
});

test("오류 구분", () => {
  assert.equal(toGeminiImageError(400, { error: { status: "INVALID_ARGUMENT", message: "API key not valid. Please pass a valid API key.", details: [{ reason: "API_KEY_INVALID" }] } }).code, "INVALID_KEY");
  assert.equal(toGeminiImageError(403, { error: { message: "Generative Language API has not been used in project 1 before or it is disabled." } }).code, "API_NOT_ENABLED");
  assert.equal(toGeminiImageError(429, { error: { status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for metric: free_tier_requests, limit: 0" } }).code, "QUOTA_EXCEEDED");
  assert.equal(toGeminiImageError(429, { error: { status: "RESOURCE_EXHAUSTED", message: "Resource has been exhausted (e.g. check quota)." } }).code, "RATE_LIMITED");
  assert.equal(toGeminiImageError(404, { error: { status: "NOT_FOUND" } }, "old-model").code, "MODEL_NOT_FOUND");
  assert.equal(toGeminiImageError(503, {}).code, "SERVER_ERROR");
  assert.ok(toGeminiImageError(400, { error: { message: "INVALID_ARGUMENT" } }).keyProblem === false);
  assert.ok(toGeminiImageError(400, { error: { message: "API key not valid" } }).keyProblem);
});

test("서버 오류·혼잡은 1회 재시도, 키·안전 오류는 재시도 안 함", async () => {
  let n = 0;
  const ok = await generateGeminiImage({ apiKey: "K", modelName: "m", prompt: "p", sleep: noSleep, fetchImpl: async () => (++n === 1 ? res(503, {}) : res(200, img())) });
  assert.equal(n, 2);
  assert.equal(ok.base64, "QUJD");
  n = 0;
  await assert.rejects(generateGeminiImage({ apiKey: "K", modelName: "m", prompt: "p", sleep: noSleep, fetchImpl: async () => (n++, res(400, { error: { message: "API key not valid" } })) }), (e) => e instanceof GeminiImageError && e.code === "INVALID_KEY");
  assert.equal(n, 1);
  n = 0;
  await assert.rejects(generateGeminiImage({ apiKey: "K", modelName: "m", prompt: "p", sleep: noSleep, fetchImpl: async () => (n++, res(200, { promptFeedback: { blockReason: "SAFETY" } })) }), (e) => e.code === "SAFETY_BLOCKED");
  assert.equal(n, 1);
});

test("시간 초과는 재시도 없이 안내, 네트워크 끊김은 재시도 후 안내, 키 없음은 바로 안내", async () => {
  let n = 0;
  await assert.rejects(
    generateGeminiImage({ apiKey: "K", modelName: "m", prompt: "p", sleep: noSleep, fetchImpl: async () => { n++; const e = new Error("t"); e.name = "TimeoutError"; throw e; } }),
    (e) => e.code === "TIMEOUT" && e.message.includes("aistudio.google.com/usage") // 이중 과금 방지: 사용량 확인 안내(2026-10-18)
  );
  assert.equal(n, 1); // 시간 초과는 이미 생성·과금됐을 수 있어 자동 재시도하지 않음
  n = 0;
  await assert.rejects(
    generateGeminiImage({ apiKey: "K", modelName: "m", prompt: "p", sleep: noSleep, fetchImpl: async () => { n++; throw new TypeError("fetch failed"); } }),
    (e) => e.code === "NETWORK"
  );
  assert.equal(n, 2); // 연결 실패는 1회 재시도
  await assert.rejects(generateGeminiImage({ apiKey: "", modelName: "m", prompt: "p" }), (e) => e.code === "INVALID_KEY");
  assert.equal(maskGeminiKey("x?key=AIzaSyABCDEFGHIJKLMNOPQRSTUVW&y=1"), "x?key=***&y=1");
});

test("생각 중 중간 초안(thought)은 건너뛰고 최종 이미지를 고른다", () => {
  const r = extractGeminiImage({
    candidates: [{ content: { parts: [
      { thought: true, text: "구상 중" },
      { thought: true, inlineData: { mimeType: "image/png", data: "DRAFT" } },
      { text: "완성" },
      { inlineData: { mimeType: "image/png", data: "FINAL" } },
    ] } }],
    usageMetadata: { totalTokenCount: 10 },
  });
  assert.equal(r.base64, "FINAL");
  assert.equal(r.text, "완성");
  assert.deepEqual(r.usage, { totalTokenCount: 10 });
  assert.throws(() => extractGeminiImage({ candidates: [{ finishReason: "STOP", content: { parts: [{ thought: true, inlineData: { data: "DRAFT" } }] } }] }), (e) => e.code === "NO_IMAGE");
});

test("외부 취소 신호: 취소되면 재시도하지 않고 CANCELLED", async () => {
  const ctrl = new AbortController();
  let n = 0;
  const p = generateGeminiImage({
    apiKey: "K", modelName: "m", prompt: "p", signal: ctrl.signal, sleep: noSleep,
    fetchImpl: (_u, init) => new Promise((_r, reject) => { n++; init.signal.addEventListener("abort", () => { const e = new Error("a"); e.name = "AbortError"; reject(e); }); }),
  });
  ctrl.abort();
  await assert.rejects(p, (e) => e.code === "CANCELLED");
  assert.equal(n, 1);
  const c2 = new AbortController(); c2.abort();
  await assert.rejects(generateGeminiImage({ apiKey: "K", modelName: "m", prompt: "p", signal: c2.signal, fetchImpl: async () => res(200, img()) }), (e) => e.code === "CANCELLED");
});
