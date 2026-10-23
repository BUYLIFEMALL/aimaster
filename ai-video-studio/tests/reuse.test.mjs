import test from "node:test";
import assert from "node:assert/strict";
import { reuseFromGeneration, sanitizeReuse, stripSafety } from "../lib/reuse.ts";
import { SAFETY } from "../lib/promptPolish.ts";

test("저장 값 정리: 맞는 칸만 남기고 길이를 자른다", () => {
  assert.deepEqual(sanitizeReuse(null), {});
  assert.deepEqual(sanitizeReuse("x"), {});
  const r = sanitizeReuse({ idea: "  한옥\n마당  ", styleId: "cinematic", cameraId: "Push; drop", polishedPrompt: "p".repeat(1300), extra: 1 });
  assert.deepEqual(Object.keys(r).sort(), ["idea", "polishedPrompt", "styleId"]);
  assert.equal(r.idea, "한옥 마당");
  assert.equal(r.polishedPrompt.length, 1200);
});

test("기록 → 화면 값: v1.11 기록은 처음 설명·화풍·카메라·다듬은 설명을 그대로", () => {
  const f = reuseFromGeneration({
    prompt: `Polished text. ${SAFETY}`, model: "kwaivgi/kling-v2.1", duration_s: 10, aspect_ratio: null,
    options: { resolution: "1080p", audio: true, idea: "첫눈", styleId: "anime", cameraId: "orbit", polishedPrompt: "Polished text." },
  });
  assert.deepEqual(f, { model: "kwaivgi/kling-v2.1", seconds: 10, aspect: null, resolution: "1080p", audio: true, idea: "첫눈", styleId: "anime", cameraId: "orbit", polishedPrompt: "Polished text." });
});

test("기록 → 화면 값: 옛 기록(idea 없음)은 안전 문구를 뗀 최종 설명을 설명 칸에", () => {
  const f = reuseFromGeneration({ prompt: `한옥 마당에 내리는 첫눈. slow push-in camera move. ${SAFETY}`, model: "m", duration_s: 5, aspect_ratio: "16:9", options: {} });
  assert.equal(f.idea, "한옥 마당에 내리는 첫눈. slow push-in camera move");
  assert.equal(f.styleId, null);
  assert.equal(f.polishedPrompt, null);
  assert.equal(f.audio, false);
  assert.equal(f.resolution, null);
});

test("안전 문구 떼기: 없으면 끝 마침표만 정리", () => {
  assert.equal(stripSafety("Just a scene."), "Just a scene");
  assert.equal(stripSafety(`A. ${SAFETY}`), "A");
});
