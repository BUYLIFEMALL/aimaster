import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildYue2Synth,
  checkYue2Wav,
  downloadVerified,
  isInstrumental,
  parseYue2Multipart,
  parseYue2Progress,
  pickYue2Profile,
  yue2Catalog,
  yue2Support,
  YUE2_STYLE_MAX,
} from "../src/yue2.mjs";
import { createQueue } from "../src/queue.mjs";
import { dirSize, missingModelGb, progressText, watchGrowth } from "../src/acestep.mjs";
import { mkdir, writeFile } from "node:fs/promises";

test("ACE-Step 받는 중 표시 — 안 받은 크기·진행 문구·폴더가 커질 때만 알림", async () => {
  const xl = { dit: "acestep-v15-xl-turbo", lm: "acestep-5Hz-lm-1.7B" };
  assert.equal(missingModelGb(xl, []), 14.9); // 처음: 공통 1.4 + XL 10 + 1.7B 3.5
  assert.equal(missingModelGb(xl, ["acestep-v15-turbo", "acestep-5Hz-lm-1.7B"]), 10);
  assert.equal(missingModelGb(xl, ["acestep-v15-xl-turbo", "acestep-5Hz-lm-1.7B"]), 0);
  assert.equal(progressText("받는 중", 3.2 * 1024 ** 3, 14.9), "받는 중 · 3.2GB / 약 14.9GB");
  assert.equal(progressText("받는 중", 16 * 1024 ** 3, 14.9), "받는 중 · 16.0GB"); // 예상보다 크면 「약」은 뺌

  const dir = path.join(await tmpDir(), "checkpoints");
  await mkdir(path.join(dir, "m"), { recursive: true });
  await writeFile(path.join(dir, "m", "a.bin"), Buffer.alloc(1000));
  const seen = [];
  const stop = watchGrowth(dir, (b) => seen.push(b), 30);
  await new Promise((r) => setTimeout(r, 200));
  await writeFile(path.join(dir, "m", "b.bin"), Buffer.alloc(500));
  await new Promise((r) => setTimeout(r, 300));
  stop();
  assert.ok(seen.length >= 1 && seen.every((b) => b === 500), JSON.stringify(seen));
  assert.equal(await dirSize(dir), 1500);
});

const tmpDir = () => mkdtemp(path.join(os.tmpdir(), "fms-yue2-"));

/** 48kHz 스테레오 24bit WAV(samples: 한 채널 값 목록) */
function wav24(samples, { bits = 24 } = {}) {
  const data = Buffer.alloc(samples.length * 6);
  samples.forEach((v, i) => {
    data.writeIntLE(v, i * 6, 3);
    data.writeIntLE(v, i * 6 + 3, 3);
  });
  const fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(1, 0);
  fmt.writeUInt16LE(2, 2);
  fmt.writeUInt32LE(48000, 4);
  fmt.writeUInt32LE(48000 * 6, 8);
  fmt.writeUInt16LE(6, 12);
  fmt.writeUInt16LE(bits, 14);
  const chunk = (name, body) => Buffer.concat([Buffer.from(name, "ascii"), Buffer.from(Uint32Array.of(body.length).buffer), body]);
  const body = Buffer.concat([Buffer.from("WAVE"), chunk("fmt ", fmt), chunk("data", data)]);
  return Buffer.concat([Buffer.from("RIFF"), Buffer.from(Uint32Array.of(body.length).buffer), body]);
}

test("그래픽 메모리별 구성 — 12GB 이상 BF16, 8GB 이상 Q8, 아니면 못 씀", () => {
  assert.equal(pickYue2Profile(16)?.id, "bf16");
  assert.equal(pickYue2Profile(12)?.id, "bf16");
  assert.equal(pickYue2Profile(8)?.id, "q8");
  assert.equal(pickYue2Profile(6), null);
  assert.equal(pickYue2Profile(null), null);
});

test("되는 PC 판정 — 윈도우·NVIDIA·드라이버 580+·8GB+", () => {
  assert.equal(yue2Support({ platform: "win32", nvidia: true, vramGb: 15.9, driver: "616.92" }).ok, true);
  assert.match(yue2Support({ platform: "darwin", nvidia: false, vramGb: null, driver: "" }).reason, /윈도우/);
  assert.match(yue2Support({ platform: "win32", nvidia: false, vramGb: null, driver: "" }).reason, /NVIDIA/);
  assert.match(yue2Support({ platform: "win32", nvidia: true, vramGb: 16, driver: "566.14" }).reason, /580/);
  assert.match(yue2Support({ platform: "win32", nvidia: true, vramGb: 6, driver: "600.1" }).reason, /8GB/);
});

test("받기 목록 — 주소는 고정 버전(태그·커밋)이고 확인값은 SHA-256", () => {
  const c = yue2Catalog();
  for (const item of [c.runtime, c.cuda, ...c.models]) {
    assert.match(item.sha256, /^[0-9a-f]{64}$/);
    assert.ok(item.bytes > 0);
    assert.ok(!/\/main\/|latest/.test(item.url), item.url);
  }
  // 커버 받아 적기 모델(엔진 0.8.0)은 커버 리비전, 나머지는 노래 모델 리비전 — 둘 다 고정 커밋
  for (const m of c.models) assert.ok(m.url.includes(c.cover.files.includes(m.filename) ? c.cover.revision : c.modelRevision), m.filename);
});

test("연주곡 — 가사를 비우고 연주곡 지시문(cot off), 노래는 cot full", () => {
  assert.ok(isInstrumental("[Instrumental]") && isInstrumental("") && !isInstrumental("[verse]\n안녕"));
  const inst = buildYue2Synth({ style: "lofi piano", lyrics: "[Instrumental]", seed: 7, durationSec: 200 });
  assert.equal(inst.lyrics, "");
  assert.equal(inst.cot, "off");
  assert.match(inst.style, /^lofi piano\n\nInstrumental music only/);
  assert.match(inst.style, /three-minute/);
  assert.equal(inst.seed, 7);
  assert.equal(inst.lm_seed, 7);
  const long = buildYue2Synth({ style: "x".repeat(2000), lyrics: "" });
  assert.ok(long.style.length <= YUE2_STYLE_MAX);
  const song = buildYue2Synth({ style: "k-pop", lyrics: "[verse]\n안녕", seed: 1 });
  assert.equal(song.cot, "full");
  assert.equal(song.output_format, "wav24");
});

test("결과 읽기 — JSON + WAV 두 조각", () => {
  const audio = wav24([1000, -2000]);
  const b = "XyZ";
  const buf = Buffer.concat([
    Buffer.from(`--${b}\r\nContent-Type: application/json\r\n\r\n{"seed":3}\r\n--${b}\r\nContent-Type: audio/wav\r\n\r\n`),
    audio,
    Buffer.from(`\r\n--${b}--\r\n`),
  ]);
  const out = parseYue2Multipart(buf, `multipart/mixed; boundary=${b}`);
  assert.deepEqual(out.replay, { seed: 3 });
  assert.equal(out.ext, "wav");
  assert.deepEqual(out.audio, audio);
  assert.throws(() => parseYue2Multipart(buf, "multipart/mixed"), /경계/);
});

test("WAV 검사 — 길이 계산, 무음·형식 오류는 실패", () => {
  const ok = checkYue2Wav(wav24(new Array(48000).fill(0).map((_, i) => (i === 10 ? 500 : 0))));
  assert.equal(ok.seconds, 1);
  assert.throws(() => checkYue2Wav(wav24([0, 0, 0])), /무음/);
  assert.throws(() => checkYue2Wav(Buffer.from("not a wav file at all, definitely not RIFF data......")), /WAV/);
});

test("진행 문구", () => {
  assert.match(parseYue2Progress("[AR] Score 10/500"), /악보/);
  assert.match(parseYue2Progress("[AR] Semantic song 0: 120 tokens"), /음악/);
  assert.equal(parseYue2Progress("[NAR] Step 3/8"), "YuE2 · 소리 다듬는 중 3/8");
  assert.equal(parseYue2Progress("loading model"), null);
});

test("받기 — SHA-256이 맞을 때만 저장, 틀리면 실패하고 파일을 남기지 않음", async () => {
  const dir = await tmpDir();
  const bytes = Buffer.from("yue2 test payload");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const fetchImpl = async () => new Response(bytes);
  const dest = path.join(dir, "a.bin");
  await downloadVerified({ url: "https://x/a", bytes: bytes.length, sha256 }, dest, { fetchImpl });
  assert.deepEqual(await readFile(dest), bytes);
  const bad = path.join(dir, "b.bin");
  await assert.rejects(downloadVerified({ url: "https://x/b", bytes: bytes.length, sha256: "0".repeat(64) }, bad, { fetchImpl }), /SHA-256/);
  await assert.rejects(stat(bad));
  await assert.rejects(downloadVerified({ url: "https://x/c", bytes: 999, sha256 }, path.join(dir, "c.bin"), { fetchImpl }), /크기/);
});

test("대기열 — 엔진·상업용 구분을 기억하고, 작업마다 실행 가능 여부를 묻는다", async () => {
  const file = path.join(await tmpDir(), "queue.json");
  const seen = [];
  const ran = [];
  const q = createQueue({
    file,
    canRun: (job) => (seen.push(job.engine), job.engine === "yue2"),
    run: async (job) => (ran.push(job.engine), {}),
  });
  await q.load();
  const track = { id: "11111111-1111-4111-8111-111111111111" };
  const a = await q.add({ kind: "text2music", title: "가", track, task: {}, engine: "yue2" });
  assert.equal(a.engine, "yue2");
  assert.equal(a.license, "noncommercial");
  const b = await q.add({ kind: "text2music", title: "나", track: { id: "22222222-2222-4222-8222-222222222222" }, task: {} });
  assert.equal(b.engine, "acestep");
  assert.equal(b.license, "commercial");
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(ran, ["yue2"]);
  assert.equal(q.get(b.id).status, "queued"); // ACE-Step 작업은 실행할 수 없으니 기다림
  assert.ok(seen.includes("acestep"));
  const saved = JSON.parse(await readFile(file, "utf8"));
  assert.equal(saved.jobs.find((j) => j.id === a.id).engine, "yue2");
});
