import test from "node:test";
import assert from "node:assert/strict";
import { masteringPlan, parseLoudness, parseMediaInfo, validateMasteringOptions } from "../src/mastering.mjs";

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
  assert.deepEqual(parseMediaInfo(flac), { duration: 185.5, sampleRate: 48000, codec: "flac", bits: null });
  const wav = "Duration: 00:00:03.00, bitrate: 2304 kb/s\n  Stream #0:0: Audio: pcm_s24le ([1][0][0][0] / 0x0001), 48000 Hz, 2 channels, s32 (24 bit)";
  assert.equal(parseMediaInfo(wav).bits, 24);
  assert.ok(Number.isNaN(parseMediaInfo("nothing").duration));
});
