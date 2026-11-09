import test from "node:test";
import assert from "node:assert/strict";
import { masteringPlan, parseLoudness, parseMediaInfo, toneFilters, validateMasteringOptions, validateTone } from "../src/mastering.mjs";

test("마스터링 설정: 기본값(-10 LUFS·-1 dBTP·균형), 정해진 값만", () => {
  assert.deepEqual(validateMasteringOptions({}), { targetLufs: -10, truePeak: -1, character: "balanced" });
  assert.deepEqual(validateMasteringOptions({ targetLufs: -14, truePeak: -0.5, character: "punchy" }), { targetLufs: -14, truePeak: -0.5, character: "punchy" });
  assert.throws(() => validateMasteringOptions({ targetLufs: -9 }), /지원하지 않는/);
  assert.throws(() => validateMasteringOptions([]), /올바르지/);
});

test("음량 분석: 마지막 loudnorm 블록, 무음은 거절", () => {
  const text = 'x {"input_i" : "-20.00","input_tp" : "-3.00","input_lra" : "6.0","input_thresh" : "-30.0","target_offset" : "0.5"} y';
  assert.deepEqual(parseLoudness(text), { integratedLufs: -20, truePeakDbtp: -3, loudnessRange: 6, threshold: -30, offset: 0.5 });
  assert.throws(() => parseLoudness('{"input_i" : "-inf","input_tp" : "-inf","input_lra" : "0","input_thresh" : "-70","target_offset" : "0"}'), /무음/);
  assert.throws(() => parseLoudness("없음"), /결과가 없습니다/);
});

test("압축 판단: 피크가 3dB 넘게 넘치거나 음량 폭이 넓을 때만", () => {
  const opt = { targetLufs: -10, truePeak: -1, character: "balanced" };
  const calm = masteringPlan({ integratedLufs: -14, truePeakDbtp: -6, loudnessRange: 6 }, opt);
  assert.equal(calm.compressorApplied, false);
  assert.equal(calm.compressor, "");
  const peaky = masteringPlan({ integratedLufs: -20, truePeakDbtp: -2, loudnessRange: 6 }, opt);
  assert.equal(peaky.compressorApplied, true);
  assert.match(peaky.compressor, /acompressor=.*ratio=2/);
  assert.equal(masteringPlan({ integratedLufs: -14, truePeakDbtp: -8, loudnessRange: 13 }, opt).compressorApplied, true);
});

test("파일 정보: ffmpeg -i 출력에서 길이·샘플레이트·24bit", () => {
  const flac = "Duration: 00:03:05.50, start: 0.000000, bitrate: 900 kb/s\n  Stream #0:0: Audio: flac, 48000 Hz, stereo, s16";
  assert.deepEqual(parseMediaInfo(flac), { duration: 185.5, sampleRate: 48000, codec: "flac", bits: null, stereo: true });
  const wav = "Duration: 00:00:03.00, bitrate: 2304 kb/s\n  Stream #0:0: Audio: pcm_s24le ([1][0][0][0] / 0x0001), 48000 Hz, 2 channels, s32 (24 bit)";
  assert.equal(parseMediaInfo(wav).bits, 24);
  assert.ok(Number.isNaN(parseMediaInfo("nothing").duration));
});

test("소리 색깔(0.8.2): 범위 밖은 잘라 맞추고, 없으면 옵션에 넣지 않음, -16·-18 LUFS 허용", () => {
  assert.equal("tone" in validateMasteringOptions({}), false);
  const o = validateMasteringOptions({ targetLufs: -16, tone: { eq: { low: 20, mid: -1, high: 2, q: 9 }, saturation: { drive: 3, harmonics: 50 }, compressor: null, width: 300 } });
  assert.equal(o.targetLufs, -16);
  assert.deepEqual(o.tone.eq, { low: 12, mid: -1, high: 2, q: 5 });
  assert.equal(o.tone.width, 200);
  assert.equal(o.tone.compressor, null);
  assert.equal(validateMasteringOptions({ targetLufs: -18 }).targetLufs, -18);
  assert.throws(() => validateTone({ eq: { low: "x" } }), /저음/);
  assert.throws(() => validateTone([1]), /올바르지/);
});

test("소리 색깔 필터: 바꿀 것만, 입력 피크 -9 dBTP 맞춤, 모노는 폭 생략, 수식 쉼표 이스케이프", () => {
  assert.deepEqual(toneFilters(validateTone({}), { inputPeakDbtp: -1, stereo: true }), []);
  const tone = validateTone({ eq: { low: 3, mid: -1.5, high: 0, q: 0.5 }, saturation: { drive: 2, harmonics: 50 }, compressor: { threshold: -20, ratio: 3, attack: 10, release: 100 }, width: 120 });
  const f = toneFilters(tone, { inputPeakDbtp: -1, stereo: true });
  assert.equal(f[0], "volume=-8dB");
  assert.ok(f.some((x) => x.startsWith("lowshelf=g=3:f=100")));
  assert.ok(f.some((x) => x.startsWith("equalizer=f=1500:t=q:w=0.5:g=-1.5")));
  assert.ok(!f.some((x) => x.startsWith("highshelf")));
  assert.ok(f.find((x) => x.startsWith("aeval=")).includes("clip(val(ch)*1.2\\,-1\\,1)"));
  assert.ok(f.some((x) => x.startsWith("acompressor=") && x.includes("ratio=3")));
  assert.ok(f.includes("extrastereo=m=1.2:c=false"));
  assert.ok(!toneFilters(tone, { inputPeakDbtp: -1, stereo: false }).some((x) => x.startsWith("extrastereo")));
});
