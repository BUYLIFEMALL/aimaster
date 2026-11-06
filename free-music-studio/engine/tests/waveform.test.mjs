import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { audioWaveform, wavWaveform } from "../src/waveform.mjs";

/** 16비트 모노 WAV — 앞 절반은 조용, 뒤 절반은 절반 크기 */
function wav(rate = 8000, seconds = 2) {
  const frames = rate * seconds;
  const data = Buffer.alloc(frames * 2);
  for (let i = frames / 2; i < frames; i++) data.writeInt16LE(i % 2 ? 16384 : -16384, i * 2);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

test("파형(0.6.9): WAV 칸마다 가장 큰 값과 길이, WAV가 아니고 ffmpeg가 없으면 알기 쉬운 오류", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "fms-wave-"));
  try {
    const f = path.join(dir, "a.wav");
    await writeFile(f, wav());
    const w = await wavWaveform(f, 10);
    assert.equal(w.duration, 2);
    assert.deepEqual(w.peaks.slice(0, 5), [0, 0, 0, 0, 0]);
    for (const p of w.peaks.slice(5)) assert.equal(p, 0.5);
    const all = await audioWaveform(f, { ffmpeg: null, tmpDir: dir });
    assert.equal(all.peaks.length, 1600);
    const flac = path.join(dir, "b.flac");
    await writeFile(flac, "fLaC....");
    await assert.rejects(audioWaveform(flac, { ffmpeg: null, tmpDir: dir }), /지원하지 않는|형식/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
