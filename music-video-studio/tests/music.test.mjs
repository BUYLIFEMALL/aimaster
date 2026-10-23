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

test("v1.13 곡 정보: AI 음악 스튜디오 곡 번호·내 파일만 남기고 잘못된 값은 버림", () => {
  assert.equal(defaultProject().song, null);
  const ams = sanitizeProject({ song: { source: "ams", ref: "526da72d-0000-4000-8000-000000000001:1", title: "노을", durationS: 61.6, model: "V6" } }).song;
  assert.deepEqual(ams, { source: "ams", title: "노을", ref: "526da72d-0000-4000-8000-000000000001:1", durationS: 62, model: "V6" });
  assert.equal(sanitizeProject({ song: { source: "ams", ref: "../x", title: "a" } }).song, null);
  assert.equal(sanitizeProject({ song: { source: "http", title: "a" } }).song, null);
  const file = sanitizeProject({ song: { source: "file", title: "", fileName: "my.mp3", durationS: -3, ref: "zzz" } }).song;
  assert.deepEqual(file, { source: "file", title: "내 곡", fileName: "my.mp3", durationS: null });
});

test("장면 길이: 가사 시간표에 맞춤 / 못 맞추면 null", async () => {
  const { sceneLengthsFromLyrics, normalizeLyric } = await import("../src/lib/music/sceneTiming.ts");
  const raw = "[0.0:4.0] [Intro] 새벽 공기\n[4.0:8.0] 너를 부르면\n[12.0:16.0] [Chorus] 다시 만나, 우리\n[16.0:20.0] 끝없는 밤\n[30.0:34.0] 다시 만나 우리";
  // 장면 가사는 시간 표시·구간 표시가 붙어 있어도 맞춘다. 첫 장면은 0초부터, 마지막은 곡 끝까지
  assert.deepEqual(sceneLengthsFromLyrics(raw, ["[Verse 1] 너를 부르면\n...", "[12.0:16.0] 다시 만나 우리!", "(Chorus) 다시 만나, 우리"], 40), [12, 18, 10]);
  // 같은 후렴은 순서대로(두 번째 장면이 앞 후렴을 쓰면 세 번째는 뒤 후렴)
  assert.equal(normalizeLyric("[Chorus] 다시 만나, 우리!"), "다시만나우리");
  // 못 맞춘 장면이 있으면 null
  assert.equal(sceneLengthsFromLyrics(raw, ["너를 부르면", "없는 가사"], 40), null);
  // 순서가 뒤집히면 null(앞으로만 찾음)
  assert.equal(sceneLengthsFromLyrics(raw, ["끝없는 밤", "너를 부르면"], 40), null);
  // 시간 가사가 아니면 null
  assert.equal(sceneLengthsFromLyrics("[Verse 1]\n너를 부르면", ["너를 부르면"], 40), null);
  // 장면이 1초보다 짧아지면 null(곡 길이가 마지막 시작보다 짧음)
  assert.equal(sceneLengthsFromLyrics(raw, ["새벽 공기", "끝없는 밤"], 16.5), null);
  // 짧은 줄(한 글자·긴 장면 가사의 일부)은 포함 비교에 쓰지 않음
  assert.equal(sceneLengthsFromLyrics("[0.0:2.0] 아\n[2.0:5.0] 노래", ["아름다운 노래"], 10), null);
});

test("v1.19 박자 찾기: 합성 딸깍 소리의 BPM·첫 박", async () => {
  const { detectBeat } = await import("../src/lib/music/beat.ts");
  const sr = 22050;
  const click = (bpm, first, secs, seed = 1) => {
    const a = new Float32Array(sr * secs);
    let r = seed;
    for (let i = 0; i < a.length; i++) { r = (r * 16807) % 2147483647; a[i] = ((r / 2147483647) - 0.5) * 0.01; } // 약한 잡음
    for (let t = first; t < secs; t += 60 / bpm) {
      const o = Math.round(t * sr);
      for (let j = 0; j < 220 && o + j < a.length; j++) a[o + j] += Math.sin(j * 0.6) * Math.exp(-j / 60);
    }
    return a;
  };
  for (const [bpm, first] of [[120, 0.3], [90, 0.1], [140, 0.25]]) {
    const b = detectBeat(click(bpm, first, 20), sr);
    assert.ok(b, `${bpm} 찾음`);
    assert.ok(Math.abs(b.bpm - bpm) <= 1.5, `${bpm} → ${b.bpm}`);
    assert.ok(Math.abs(b.firstBeat - first) <= 0.03, `첫 박 ${first} → ${b.firstBeat}`);
  }
  // 잡음만·너무 짧음 → null
  const noise = new Float32Array(sr * 10); let r = 7; for (let i = 0; i < noise.length; i++) { r = (r * 16807) % 2147483647; noise[i] = ((r / 2147483647) - 0.5) * 0.2; }
  assert.equal(detectBeat(noise, sr), null);
  assert.equal(detectBeat(new Float32Array(sr * 2), sr), null);
  assert.equal(detectBeat(new Float32Array(sr * 10), sr), null);
});

test("v1.19 장면 전환을 박자에 맞추기", async () => {
  const { snapLengths } = await import("../src/lib/music/beat.ts");
  const beat = { period: 0.5, firstBeat: 0.2 }; // 120 BPM, 마디 2초(0.2, 2.2, 4.2 …)
  // 고르게 나눈 16초 4장면(4,8,12) → 마디 4.2·8.2·12.2로
  const s = snapLengths([4, 4, 4, 4], beat, "bar");
  assert.deepEqual(s, [4.2, 4, 4, 3.8]);
  assert.ok(Math.abs(s.reduce((a, b) => a + b, 0) - 16) < 1e-9);
  // 박 기준: 5.1 → 5.2
  assert.deepEqual(snapLengths([5.1, 4.9], beat, "beat"), [5.2, 4.8]);
  // 마디가 1.5박보다 멀면 가까운 박으로(3.1 → 마디 2.2/4.2 모두 멂 → 박 3.2)
  assert.deepEqual(snapLengths([3.1, 6.9], beat, "bar"), [3.2, 6.8]);
  // 장면이 1초보다 짧아지면 옮기지 않음
  assert.deepEqual(snapLengths([1.2, 5], { period: 0.5, firstBeat: 0 }, "beat", 1.1), [1.2, 5]); // 1.0으로 옮기면 1.1초보다 짧음
  assert.deepEqual(snapLengths([1.05, 5], { period: 0.5, firstBeat: 0 }, "bar", 1), [1, 5.05]); // 1.0초는 최소 1초를 지킴
  // 장면 1개·박 없음은 그대로
  assert.deepEqual(snapLengths([10], beat), [10]);
  assert.deepEqual(snapLengths([4, 4], { period: 0, firstBeat: 0 }), [4, 4]);
});
