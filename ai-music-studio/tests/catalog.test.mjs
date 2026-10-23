import { test } from "node:test";
import assert from "node:assert/strict";
import { MODELS, PROVIDERS, clampDuration, findModel, validateForModel } from "../lib/providers/catalog.ts";

test("모든 모델은 등록된 공급자·고유 이름을 가진다", () => {
  const keys = new Set();
  for (const m of MODELS) {
    assert.ok(PROVIDERS[m.provider], m.key);
    assert.equal(m.key, `${m.provider}:${m.model}`);
    assert.ok(!keys.has(m.key), `중복 ${m.key}`);
    keys.add(m.key);
    assert.ok(m.estCostUsd(m.defaultDurationS) > 0, `${m.key} 비용`);
  }
});

test("길이는 모델 범위로 맞추고, 길이를 못 정하는 모델은 기본값", () => {
  const el = findModel("elevenlabs:music_v2_5");
  assert.equal(clampDuration(el, 9999), 300);
  assert.equal(clampDuration(el, 1), 10);
  assert.equal(clampDuration(el, 95.4), 95);
  const suno = findModel("suno:V6");
  assert.equal(clampDuration(suno, 30), suno.defaultDurationS);
});

test("연주곡 전용 모델에 보컬곡을 보내면 막는다", () => {
  const sa = findModel("fal:fal-ai/stable-audio-25/text-to-audio");
  assert.match(validateForModel(sa, { instrumental: false, lyrics: "" }), /연주곡 전용/);
  assert.equal(validateForModel(sa, { instrumental: true, lyrics: "" }), null);
});

test("가사가 꼭 필요한 모델은 빈 가사를 막고, 아닌 모델은 통과", () => {
  assert.match(validateForModel(findModel("suno:V6"), { instrumental: false, lyrics: " " }), /가사/);
  assert.equal(validateForModel(findModel("suno:V6"), { instrumental: true, lyrics: "" }), null);
  assert.equal(validateForModel(findModel("gemini:lyria-3.5"), { instrumental: false, lyrics: "" }), null);
  assert.match(validateForModel(findModel("replicate:minimax/music-2.5"), { instrumental: true, lyrics: "" }), /연주곡을 만들 수 없습니다/);
});
