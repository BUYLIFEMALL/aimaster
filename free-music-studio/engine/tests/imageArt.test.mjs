import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { IMAGE_ENGINE_BUILDS, checkPng, cleanArtPrompt, imageFailMessage, createImageArt, defaultImageDir, imageEngineBuild, imageVariants, localImageChoices, settleImageDir } from "../src/imageArt.mjs";

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

test("그림 모델 폴더 바꾸기(0.7.1) — 고른 폴더 안 ImageModels로(0.7.2) 옮기고 예전 것은 지움, 안쪽·같은 폴더는 거절", async () => {
  const { mkdir, writeFile, readFile, stat } = await import("node:fs/promises");
  const base = await mkdtemp(path.join(os.tmpdir(), "fms-artmove-"));
  const models = path.join(base, "models");
  let custom = "";
  const art = createImageArt({ dataDir: () => models, getCustomDir: () => custom, getSystem: async () => ({ platform: "win32", arch: "x64", gpuVendor: "NVIDIA", vramGb: 8, ramGb: 16, freeGb: 200 }) });
  const oldRoot = art.paths().root;
  await mkdir(path.join(oldRoot, "models", "text-encoders"), { recursive: true });
  await writeFile(path.join(oldRoot, "models", "text-encoders", "a.gguf"), "x".repeat(1000));
  await writeFile(path.join(oldRoot, "install-state.json"), JSON.stringify({ engine: { executable: path.join(oldRoot, "runtime", "sd-cli.exe") } }));
  await assert.rejects(art.moveTo(path.join(oldRoot, "sub"), "move", { saveDir: async () => {} }), /안쪽/);
  await assert.rejects(art.moveTo("상대경로", "move", { saveDir: async () => {} }), /경로가 올바르지/);
  const target = path.join(base, "D-drive");
  const r = await art.moveTo(target, "move", { saveDir: async (d) => (custom = d) });
  assert.equal(r.dir, path.join(target, "ImageModels"));
  for (let i = 0; i < 100 && art.isMoving(); i++) await new Promise((ok) => setTimeout(ok, 20));
  assert.equal(art.paths().root, r.dir);
  assert.equal((await readFile(path.join(r.dir, "models", "text-encoders", "a.gguf"), "utf8")).length, 1000);
  assert.equal(await stat(oldRoot).then(() => true, () => false), false);
  const rec = JSON.parse(await readFile(path.join(r.dir, "install-state.json"), "utf8"));
  assert.deepEqual(rec.engine, { exeRel: path.join("runtime", "sd-cli.exe") }); // 0.7.0의 전체 경로 기록을 상대 경로로
  const st = await art.state();
  assert.equal(st.isDefault, false);
  assert.equal(st.dir, r.dir);
});

test("그림 모델 독립 폴더 — 모델이 있는 파일시스템 루트, 아니면 LOCALAPPDATA 아래", () => {
  const modelsDir = process.platform === "win32" ? "D:\\AI무료음악\\모델" : "/Volumes/모델/음악";
  assert.equal(defaultImageDir({ modelsDir }), path.join(process.platform === "win32" ? "D:\\" : "/", "AIMaster", "ImageModels"));
  const localAppData = process.platform === "win32" ? "C:\\Users\\a\\AppData\\Local" : "/Users/a/Library/Application Support";
  assert.equal(defaultImageDir({ modelsDir: "", localAppData }), path.join(localAppData, "AIMaster", "ImageModels"));
});

test("엔진을 켤 때 — 정해진 폴더가 있으면 그대로, 예전 자리에 받아 둔 것은 새 폴더로 옮기고 실행 파일 기록을 상대 경로로", async () => {
  const { mkdir, writeFile, readFile, stat } = await import("node:fs/promises");
  const base = await mkdtemp(path.join(os.tmpdir(), "fms-settle-"));
  const saved = [];
  const save = async (d) => saved.push(d);
  assert.deepEqual(await settleImageDir({ current: "X:\keep", legacy: "", target: "", save }), { dir: "X:\keep", moved: false, kept: false });
  const legacy = path.join(base, "models", "engines", "image-sdcpp");
  await mkdir(path.join(legacy, "runtime"), { recursive: true });
  await writeFile(path.join(legacy, "install-state.json"), JSON.stringify({ engine: { executable: path.join(legacy, "runtime", "sd-cli.exe") }, variants: ["flux2-klein-4b:q4_0"] }));
  const target = path.join(base, "AIMaster", "ImageModels");
  const r = await settleImageDir({ current: "", legacy, target, save });
  assert.deepEqual(r, { dir: target, moved: true, kept: false });
  assert.deepEqual(saved, [target]);
  assert.equal(await stat(legacy).then(() => true, () => false), false);
  const rec = JSON.parse(await readFile(path.join(target, "install-state.json"), "utf8"));
  assert.deepEqual(rec.engine, { exeRel: path.join("runtime", "sd-cli.exe") });
  // 받아 둔 것이 없으면 기본 폴더를 만들고 정한다
  const fresh = path.join(base, "fresh", "AIMaster", "ImageModels");
  assert.equal((await settleImageDir({ current: "", legacy: path.join(base, "없음"), target: fresh, save })).dir, fresh);
  assert.equal(await stat(fresh).then((s) => s.isDirectory()), true);
});

test("B-3 그래픽 메모리 — nvidia-smi 출력 읽기·시작 전 사용량을 뺀 최대값(GB)", async () => {
  const { parseNvidiaMemUsed, watchVram } = await import("../src/imageArt.mjs");
  assert.equal(parseNvidiaMemUsed("5321\n812\n"), 5321);
  assert.equal(parseNvidiaMemUsed(" 1024 MiB"), 1024);
  assert.equal(parseNvidiaMemUsed(""), null);
  assert.equal(parseNvidiaMemUsed("N/A"), null);
  const seq = [1000, 4000, 9192, 6000];
  let i = 0;
  const fake = (cmd, args, opts, cb) => cb(null, String(seq[Math.min(i++, seq.length - 1)]));
  const w = watchVram(fake, 5);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(await w.stop(), 8); // (9192 - 1000) MiB = 8.0GB
  const none = watchVram((c, a, o, cb) => cb(new Error("없음")), 5);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(await none.stop(), null);
});

// C-14: 실제 임시 파일로 복사 생략, 목적지 보존, 실패 복구를 검증한다.
for (const scenario of ["rename", "merge", "EXDEV", "EPERM", "save-fail", "rollback-fail"]) {
  test(`그림 폴더 이동 안전성: ${scenario}`, async (t) => {
    const fs = await import("node:fs/promises");
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "fms-art-fastmove-"));
    t.after(() => fs.rm(base, { recursive: true, force: true }));
    const from = path.join(base, "이전 그림");
    const target = path.join(base, "새 폴더");
    const to = path.join(target, "ImageModels");
    await fs.mkdir(path.join(from, "models"), { recursive: true });
    await fs.mkdir(path.join(from, ".render"), { recursive: true });
    await fs.writeFile(path.join(from, "models", "model.gguf"), "model-data");
    await fs.writeFile(path.join(from, ".render", "temporary.png"), "scratch");
    const before = await fs.stat(path.join(from, "models", "model.gguf"));
    if (scenario === "merge") {
      await fs.mkdir(to, { recursive: true });
      await fs.writeFile(path.join(to, "keep.txt"), "keep");
    }
    let custom = from;
    let attempts = 0;
    const art = createImageArt({
      dataDir: () => base, getCustomDir: () => custom, getSystem: async () => ({}),
      renameImpl: async (a, b) => {
        attempts++;
        if (scenario === "EXDEV") throw Object.assign(new Error("다른 파일시스템"), { code: "EXDEV" });
        if (scenario === "EPERM") throw Object.assign(new Error("파일을 연 프로그램이 있음"), { code: "EPERM" }); // 윈도우 잠김 → 복사로
        if (scenario === "rollback-fail" && attempts === 2) throw new Error("복구 차단");
        return fs.rename(a, b);
      },
    });
    await art.moveTo(target, "move", { saveDir: async (d) => {
      if (scenario.endsWith("fail")) throw new Error("설정 저장 실패");
      custom = d;
    } });
    for (let i = 0; i < 250 && art.isMoving(); i++) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(art.isMoving(), false, "이동이 끝나야 한다");
    const state = await art.state();
    if (scenario.endsWith("fail")) {
      assert.equal(custom, from);
      const actual = scenario === "rollback-fail" ? to : from;
      assert.equal(await fs.readFile(path.join(actual, "models", "model.gguf"), "utf8"), "model-data");
      assert.match(state.moveError, /설정 저장 실패/);
      if (scenario === "rollback-fail") assert.ok(state.moveError.includes(to) && state.moveError.includes("자동 복구하지 못했습니다"));
      else assert.equal((await fs.stat(path.join(from, "models", "model.gguf"))).ino, before.ino);
    } else {
      assert.equal(custom, to);
      assert.equal(await fs.readFile(path.join(to, "models", "model.gguf"), "utf8"), "model-data");
      assert.equal(await fs.stat(from).then(() => true, () => false), false);
      assert.equal(await fs.stat(path.join(to, ".render")).then(() => true, () => false), false);
      if (scenario === "rename") assert.equal((await fs.stat(path.join(to, "models", "model.gguf"))).ino, before.ino, "같은 파일을 이름만 바꿔야 한다");
      if (scenario === "merge") {
        assert.equal(attempts, 0);
        assert.equal(await fs.readFile(path.join(to, "keep.txt"), "utf8"), "keep");
      }
      if (scenario === "EXDEV" || scenario === "EPERM") assert.equal(attempts, 1);
    }
  });
}

test("0.7.8 16GB NVIDIA: Z-Image BF16은 쓸 수 있지만 「메모리 빠듯」 경고, Q8_0은 경고 없음·추천", () => {
  const nv = localImageChoices({ platform: "win32", arch: "x64", gpuVendor: "NVIDIA", vramGb: 15.9, ramGb: 32, freeGb: 500 });
  const z = nv.families.find((f) => f.id === "z-image-turbo").variants;
  const bf16 = z.find((v) => v.quant === "BF16");
  const q8 = z.find((v) => v.quant === "Q8_0");
  assert.equal(bf16.status, "available");
  assert.equal(bf16.tight, true);
  assert.match(bf16.reason, /권장 18GB보다 작아/);
  assert.equal(q8.tight, false);
  assert.equal(q8.reason, "");
  assert.notEqual(nv.recommendedId, bf16.id);
});

test("0.7.8 그림 엔진 실패 문장: 메모리 부족이면 한국어 안내, 아니면 마지막 두 줄", () => {
  const oom = imageFailMessage(1, "ggml_backend_cuda_buffer_type_alloc_buffer: allocating 2400 MiB on device 0: cudaMalloc failed: out of memory\n[E] sampling for image 1/1 failed after 14.99s", "BF16");
  assert.match(oom, /그래픽 메모리가 모자라.*BF16.*Q8_0/);
  assert.equal(imageFailMessage(1, "a\nb\nc\n"), "그림 엔진이 실패했습니다(코드 1). b c");
});

test("새 sd-cli 메모리 부족 문장(마스터PC 2026-11-08 실제 기록)도 한국어 안내 + 필요·남은 양", () => {
  const tail = [
    "[W] model manager memory on CUDA0: reported free 431.62 MB / total 16275.44 MB, tracked weights 11742.99 MB / other runtime 0.00 MB / current runtime 698.00 MB --- model_manager.cpp:1753",
    "[E] z_image segment 1/1 (graph) failed during allocated capacity check --- ggml_runner.cpp:899",
    "[W] model manager cannot make enough memory available on CUDA0: need 512.00 MB device / 698.00 MB budget, available 431.62 MB device / unlimited budget --- model_manager.cpp:1962",
    "[E] diffusion model compute failed --- diffusion_engine.cpp:2620",
    "[E] sampling for image 1/1 failed after 27.89s --- image.cpp:907",
    "[E] generate failed --- main.cpp:939",
  ].join("\n");
  const msg = imageFailMessage(1, tail, "BF16");
  assert.match(msg, /그래픽 메모리가 모자라/);
  assert.match(msg, /512MB가 필요했는데 432MB만 남아/);
  assert.match(msg, /BF16.*Q8_0/);
});

test("0.7.9 메모리 부족 재시도 판 — 같은 가족의 받아 둔 바로 아래 판, 없으면 null", async () => {
  const { smallerImageVariant, isImageOom } = await import("../src/imageArt.mjs");
  assert.equal(smallerImageVariant("z-image-turbo:bf16", ["z-image-turbo:q8_0", "z-image-turbo:q4_k"])?.id, "z-image-turbo:q8_0");
  assert.equal(smallerImageVariant("z-image-turbo:bf16", ["z-image-turbo:q4_k", "flux2-klein-4b:q8_0"])?.id, "z-image-turbo:q4_k");
  assert.equal(smallerImageVariant("z-image-turbo:bf16", ["flux2-klein-4b:q8_0"]), null);
  assert.equal(smallerImageVariant("z-image-turbo:q3_k", ["z-image-turbo:q3_k"]), null);
  assert.equal(isImageOom("[W] model manager cannot make enough memory available on CUDA0"), true);
  assert.equal(isImageOom("[E] generate failed"), false);
});

test("0.7.9 처음 고를 판 — 기본 판 → 받아 둔 추천 판 → 「메모리 빠듯」 아닌 받아 둔 판 → 받아 둔 첫 판 → 추천 판", async () => {
  const { pickImageVariant } = await import("../src/imageArt.mjs");
  const families = [{ variants: [
    { id: "z-image-turbo:q8_0", status: "available", tight: false },
    { id: "z-image-turbo:bf16", status: "available", tight: true },
    { id: "flux2-klein-4b:bf16", status: "available", tight: false },
  ] }];
  assert.equal(pickImageVariant("z-image-turbo:bf16", { families }), "z-image-turbo:bf16"); // 작업이 고른 판
  assert.equal(pickImageVariant("", { defaultId: "z-image-turbo:bf16", installed: ["z-image-turbo:q8_0"], families }), "z-image-turbo:bf16"); // 직접 정한 기본
  assert.equal(pickImageVariant("", { installed: ["z-image-turbo:bf16", "z-image-turbo:q8_0"], recommendedId: "z-image-turbo:q8_0", families }), "z-image-turbo:q8_0");
  assert.equal(pickImageVariant("", { installed: ["z-image-turbo:bf16", "flux2-klein-4b:bf16"], recommendedId: "z-image-turbo:q8_0", families }), "flux2-klein-4b:bf16");
  assert.equal(pickImageVariant("", { installed: ["z-image-turbo:bf16"], recommendedId: "z-image-turbo:q8_0", families }), "z-image-turbo:bf16");
  assert.equal(pickImageVariant("", { installed: [], recommendedId: "z-image-turbo:q8_0", families }), "z-image-turbo:q8_0");
});
