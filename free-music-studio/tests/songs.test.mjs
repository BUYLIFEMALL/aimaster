import test from "node:test";
import assert from "node:assert/strict";
import { parseSongInput, DEFAULT_DURATION, LIMITS } from "../src/lib/songs.ts";
import { toLyricModel, toLyricProvider, LYRIC_PROVIDERS } from "../src/lib/lyricModels.ts";

const ok = { title: " 비 오는 오후 ", style_prompt: "city pop, 92 BPM", lyrics: "[Verse]\r\n창가에 앉아\r\n", duration_sec: 30 };

test("정상 입력은 앞뒤 공백·줄바꿈을 정리해 통과", () => {
  const r = parseSongInput(ok);
  assert.equal(r.ok, true);
  assert.equal(r.value.title, "비 오는 오후");
  assert.equal(r.value.lyrics, "[Verse]\n창가에 앉아");
  assert.equal(r.value.duration_sec, 30);
});

test("초안의 프로젝트: 없으면 null, uuid만 받음", () => {
  const base = { title: "곡", duration_sec: DEFAULT_DURATION };
  assert.equal(parseSongInput(base).value.project_id, null);
  const id = "3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab";
  assert.equal(parseSongInput({ ...base, project_id: id }).value.project_id, id);
  assert.equal(parseSongInput({ ...base, project_id: "abc" }).ok, false);
});

test("제목이 없으면 거절", () => {
  assert.equal(parseSongInput({ ...ok, title: "  " }).ok, false);
});

test("목록에 없는 길이는 거절, 길이를 안 보내면 기본값", () => {
  assert.equal(parseSongInput({ ...ok, duration_sec: 45 }).ok, false);
  const { duration_sec, ...rest } = ok;
  void duration_sec;
  assert.equal(parseSongInput(rest).value.duration_sec, DEFAULT_DURATION);
});

test("효과음([SFX])은 3~30초 목록, 곡은 30초부터(2026-11-05)", () => {
  const fx = { ...ok, lyrics: "[SFX]", style_prompt: "door slam" };
  assert.equal(parseSongInput({ ...fx, duration_sec: 3 }).ok, true);
  assert.equal(parseSongInput({ ...fx, duration_sec: 60 }).ok, false);
  assert.equal(parseSongInput({ ...ok, duration_sec: 5 }).ok, false);
});

test("가사 글자 수 한도를 넘으면 거절", () => {
  assert.equal(parseSongInput({ ...ok, lyrics: "가".repeat(LIMITS.lyrics + 1) }).ok, false);
});

test("빈 요청 본문도 오류 문장으로 거절(예외 없음)", () => {
  assert.equal(parseSongInput(null).ok, false);
  assert.equal(parseSongInput("문자열").ok, false);
});

test("AI 작사: 공급사 순서는 OpenAI·Claude·Gemini, 각 3개 모델", () => {
  assert.deepEqual(LYRIC_PROVIDERS.map((p) => p.id), ["openai", "anthropic", "gemini"]);
  for (const p of LYRIC_PROVIDERS) assert.equal(p.models.length, 3);
});

test("AI 작사: 모델은 그 공급사 목록 안에서만, 아니면 그 공급사의 균형 모델", () => {
  assert.equal(toLyricModel("anthropic", "claude-opus-5-5"), "claude-opus-5-5");
  assert.equal(toLyricModel("openai", "claude-opus-5-5"), "gpt-6.1-terra");
  assert.equal(toLyricModel("gemini", undefined), "gemini-3.8-flash");
  assert.equal(toLyricProvider("mistral"), "anthropic");
  assert.equal(toLyricProvider("openai"), "openai");
});
