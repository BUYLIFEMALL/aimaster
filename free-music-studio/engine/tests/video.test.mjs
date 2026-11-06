import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkVideoInfo, createVideoStudio, validateEngineVideoOptions, videoChapters, videoTiming } from "../src/video.mjs";
import { readMp4Info } from "../src/mp4-info.mjs";

test("영상 설정: 16:9·9:16 크기, 허용 값만", () => {
  assert.deepEqual(validateEngineVideoOptions({ resolution: 1080 }).width, 1920);
  const v = validateEngineVideoOptions({ aspect: "9:16", resolution: 720, fps: 60, repeat: 3, normalize: true });
  assert.equal(v.width, 720);
  assert.equal(v.height, 1280);
  assert.equal(v.normalize, true);
  for (const bad of [{ fps: 29 }, { resolution: 1000 }, { repeat: 21 }, { repeat: 0 }, { format: "avi" }, { aspect: "4:3" }]) assert.throws(() => validateEngineVideoOptions(bad));
});

test("타이밍·챕터: 한 바퀴를 프레임에 맞추고 반복마다 챕터", () => {
  const t = videoTiming([1.01, 2], { fps: 30, repeat: 2 });
  assert.equal(t.cycleFrames, 91);
  assert.equal(t.frames, 182);
  assert.ok(Math.abs(t.alignedCycleDuration - 91 / 30) < 1e-9);
  const ch = videoChapters([{ id: "a", title: "가", duration: 1.01 }, { id: "b", title: "나", duration: 2 }], { cycleDuration: t.alignedCycleDuration, repeat: 2 });
  assert.deepEqual(ch.map((c) => c.start), [0, 1.01, 3.033, 4.043]);
});

test("검증: 프레임 수가 다르면 실패", () => {
  const info = { duration: 2, tracks: [{ type: "video", codec: "h264", width: 854, height: 480, frames: 48, frameRate: 24, averageFrameRate: 24 }, { type: "audio", codec: "aac" }] };
  const want = { width: 854, height: 480, fps: 24, frames: 48, duration: 2, repeat: 1 };
  assert.equal(checkVideoInfo(info, want), true);
  assert.equal(checkVideoInfo(info, { ...want, frames: 47 }), false);
});

const ffmpegOk = spawnSync("ffmpeg", ["-hide_banner", "-version"], { windowsHide: true }).status === 0;

test("실제 ffmpeg: 분석 → 조각 받기 → 반복 2번 담기 → MP4 검증·목록", { skip: !ffmpegOk && "ffmpeg 없음" }, async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "fms-video-"));
  try {
    const song = path.join(dir, "song.flac");
    spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1.5", "-ac", "2", "-ar", "44100", song], { windowsHide: true });
    const id = "11111111-1111-4111-8111-111111111111";
    const library = { dir: path.join(dir, "lib"), fileOf: async (x) => (x === id ? song : null) };
    const studio = createVideoStudio({ dataDir: path.join(dir, "data"), library, getFfmpeg: () => true });
    const started = await studio.start({ title: "시험 영상", template: "spectrum", tracks: [{ id, title: "사인파" }], options: { resolution: 480, fps: 24, repeat: 2, normalize: true } });
    assert.equal(started.ok, true, started.error);
    const sid = started.session.id;
    let s;
    for (let i = 0; i < 200; i++) {
      s = studio.get(sid);
      if (s.status !== "analyzing") break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(s.status, "rendering", s.error);
    const frames = s.timing.cycleFrames;
    assert.equal(frames, 36);
    const analysis = JSON.parse(await studio.analysis(sid, 0));
    assert.equal(analysis.encoding, "u8-bins-i8-wave");
    assert.equal(analysis.frameCount, Math.ceil(1.5 * 15));
    // 화면 대신 ffmpeg가 같은 크기·프레임 수의 Annex-B H.264를 만든다
    const h264 = path.join(dir, "v.h264");
    const enc = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `testsrc=size=854x480:rate=24`, "-frames:v", String(frames), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-bsf:v", "h264_mp4toannexb", "-f", "h264", h264], { windowsHide: true });
    if (enc.status !== 0) return; // libx264가 없는 ffmpeg — 담기 시험은 건너뜀
    const bytes = await readFile(h264);
    const half = Math.floor(bytes.length / 2);
    assert.equal((await studio.append(sid, 0, bytes.subarray(0, half))).written, half);
    assert.equal((await studio.append(sid, 0, bytes.subarray(0, half))).status, 409); // 같은 조각 두 번 → 순서 오류
    assert.equal((await studio.append(sid, half, bytes.subarray(half))).written, bytes.length);
    assert.equal((await studio.finish(sid, { frames: frames - 1, written: bytes.length })).ok, false);
    assert.equal((await studio.finish(sid, { frames, written: bytes.length, hardware: false, codec: "avc1.640028" })).ok, true);
    for (let i = 0; i < 300; i++) {
      s = studio.get(sid);
      if (s.status !== "finishing") break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(s.status, "done", s.error);
    const info = await readMp4Info(s.video.file);
    const v = info.tracks.find((t) => t.type === "video");
    assert.equal(v.frames, 72);
    assert.equal(v.width, 854);
    assert.equal(s.video.chapters.length, 2);
    assert.match(path.basename(s.video.file), /^시험 영상\.mp4$/);
    const list = await studio.list();
    assert.equal(list.length, 1);
    assert.equal(list[0].missing, false);
    assert.equal((await studio.remove(list[0].id, { removeFile: true })).fileRemoved, true);
    assert.equal(await stat(s.video.file).then(() => true, () => false), false);
    assert.equal((await studio.list()).length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
