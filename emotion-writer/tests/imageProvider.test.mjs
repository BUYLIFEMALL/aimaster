import test from "node:test";
import assert from "node:assert/strict";
import { validateImage } from "../src/lib/studio/validation.ts";
import { generateImage } from "../src/lib/studio/services.ts";

test("validateImage supports gemini, openai, and free providers with defaults", () => {
  const v1 = validateImage({
    quote: "오늘도 행복한 하루",
    topic: "일상 위로",
    ratio: "1:1",
    provider: "openai",
  });
  assert.equal(v1.provider, "openai");
  assert.equal(v1.model, "gpt-image-2.5-flare");

  const v2 = validateImage({
    quote: "오늘도 행복한 하루",
    topic: "일상 위로",
    ratio: "9:16",
    provider: "free",
  });
  assert.equal(v2.provider, "free");
  assert.equal(v2.model, "pollinations-flux");

  assert.throws(
    () =>
      validateImage({
        quote: "오늘도 행복한 하루",
        topic: "일상 위로",
        ratio: "1:1",
        provider: "unknown",
      }),
    /지원하지 않는 이미지 제공자입니다/,
  );
});

test("generateImage with free provider calls Pollinations FLUX and returns data URL", async () => {
  let calledUrl = "";
  const mockCall = async (url) => {
    calledUrl = String(url);
    return {
      ok: true,
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: async () => Buffer.from("dummy-flux-image-binary"),
    };
  };

  const input = validateImage({
    quote: "따뜻한 차 한 잔의 여유",
    topic: "휴식",
    ratio: "1:1",
    provider: "free",
  });

  const dataUrl = await generateImage("free", input, undefined, mockCall);
  assert.ok(calledUrl.includes("image.pollinations.ai/prompt/"));
  assert.ok(calledUrl.includes("model=flux"));
  assert.ok(dataUrl.startsWith("data:image/jpeg;base64,"));
});

test("generateImage with openai provider calls OpenAI endpoint and parses b64_json", async () => {
  let capturedAuth = "";
  let capturedBody = {};
  const mockCall = async (url, opts) => {
    capturedAuth = opts?.headers?.Authorization;
    capturedBody = JSON.parse(opts?.body || "{}");
    return {
      ok: true,
      json: async () => ({
        data: [{ b64_json: Buffer.from("dummy-openai-image").toString("base64") }],
      }),
    };
  };

  const input = validateImage({
    quote: "새벽의 고요함",
    topic: "새벽 감성",
    ratio: "1:1",
    provider: "openai",
  });

  const dataUrl = await generateImage("sk-test-key", input, undefined, mockCall);
  assert.equal(capturedAuth, "Bearer sk-test-key");
  assert.equal(capturedBody.model, "gpt-image-2.5-flare");
  assert.ok(dataUrl.startsWith("data:image/png;base64,"));
});
