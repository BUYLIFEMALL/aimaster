import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskBody, parseTaskState, vocalLanguage } from "../src/lib/engine.ts";

const song = { style_prompt: " warm city pop ", lyrics: " [Verse]\n비 오는 오후 ", duration_sec: 60 };

test("가사 언어: 한글이 있으면 한국어, 없으면 영어", () => {
  assert.equal(vocalLanguage("[Verse]\n비 오는 오후"), "ko");
  assert.equal(vocalLanguage("[Verse]\nrainy afternoon"), "en");
  assert.equal(vocalLanguage(""), "en");
});

test("생성 요청: 한 곡·MP3·길이 그대로, 언어 모델은 그래픽카드에서만", () => {
  const gpu = buildTaskBody(song, "cuda");
  assert.deepEqual(gpu, {
    prompt: "warm city pop",
    lyrics: "[Verse]\n비 오는 오후",
    audio_duration: 60,
    vocal_language: "ko",
    thinking: true,
    batch_size: 1,
    audio_format: "mp3",
  });
  assert.equal(buildTaskBody(song, "mps").thinking, true);
  assert.equal(buildTaskBody(song, "cpu").thinking, false);
});

const reply = (status, result) => ({ data: [{ task_id: "t1", status, result }], code: 200 });

test("작업 상태: 진행 중·실패·없는 작업", () => {
  assert.deepEqual(parseTaskState(reply(0, ""), "t1"), { state: "running" });
  assert.equal(parseTaskState(reply(2, ""), "t1").state, "failed");
  assert.deepEqual(parseTaskState(reply(1, "[]"), "other"), { state: "running" });
  assert.deepEqual(parseTaskState(null, "t1"), { state: "running" });
});

test("작업 상태: 완성 — result(JSON 문자열)에서 음원 주소 꺼내기", () => {
  const result = JSON.stringify([{ file: "/v1/audio?path=%2Ftmp%2Fa.mp3", status: 1 }]);
  assert.deepEqual(parseTaskState(reply(1, result), "t1"), { state: "done", file: "/v1/audio?path=%2Ftmp%2Fa.mp3" });
  // 배열로 와도 받는다
  assert.equal(parseTaskState(reply(1, [{ file: "/v1/audio?path=x" }]), "t1").state, "done");
});

test("작업 상태: /v1/audio가 아닌 주소·깨진 결과는 실패로", () => {
  assert.equal(parseTaskState(reply(1, JSON.stringify([{ file: "http://evil.example/a.mp3" }])), "t1").state, "failed");
  assert.equal(parseTaskState(reply(1, "not json"), "t1").state, "failed");
});
