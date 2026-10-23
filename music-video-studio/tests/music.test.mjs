import test from "node:test";
import assert from "node:assert/strict";
import { buildLyricsPrompt, parseLyrics, buildStoryboardPrompt, parseStoryboard, buildImagePrompt, buildVideoPrompt, extractJson } from "../src/lib/music/prompts.ts";
import { effectiveLength, estimateCost, isVeoModel, isVideoLength } from "../src/lib/music/veo.ts";
import { findVideoModel } from "../src/lib/video/videoModels.ts";
import { submitVideoJob, checkVideoJob, VideoGenError } from "../src/lib/video/videoProviders.ts";
import { defaultProject, sanitizeProject } from "../src/lib/music/project.ts";
import { VEO_MODELS, GENRES } from "../src/lib/music/presets.ts";

test("가사 프롬프트: 연도 지침·데이터 격리·입력 정리", () => {
  const p = buildLyricsPrompt({ topic: "이별 <script>", genre: "발라드" }, 2026);
  assert.match(p.system, /2026년/);
  assert.match(p.system, /<data>/);
  assert.ok(!p.user.includes("<script>"), "꺾쇠는 제거된다");
  assert.match(p.user, /발라드/);
});

test("parseLyrics: 코드 블록·누락 처리", () => {
  const ok = '```json\n{"title":"저무는 바다","sunoStyle":"Ballad, 70BPM","lyrics":"[Verse]\\n가사"}\n```';
  assert.deepEqual(parseLyrics(ok), { title: "저무는 바다", sunoStyle: "Ballad, 70BPM", lyrics: "[Verse]\n가사" });
  assert.equal(parseLyrics('{"title":"","lyrics":"x"}'), null);
  assert.equal(parseLyrics("not json"), null);
  assert.equal(extractJson("앞 {\"a\":1} 뒤").a, 1);
});

test("스토리보드: 장면 수 일치·빈 묘사 거부·한국인 지침", () => {
  const req = { title: "t", sunoStyle: "s", lyrics: "가\n나", sceneCount: 2, extra: "", artStyle: "anime", hasReferenceImages: false };
  const p = buildStoryboardPrompt(req, 2026);
  assert.match(p.system, /정확히 2입니다/);
  assert.match(p.system, /한국인/);
  const ok = JSON.stringify({ mood: "서정적", scenes: [{ lyric: "가", prompt: "wide shot" }, { lyric: "나", prompt: "close up" }] });
  assert.equal(parseStoryboard(ok, 2).scenes.length, 2);
  assert.equal(parseStoryboard(ok, 3), null);
  assert.equal(parseStoryboard(JSON.stringify({ scenes: [{ lyric: "가", prompt: "" }] }), 1), null);
});

test("이미지·영상 프롬프트: 화풍·루프 문구", () => {
  const img = buildImagePrompt({ prompt: "a quiet beach" }, "oil", "16:9", true);
  assert.match(img, /oil painting/i);
  assert.match(img, /Korean/);
  assert.match(img, /reference images/);
  assert.match(buildVideoPrompt({ prompt: "x" }, "anime", true), /loops seamlessly/);
  assert.ok(!/loops seamlessly/.test(buildVideoPrompt({ prompt: "x" }, "anime", false)));
});

// 2026-10-23 v1.12: Veo 3.1 Preview 종료 → 공용 ai-video-providers(Gemini Omni Flash). 실제 호출 없이 fetch를 가짜로 바꿔 요청 모양을 본다.
async function captureGemini(opts, reply = { id: "interactions/abc123", status: "in_progress" }) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith("data:")) return real(url);
    calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null, headers: init?.headers });
    return new Response(JSON.stringify(reply), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try { return { result: await submitVideoJob({ key: "k", model: findVideoModel("gemini-omni-1.1-flash"), prompt: "p", seconds: 6, ...opts }), calls }; }
  finally { globalThis.fetch = real; }
}
const PNG = "data:image/png;base64," + Buffer.from("x".repeat(2000)).toString("base64");

test("Omni Flash 요청: 글만 · 가로 비율 · 백그라운드 작업", async () => {
  const { result, calls } = await captureGemini({ aspectRatio: "16:9" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://generativelanguage.googleapis.com/v1beta/interactions");
  assert.equal(calls[0].body.model, "gemini-omni-1.1-flash");
  assert.equal(calls[0].body.response_format.aspect_ratio, "16:9");
  assert.equal(calls[0].body.background, true);
  assert.deepEqual(calls[0].body.input.map((i) => i.type), ["text"]);
  assert.match(calls[0].body.input[0].text, /About 6 seconds long/);
  assert.equal(calls[0].headers["x-goog-api-key"], "k");
  assert.equal(result.job.id, "interactions/abc123");
  assert.equal(result.job.withEnd, false);
});

test("Omni Flash 요청: 이미지 → 영상, 루프면 끝 화면도 같은 이미지, 비율 기본 9:16", async () => {
  const one = await captureGemini({ startUrl: PNG });
  assert.deepEqual(one.calls[0].body.input.map((i) => i.type), ["image", "text"]);
  assert.equal(one.calls[0].body.input[0].mime_type, "image/png");
  assert.equal(one.calls[0].body.response_format.aspect_ratio, "9:16");
  const loop = await captureGemini({ startUrl: PNG, endUrl: PNG, aspectRatio: "16:9" });
  assert.deepEqual(loop.calls[0].body.input.map((i) => i.type), ["image", "image", "text"]);
  assert.equal(loop.result.job.withEnd, true);
});

test("Omni Flash: 바로 끝난 응답은 영상 바이트, 사진 필요한 업체는 사진 없이 거절", async () => {
  const mp4 = Buffer.alloc(4000, 1).toString("base64");
  const done = await captureGemini({}, { id: "interactions/x1", status: "completed", steps: [{ content: [{ type: "video", mime_type: "video/mp4", data: mp4 }] }] });
  assert.ok("bytes" in done.result, "완료 응답이면 영상 바이트를 바로 돌려준다");
  await assert.rejects(() => submitVideoJob({ key: "k", model: findVideoModel("fal-ai/kling-video/o3/standard/image-to-video"), prompt: "p", seconds: 5 }), (e) => e instanceof VideoGenError && e.code === "frame");
});

test("옵션 검사·비용: Omni Flash 하나, 옛 Veo 값 거부", () => {
  assert.equal(isVeoModel("gemini-omni-1.1-flash"), true);
  assert.equal(isVeoModel("veo-3.1-lite-generate-preview"), false);
  assert.equal(isVideoLength(8), true);
  assert.equal(isVideoLength(5), false);
  assert.equal(effectiveLength(4, true, true), 4);
  assert.deepEqual(estimateCost("gemini-omni-1.1-flash", 8), { usd: 0.8, krw: 1120 });
  assert.equal(estimateCost("gemini-omni-1.1-flash", 8, 4).usd, 3.2);
  assert.equal(VEO_MODELS.length, 1);
  assert.equal(typeof checkVideoJob, "function");
});

test("저장된 옛 프로젝트: Veo 모델 값은 Omni Flash로 바뀐다", () => {
  const s = sanitizeProject({ video: { model: "veo-3.1-generate-preview", length: 6, loop: true, ratio: "9:16" } });
  assert.equal(s.video.model, "gemini-omni-1.1-flash");
  assert.equal(s.video.length, 6);
  assert.equal(s.video.ratio, "9:16");
});

test("프로젝트 정리: 범위·허용 목록·기본값", () => {
  const d = defaultProject();
  assert.equal(d.genre, GENRES[0].value);
  const s = sanitizeProject({ sceneCount: 99, artStyle: "nope", video: { model: "x", length: 5, loop: "y", ratio: "1:1" }, scenes: new Array(20).fill({ lyric: "a", prompt: "b" }) });
  assert.equal(s.sceneCount, 4);
  assert.equal(s.artStyle, "cinematic");
  assert.deepEqual(s.video, d.video);
  assert.equal(s.scenes.length, 8);
  assert.deepEqual(sanitizeProject(null), d);
});
