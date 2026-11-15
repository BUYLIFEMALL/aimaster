// 레퍼런스 받아쓰기 모델 선택(2026-11-10)
import test from "node:test";
import assert from "node:assert/strict";
import { TRANSCRIBE_MODELS, cleanTranscript, defaultTranscribeModel, geminiWordPrompt, isTranscribeModel, parseGeminiWords } from "../src/lib/transcribeModels.ts";

test("받아쓰기 모델: Gemini 2개 + OpenAI gpt-transcribe, Claude·whisper 없음", () => {
  assert.deepEqual(TRANSCRIBE_MODELS.map((m) => m.id), ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gpt-transcribe"]);
  assert.equal(isTranscribeModel("whisper-1"), false);
  assert.equal(isTranscribeModel("claude-haiku-5-5"), false);
});

test("받아쓰기 모델 기본값: 가진 키 중 Gemini 먼저, 기억한 선택은 키가 있을 때만", () => {
  assert.equal(defaultTranscribeModel(["gemini", "openai"]), "gemini-3.8-flash");
  assert.equal(defaultTranscribeModel(["openai"]), "gpt-transcribe");
  assert.equal(defaultTranscribeModel([]), "gemini-3.8-flash");
  assert.equal(defaultTranscribeModel(["gemini", "openai"], "gpt-transcribe"), "gpt-transcribe");
  assert.equal(defaultTranscribeModel(["gemini"], "gpt-transcribe"), "gemini-3.8-flash");
});

test("Gemini 받아쓴 글 정리: 울타리·머리말·공백", () => {
  assert.equal(cleanTranscript("```text\n받아쓰기: 안녕하세요.  여러분\n\n오늘은   캠핑\n```"), "안녕하세요. 여러분\n오늘은 캠핑");
  assert.equal(cleanTranscript(null), "");
  assert.equal(cleanTranscript("x".repeat(9000)).length, 8000);
});

test("v1.59 Gemini 낱말 시각: JSON 답을 읽고, 믿을 수 없는 답은 null", () => {
  assert.deepEqual(parseGeminiWords('```json\n[{"word":"오늘","start":0.1},{"word":"출근길","start":0.62}]\n```'), [{ word: "오늘", start: 0.1 }, { word: "출근길", start: 0.62 }]);
  assert.equal(parseGeminiWords("설명입니다"), null);
  assert.equal(parseGeminiWords([{ word: "하나", start: 0 }]), null); // 2개 미만
  assert.equal(parseGeminiWords([{ word: "a", start: 3 }, { word: "b", start: 1 }, { word: "c", start: 0.5 }]), null); // 거꾸로 감
  assert.equal(parseGeminiWords([{ word: "a", start: 0 }, { word: "b", start: -1 }, { word: "c", start: 999 }]), null); // 버리고 남은 게 1개
  assert.ok(geminiWordPrompt("오늘 출근길").includes("대본:\n오늘 출근길"));
});
