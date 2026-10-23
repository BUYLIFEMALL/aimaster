import test from "node:test";
import assert from "node:assert/strict";
import { audioDurationSeconds } from "../src/lib/audioDuration.ts";

// MPEG1 Layer III 프레임 머리글(0xFF 0xFB) + 비트레이트 192kbps(색인 11)·44.1kHz
const frame = (len) => { const b = new Uint8Array(len); b.set([0xff, 0xfb, 0xb0, 0x00]); return b; };

test("v1.42 MP3 고정 비트레이트: 192kbps 1,440,000바이트 = 60초", () => {
  assert.equal(audioDurationSeconds(frame(1_440_000), "audio/mpeg"), 60);
});

test("v1.42 MP3 앞에 ID3 태그가 있어도 첫 프레임을 찾는다", () => {
  const id3 = new Uint8Array(10 + 100); id3.set([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 100]);
  const body = frame(1_440_000);
  const all = new Uint8Array(id3.length + body.length); all.set(id3); all.set(body, id3.length);
  assert.equal(audioDurationSeconds(all, "audio/mpeg"), 60);
});

test("v1.42 MP3 가변 비트레이트(Xing 머리글): 프레임 1000개 × 1152 / 44100 ≈ 26초", () => {
  const b = frame(400_000);
  const at = 4 + 32; // MPEG1 스테레오 보조 정보 32바이트 뒤
  b.set([0x58, 0x69, 0x6e, 0x67, 0, 0, 0, 1, 0, 0, 0x03, 0xe8], at); // "Xing", 플래그 1(프레임 수), 1000
  assert.equal(audioDurationSeconds(b, "audio/mpeg"), 26);
});

test("v1.42 WAV: 48kHz 스테레오 16비트 30초", () => {
  const dataSize = 48000 * 4 * 30;
  const b = new Uint8Array(44 + dataSize); const v = new DataView(b.buffer);
  const w = (o, s) => [...s].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + dataSize, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, 48000, true); v.setUint32(28, 192000, true);
  v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, dataSize, true);
  assert.equal(audioDurationSeconds(b, "audio/wav"), 30);
});

test("v1.42 알아볼 수 없는 파일은 null(길이 표시 안 함)", () => {
  assert.equal(audioDurationSeconds(new Uint8Array(5000), "audio/mpeg"), null);
  assert.equal(audioDurationSeconds(new Uint8Array(0)), null);
});
