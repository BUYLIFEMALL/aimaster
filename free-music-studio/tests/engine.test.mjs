import test from "node:test";
import assert from "node:assert/strict";
import { buildEditFields, buildTaskBody, parseTaskState, vocalLanguage } from "../src/lib/engine.ts";

test("가져온 음악: 커버 — 세기 0.2~1.0으로 자르고 언어 모델 끔", () => {
  const f = buildEditFields({ mode: "cover", style_prompt: " jazz ", lyrics: "[Verse]\n안녕", strength: 0.05 }, 200);
  assert.equal(f.task_type, "cover");
  assert.equal(f.audio_cover_strength, "0.20");
  assert.equal(f.prompt, "jazz");
  assert.equal(f.vocal_language, "ko");
  assert.equal(f.thinking, "false");
  assert.equal(f.batch_size, "1");
  assert.equal(buildEditFields({ mode: "cover", style_prompt: "", lyrics: "", strength: 3 }, 200).audio_cover_strength, "1.00");
});

test("가져온 음악: 부분 수정 — 구간을 원곡 길이 안으로", () => {
  const f = buildEditFields({ mode: "repaint", style_prompt: "x", lyrics: "", start: 10, end: 20 }, 60.4);
  assert.deepEqual([f.task_type, f.repainting_start, f.repainting_end, f.chunk_mask_mode], ["repaint", "10", "20", "explicit"]);
  const g = buildEditFields({ mode: "repaint", style_prompt: "x", lyrics: "", start: 100, end: 500 }, 60.4);
  assert.deepEqual([g.repainting_start, g.repainting_end], ["59", "60"]);
  assert.equal(f.audio_cover_strength, undefined);
});

const song = { style_prompt: " warm city pop ", lyrics: " [Verse]\n비 오는 오후 ", duration_sec: 60 };

test("가사 언어: 한글이 있으면 한국어, 없으면 영어", () => {
  assert.equal(vocalLanguage("[Verse]\n비 오는 오후"), "ko");
  assert.equal(vocalLanguage("[Verse]\nrainy afternoon"), "en");
  assert.equal(vocalLanguage(""), "en");
});

test("생성 요청: 음질 설정이 있으면 무손실 FLAC·그 설정 단계 수·언어 모델은 띄운 경우만", () => {
  const q = { tier: "high", label: "", dit: "acestep-v15-xl-turbo", lm: "acestep-5Hz-lm-1.7B", steps: 8, offload: true, vramGb: 16, ffmpeg: true };
  const b = buildTaskBody(song, "cuda", q);
  assert.equal(b.audio_format, "flac");
  assert.equal(b.inference_steps, 8);
  assert.equal(b.thinking, true);
  assert.equal(buildTaskBody(song, "cpu", { ...q, lm: null, steps: 50 }).thinking, false);
  assert.equal(buildTaskBody(song, "cpu", { ...q, lm: null, steps: 50 }).inference_steps, 50);
  assert.equal(buildEditFields({ mode: "cover", style_prompt: "", lyrics: "", strength: 1 }, 60, q).audio_format, "flac");
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
  // 음악 엔진이 알려 준 실패 이유를 붙인다(2026-11-04 마스터PC cp949 오류)
  const fail = parseTaskState(reply(2, JSON.stringify([{ error: "'cp949' codec can't encode\n character" }])), "t1");
  assert.equal(fail.error, "음악 엔진이 곡을 만들지 못했습니다 — 'cp949' codec can't encode character");
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

test("음악 엔진 목록(v1.12): 상업용·개인용, 엔진이 알린 것만, 엔진 쪽 분류와 같음", async () => {
  const { MUSIC_ENGINES, availableEngines, licenseOfEngine, consentKey, engineInfo } = await import("../src/lib/engine.ts");
  const { readFile } = await import("node:fs/promises");
  const cat = JSON.parse(await readFile(new URL("../engine/src/pyengines-catalog.json", import.meta.url), "utf8"));
  for (const e of cat.engines) {
    const w = MUSIC_ENGINES.find((m) => m.id === e.id);
    assert.ok(w, `사이트 목록에 ${e.id}`);
    assert.equal(w.license, e.license, e.id);
    assert.equal(w.kind, e.kind, e.id);
  }
  assert.deepEqual(availableEngines(null).map((e) => e.id), ["acestep"]);
  // 한국어를 못 부르는 노래 엔진(LeVo 2)은 엔진이 알려도 선택지에서 뺀다(주인님 2026-11-04)
  assert.deepEqual(availableEngines({ features: ["queue", "yue2", "levo2"] }).map((e) => e.id), ["acestep", "yue2"]);
  assert.equal(licenseOfEngine("levo2"), "noncommercial");
  assert.equal(licenseOfEngine("stableaudio3"), "commercial");
  assert.equal(consentKey("yue2"), "fms-yue2-noncommercial-consent"); // 예전 동의 그대로 이어짐
  assert.equal(engineInfo(undefined).id, "acestep");
});
