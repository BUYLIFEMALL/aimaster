// 대본 글자 수·예상 발화 시간 시험 — 2026-11-20 영상 담당(MOV-SVS-SPEECH-ESTIMATE). 네트워크 없음.
// 실행: node --test tests/speechEstimate.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const { SPEECH_CHARS_PER_SEC, countSpeechChars, estimateSpeechSec, sceneSpeechLabel, totalSpeech } = await import("../src/lib/speechEstimate.ts");

test("공백·문장 부호·기호는 세지 않고 글자·숫자만 센다", () => {
  assert.equal(countSpeechChars("겨울 캠핑, 준비물 3가지!"), 10);
  assert.equal(countSpeechChars("  ...!?  "), 0);
  assert.equal(countSpeechChars(""), 0);
  assert.equal(countSpeechChars(null), 0);
  assert.equal(countSpeechChars("S&P500"), 5);
});

test("분해형 한글도 같은 글자 수로 센다", () => {
  assert.equal(countSpeechChars("캠핑".normalize("NFD")), 2);
});

test("예상 시간은 글자 수 ÷ 기준 속도, 소수 첫째 자리", () => {
  assert.equal(SPEECH_CHARS_PER_SEC, 6);
  assert.equal(estimateSpeechSec("가".repeat(12)), 2);
  assert.equal(estimateSpeechSec("가".repeat(10)), 1.7);
  assert.equal(estimateSpeechSec(""), 0);
});

test("씬 표시 문구: 글자가 없으면 빈 문자열", () => {
  assert.equal(sceneSpeechLabel("가".repeat(24)), "24자 · 약 4초");
  assert.equal(sceneSpeechLabel("  "), "");
});

test("전체 합계와 목표 비교: 15% 넘게 길 때만 줄이라는 안내", () => {
  const ok = totalSpeech(["가".repeat(90), "나".repeat(90)], 30);
  assert.deepEqual({ chars: ok.chars, sec: ok.sec, over: ok.over }, { chars: 180, sec: 30, over: false });
  assert.equal(ok.label, "나레이션 180자 · 예상 약 30초 / 목표 30초");
  const edge = totalSpeech(["가".repeat(207)], 30); // 34.5초 = 정확히 115% → 넘지 않음
  assert.equal(edge.over, false);
  const long = totalSpeech(["가".repeat(240)], 30);
  assert.equal(long.over, true);
  assert.match(long.label, /목표보다 깁니다/);
});

test("목표가 없으면 비교하지 않는다", () => {
  const t = totalSpeech(["가".repeat(60), null, undefined]);
  assert.equal(t.label, "나레이션 60자 · 예상 약 10초");
  assert.equal(t.over, false);
  assert.equal(totalSpeech([], 30).label, "나레이션 0자 · 예상 약 0초 / 목표 30초");
});
