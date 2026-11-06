import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createStems, sortStems, stemDevice, stemLabel, stemTool } from "../src/stems.mjs";
import { stepArgs } from "../src/pyengines.mjs";

test("장치: 윈도우 NVIDIA 4GB 이상만 그래픽카드, 아니면 CPU, 윈도우 밖은 안 됨", () => {
  assert.equal(stemDevice({ platform: "win32", nvidia: true, vramGb: 8 }).device, "cuda");
  assert.equal(stemDevice({ platform: "win32", nvidia: true, vramGb: 3 }).device, "cpu");
  assert.equal(stemDevice({ platform: "win32", nvidia: false, vramGb: null }).device, "cpu");
  assert.equal(stemDevice({ platform: "darwin", nvidia: false, vramGb: null }).ok, false);
});

test("설치 묶음: 원본과 같은 고정 판, 날짜 제한 없이 장치별 저장소", () => {
  const cuda = stemTool("cuda");
  const p = { python: "py", root: "r", src: "s" };
  const args = stepArgs(cuda.steps[1], p, cuda.catalog);
  assert.ok(args.includes("audio-separator[gpu]==0.47.0") && args.includes("onnxruntime-gpu==1.23.2") && args.includes("torch==2.8.0"));
  assert.ok(!args.includes("--exclude-newer"));
  assert.ok(args.includes("https://download.pytorch.org/whl/cu128"));
  const cpu = stemTool("cpu");
  assert.equal(cpu.id, "stems-cpu");
  assert.ok(stepArgs(cpu.steps[1], p, cpu.catalog).includes("audio-separator[cpu]==0.47.0"));
});

test("이름표·순서: stem_(Vocals).wav → 보컬, 보컬·반주·드럼… 순", () => {
  assert.equal(stemLabel("C:/x/stem_(Vocals).wav"), "보컬");
  assert.equal(stemLabel("stem_(Instrumental).wav"), "반주");
  assert.equal(stemLabel("song_drums.wav"), "드럼");
  assert.equal(stemLabel("stem_(Other).wav"), "그 외 소리");
  assert.deepEqual(sortStems([{ label: "그 외 소리" }, { label: "베이스" }, { label: "보컬" }, { label: "새것" }]).map((f) => f.label), ["보컬", "베이스", "그 외 소리", "새것"]);
});

test("결과 목록·지우기: 「Stem」 폴더 안 파일만 지우고, 다른 파일이 있으면 폴더는 남긴다", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "fms-stems-"));
  try {
    const lib = path.join(dir, "lib");
    const batch = path.join(lib, "Stem", "노래 (2트랙)");
    await mkdir(batch, { recursive: true });
    await writeFile(path.join(batch, "보컬.wav"), "v");
    await writeFile(path.join(batch, "반주.wav"), "i");
    await writeFile(path.join(batch, "내 메모.txt"), "keep");
    const outside = path.join(dir, "outside.wav");
    await writeFile(outside, "o");
    const recordFile = path.join(dir, "stems.json");
    const sid = "11111111-1111-4111-8111-111111111111";
    await writeFile(
      recordFile,
      JSON.stringify([
        { id: "a", sourceId: sid, mode: "two", dir: batch, createdAt: "2026-11-06T00:00:00Z", files: [{ label: "보컬", file: path.join(batch, "보컬.wav"), size: 1 }, { label: "반주", file: path.join(batch, "반주.wav"), size: 1 }, { label: "밖", file: outside, size: 1 }] },
      ])
    );
    const stems = createStems({ dataDir: () => dir, library: { dir: lib }, recordFile, getDevice: () => ({ ok: true, device: "cpu", reason: "" }) });
    const list = await stems.listFor(sid);
    assert.equal(list.length, 1);
    assert.equal(list[0].files.length, 3);
    assert.equal((await stems.fileOf("a", 1)).label, "반주");
    assert.equal(await stems.fileOf("a", 9), null);
    assert.equal(await stems.remove("a"), true);
    assert.deepEqual(await readdir(batch), ["내 메모.txt"]); // 회원 파일·폴더는 남음
    assert.ok(await stat(outside)); // 「Stem」 밖 파일은 지우지 않음
    assert.equal((await stems.listFor(sid)).length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
