// 받아쓰기 모델 선택·Gemini 응답 검사(2026-11-10) — 네트워크 없음
import test from "node:test";
import assert from "node:assert/strict";
import { TRANSCRIBE_MODELS, defaultTranscribeModel, isTranscribeModel, parseGeminiSegments, transcribeCostWon } from "../lib/clip/transcribe.ts";

test("모델 목록: Gemini 2개 + whisper-1, Claude 없음(음성 입력 없음)", () => {
  assert.deepEqual(TRANSCRIBE_MODELS.map((m) => m.id), ["gemini-3.8-flash", "gemini-3.5-flash-lite", "whisper-1"]);
  assert.ok(!TRANSCRIBE_MODELS.some((m) => /claude/.test(m.id)));
  assert.equal(isTranscribeModel("gpt-transcribe"), false); // 문장 시각이 없어 제외
});

test("기본값: 가진 키 중 Gemini 3.8 Flash 먼저, 고른 모델은 키가 있을 때만 유지", () => {
  assert.equal(defaultTranscribeModel(["gemini", "openai"]), "gemini-3.8-flash");
  assert.equal(defaultTranscribeModel(["openai"]), "whisper-1");
  assert.equal(defaultTranscribeModel([]), "gemini-3.8-flash");
  assert.equal(defaultTranscribeModel(["gemini", "openai"], "whisper-1"), "whisper-1");
  assert.equal(defaultTranscribeModel(["gemini"], "whisper-1"), "gemini-3.8-flash"); // 키 없는 선택은 버림
  assert.equal(defaultTranscribeModel(["gemini"], "gemini-3.5-flash-lite"), "gemini-3.5-flash-lite");
  assert.equal(defaultTranscribeModel(["gemini"], "엉뚱한값"), "gemini-3.8-flash");
});

test("비용 안내: 길이에 비례, 최소 1원", () => {
  assert.equal(transcribeCostWon("gemini-3.8-flash", 180), 10);
  assert.equal(transcribeCostWon("whisper-1", 180), 25);
  assert.equal(transcribeCostWon("gemini-3.5-flash-lite", 5), 1);
});

test("Gemini 응답: 정렬·빈 글 제거·길이 넘김 잘라냄·겹침 정리", () => {
  const segs = parseGeminiSegments({ segments: [
    { start: 5.2, end: 9, text: " 둘째  문장 " },
    { start: 0, end: 5.5, text: "첫째 문장" },
    { start: 9, end: 9, text: "길이 0" },
    { start: 10, end: 30, text: "끝 넘김" },
    { start: "x", end: 3, text: "숫자 아님" },
    { start: 12, end: 14, text: "" },
    { start: 25, end: 26, text: "소리 밖" },
  ] }, 16.9);
  assert.deepEqual(segs, [
    { start: 0, end: 5.2, text: "첫째 문장" },
    { start: 5.2, end: 9, text: "둘째 문장" },
    { start: 10, end: 16.9, text: "끝 넘김" },
  ]);
});

test("Gemini 응답: 모양이 다르면 빈 배열", () => {
  assert.deepEqual(parseGeminiSegments(null, 10), []);
  assert.deepEqual(parseGeminiSegments({ segments: "x" }, 10), []);
  assert.deepEqual(parseGeminiSegments({ segments: [] }, 10), []);
});

test("WAV 자르기: 조각 길이·시작 초·머리말 크기, 조용한 곳에서 자름", async () => {
  const { encodeWav } = await import("../lib/clip/clipPlan.ts");
  const { splitWav } = await import("../lib/clip/transcribe.ts");
  const rate = 16000;
  // 25초: 대부분 소리(0.5), 8.0~8.2초만 조용함 → 10초 목표면 8.1초 근처에서 잘려야 함
  const s = new Float32Array(rate * 25).fill(0.5);
  s.fill(0, rate * 8, rate * 8.2);
  const parts = splitWav(encodeWav(s, rate), 10);
  assert.ok(parts.length >= 3);
  assert.equal(parts[0].offset, 0);
  assert.ok(parts[1].offset > 8 && parts[1].offset < 8.25, String(parts[1].offset));
  const totalSamples = parts.reduce((n, p) => n + (p.wav.byteLength - 44) / 2, 0);
  assert.equal(totalSamples, rate * 25);
  for (const p of parts) {
    const v = new DataView(p.wav.buffer);
    assert.equal(v.getUint32(40, true), p.wav.byteLength - 44);
    assert.equal(v.getUint32(24, true), rate);
    assert.ok((p.wav.byteLength - 44) / 2 <= rate * 10);
  }
  // 짧은 소리는 한 조각
  assert.equal(splitWav(encodeWav(new Float32Array(rate * 3), rate), 10).length, 1);
});
