import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { TOOLS, ensureTools, toolBinDir, useTools } from "../src/tools.mjs";

const tmpDir = () => mkdtemp(path.join(os.tmpdir(), "fms-tools-"));

/** 폴더를 zip으로(윈도우 tar -a) */
async function zipOf(srcDir) {
  const zip = path.join(await tmpDir(), "t.zip");
  const r = spawnSync(process.platform === "win32" ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar", ["-a", "-cf", zip, "-C", srcDir, "."], { windowsHide: true });
  assert.equal(r.status, 0);
  const bytes = await readFile(zip);
  return { bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
}

test("도구 목록 — 고정 버전 주소, SHA-256, ffmpeg는 LGPL 판", () => {
  for (const t of Object.values(TOOLS)) {
    assert.match(t.sha256, /^[0-9a-f]{64}$/);
    assert.ok(t.bytes > 0 && !/latest/.test(t.url), t.url);
  }
  assert.match(TOOLS.ffmpeg.url, /lgpl/);
  assert.match(TOOLS.uv.url, /\/0\.9\.29\//);
});

test("도구 받기 — bin 폴더째 데이터 폴더 tools/에 두고, 다시 부르면 받지 않음", { skip: process.platform !== "win32" }, async () => {
  const src = await tmpDir();
  await mkdir(path.join(src, "ffmpeg-x", "bin"), { recursive: true });
  await writeFile(path.join(src, "ffmpeg-x", "bin", "ffmpeg.exe"), "fake");
  await writeFile(path.join(src, "ffmpeg-x", "bin", "avcodec.dll"), "fake");
  const z = await zipOf(src);
  const catalog = { ffmpeg: { label: "가짜 ffmpeg", url: "https://x/f.zip", bytes: z.bytes.length, sha256: z.sha256, exe: "ffmpeg.exe", binSubdir: "bin" } };
  let calls = 0;
  const fetchImpl = async () => (calls++, new Response(z.bytes));
  const data = await tmpDir();
  const stages = [];
  assert.deepEqual(await ensureTools(data, ["ffmpeg"], { catalog, fetchImpl, onStage: (s) => stages.push(s) }), ["ffmpeg"]);
  assert.ok(existsSync(path.join(toolBinDir(data, "ffmpeg"), "ffmpeg.exe")));
  assert.ok(existsSync(path.join(toolBinDir(data, "ffmpeg"), "avcodec.dll")));
  assert.ok(stages.some((s) => s.includes("푸는 중")));
  assert.deepEqual(await ensureTools(data, ["ffmpeg"], { catalog, fetchImpl }), []);
  assert.equal(calls, 1);

  const env = { Path: "C:\\Windows" };
  useTools(data, env);
  assert.equal(env.Path.split(path.delimiter)[0], toolBinDir(data, "ffmpeg"));
  useTools(data, env); // 두 번 넣지 않음
  assert.equal(env.Path.split(path.delimiter).filter((p) => p === toolBinDir(data, "ffmpeg")).length, 1);
});

test("도구 받기 — 맥·리눅스는 받지 않음(설치 안내 그대로)", async () => {
  assert.deepEqual(await ensureTools(await tmpDir(), ["uv"], { platform: "darwin" }), []);
});
