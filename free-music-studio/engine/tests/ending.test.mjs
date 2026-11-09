import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { codecArgs, extendRange, parseMeanVolume, prepareExtendSource, smoothEnding, tailIsCut } from "../src/ending.mjs";
import { parseMediaInfo, probe } from "../src/mastering.mjs";

test("끝 음량 읽기·끊김 판단", () => {
  assert.equal(parseMeanVolume("[Parsed_volumedetect_0] mean_volume: -12.3 dB"), -12.3);
  assert.equal(parseMeanVolume("mean_volume: -inf dB"), -Infinity);
  assert.ok(Number.isNaN(parseMeanVolume("없음")));
  assert.equal(tailIsCut(-12), true);
  assert.equal(tailIsCut(-50), false);
  assert.equal(tailIsCut(-Infinity), false);
  assert.equal(tailIsCut(NaN), false);
});

test("형식 그대로 저장하는 코덱", () => {
  assert.deepEqual(codecArgs("wav", "pcm_s24le"), ["-c:a", "pcm_s24le"]);
  assert.deepEqual(codecArgs("wav", "pcm_f32le"), ["-c:a", "pcm_f32le"]);
  assert.deepEqual(codecArgs("wav", ""), ["-c:a", "pcm_s16le"]);
  assert.deepEqual(codecArgs("flac"), ["-c:a", "flac"]);
  assert.deepEqual(codecArgs("mp3"), ["-c:a", "libmp3lame", "-b:a", "320k"]);
});

test("이어 만들기 구간 — 원곡 끝 10초 전부터 새 끝까지", () => {
  assert.deepEqual(extendRange(239.4, 60), { start: 229, end: 300, total: 300, add: 60 });
  assert.deepEqual(extendRange(5, 30), { start: 0, end: 35, total: 35, add: 30 });
  assert.equal(extendRange(100, 45).add, 30); // 고를 수 없는 길이는 30초
});

const ffmpeg = spawnSync("ffmpeg", ["-version"]).status === 0 ? "ffmpeg" : null;
const make = (file, filter) => spawnSync("ffmpeg", ["-hide_banner", "-nostdin", "-y", "-f", "lavfi", "-i", filter, "-c:a", "pcm_s24le", file]).status === 0;

test("실제 ffmpeg — 끊긴 끝만 줄이고, 조용한 끝은 그대로, 이어 만들기는 빈 소리로 길이를 늘림", { skip: !ffmpeg && "ffmpeg 없음" }, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "fms-ending-"));
  try {
    const loud = path.join(dir, "loud.wav");
    const quiet = path.join(dir, "quiet.wav");
    assert.ok(make(loud, "sine=frequency=440:duration=20,volume=0.5"));
    assert.ok(make(quiet, "sine=frequency=440:duration=20,volume=0.5,afade=t=out:st=15:d=5"));

    const a = await smoothEnding({ ffmpeg, bytes: readFileSync(loud), ext: "wav", tmpDir: dir });
    assert.equal(a.faded, true);
    const outFile = path.join(dir, "a.wav");
    (await import("node:fs")).writeFileSync(outFile, a.bytes);
    const info = parseMediaInfo(await probe(ffmpeg, outFile));
    assert.ok(Math.abs(info.duration - 20) < 0.05, "길이는 그대로");
    assert.equal(info.bits, 24, "24bit 그대로");
    const tail = spawnSync("ffmpeg", ["-hide_banner", "-nostdin", "-sseof", "-0.3", "-i", outFile, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
    assert.ok(parseMeanVolume(tail.stderr) < -40, "끝이 조용해짐");

    const b = await smoothEnding({ ffmpeg, bytes: readFileSync(quiet), ext: "wav", tmpDir: dir });
    assert.equal(b.faded, false);

    const prep = await prepareExtendSource({ ffmpeg, src: loud, dir, seconds: 30 });
    assert.deepEqual(prep.range, { start: 10, end: 50, total: 50, add: 30 });
    const ext = parseMediaInfo(await probe(ffmpeg, path.join(dir, prep.file)));
    assert.ok(Math.abs(ext.duration - 50) < 0.1, `빈 소리 붙인 길이 ${ext.duration}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
