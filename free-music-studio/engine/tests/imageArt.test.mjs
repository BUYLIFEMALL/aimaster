import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { IMAGE_ENGINE_BUILDS, checkPng, cleanArtPrompt, createImageArt, imageEngineBuild, imageVariants, localImageChoices } from "../src/imageArt.mjs";

test("내 PC 그림 목록 — 두 가족 8개 판, 모든 파일은 고정 주소·크기·SHA-256", () => {
  const all = imageVariants();
  assert.equal(all.length, 8);
  for (const v of all) for (const f of v.files) {
    assert.match(f.sha256, /^[0-9a-f]{64}$/);
    assert.ok(f.bytes > 0 && /^https:\/\/huggingface\.co\/.+\/resolve\/main\//.test(f.url), f.url);
  }
  for (const b of Object.values(IMAGE_ENGINE_BUILDS)) for (const a of b.assets) assert.match(a.url, /\/master-956-1b0ba10\//);
});

test("실행 파일 고르기 — NVIDIA는 CUDA, AMD·Arc는 Vulkan, 그 밖은 CPU, Intel 맥은 없음", () => {
  assert.equal(imageEngineBuild({ platform: "win32", arch: "x64", gpuVendor: "NVIDIA", gpu: "RTX 5080" }).id, "win-cuda12");
  assert.equal(imageEngineBuild({ platform: "win32", arch: "x64", gpu: "AMD Radeon RX 7800" }).id, "win-vulkan");
  assert.equal(imageEngineBuild({ platform: "win32", arch: "x64", gpu: "Intel(R) UHD Graphics" }).id, "win-cpu");
  assert.equal(imageEngineBuild({ platform: "darwin", arch: "arm64" }).id, "mac-metal");
  assert.equal(imageEngineBuild({ platform: "darwin", arch: "x64" }).id, null);
});

test("추천 — 16GB NVIDIA는 Z-Image Q8_0(BF16은 18GB부터), CPU PC는 모두 「느림」, 공간이 모자라면 못 씀", () => {
  const nv = localImageChoices({ platform: "win32", arch: "x64", gpuVendor: "NVIDIA", vramGb: 16, ramGb: 32, freeGb: 500 });
  assert.equal(nv.recommendedId, "z-image-turbo:q8_0");
  assert.equal(nv.families.find((f) => f.id === "flux2-klein-4b").variants.find((v) => v.familyRecommended).quant, "BF16");
  const cpu = localImageChoices({ platform: "win32", arch: "x64", gpu: "Intel(R) UHD Graphics", ramGb: 32, freeGb: 500 });
  const rows = cpu.families.flatMap((f) => f.variants);
  assert.ok(rows.filter((r) => r.status !== "unavailable").every((r) => r.status === "slow"));
  assert.ok(cpu.recommendedId);
  const full = localImageChoices({ platform: "win32", arch: "x64", gpuVendor: "NVIDIA", vramGb: 16, ramGb: 32, freeGb: 3 });
  assert.ok(full.families.flatMap((f) => f.variants).every((r) => r.status === "unavailable" && /저장 공간/.test(r.reason)));
  assert.equal(full.recommendedId, null);
});

test("영어 설명문 — 따옴표·한글은 빼고 ASCII만, 너무 짧으면 안내", () => {
  assert.equal(cleanArtPrompt("Prompt: “misty autumn road”, warm light — 가을, film grain"), 'misty autumn road", warm light - , film grain');
  assert.throws(() => cleanArtPrompt("가을 노래"), /영어로 3단어/);
  const long = cleanArtPrompt("a quiet lakeside at dawn, ".repeat(60)); // 900자를 넘으면 마지막 쉼표 앞까지
  assert.ok(long.length <= 900 && long.endsWith("a quiet lakeside at dawn"));
});

test("PNG 확인 — 머리·크기", () => {
  const png = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
  png.write("IHDR", 12, "ascii");
  png.writeUInt32BE(1024, 16);
  png.writeUInt32BE(1024, 20);
  assert.deepEqual(checkPng(png), { width: 1024, height: 1024 });
  assert.throws(() => checkPng(Buffer.from("not png")), /PNG가 아닙니다/);
});

test("받아 둔 것이 없으면 상태는 「받지 않음」, 지우기는 기본 판도 풀어 준다", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "fms-art-"));
  const art = createImageArt({ dataDir: () => dir, getSystem: async () => ({ platform: "win32", arch: "x64", gpuVendor: "NVIDIA", vramGb: 8, ramGb: 16, freeGb: 200 }) });
  const s = await art.state();
  assert.equal(s.engineInstalled, false);
  assert.deepEqual(s.installed, []);
  await art.setDefault("flux2-klein-4b:q4_0");
  assert.equal((await art.state()).defaultId, "flux2-klein-4b:q4_0");
  assert.equal(await art.remove("flux2-klein-4b:q4_0"), true);
  assert.equal((await art.state()).defaultId, null);
  await assert.rejects(art.setDefault("없는 판"), /없는 그림 모델/);
});
