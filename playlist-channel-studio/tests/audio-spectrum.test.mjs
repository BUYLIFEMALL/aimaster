import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSpectrumReader, bassLevelOf } from '../src/lib/render/audio-spectrum.ts';

const RATE = 48000;
const buffer = (seconds, fn) => {
  const data = new Float32Array(Math.round(seconds * RATE));
  for (let i = 0; i < data.length; i++) data[i] = fn(i / RATE);
  return { duration: seconds, sampleRate: RATE, numberOfChannels: 1, getChannelData: () => data };
};
const peakBin = (arr) => arr.reduce((best, v, i) => (v > arr[best] ? i : best), 0);

test('실제 소리의 주파수 위치에 막대가 선다(분석기와 같은 칸)', () => {
  const freq = 3000; // 칸 하나 = 48000/256 = 187.5Hz → 3000Hz는 16번째 칸
  const read = createSpectrumReader([buffer(1, (t) => 0.01 * Math.sin(2 * Math.PI * freq * t))], 30);
  let out; for (let f = 0; f < 15; f++) out = read(f / 30 + 0.1); // 평활이 쌓이도록 여러 프레임
  assert.equal(peakBin(out), 16);
  assert.ok(out[16] > 100 && out[16] < 255, `세기 ${out[16]}`);
});

test('소리가 없으면 0이고 저음 곡은 저음 세기가 크다', () => {
  const silent = createSpectrumReader([buffer(1, () => 0)], 30);
  assert.equal(Math.max(...silent(0.5)), 0);
  const bass = createSpectrumReader([buffer(1, (t) => 0.9 * Math.sin(2 * Math.PI * 300 * t))], 30);
  let out; for (let f = 0; f < 15; f++) out = bass(f / 30 + 0.1);
  assert.ok(bassLevelOf(out) > 80, `저음 ${bassLevelOf(out)}`);
});

test('이어 붙인 둘째 곡의 소리를 읽는다', () => {
  const read = createSpectrumReader([buffer(1, () => 0), buffer(1, (t) => 0.01 * Math.sin(2 * Math.PI * 3000 * t))], 30);
  let out; for (let f = 0; f < 15; f++) out = read(1.1 + f / 30);
  assert.equal(peakBin(out), 16);
});
