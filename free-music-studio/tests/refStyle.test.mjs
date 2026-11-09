import test from "node:test";
import assert from "node:assert/strict";
import { REF_MAX_SEC, encodeWavMono16, pickRefWindow } from "../src/lib/refAudio.ts";
import { parseRefStyle, refStyleRules } from "../src/lib/refStyle.ts";
import { LIMITS } from "../src/lib/songs.ts";

test("참고곡 구간(D-9): 긴 곡은 20% 지점부터 60초, 끝을 넘지 않음, 짧은 곡은 전부", () => {
  assert.deepEqual(pickRefWindow(200), { start: 40, seconds: REF_MAX_SEC });
  assert.deepEqual(pickRefWindow(70), { start: 10, seconds: 60 });
  assert.deepEqual(pickRefWindow(45), { start: 0, seconds: 45 });
  assert.deepEqual(pickRefWindow(0), { start: 0, seconds: 0 });
});

test("모노 16비트 WAV 머리", () => {
  const b = encodeWavMono16(new Float32Array(100), 12000);
  const s = (o, n) => String.fromCharCode(...b.subarray(o, o + n));
  assert.equal(s(0, 4), "RIFF");
  assert.equal(s(8, 4), "WAVE");
  assert.equal(b.length, 44 + 200);
  assert.equal(new DataView(b.buffer).getUint32(24, true), 12000);
});

test("참고곡 응답 해석: 연주곡이면 instrumental 앞에, 보컬 없음, 길이 한도, BPM 범위", () => {
  const r = parseRefStyle('{"style":"lo-fi jazz, mellow, 82 BPM, rhodes","bpm":82,"has_vocals":true}', true);
  assert.equal(r.style, "instrumental, lo-fi jazz, mellow, 82 BPM, rhodes");
  assert.equal(r.hasVocals, false);
  assert.equal(r.bpm, 82);
  const v = parseRefStyle('noise {"style":"k-pop, bright female vocals","bpm":999,"has_vocals":true} tail', false);
  assert.equal(v.hasVocals, true);
  assert.equal(v.bpm, null);
  const long = parseRefStyle(JSON.stringify({ style: Array.from({ length: 80 }, (_, i) => "tag" + i).join(", "), bpm: null, has_vocals: false }), false);
  assert.ok(long.style.length <= LIMITS.style);
  assert.throws(() => parseRefStyle("no json", false));
  assert.throws(() => parseRefStyle('{"style":""}', false));
});

test("참고곡 규칙: 가사·곡 이름·가수 이름 금지, 연주곡이면 보컬 묘사 금지", () => {
  assert.match(refStyleRules(true), /Never write lyrics/);
  assert.match(refStyleRules(true), /artist or band names/);
  assert.match(refStyleRules(true), /do not describe any vocals/);
  assert.doesNotMatch(refStyleRules(false), /do not describe any vocals/);
});
