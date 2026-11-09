// 엔진 0.8.0 YuE2 커버(백로그 B-5) — 원곡 멜로디 받아 적기(SheetSage2) → cot melody
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildYue2Synth,
  parseYue2Multipart,
  parseYue2Transcription,
  yue2Catalog,
  yue2CoverNeeds,
  yue2CoverReady,
  yue2Paths,
  yue2RuntimeCurrent,
} from "../src/yue2.mjs";

const wav24 = (samples) => {
  const data = Buffer.alloc(samples.length * 3);
  samples.forEach((s, i) => data.writeIntLE(s, i * 3, 3));
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(48000, 24);
  h.writeUInt32LE(48000 * 3, 28);
  h.writeUInt16LE(3, 32);
  h.writeUInt16LE(24, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
};

test("결과 읽기 — v3.8.5 세 조각(JSON + WAV + latents)에서 latents는 무시", () => {
  const audio = wav24([1000, -2000]);
  const b = "yue2-batch-boundary";
  const buf = Buffer.concat([
    Buffer.from(`--${b}\r\nContent-Type: application/json\r\n\r\n{"seed":5}\r\n--${b}\r\nContent-Type: audio/wav\r\n\r\n`),
    audio,
    Buffer.from(`\r\n--${b}\r\nContent-Type: application/octet-stream\r\n\r\n`),
    Buffer.alloc(64, 7),
    Buffer.from(`\r\n--${b}--\r\n`),
  ]);
  const out = parseYue2Multipart(buf, `multipart/mixed; boundary=${b}`);
  assert.deepEqual(out.replay, { seed: 5 });
  assert.deepEqual(out.audio, audio);
  assert.equal(out.ext, "wav");
});

test("받아 적기 결과 읽기 — ABC 악보만, 비었거나 깨지면 한국어 오류", () => {
  const abc = "X:1\nT:song\nM:4/4\nL:1/8\nK:C\nCDEF GABc|";
  assert.equal(parseYue2Transcription(JSON.stringify({ abc })), abc);
  assert.throws(() => parseYue2Transcription(JSON.stringify({ abc: "" })), /받아 적지 못했습니다/);
  assert.throws(() => parseYue2Transcription("not json"), /읽지 못했습니다/);
});

test("커버 요청 본문 — abc가 있으면 cot melody + 악보 + 새 가사, 없으면 지금처럼", () => {
  const abc = "X:1\nK:G\nGABc|";
  const body = buildYue2Synth({ style: "acoustic jazz cover", lyrics: "[verse]\n새 가사", seed: 3, abc });
  assert.equal(body.cot, "melody");
  assert.equal(body.abc, abc);
  assert.equal(body.lyrics, "[verse]\n새 가사");
  assert.equal(body.seed, 3);
  const song = buildYue2Synth({ style: "x", lyrics: "[verse]\n가사", seed: 1 });
  assert.equal(song.cot, "full");
  assert.equal("abc" in song, false);
});

test("받기 목록 — 실행 도구 v3.8.5, 커버 모델은 SheetSage2와 같은 양자화의 MERT", () => {
  const c = yue2Catalog();
  assert.equal(c.runtime.version, "3.8.5");
  assert.match(c.runtime.url, /v3\.8\.5\/YuE2-Studio-3\.8\.5-portable-windows-x64\.zip$/);
  assert.deepEqual(yue2CoverNeeds().map((m) => m.filename).sort(), ["MERT-v2-FullSong-Q8_0.gguf", "SheetSage2-Q8_0.gguf"]);
  assert.equal(c.cover.transcriber, "SheetSage2-Q8_0.gguf");
  for (const p of c.profiles) assert.equal(p.transcriber, undefined);
  for (const m of yue2CoverNeeds()) assert.match(m.sha256, /^[0-9a-f]{64}$/);
});

test("실행 도구 판 — 판 기록이 없거나 다르면 다시 받기, 같으면 그대로 / 커버 모델 준비", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "yue2v-"));
  const p = yue2Paths(dir);
  assert.equal(yue2RuntimeCurrent(dir), false);
  await mkdir(path.dirname(p.cudaDll), { recursive: true });
  await writeFile(p.exe, "x");
  await writeFile(p.cudaDll, "x");
  assert.equal(yue2RuntimeCurrent(dir), false, "옛 설치(판 기록 없음)는 다시 받기");
  await writeFile(p.versionFile, "3.4.0");
  assert.equal(yue2RuntimeCurrent(dir), false);
  await writeFile(p.versionFile, "3.8.5");
  assert.equal(yue2RuntimeCurrent(dir), true);
  assert.equal(yue2CoverReady(dir), false);
  await mkdir(p.modelsDir, { recursive: true });
  for (const m of yue2CoverNeeds()) await writeFile(path.join(p.modelsDir, `${m.filename}.ok`), m.sha256);
  assert.equal(yue2CoverReady(dir), true);
});
