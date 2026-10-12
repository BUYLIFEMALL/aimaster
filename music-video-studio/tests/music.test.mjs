import test from "node:test";
import assert from "node:assert/strict";
import { buildLyricsPrompt, parseLyrics, buildStoryboardPrompt, parseStoryboard, buildImagePrompt, buildVideoPrompt, extractJson } from "../src/lib/music/prompts.ts";
import {
  buildVeoRequest, parseOperationStart, parseOperationStatus, isAllowedVideoUri, isAllowedOperationName, effectiveLength, estimateCost, isVeoModel, isVideoLength,
} from "../src/lib/music/veo.ts";
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

test("Veo 요청: 텍스트만 / 이미지 / 루프(첫·마지막 프레임, 8초 고정)", () => {
  const a = buildVeoRequest({ model: "veo-3.1-lite-generate-preview", prompt: "p", ratio: "16:9", length: 6, loop: true });
  assert.equal(a.url, "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-lite-generate-preview:predictLongRunning");
  assert.deepEqual(a.body, { instances: [{ prompt: "p" }], parameters: { aspectRatio: "16:9", durationSeconds: 6 } });
  const img = { mimeType: "image/jpeg", data: "AAAA" };
  const b = buildVeoRequest({ model: "veo-3.1-fast-generate-preview", prompt: "p", ratio: "9:16", length: 4, loop: false, image: img });
  assert.deepEqual(b.body.instances[0].image, { inlineData: img });
  assert.equal(b.body.instances[0].lastFrame, undefined);
  assert.equal(b.body.parameters.durationSeconds, 4);
  const c = buildVeoRequest({ model: "veo-3.1-fast-generate-preview", prompt: "p", ratio: "9:16", length: 4, loop: true, image: img });
  assert.deepEqual(c.body.instances[0].lastFrame, { inlineData: img });
  assert.equal(c.body.parameters.durationSeconds, 8);
  assert.equal(effectiveLength(4, true, true), 8);
  assert.equal(effectiveLength(4, true, false), 4);
});

test("Veo 응답: 시작·진행·완료·실패·안전필터", () => {
  assert.equal(parseOperationStart({ name: "models/veo-3.1-lite-generate-preview/operations/abc123" }), "models/veo-3.1-lite-generate-preview/operations/abc123");
  assert.equal(parseOperationStart({ name: "../../etc/passwd" }), null);
  assert.deepEqual(parseOperationStatus({ done: false }), { state: "running" });
  const uri = "https://generativelanguage.googleapis.com/v1beta/files/abc:download?alt=media";
  assert.deepEqual(parseOperationStatus({ done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri } }] } } }), { state: "done", videoUri: uri });
  assert.equal(parseOperationStatus({ done: true, error: { message: "secret detail" } }).state, "failed");
  assert.equal(parseOperationStatus({ done: true, error: { message: "secret detail" } }).message.includes("secret"), false);
  assert.equal(parseOperationStatus({ done: true, response: { generateVideoResponse: { raiMediaFilteredReasons: ["x"] } } }).state, "failed");
  // 다른 주소의 결과는 받아들이지 않는다
  assert.equal(parseOperationStatus({ done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri: "https://evil.example/x.mp4" } }] } } }).state, "failed");
});

test("내려받기·작업 이름 허용 목록", () => {
  assert.equal(isAllowedVideoUri("https://generativelanguage.googleapis.com/v1beta/files/a:download?alt=media"), true);
  assert.equal(isAllowedVideoUri("http://generativelanguage.googleapis.com/x"), false);
  assert.equal(isAllowedVideoUri("https://generativelanguage.googleapis.com.evil.com/x"), false);
  assert.equal(isAllowedVideoUri("https://user:pw@generativelanguage.googleapis.com/x"), false);
  assert.equal(isAllowedVideoUri("not a url"), false);
  assert.equal(isAllowedOperationName("models/m/operations/o-1"), true);
  assert.equal(isAllowedOperationName("models/m/operations/../x"), false);
  assert.equal(isVeoModel("veo-3.1-generate-preview"), true);
  assert.equal(isVeoModel("veo-9"), false);
  assert.equal(isVideoLength(8), true);
  assert.equal(isVideoLength(5), false);
});

test("비용 추정: 모델·길이·장면 수", () => {
  assert.deepEqual(estimateCost("veo-3.1-lite-generate-preview", 8), { usd: 0.4, krw: 560 });
  assert.equal(estimateCost("veo-3.1-generate-preview", 8, 4).usd, 12.8);
  assert.equal(VEO_MODELS.length, 3);
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
