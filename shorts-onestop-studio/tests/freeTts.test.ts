// v1.42 무료 음성(브라우저 Supertone) — 순수 함수 시험(모델 내려받기·계산 없음). 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { freeTtsErrorText, sentenceWords, writeWav, FREE_TTS_VOICES } from "../src/lib/freeTts/protocol.ts";
import { normalizeAudio, startsFromWords, TTS_VOICES } from "../src/lib/voice.ts";
import { FREE_VOICE_NOTE, usesFreeVoice } from "../src/lib/script.ts";

test("문장 시각 → 낱말 시작 시각(문장 안은 글자 수 비율)", () => {
  const w = sentenceWords([{ text: "안녕 하세요", start: 0, end: 1 }, { text: "반갑습니다", start: 1.3, end: 2.3 }]);
  assert.deepEqual(w.map((x) => x.word), ["안녕", "하세요", "반갑습니다"]);
  assert.equal(w[0].start, 0);
  assert.ok(Math.abs(w[1].start - 0.4) < 1e-9); // 2글자 / 5글자
  assert.equal(w[2].start, 1.3);
});

test("대본 낱말 수와 같은 개수의 자막 시각이 나온다", () => {
  const text = "가을 여행지 다섯 곳. 첫 번째는 내장산입니다.";
  const starts = startsFromWords(text, sentenceWords([{ text: "가을 여행지 다섯 곳.", start: 0, end: 1.6 }, { text: "첫 번째는 내장산입니다.", start: 1.9, end: 3.4 }]));
  assert.equal(starts?.length, 7);
  assert.ok(starts!.every((t, i) => i === 0 || t >= starts![i - 1]));
  assert.ok(starts![4] >= 1.9);
});

test("WAV 머리말: 16bit 모노, 길이 표기", () => {
  const v = new DataView(writeWav(new Float32Array([0, 0.5, -1, 2]), 44100));
  assert.equal(v.byteLength, 44 + 8);
  assert.equal(String.fromCharCode(v.getUint8(0), v.getUint8(1), v.getUint8(2), v.getUint8(3)), "RIFF");
  assert.equal(v.getUint16(22, true), 1);
  assert.equal(v.getUint32(24, true), 44100);
  assert.equal(v.getInt16(44 + 6, true), 32767); // 범위를 넘는 값은 잘라 냄
});

test("오류 → 한국어 안내(내려받기·메모리·그 밖)", () => {
  assert.match(freeTtsErrorText("download:503"), /받지 못했습니다/);
  assert.match(freeTtsErrorText("RangeError: Array buffer allocation failed"), /메모리/);
  assert.match(freeTtsErrorText("이상한 오류"), /만들지 못했습니다/);
});

test("음성 설정: 무료 음성 목소리 10개·빠르기 0.9~1.5, 기본값은 그대로 OpenAI", () => {
  assert.deepEqual(TTS_VOICES.browser.map((v) => v.id), FREE_TTS_VOICES.map((v) => v.id));
  const a = normalizeAudio({ model: "supertonic-3", voice: "M3", speed: 2 } as never);
  assert.equal(a.provider, "browser"); assert.equal(a.voice, "M3"); assert.equal(a.speed, 1.5);
  assert.equal(normalizeAudio({ model: "supertonic-3", voice: "nova", speed: 0.5 } as never).voice, "F1");
  assert.equal(normalizeAudio({ model: "supertonic-3", speed: 0.5 } as never).speed, 0.9);
  assert.equal(normalizeAudio(undefined).provider, "openai");
});

test("무료 음성을 쓴 장면이 있으면 유튜브 설명란에 합성음 표기", () => {
  const v = (free?: boolean) => ({ path: "u/voice/a.wav", dur: 2, text: "안녕", ...(free ? { free } : {}) });
  const mk = (free?: boolean) => ({ intro: { narration: "안녕", voice: v(free) }, cards: [], outro: { narration: "" } }) as never;
  assert.equal(usesFreeVoice(mk(true)), true);
  assert.equal(usesFreeVoice(mk()), false);
  assert.match(FREE_VOICE_NOTE, /AI 합성 음성/);
});
