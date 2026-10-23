import test from "node:test";
import assert from "node:assert/strict";
import { planDurations, parseSeconds, defaultBands, clampBand, clampCrop, cellRects, keyframeFileName, safeName, formatSeconds } from "../src/lib/storyboard/plan.ts";
import { buildAnalysisPrompt, buildContactSheetPrompt, buildVideoPrompt, buildTopicPrompt } from "../src/lib/storyboard/prompts.ts";
import { normalizeAnalysis, normalizeVideoPrompts, stripMetaWords, hasMetaWords, sumDurations } from "../src/lib/storyboard/validate.ts";
import { GLOSSARY } from "../src/lib/storyboard/glossary.ts";

const kf = (i) => ({ number: `KF#0${i}`, duration: "2s", shotType: "CU", composition: "c", action: "a", camera: "cam", lighting: "l" });
const analysisRaw = () => ({
  sceneBreakdown: { subjects: ["A"], environment: "env", visualAnchors: ["x"] },
  story: { theme: "t", logline: "log", emotionalArc: ["1", "2", "3", "4"] },
  cinematicApproach: { shotProgression: "p", cameraMovement: "m", lensAndExposure: "e", lightAndColor: "c" },
  keyframes: Array.from({ length: 9 }, (_, i) => kf(i + 1)),
});

test("장면 길이 배분: 합계가 총 길이와 같고 장면 1이 가장 길다", () => {
  for (const total of [5, 8, 10, 15]) {
    const d = planDurations(total);
    assert.equal(d.length, 9);
    assert.equal(d.reduce((a, b) => a + b, 0), total);
    assert.ok(d[0] >= Math.max(...d.slice(1)));
    assert.ok(d.every((x) => x >= 0.5));
  }
  assert.equal(formatSeconds(2), "2s");
  assert.equal(formatSeconds(1.5), "1.5s");
  assert.equal(parseSeconds("2.5s"), 2.5);
  assert.equal(parseSeconds("4초"), 4);
  assert.equal(parseSeconds("abc"), null);
});

test("자르기 좌표: 9개 컷, 가로 3등분, 경계 보정", () => {
  const bands = defaultBands(1000);
  assert.equal(bands.length, 3);
  const rects = cellRects(900, { left: 0, right: 0 }, bands);
  assert.equal(rects.length, 9);
  assert.equal(rects[0].w, 300);
  assert.equal(rects[1].x, 300);
  assert.equal(rects[8].x, 600);
  const cropped = cellRects(900, { left: 30, right: 30 }, bands);
  assert.equal(cropped[0].x, 30);
  assert.equal(cropped[0].w, 280);
  assert.deepEqual(clampBand({ top: 950, bottom: 900 }, 1000), { top: 950, bottom: 951 });
  assert.deepEqual(clampBand({ top: -5, bottom: 5000 }, 1000), { top: 0, bottom: 1000 });
  assert.deepEqual(clampCrop({ left: 9999, right: -1 }, 900), { left: 450, right: 0 });
  assert.equal(keyframeFileName(0), "keyframe_01.jpg");
  assert.equal(keyframeFileName(8), "keyframe_09.jpg");
  assert.equal(safeName('a<b>:"c"'), "a_b___c_");
});

test("프롬프트: 주제·연도·인물 규칙·장면 길이 계획 포함", () => {
  const a = buildAnalysisPrompt({ topic: "비 오는 추격전", lang: "ko", year: 2026 });
  assert.match(a, /비 오는 추격전/);
  assert.match(a, /current year is 2026/);
  assert.match(a, /Korean \(East Asian\)/);
  assert.match(a, /exactly 9 items/);
  assert.doesNotMatch(buildAnalysisPrompt({ lang: "en", year: 2026 }), /USER TOPIC/);
  const v = buildVideoPrompt({ totalSeconds: 10, dialogue: "ko", lang: "ko", year: 2026 });
  assert.match(v, /Total length: 10s/);
  assert.match(v, /Scene 1 = /);
  assert.match(v, /KOREAN/);
  assert.match(buildVideoPrompt({ totalSeconds: 8, dialogue: "none", lang: "en" }), /Do not write any dialogue/);
  assert.match(buildContactSheetPrompt(normalizeAnalysis(analysisRaw())), /Panel 9:/);
  assert.match(buildTopicPrompt({ topic: "x", lang: "ko" }), /'x'/);
});

test("분석 검증: 9개 미만이면 null, 정상이면 정리", () => {
  assert.equal(normalizeAnalysis(null), null);
  const short = analysisRaw();
  short.keyframes = short.keyframes.slice(0, 5);
  assert.equal(normalizeAnalysis(short), null);
  const ok = normalizeAnalysis(analysisRaw());
  assert.equal(ok.keyframes.length, 9);
  const many = analysisRaw();
  many.keyframes = Array.from({ length: 12 }, (_, i) => kf(i + 1));
  assert.equal(normalizeAnalysis(many).keyframes.length, 9);
});

test("메타 단어 제거", () => {
  assert.ok(hasMetaWords("A storyboard panel showing a man"));
  assert.equal(stripMetaWords("A storyboard panel showing a man"), "A scene shot showing a man");
  assert.ok(!hasMetaWords(stripMetaWords("Grid of pictures in the frame")));
  assert.ok(!hasMetaWords("A man stands in the rain"));
});

test("영상 프롬프트 검증: 길이 고정·장면 1 시작어·대사 규칙·메타 단어", () => {
  const raw = {
    masterPrompt: { style: "35mm film grain", character: "a man in a panel jacket frame", environment: "rain" },
    scenes: Array.from({ length: 9 }, (_, i) => ({ id: `S0${i + 1}`, duration: "99s", shotType: "MS", prompt: i === 0 ? "A man in rain" : "A storyboard panel of a man", dialogue: "대사" })),
    meta: { totalDuration: "?", totalScenes: 9, aspectRatio: "16:9" },
  };
  const vp = normalizeVideoPrompts(raw, 10, "ko");
  assert.equal(vp.scenes.length, 9);
  assert.ok(Math.abs(sumDurations(vp.scenes) - 10) < 1e-9);
  assert.match(vp.scenes[0].prompt, /^Static cinematic shot,/);
  assert.equal(vp.scenes[0].dialogue, "");
  assert.equal(vp.scenes[8].dialogue, "");
  assert.equal(vp.scenes[3].dialogue, "대사");
  assert.ok(vp.scenes.every((s) => !hasMetaWords(s.prompt)));
  assert.ok(!hasMetaWords(vp.masterPrompt.character));
  assert.equal(vp.meta.totalDuration, "10s");
  assert.equal(normalizeVideoPrompts(raw, 10, "none").scenes[3].dialogue, "");
  assert.equal(normalizeVideoPrompts({ scenes: [] }, 10, "none"), null);
});

test("촬영 용어 사전", () => {
  assert.equal(GLOSSARY.length, 19);
  assert.ok(GLOSSARY.every((g) => g.term && g.ko && g.en));
});
