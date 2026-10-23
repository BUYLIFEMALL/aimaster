// 공급자 어댑터 — 실제 호출 없이(무료) 가짜 fetch로 요청 주소·머리글·본문 모양과 응답 해석을 검사한다.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { findModel } from "../lib/providers/catalog.ts";
import { geminiAdapter } from "../lib/providers/adapters/gemini.ts";
import { elevenlabsAdapter } from "../lib/providers/adapters/elevenlabs.ts";
import { falAdapter } from "../lib/providers/adapters/fal.ts";
import { replicateAdapter } from "../lib/providers/adapters/replicate.ts";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init, body: init.body ? JSON.parse(init.body) : undefined });
    return handler(String(url), init, calls.length);
  };
  return calls;
}
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

const input = { prompt: "잔잔한 피아노 발라드", title: "빗소리", lyrics: "[Verse]\n창밖에 비", instrumental: false, durationS: 90, language: "Korean" };

test("Lyria: interactions 호출, 응답의 audio(base64)·가사를 꺼낸다", async () => {
  const audio = Buffer.from("ID3fake-mp3").toString("base64");
  const calls = mockFetch(() => json({ steps: [{ type: "model_output", content: [{ type: "text", text: "가사 줄" }, { type: "audio", data: audio, mime_type: "audio/mpeg" }] }] }));
  const r = await geminiAdapter.start(findModel("gemini:lyria-3.5"), input, "KEY");
  assert.equal(calls[0].url, "https://generativelanguage.googleapis.com/v1beta/interactions");
  assert.equal(calls[0].init.headers["x-goog-api-key"], "KEY");
  assert.equal(calls[0].body.model, "lyria-3.5");
  assert.deepEqual(calls[0].body.response_format, { type: "audio" });
  assert.match(calls[0].body.input, /Lyrics:\n\[Verse\]/);
  assert.match(calls[0].body.input, /about 90 seconds/);
  assert.equal(r.kind, "done");
  assert.equal(Buffer.from(r.files[0].data).toString(), "ID3fake-mp3");
  assert.equal(r.lyricsOut, "가사 줄");
});

test("Lyria: 음원이 없으면 안전 필터 안내 오류", async () => {
  mockFetch(() => json({ steps: [{ type: "model_output", content: [{ type: "text", text: "거절" }] }] }));
  await assert.rejects(geminiAdapter.start(findModel("gemini:lyria-3.5"), input, "K"), /안전 필터/);
});

test("Lyria: 401은 키 확인 안내(키 값은 메시지에 없음)", async () => {
  mockFetch(() => new Response("bad key", { status: 401 }));
  await assert.rejects(geminiAdapter.start(findModel("gemini:lyria-3.5"), input, "SECRET-KEY"), (e) => /API 키를 확인/.test(e.message) && !e.message.includes("SECRET-KEY"));
});

test("ElevenLabs: /v1/music 본문(길이 ms·모델·연주곡)과 음원 바이트", async () => {
  const calls = mockFetch(() => new Response(new Uint8Array(2048), { status: 200, headers: { "content-type": "audio/mpeg" } }));
  const r = await elevenlabsAdapter.start(findModel("elevenlabs:music_v2_5"), { ...input, instrumental: true }, "XI");
  assert.match(calls[0].url, /^https:\/\/api\.elevenlabs\.io\/v1\/music\?output_format=/);
  assert.equal(calls[0].init.headers["xi-api-key"], "XI");
  assert.equal(calls[0].body.music_length_ms, 90_000);
  assert.equal(calls[0].body.model_id, "music_v2_5");
  assert.equal(calls[0].body.force_instrumental, true);
  assert.doesNotMatch(calls[0].body.prompt, /Lyrics:/);
  assert.equal(r.files[0].data.byteLength, 2048);
});

test("fal: 대기열 제출 → status_url·response_url 저장 → 완료 시 audio.url", async () => {
  const calls = mockFetch((url) => {
    if (url.startsWith("https://queue.fal.run/fal-ai/minimax-music/v2.6?fal_webhook=")) return json({ request_id: "r1", status_url: "https://queue.fal.run/fal-ai/minimax-music/requests/r1/status", response_url: "https://queue.fal.run/fal-ai/minimax-music/requests/r1" });
    if (url.endsWith("/status")) return json({ status: "COMPLETED" });
    return json({ audio: { url: "https://v3.fal.media/x.mp3" } });
  });
  const m = findModel("fal:fal-ai/minimax-music/v2.6");
  const s = await falAdapter.start(m, input, "FK");
  assert.equal(calls[0].init.headers.Authorization, "Key FK");
  assert.equal(new URL(calls[0].url).searchParams.get("fal_webhook"), "https://ai-music-studio.buylife.xyz/api/webhooks/fal");
  assert.equal(calls[0].body.lyrics, input.lyrics);
  assert.equal(s.kind, "queued");
  const p = await falAdapter.poll(m, s.taskId, s.meta, "FK");
  assert.deepEqual(p, { state: "done", files: [{ url: "https://v3.fal.media/x.mp3" }] });
});

test("fal: 가사가 비면 lyrics_optimizer, 연주곡이면 is_instrumental", async () => {
  const calls = mockFetch(() => json({ request_id: "r", status_url: "s", response_url: "o" }));
  const m = findModel("fal:fal-ai/minimax-music/v2.6");
  await falAdapter.start(m, { ...input, lyrics: "" }, "K");
  await falAdapter.start(m, { ...input, instrumental: true }, "K");
  assert.equal(calls[0].body.lyrics_optimizer, true);
  assert.equal(calls[1].body.is_instrumental, true);
});

test("fal: 진행 중이면 processing, 실패(error)면 failed", async () => {
  mockFetch(() => json({ status: "IN_PROGRESS" }));
  const m = findModel("fal:fal-ai/ace-step");
  assert.deepEqual(await falAdapter.poll(m, "r", { status_url: "s", response_url: "o" }, "K"), { state: "processing" });
  mockFetch(() => json({ status: "COMPLETED", error: "boom" }));
  const f = await falAdapter.poll(m, "r", { status_url: "s", response_url: "o" }, "K");
  assert.equal(f.state, "failed");
});

test("Replicate: 공식 모델 예측 제출·조회, 결과 주소에 인증 머리글", async () => {
  const calls = mockFetch((url) => {
    if (url.endsWith("/predictions") ) return json({ id: "p1", status: "starting" }, 201);
    return json({ status: "succeeded", output: "https://replicate.delivery/a.mp3" });
  });
  const m = findModel("replicate:stability-ai/stable-audio-2.5");
  const s = await replicateAdapter.start(m, { ...input, instrumental: true }, "R8");
  assert.equal(calls[0].url, "https://api.replicate.com/v1/models/stability-ai/stable-audio-2.5/predictions");
  assert.equal(calls[0].init.headers.Authorization, "Bearer R8");
  assert.deepEqual(calls[0].body, { input: { prompt: input.prompt, duration: 90 }, webhook: "https://ai-music-studio.buylife.xyz/api/webhooks/replicate", webhook_events_filter: ["completed"] });
  const p = await replicateAdapter.poll(m, s.taskId, {}, "R8");
  assert.equal(p.state, "done");
  assert.equal(p.files[0].url, "https://replicate.delivery/a.mp3");
  assert.equal(p.files[0].fetchHeaders.Authorization, "Bearer R8");
});

test("Replicate: MiniMax 2.5는 lyrics·prompt, 실패 상태는 failed", async () => {
  const calls = mockFetch((url) => (url.endsWith("/predictions") ? json({ id: "p" }, 201) : json({ status: "failed", error: "nsfw" })));
  const m = findModel("replicate:minimax/music-2.5");
  await replicateAdapter.start(m, input, "R");
  assert.deepEqual(Object.keys(calls[0].body.input).sort(), ["lyrics", "prompt"]);
  const p = await replicateAdapter.poll(m, "p", {}, "R");
  assert.equal(p.state, "failed");
});

test("ElevenLabs: 가사에 구간 표시가 있으면 작곡 계획(composition_plan)으로 보낸다 (v1.03)", async () => {
  const calls = mockFetch(() => new Response(new Uint8Array(2048), { status: 200, headers: { "content-type": "audio/mpeg" } }));
  const r = await elevenlabsAdapter.start(findModel("elevenlabs:music_v2_5"), { ...input, lyrics: "[Verse]\n창밖에 비\n두 번째 줄\n[Chorus]\n후렴", durationS: 30 }, "XI");
  assert.equal(calls[0].body.prompt, undefined);
  assert.equal(calls[0].body.music_length_ms, undefined);
  assert.equal(calls[0].body.composition_plan.chunks.length, 2);
  assert.equal(calls[0].body.composition_plan.chunks[0].text, "[Verse]\n창밖에 비\n두 번째 줄");
  assert.match(r.actual, /작곡 계획 2구간/);
});

test("Lyria 3.5: 이미지가 있으면 input을 텍스트+이미지 묶음으로, WAV면 response_format.mime_type (v1.06)", async () => {
  const audio = Buffer.from("RIFFfake").toString("base64");
  const calls = mockFetch(() => json({ steps: [{ type: "model_output", content: [{ type: "audio", data: audio, mime_type: "audio/wav" }] }] }));
  const r = await geminiAdapter.start(findModel("gemini:lyria-3.5"), { ...input, format: "wav", images: [{ mimeType: "image/jpeg", data: "AAAA" }] }, "K");
  assert.ok(Array.isArray(calls[0].body.input));
  assert.equal(calls[0].body.input[0].type, "text");
  assert.deepEqual(calls[0].body.input[1], { type: "image", mime_type: "image/jpeg", data: "AAAA" });
  assert.deepEqual(calls[0].body.response_format, { type: "audio", mime_type: "audio/wav" });
  assert.equal(r.files[0].contentType, "audio/wav");
  assert.match(r.actual, /이미지 1장 · WAV/);
});

test("Lyria 3 Clip은 이미지·WAV 선택을 무시한다(지원 모델만)", async () => {
  const calls = mockFetch(() => json({ steps: [{ type: "model_output", content: [{ type: "audio", data: "QQ==" }] }] }));
  await geminiAdapter.start(findModel("gemini:lyria-3-clip-preview"), { ...input, format: "wav", images: [{ mimeType: "image/jpeg", data: "AAAA" }] }, "K");
  assert.equal(typeof calls[0].body.input, "string");
  assert.deepEqual(calls[0].body.response_format, { type: "audio" });
});

// 2026-10-23 Mureka(코드만 준비, MUREKA_ENABLED=false) — 실제 호출 없이 요청 주소·본문과 상태 해석만 검사
import { murekaAdapter } from "../lib/providers/adapters/mureka.ts";
import { MUREKA_MODELS, MUREKA_ENABLED, VISIBLE_PROVIDERS, findModel as findModel2 } from "../lib/providers/catalog.ts";

test("Mureka: 꺼져 있는 동안 모델·키 칸이 화면에 나오지 않는다", () => {
  assert.equal(MUREKA_ENABLED, false);
  assert.equal(findModel2("mureka:auto"), undefined);
  assert.ok(!VISIBLE_PROVIDERS.some((p) => p.id === "mureka"));
});

test("Mureka: 보컬곡은 /v1/song/generate(가사 포함), 연주곡은 /v1/instrumental/generate", async () => {
  const m = MUREKA_MODELS[0];
  const calls = mockFetch(() => json({ id: "435134" }));
  const r = await murekaAdapter.start(m, input, "MK");
  assert.equal(calls[0].url, "https://api.mureka.ai/v1/song/generate");
  assert.equal(calls[0].init.headers.Authorization, "Bearer MK");
  assert.equal(calls[0].body.model, "auto");
  assert.match(calls[0].body.lyrics, /창밖에 비/);
  assert.deepEqual(r, { kind: "queued", taskId: "435134", meta: { kind: "song" } });
  const r2 = await murekaAdapter.start(m, { ...input, instrumental: true }, "MK");
  assert.equal(calls[1].url, "https://api.mureka.ai/v1/instrumental/generate");
  assert.equal(calls[1].body.lyrics, undefined);
  assert.equal(r2.meta.kind, "instrumental");
});

test("Mureka: 상태 해석 — 진행 중 / 완료(choices[].url) / 실패", async () => {
  const m = MUREKA_MODELS[0];
  const calls = mockFetch((_u, _i, n) => n === 1 ? json({ status: "preparing" }) : n === 2 ? json({ status: "succeeded", choices: [{ url: "https://cdn.mureka.ai/a.mp3" }, { url: "https://cdn.mureka.ai/b.mp3" }] }) : json({ status: "timeouted" }));
  assert.deepEqual(await murekaAdapter.poll(m, "1", { kind: "instrumental" }, "MK"), { state: "processing" });
  assert.equal(calls[0].url, "https://api.mureka.ai/v1/instrumental/query/1");
  const done = await murekaAdapter.poll(m, "1", { kind: "song" }, "MK");
  assert.equal(done.state, "done");
  assert.deepEqual(done.files.map((f) => f.url), ["https://cdn.mureka.ai/a.mp3", "https://cdn.mureka.ai/b.mp3"]);
  const failed = await murekaAdapter.poll(m, "1", { kind: "song" }, "MK");
  assert.equal(failed.state, "failed");
  assert.match(failed.error, /timeouted/);
});

test("Stable Audio 3(fal): 대기열 주소와 duration·mp3 입력", async () => {
  const calls = mockFetch(() => json({ request_id: "r1", status_url: "https://queue.fal.run/x/status", response_url: "https://queue.fal.run/x" }));
  const m = findModel("fal:fal-ai/stable-audio-3/medium/text-to-audio");
  assert.ok(m && !m.vocals && m.maxDurationS === 380);
  await falAdapter.start(m, { ...input, instrumental: true, durationS: 200 }, "FK");
  assert.match(calls[0].url, /^https:\/\/queue\.fal\.run\/fal-ai\/stable-audio-3\/medium\/text-to-audio\?fal_webhook=/);
  assert.deepEqual(calls[0].body, { prompt: "잔잔한 피아노 발라드", duration: 200, output_format: "mp3" });
});
