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

  // ECOM-20261118-03: 무료 엔진은 정책 결정 전 꺼짐 — 기본값 대신 「준비 중」 거절(옛 기대값: provider free·model pollinations-flux).
  assert.throws(
    () => validateImage({ quote: "오늘도 행복한 하루", topic: "일상 위로", ratio: "9:16", provider: "free" }),
    /준비 중/,
  );

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
    // ECOM-20261118-03: 본문은 스트림으로 상한까지만 읽고, 실제 JPEG 서명이 있어야 통과(옛 가짜 바이트는 이제 거절).
    return {
      ok: true,
      headers: new Headers({ "content-type": "image/jpeg" }),
      body: new Blob([Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16, 3)])]).stream(),
    };
  };

  // 무료 엔진은 지금 validateImage가 거절하므로, 꺼진 상태에서도 서비스 방어가 동작하는지 입력을 직접 만들어 본다.
  const input = { quote: "따뜻한 차 한 잔의 여유", topic: "휴식", ratio: "1:1", provider: "free", model: "pollinations-flux" };

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
        // ECOM-20261118-03: 실제 PNG 서명이 있는 바이트(옛 가짜 문자열은 이제 거절)
        data: [{ b64_json: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16, 4)]).toString("base64") }],
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

// ── ECOM-20261118-03 QA049 반례(I-F01~04) — 모의 응답만, 실제 네트워크 0 ──
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 2)]);
const base = { quote: "새벽의 고요함", topic: "새벽 감성", ratio: "1:1" };
const okOpenAi = (b64 = PNG.toString("base64")) => async () => ({ ok: true, json: async () => ({ data: [{ b64_json: b64 }] }) });
const freeInput = { ...base, provider: "free", model: "pollinations-flux" };

test("I-F01: OpenAI 모델은 공식 확인 목록만 — 임의·타사·객체 모델은 외부 호출 전 400", () => {
  for (const model of ["arbitrary-model", "gemini-nano-banana-2.1", { x: 1 }, "x".repeat(65)]) {
    assert.throws(() => validateImage({ ...base, provider: "openai", model }), /지원하지 않는 이미지 모델/);
  }
  assert.equal(validateImage({ ...base, provider: "openai", model: "gpt-image-2.5-flare" }).model, "gpt-image-2.5-flare");
  assert.throws(() => validateImage({ ...base, provider: { p: 1 } }), /지원하지 않는 이미지 제공자/);
});

test("무료 엔진(FLUX, 키 없음)은 정책 결정 전 서버에서 거절", () => {
  assert.throws(() => validateImage({ ...base, provider: "free" }), /준비 중/);
});

test("I-F02: OpenAI 응답 — 잘못된·빈·패딩 오류·과대·이미지 아닌 base64는 502", async () => {
  const bad = ["!!!!", "", "QUJD=", "A".repeat(5 * 1024 * 1024), Buffer.from("<html>error</html>").toString("base64")];
  for (const b64 of bad) {
    await assert.rejects(generateImage("k", validateImage({ ...base, provider: "openai" }), undefined, okOpenAi(b64)), (e) => e.status === 502);
  }
  const ok = await generateImage("k", validateImage({ ...base, provider: "openai" }), undefined, okOpenAi());
  assert.ok(ok.startsWith("data:image/png;base64,"));
});

test("I-F03: OpenAI가 url만 주면 두 번째 요청 없이 502", async () => {
  let calls = 0;
  await assert.rejects(
    generateImage("k", validateImage({ ...base, provider: "openai" }), undefined, async () => {
      calls++;
      return { ok: true, json: async () => ({ data: [{ url: "http://127.0.0.1:4321/private-fixture" }] }) };
    }),
    (e) => e.status === 502,
  );
  assert.equal(calls, 1);
});

test("OpenAI 요청 본문: 공식 표준 크기만, response_format 보내지 않음", async () => {
  const sizes = {};
  for (const ratio of ["1:1", "9:16", "3:4"]) {
    await generateImage("k", validateImage({ ...base, ratio, provider: "openai" }), undefined, async (_u, o) => {
      const body = JSON.parse(o.body);
      sizes[ratio] = body.size;
      assert.equal(body.response_format, undefined);
      return { ok: true, json: async () => ({ data: [{ b64_json: PNG.toString("base64") }] }) };
    });
  }
  assert.deepEqual(sizes, { "1:1": "1024x1024", "9:16": "1024x1536", "3:4": "1024x1536" });
});

test("I-F04: 자체 전체 시간 제한(주입 20ms) — 멈춘 서버는 TimeoutError, 부모 취소는 AbortError, 재시도 0", async () => {
  let calls = 0;
  const hang = async (_u, o) => {
    calls++;
    return new Promise((_, reject) => o.signal.addEventListener("abort", () => reject(o.signal.reason)));
  };
  await assert.rejects(generateImage("k", validateImage({ ...base, provider: "openai" }), undefined, hang, 20), (e) => e.name === "TimeoutError");
  assert.equal(calls, 1);
  const ac = new AbortController();
  const p = generateImage("k", validateImage({ ...base, provider: "openai" }), ac.signal, hang, 60_000);
  ac.abort();
  await assert.rejects(p, (e) => e.name === "AbortError");
});

test("무료 경로(꺼진 상태에서도 코드 방어): 이미지 아닌 본문·상한 초과·리다이렉트 금지·본문 읽기 중 시간 제한", async () => {
  const resp = (bytes, type = "image/jpeg") => ({ ok: true, headers: new Headers({ "content-type": type }), body: new Blob([bytes]).stream() });
  await assert.rejects(generateImage("free", freeInput, undefined, async () => resp(Buffer.from("<html>error</html>"), "text/html")), (e) => e.status === 502);
  await assert.rejects(generateImage("free", freeInput, undefined, async () => resp(Buffer.concat([JPG, Buffer.alloc(4 * 1024 * 1024)]))), (e) => e.status === 502);
  let opts;
  const ok = await generateImage("free", freeInput, undefined, async (_u, o) => ((opts = o), resp(JPG, "text/plain")));
  assert.equal(opts.redirect, "error");
  assert.ok(ok.startsWith("data:image/jpeg;base64,"));
  // 본문이 오다가 멈추면 같은 예산 신호로 끊긴다
  const stalled = async (_u, o) => ({
    ok: true,
    headers: new Headers(),
    body: new ReadableStream({ start(c) { c.enqueue(JPG); o.signal.addEventListener("abort", () => c.error(o.signal.reason)); } }),
  });
  await assert.rejects(generateImage("free", freeInput, undefined, stalled, 20), (e) => e.name === "TimeoutError");
});
