import test from "node:test";
import assert from "node:assert/strict";
import { parseSongInput, DEFAULT_DURATION, LIMITS } from "../src/lib/songs.ts";
import { toLyricModel, DEFAULT_LYRIC_MODEL } from "../src/lib/lyricModels.ts";

const ok = { title: " 비 오는 오후 ", style_prompt: "city pop, 92 BPM", lyrics: "[Verse]\r\n창가에 앉아\r\n", duration_sec: 30 };

test("정상 입력은 앞뒤 공백·줄바꿈을 정리해 통과", () => {
  const r = parseSongInput(ok);
  assert.equal(r.ok, true);
  assert.equal(r.value.title, "비 오는 오후");
  assert.equal(r.value.lyrics, "[Verse]\n창가에 앉아");
  assert.equal(r.value.duration_sec, 30);
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

test("가사 글자 수 한도를 넘으면 거절", () => {
  assert.equal(parseSongInput({ ...ok, lyrics: "가".repeat(LIMITS.lyrics + 1) }).ok, false);
});

test("빈 요청 본문도 오류 문장으로 거절(예외 없음)", () => {
  assert.equal(parseSongInput(null).ok, false);
  assert.equal(parseSongInput("문자열").ok, false);
});

test("AI 작사 모델은 허용 목록 밖이면 기본값(균형)", () => {
  assert.equal(toLyricModel("claude-opus-5-5"), "claude-opus-5-5");
  assert.equal(toLyricModel("gpt-5"), DEFAULT_LYRIC_MODEL);
  assert.equal(toLyricModel(undefined), DEFAULT_LYRIC_MODEL);
});
