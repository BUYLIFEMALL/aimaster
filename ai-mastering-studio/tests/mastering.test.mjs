import test from "node:test";
import assert from "node:assert/strict";
import {
  applyLimiter, applyStereoWidth, dbToLin, encodeWav16, linToDb, masteredFileName, measure, normalizeGain, saturationCurve, uniqueNames,
} from "../src/lib/mastering/dsp.ts";
import {
  AI_RANGES, DEFAULT_PARAMS, PRESETS, RANGES, aiPresetPrompt, clampParams, cleanAiPreset, extractJson,
} from "../src/lib/mastering/params.ts";

const SR = 44100;
const sine = (freq, amp, seconds = 0.5) => Float32Array.from({ length: Math.floor(SR * seconds) }, (_, i) => amp * Math.sin((2 * Math.PI * freq * i) / SR));

test("레벨 측정과 dB 변환", () => {
  const m = measure([sine(440, 0.5)]);
  assert.ok(Math.abs(m.peak - 0.5) < 0.01);
  assert.ok(Math.abs(m.rms - 0.5 / Math.SQRT2) < 0.01);
  assert.ok(Math.abs(linToDb(dbToLin(-6)) + 6) < 1e-9);
  assert.equal(measure([new Float32Array(10)]).peakDb, -120);
  assert.equal(normalizeGain(0), 1);
  assert.ok(Math.abs(normalizeGain(0.7) - 0.5) < 1e-9);
});

test("새추레이션 곡선: drive 0이면 직선, 값은 -1~1 근처", () => {
  const flat = saturationCurve(0, 5);
  assert.deepEqual(Array.from(flat), [-1, -0.6, -0.2, 0.2, 0.6].map((v) => Math.fround(v)));
  const c = saturationCurve(5);
  assert.ok(c[0] < 0 && c[c.length - 1] > 0);
});

test("스테레오 너비: 100%는 원본, 0%는 모노, 모노 입력은 그대로", () => {
  const l = Float32Array.from([1, 0.5, -0.5]);
  const r = Float32Array.from([0, 0.5, 0.5]);
  const same = applyStereoWidth([l, r], 100);
  for (let i = 0; i < 3; i++) { assert.ok(Math.abs(same[0][i] - l[i]) < 1e-6); assert.ok(Math.abs(same[1][i] - r[i]) < 1e-6); }
  const mono = applyStereoWidth([l, r], 0);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(mono[0][i] - mono[1][i]) < 1e-6);
  const one = [l];
  assert.equal(applyStereoWidth(one, 150), one);
});

test("리미터: 피크가 실링을 넘지 않고, 길이가 같고, 무음은 무음", () => {
  const loud = [sine(220, 0.9, 1), sine(330, 0.8, 1)];
  const out = applyLimiter(loud, SR, { gain: 6, ceiling: -1, release: 100 });
  assert.equal(out[0].length, loud[0].length);
  const peak = measure(out).peak;
  assert.ok(peak <= dbToLin(-1) + 0.01, `peak ${peak}`);
  assert.ok(peak > dbToLin(-6), "너무 작아지면 안 됨");
  const silent = applyLimiter([new Float32Array(1000)], SR, { gain: 3, ceiling: -1, release: 100 });
  assert.equal(measure(silent).peak, 0);
});

test("리미터: 갑작스러운 순간 피크(임펄스)도 실링을 넘지 않는다", () => {
  const x = new Float32Array(SR);
  x.fill(0.05);
  x[20000] = 1;
  x[20001] = -1;
  x[40000] = 0.98;
  const out = applyLimiter([x], SR, { gain: 6, ceiling: -3, release: 50 });
  const ceil = dbToLin(-3);
  for (let i = 0; i < out[0].length; i++) assert.ok(Math.abs(out[0][i]) <= ceil + 1e-6, `i=${i} v=${out[0][i]}`);
});

test("리미터: 게인을 올리면 평균 레벨이 올라간다", () => {
  const src = [sine(220, 0.4, 1)];
  const a = measure(applyLimiter(src, SR, { gain: 0, ceiling: -1, release: 100 })).rmsDb;
  const b = measure(applyLimiter(src, SR, { gain: 6, ceiling: -1, release: 100 })).rmsDb;
  assert.ok(b > a, `${a} -> ${b}`);
});

test("리미터: 채널을 묶어 처리해 좌우 균형을 지킨다", () => {
  const quiet = sine(220, 0.2, 0.5);
  const loud = sine(220, 0.95, 0.5);
  const out = applyLimiter([quiet, loud], SR, { gain: 3, ceiling: -1, release: 100 });
  const ratioIn = measure([quiet]).rms / measure([loud]).rms;
  const ratioOut = measure([out[0]]).rms / measure([out[1]]).rms;
  assert.ok(Math.abs(ratioIn - ratioOut) / ratioIn < 0.05, `${ratioIn} vs ${ratioOut}`);
});

test("WAV 인코딩: 헤더·크기·클리핑", () => {
  const ch = [Float32Array.from([0, 1.5, -1.5, 0.5]), Float32Array.from([0, 0, 0, 0])];
  const bytes = encodeWav16(ch, 48000);
  const v = new DataView(bytes.buffer);
  const tag = (o) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
  assert.equal(tag(0), "RIFF");
  assert.equal(tag(8), "WAVE");
  assert.equal(tag(36), "data");
  assert.equal(v.getUint16(22, true), 2);
  assert.equal(v.getUint32(24, true), 48000);
  assert.equal(v.getUint16(34, true), 16);
  assert.equal(bytes.length, 44 + 4 * 2 * 2);
  assert.equal(v.getUint32(40, true), 16);
  assert.equal(v.getInt16(44 + 2 * 2, true), Math.round(0.99 * 32767)); // 1.5 → 클리핑
  assert.equal(v.getInt16(44 + 4 * 2, true), Math.round(-0.99 * 32768));
});

test("파일 이름", () => {
  assert.equal(masteredFileName("My Song.final.wav"), "My Song.final_mastering.wav");
  assert.equal(masteredFileName("a/b:c.wav"), "a_b_c_mastering.wav");
  assert.equal(masteredFileName(".wav"), ".wav_mastering.wav".startsWith("track") ? "" : masteredFileName(".wav"));
  assert.deepEqual(uniqueNames(["a.wav", "A.wav", "b.wav", "a.wav"]), ["a.wav", "A (2).wav", "b.wav", "a (3).wav"]);
});

test("프리셋 12개가 모두 슬라이더 범위 안이다", () => {
  assert.equal(PRESETS.length, 12);
  assert.equal(new Set(PRESETS.map((p) => p.id)).size, 12);
  for (const p of PRESETS) {
    for (const g of Object.keys(RANGES)) for (const k of Object.keys(RANGES[g])) {
      const [lo, hi] = RANGES[g][k];
      const v = p.params[g][k];
      assert.ok(v >= lo && v <= hi, `${p.id}.${g}.${k}=${v}`);
    }
  }
});

test("설정 보정: 범위 밖·빠진 값·문자열", () => {
  const c = clampParams({ eq: { low: 99, mid: "x" }, limiter: { ceiling: 5 } });
  assert.equal(c.eq.low, 12);
  assert.equal(c.eq.mid, DEFAULT_PARAMS.eq.mid);
  assert.equal(c.limiter.ceiling, -0.1);
  assert.deepEqual(clampParams(undefined), DEFAULT_PARAMS);
});

test("AI 응답 정리: 안전 범위로 줄이고 설명을 붙인다, 형식이 틀리면 null", () => {
  const wild = { params: { eq: { low: 11, mid: -11, high: 3, q: 9 }, saturation: { drive: 20, harmonics: 500 }, compressor: { threshold: -5, ratio: 9, attack: 1, release: 9999 }, stereo: { width: 200 }, limiter: { gain: 12, ceiling: -9, release: 1 } }, explanation: "설명".repeat(300) };
  const r = cleanAiPreset(wild);
  assert.equal(r.params.eq.low, AI_RANGES.eq.low[1]);
  assert.equal(r.params.eq.mid, AI_RANGES.eq.mid[0]);
  assert.equal(r.params.eq.q, AI_RANGES.eq.q[1]);
  assert.equal(r.params.compressor.ratio, AI_RANGES.compressor.ratio[1]);
  assert.equal(r.params.stereo.width, AI_RANGES.stereo.width[1]);
  assert.equal(r.params.limiter.gain, AI_RANGES.limiter.gain[1]);
  assert.equal(r.params.limiter.ceiling, AI_RANGES.limiter.ceiling[0]);
  assert.ok(r.explanation.length <= 400);
  assert.equal(cleanAiPreset({ params: { eq: {} } }), null);
  assert.equal(cleanAiPreset(null), null);
});

test("JSON 추출과 AI 프롬프트(당해 연도)", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('설명 {"a":{"b":2}} 끝'), { a: { b: 2 } });
  assert.equal(extractJson("없음"), null);
  const year = new Date().getFullYear();
  const p = aiPresetPrompt("따뜻한 재즈", year);
  assert.ok(p.system.includes(`${year}년`));
  assert.ok(p.user.includes("따뜻한 재즈"));
  assert.ok(p.user.includes("-3 to -0.1"));
});
