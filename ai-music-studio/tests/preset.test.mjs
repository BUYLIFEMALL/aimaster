import { test } from "node:test";
import assert from "node:assert/strict";
import { presetFromRow, isGenerationId } from "../lib/preset.ts";

const row = { provider: "gemini", model: "lyria-3.5", prompt: "calm piano", title: "노을", lyrics: "[Verse]\n가사", instrumental: false, duration_s: 90, options: { language: "ko", format: "wav" } };

test("지난 곡 설정을 그대로 채움", () => {
  const p = presetFromRow(row);
  assert.equal(p.modelKey, "gemini:lyria-3.5");
  assert.equal(p.prompt, "calm piano");
  assert.equal(p.title, "노을");
  assert.equal(p.lyrics, "[Verse]\n가사");
  assert.equal(p.language, "ko");
  assert.equal(p.durationS, 90);
  assert.equal(p.fromTitle, "노을");
});

test("WAV는 지원 모델일 때만, 아니면 mp3", () => {
  assert.equal(presetFromRow(row).format, "wav");
  assert.equal(presetFromRow({ ...row, provider: "elevenlabs", model: "music_v2_5" }).format, "mp3");
});

test("없어진·숨김 모델은 모델만 비움", () => {
  const p = presetFromRow({ ...row, provider: "mureka", model: "auto" });
  assert.equal(p.modelKey, null);
  assert.equal(p.prompt, "calm piano");
});

test("빈 값 기본: 언어 auto, 길이 120, 제목 없으면 설명 앞부분", () => {
  const p = presetFromRow({ ...row, title: null, lyrics: null, duration_s: null, options: {} });
  assert.equal(p.language, "auto");
  assert.equal(p.durationS, 120);
  assert.equal(p.lyrics, "");
  assert.equal(p.fromTitle, "calm piano");
});

test("곡 번호 형식 검사", () => {
  assert.equal(isGenerationId("0f8fad5b-d9cb-469f-a165-70867728950e"), true);
  assert.equal(isGenerationId("x' or 1=1"), false);
  assert.equal(isGenerationId(undefined), false);
});

import { presetFromFmsDraft } from "../lib/preset.ts";

test("무료음악 초안 → 미리 채우기(D-11): 노래·연주곡·효과음·길이", () => {
  const v = presetFromFmsDraft({ title: "달빛 산책", style_prompt: "city pop, 108 BPM", lyrics: "[Verse]\r\n가사", duration_sec: 180 });
  assert.equal(v.title, "달빛 산책");
  assert.equal(v.prompt, "city pop, 108 BPM");
  assert.equal(v.lyrics, "[Verse]\n가사");
  assert.equal(v.instrumental, false);
  assert.equal(v.durationS, 180);
  assert.equal(v.modelKey, null);
  const i = presetFromFmsDraft({ title: "x", style_prompt: "lo-fi", lyrics: "[Instrumental]", duration_sec: 999 });
  assert.equal(i.instrumental, true);
  assert.equal(i.lyrics, "");
  assert.equal(i.durationS, 300);
  assert.equal(presetFromFmsDraft({ title: "비", style_prompt: "rain", lyrics: "[SFX]", duration_sec: 30 }), null);
});
