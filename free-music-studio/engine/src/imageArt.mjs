// 내 PC 앨범 그림(엔진 0.7.0) — 원본 boks-music `electron/image-catalog.mjs`·`image-engine.mjs`(MIT, © 2026 boksajang) 이식.
// stable-diffusion.cpp(MIT) 실행 파일 + 모델 두 가족(Z-Image Turbo·FLUX.2 klein 4B, Apache-2.0)으로 정사각형 PNG 1장.
// 다른 점: 받기는 우리 download.mjs(이어받기·재시도), 처음 그릴 때 엔진·모델을 받음(Stem과 같은 방식), 결과는 대기열 작업 번호로
// 데이터 폴더에 두고 화면이 받아 미리 본 뒤 곡 표지로 저장한다. 파일 크기·SHA-256은 원본이 2026-10-11 확인한 값 그대로.
import { execFile, spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rename, rm, rmdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { downloadVerified, hashFile } from "./download.mjs";
import { copyTree, freeBytes, isInside, removeBestEffort, sizeOf } from "./storage.mjs";

const HF = "https://huggingface.co";
const GH = "https://github.com/leejet/stable-diffusion.cpp/releases/download";
export const IMAGE_ENGINE_RELEASE = "master-956-1b0ba10";
const asset = (name, bytes, sha256) => ({ filename: name, url: `${GH}/${IMAGE_ENGINE_RELEASE}/${name}`, bytes, sha256 });
// 이 PC용 실행 파일 — NVIDIA는 CUDA 12(런타임 DLL 포함), 그 밖의 윈도우 그래픽카드는 Vulkan
export const IMAGE_ENGINE_BUILDS = {
  "win-cuda12": { label: "NVIDIA CUDA", assets: [asset("sd-master-1b0ba10-bin-win-cuda12-x64.zip", 337974452, "144b9631bf2eeb9bf6bf7f148cf40aaf05739ce7c49d3ac0ec2ddf6b65765d69"), asset("cudart-sd-bin-win-cu12-x64.zip", 563452046, "fe20366827d357c00797eebb58244dddab7fd9a348d70090c3871004c320f38d")] },
  "win-vulkan": { label: "Vulkan", assets: [asset("sd-master-1b0ba10-bin-win-vulkan-x64.zip", 30123908, "9e8b9baff514fe5dfb77e51bf08d85f11e6f10128eac14d4474c87f563309725")] },
  "win-cpu": { label: "CPU", assets: [asset("sd-master-1b0ba10-bin-win-cpu-x64.zip", 17543461, "39c2ea1cc03f697864c858ad0b22b9b8ce62f945ba428e8596a814527e6db6fb")] },
  "mac-metal": { label: "Apple Metal", assets: [asset("sd-master-1b0ba10-bin-Darwin-macOS-26.6.2-arm64.zip", 35158090, "72c18ca1ba4177ca77cd288a9cb1e0f78d63ad3bde4b91fd7c84f3f4187b5761")] },
};
const hf = (repo, file, bytes, sha256, folder) => ({ filename: file.split("/").pop(), url: `${HF}/${repo}/resolve/main/${file}`, bytes, sha256, folder });
// Qwen3-4B 글 이해 모델 — 두 가족이 같은 파일(같은 SHA-256)을 함께 쓴다
const TEXT_ENCODERS = {
  q4: hf("unsloth/Qwen3-4B-GGUF", "Qwen3-4B-Q4_K_M.gguf", 2497281312, "f6f851777709861056efcdad3af01da38b31223a3ba26e61a4f8bf3a2195813a", "text-encoders"),
  q8: hf("unsloth/Qwen3-4B-GGUF", "Qwen3-4B-Q8_0.gguf", 4280405792, "eed555233267a33c7e8ee31682762cc7751b3f6d224039086e0e846f05fffa5d", "text-encoders"),
  bf16: hf("Comfy-Org/z_image_turbo", "split_files/text_encoders/qwen_3_4b.safetensors", 8044982048, "6c671498573ac2f7a5501502ccce8d2b08ea6ca2f661c458e708f36b36edfc5a", "text-encoders"),
};
export const IMAGE_FAMILIES = [
  {
    id: "z-image-turbo",
    name: "Z-Image Turbo",
    vendor: "Tongyi-MAI",
    license: "Apache-2.0",
    parameters: "6B",
    description: "사실적인 질감과 조명이 강한 고품질 모델입니다. 8단계로 그립니다.",
    steps: 8,
    cfgScale: 1,
    vae: hf("Comfy-Org/z_image_turbo", "split_files/vae/ae.safetensors", 335304388, "afc8e28272cd15db3919bacdb6918ce9c1ed22e96cb12c4d5ed0fba823529e38", "z-image-turbo"),
    variants: [
      { quant: "Q3_K", note: "4GB급 그래픽카드에서도 되는 가장 작은 구성(세부 묘사가 줄어듦)", minVramGB: 4, recVramGB: 6, diffusion: hf("leejet/Z-Image-Turbo-GGUF", "z_image_turbo-Q3_K.gguf", 3143559104, "4b44bdaa7814f20d7cf144e3939bd93aa32f50660204dd0c2aea5c5376232980", "z-image-turbo"), textEncoder: "q4" },
      { quant: "Q4_K", note: "6GB급 그래픽카드의 균형 구성", minVramGB: 6, recVramGB: 8, diffusion: hf("leejet/Z-Image-Turbo-GGUF", "z_image_turbo-Q4_K.gguf", 3864250304, "14b375ab4f226bc5378f68f37e899ef3c2242b8541e61e2bc1aff40976086fbd", "z-image-turbo"), textEncoder: "q4" },
      { quant: "Q6_K", note: "원본에 가까운 품질, 8GB급 그래픽카드", minVramGB: 8, recVramGB: 10, diffusion: hf("leejet/Z-Image-Turbo-GGUF", "z_image_turbo-Q6_K.gguf", 5263239104, "319f627beac8059b7546f36a7b4d5097b7f4ee6a1fc37585d0f75ca1d12d01af", "z-image-turbo"), textEncoder: "q4" },
      { quant: "Q8_0", note: "원본과 거의 같은 품질, 10GB급 그래픽카드", minVramGB: 8, recVramGB: 10, diffusion: hf("leejet/Z-Image-Turbo-GGUF", "z_image_turbo-Q8_0.gguf", 6577440704, "df1c5baa86d1398c979495a6072dbcee79444fdb884a2445582ba0769c44e9a1", "z-image-turbo"), textEncoder: "q8" },
      // 16GB에도 들어가지만 Q8_0과 품질이 같고 받는 크기가 두 배라 18GB부터 추천(원본 주석)
      { quant: "BF16", note: "줄이지 않은 원본, 16GB 이상 그래픽카드", minVramGB: 13, recVramGB: 18, diffusion: hf("Comfy-Org/z_image_turbo", "split_files/diffusion_models/z_image_turbo_bf16.safetensors", 12309866400, "2407613050b809ffdff18a4ac99af83ea6b95443ecebdf80e064a79c825574a6", "z-image-turbo"), textEncoder: "bf16" },
    ],
  },
  {
    id: "flux2-klein-4b",
    name: "FLUX.2 klein 4B",
    vendor: "Black Forest Labs",
    license: "Apache-2.0",
    parameters: "4B",
    description: "가장 빠른 모델입니다. 4단계로 그려 낮은 사양에서도 기다림이 짧습니다.",
    steps: 4,
    cfgScale: 1,
    vae: hf("Comfy-Org/flux2-klein-4B", "split_files/vae/flux2-vae.safetensors", 336211292, "868fe7b343cc8f3a19dbcfcafbc3d5f888802be3f89bd81b65b3621a066ce8f3", "flux2-klein-4b"),
    variants: [
      { quant: "Q4_0", note: "4GB급 그래픽카드용 가장 작은 구성", minVramGB: 4, recVramGB: 6, diffusion: hf("leejet/FLUX.2-klein-4B-GGUF", "flux-2-klein-4b-Q4_0.gguf", 2460378560, "d1023499ef3f2f82ff7c50e6778495195c1b6cc34835741778868428111f9ff4", "flux2-klein-4b"), textEncoder: "q4" },
      { quant: "Q8_0", note: "원본과 거의 같은 품질, 8GB급 그래픽카드", minVramGB: 6, recVramGB: 8, diffusion: hf("leejet/FLUX.2-klein-4B-GGUF", "flux-2-klein-4b-Q8_0.gguf", 4300629440, "0bba6951258ec8f92d51114a8fa13e66828297bfff58a738f52729b3ef66fa28", "flux2-klein-4b"), textEncoder: "q8" },
      { quant: "BF16", note: "줄이지 않은 원본, 12GB 이상 그래픽카드", minVramGB: 10, recVramGB: 12, diffusion: hf("Comfy-Org/flux2-klein-4B", "split_files/diffusion_models/flux-2-klein-4b.safetensors", 7751105712, "ec3d4e733a771f61c052fb4856c48b336c55eaf2c65487c2a1faeb9bbda7a343", "flux2-klein-4b"), textEncoder: "bf16" },
    ],
  },
];
const GB = 1024 ** 3;
export const variantId = (family, variant) => `${family.id}:${variant.quant.toLowerCase()}`;

/** 판마다 필요한 파일(그림 모델·VAE·공용 글 이해 모델) */
export function imageVariants() {
  return IMAGE_FAMILIES.flatMap((family) =>
    family.variants.map((v) => {
      const files = [v.diffusion, family.vae, TEXT_ENCODERS[v.textEncoder]];
      return {
        id: variantId(family, v),
        family: family.id,
        familyName: family.name,
        quant: v.quant,
        note: v.note,
        minVramGB: v.minVramGB,
        recVramGB: v.recVramGB,
        steps: family.steps,
        cfgScale: family.cfgScale,
        files,
        modelBytes: files.reduce((s, f) => s + f.bytes, 0),
        weightsGB: (v.diffusion.bytes + TEXT_ENCODERS[v.textEncoder].bytes) / GB,
      };
    })
  );
}
export const findImageVariant = (id) => imageVariants().find((v) => v.id === id) || null;

const num = (v) => {
  const p = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(p) ? p : 0;
};
/** 이 PC용 실행 파일(없으면 이유) — system { platform, arch, gpu, gpuVendor, vramGb } */
export function imageEngineBuild(system = {}) {
  const platform = system.platform || process.platform;
  const arch = system.arch || process.arch;
  const vendor = `${system.gpuVendor || ""} ${system.gpu || ""}`.toLowerCase();
  if (platform === "darwin") return arch === "arm64" ? { id: "mac-metal", ...IMAGE_ENGINE_BUILDS["mac-metal"] } : { id: null, reason: "Intel 맥용 그림 엔진 실행 파일은 없습니다." };
  if (platform !== "win32") return { id: null, reason: "지금 운영체제는 지원하지 않습니다." };
  if (arch !== "x64") return { id: null, reason: "윈도우 x64에서만 그림 엔진 실행 파일이 있습니다." };
  if (/nvidia/.test(vendor)) return { id: "win-cuda12", ...IMAGE_ENGINE_BUILDS["win-cuda12"] };
  if (/amd|radeon|\barc\b|intel\(r\) arc|iris xe/.test(vendor)) return { id: "win-vulkan", ...IMAGE_ENGINE_BUILDS["win-vulkan"] };
  return { id: "win-cpu", ...IMAGE_ENGINE_BUILDS["win-cpu"] };
}
/** 쓸 수 있는 그래픽 메모리·시스템 메모리·남은 공간(GB). 애플 실리콘은 한 메모리를 함께 쓴다. */
export function imageHardware(system = {}) {
  const ram = num(system.ramGb);
  const disk = num(system.freeGb);
  const build = imageEngineBuild(system);
  if (build.id === "mac-metal") return { build, gpuGB: ram * 0.65, ramGB: ram, diskGB: disk, shared: true };
  // AMD·Intel은 그래픽 메모리를 알 수 없는 경우가 많아 4GB로 보고 그렇게 알린다(원본)
  const reported = build.id === "win-cpu" ? 0 : num(system.vramGb);
  const unknownVram = build.id === "win-vulkan" && !reported;
  return { build, gpuGB: unknownVram ? 4 : reported, ramGB: ram, diskGB: disk, shared: false, unknownVram };
}

/**
 * 판마다 상태 — recommended | available | slow(메모리 사이를 오가며 느리게) | unavailable(이유). 가족마다 낮은 사양부터.
 * installed: 받아 둔 판 id, engineInstalled: 실행 파일 있음, presentFiles: 이미 있는 모델 파일 `폴더/이름`
 */
export function localImageChoices(system = {}, { installed = [], engineInstalled = false, presentFiles = [] } = {}) {
  const hw = imageHardware(system);
  const { build } = hw;
  const present = new Set(presentFiles);
  const engineBytes = build.id && !engineInstalled ? build.assets.reduce((s, a) => s + a.bytes, 0) : 0;
  const rows = imageVariants().map((v) => {
    const needBytes = engineBytes + v.files.filter((f) => !present.has(`${f.folder}/${f.filename}`)).reduce((s, f) => s + f.bytes, 0);
    const needGB = needBytes / GB;
    const isInstalled = installed.includes(v.id);
    let status = "available";
    let reason = "";
    if (!build.id) (status = "unavailable"), (reason = build.reason);
    else if (!isInstalled && hw.diskGB && hw.diskGB < needGB * 1.1 + 1) (status = "unavailable"), (reason = `저장 공간이 부족합니다. ${needGB.toFixed(1)}GB가 필요한데 ${hw.diskGB.toFixed(0)}GB 남았습니다.`);
    else if (hw.shared ? hw.ramGB * 0.75 < v.weightsGB * 1.2 : hw.gpuGB + hw.ramGB * 0.6 < v.weightsGB * 1.2) (status = "unavailable"), (reason = `메모리가 부족합니다. 그래픽 메모리와 시스템 메모리를 합쳐도 모델(${v.weightsGB.toFixed(1)}GB)을 올릴 수 없습니다.`);
    else if (build.id === "win-cpu") (status = "slow"), (reason = "그래픽카드 가속 없이 CPU로 그려 한 장에 몇 분 이상 걸릴 수 있습니다.");
    else if (hw.gpuGB < v.minVramGB) (status = "slow"), (reason = hw.unknownVram ? `그래픽 메모리 크기를 알 수 없어 4GB로 보았습니다. 권장 최소 ${v.minVramGB}GB보다 작으면 느리게 그립니다.` : `그래픽 메모리(${hw.gpuGB.toFixed(0)}GB)가 권장 최소 ${v.minVramGB}GB보다 작아 일부를 시스템 메모리로 옮기며 느리게 그립니다.`);
    const { files, ...rest } = v;
    return { ...rest, status, reason, installed: isInstalled, downloadBytes: isInstalled ? 0 : needBytes };
  });
  // 추천: 가족마다 권장 그래픽 메모리가 맞는 가장 높은 판, 전체는 Z-Image 먼저(원본)
  const pick = (fam) => [...rows].filter((r) => r.family === fam && r.status === "available" && hw.gpuGB >= r.recVramGB).pop() || rows.find((r) => r.family === fam && r.status === "available");
  const recommended = pick("z-image-turbo") || pick("flux2-klein-4b") || rows.find((r) => r.status === "slow") || null;
  for (const f of IMAGE_FAMILIES) {
    const best = pick(f.id);
    if (best) best.familyRecommended = true;
  }
  if (recommended) recommended.recommended = true;
  return {
    build: build.id ? { id: build.id, label: build.label } : null,
    reason: build.id ? "" : build.reason,
    hardware: { gpuGB: Math.round(hw.gpuGB * 10) / 10, ramGB: Math.round(hw.ramGB), diskGB: Math.round(hw.diskGB), shared: hw.shared, unknownVram: !!hw.unknownVram },
    recommendedId: recommended?.id || null,
    families: IMAGE_FAMILIES.map((f) => ({ id: f.id, name: f.name, vendor: f.vendor, license: f.license, parameters: f.parameters, description: f.description, variants: rows.filter((r) => r.family === f.id) })),
  };
}

/** PNG 머리·크기 확인(원본 validatePng 대신 간단히) */
export function checkPng(buf) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!buf || buf.length < 33 || !sig.every((b, i) => buf[i] === b) || buf.toString("ascii", 12, 16) !== "IHDR") throw new Error("그림 엔진이 만든 파일이 PNG가 아닙니다.");
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  if (!w || !h || w > 4096 || h > 4096) throw new Error("그림 크기가 올바르지 않습니다.");
  return { width: w, height: h };
}

/** 영어 설명문을 엔진이 읽을 수 있게 — 윈도우 sd-cli는 인자를 ANSI로 읽어 ASCII만 남긴다(원본 cleanArtPrompt) */
export const ART_PROMPT_LIMIT = 900;
export function cleanArtPrompt(text) {
  let v = String(text || "")
    .replace(/```[a-z]*\n?|```/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(prompt|image prompt)\s*:\s*/i, "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim();
  v = v.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-").normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/\s+/g, " ").trim();
  if (v.length > ART_PROMPT_LIMIT) v = v.slice(0, ART_PROMPT_LIMIT).replace(/[,;\s][^,;]*$/, "");
  if (v.split(" ").length < 3) throw new Error("그림 설명을 영어로 3단어 이상 적어 주세요(내 PC 그림 모델은 영어만 읽습니다).");
  return v;
}

const exists = (f) => stat(f).then((s) => s.isFile(), () => false);
const tarExe = () => (process.platform === "win32" ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe") : "/usr/bin/tar");

/**
 * 그림 모델 폴더(0.7.1): 엔진이 켤 때 정한 독립 폴더(settleImageDir, 기본 AIMasterImageModels) 또는 회원이 고른 폴더 안 「ImageModels」(getCustomDir, 0.7.1은 「AIMaster-ImageModels」). 둘 다 없을 때만 모델 저장 폴더 안 engines/image-sdcpp.
 * @param {{ dataDir: () => string, getCustomDir?: () => string, getSystem: () => Promise<object>, log?: (s:string)=>void, spawnImpl?: typeof spawn }} p
 */
export const IMAGE_DIR_NAME = "ImageModels"; // 0.7.2: 「AIMaster-ImageModels」 → 「ImageModels」(주인님 2026-11-07 「그냥 ImageModels 로 바꿔줘」). 이미 옮긴 폴더는 설정에 전체 경로가 있어 그대로 쓴다

/**
 * 그림 모델 기본 폴더(2026-11-06 주인님 「이미지 모델은 나중에 이미지 자동화에서 사용할 수 있으니 따로 폴더를 관리」) —
 * 음악 모델 폴더 밖의 독립 폴더. 음악 모델 폴더를 다른 드라이브로 옮겨 둔 PC면 그 드라이브의 \AIMaster\ImageModels, 아니면 %LOCALAPPDATA%\AIMaster\ImageModels.
 * 처음 한 번 정해 설정(imageDir)에 고정한다 — 나중에 음악 모델 폴더를 옮겨도 따라가지 않는다.
 */
export function defaultImageDir({ modelsDir = "", localAppData = process.env.LOCALAPPDATA || "", fallback = "" } = {}) {
  if (modelsDir) return path.join(path.parse(path.resolve(modelsDir)).root, "AIMaster", "ImageModels");
  return path.join(localAppData || fallback, "AIMaster", "ImageModels");
}

/** 엔진 0.7.0 기록은 실행 파일을 전체 경로로 적었다 — 새 폴더(root) 기준 상대 경로로 바꿔 옮긴 뒤에도 다시 받지 않게 */
export async function relativizeReceipt(root, oldRoot) {
  const rf = path.join(root, "install-state.json");
  const r = await readFile(rf, "utf8").then(JSON.parse, () => null);
  if (r?.engine?.executable && !r.engine.exeRel && isInside(r.engine.executable, oldRoot)) {
    const { executable, ...engine } = r.engine;
    await writeFile(rf, JSON.stringify({ ...r, engine: { ...engine, exeRel: path.relative(oldRoot, executable) } }, null, 1));
  }
}

/**
 * 엔진을 켤 때 한 번 — 그림 모델 폴더가 정해져 있지 않으면 기본 폴더로 정하고, 예전 자리(모델 저장 폴더 안 engines/image-sdcpp)에 받아 둔 것이 있으면
 * 같은 드라이브일 때만 옮긴다(이름 바꾸기라 바로 끝남). 드라이브가 다르거나 실패하면 예전 자리를 그대로 쓴다(회원이 화면에서 옮길 수 있음).
 * @returns {Promise<{ dir: string, moved: boolean, kept: boolean }>}
 */
export async function settleImageDir({ current, legacy, target, save, log = () => {} }) {
  if (current) return { dir: current, moved: false, kept: false };
  const hasLegacy = await stat(legacy).then((s) => s.isDirectory(), () => false);
  const hasTarget = await stat(target).then(() => true, () => false);
  if (hasLegacy && !hasTarget) {
    try {
      await mkdir(path.dirname(target), { recursive: true });
      await rename(legacy, target);
      await relativizeReceipt(target, legacy);
      await save(target);
      log(`🖼 그림 모델을 독립 폴더로 옮겼습니다: ${legacy} → ${target}`);
      return { dir: target, moved: true, kept: false };
    } catch (e) {
      log(`🖼 그림 모델은 예전 자리를 그대로 씁니다(${legacy}) — 「내 PC 엔진」 화면에서 다른 폴더로 옮길 수 있습니다. ${e instanceof Error ? e.message : e}`);
      return { dir: "", moved: false, kept: true };
    }
  }
  try {
    await mkdir(target, { recursive: true });
    await save(target);
    return { dir: target, moved: false, kept: false };
  } catch (e) {
    log(`🖼 그림 모델 기본 폴더를 만들지 못해 모델 저장 폴더 안을 씁니다. ${e instanceof Error ? e.message : e}`);
    return { dir: "", moved: false, kept: false };
  }
}
export function createImageArt({ dataDir, getCustomDir = () => "", getSystem, log = () => {}, spawnImpl = spawn, execFileImpl = execFile, renameImpl = rename }) {
  const defaultRoot = () => path.join(dataDir(), "engines", "image-sdcpp");
  const paths = () => {
    const root = getCustomDir() || defaultRoot();
    return { root, runtime: path.join(root, "runtime"), receipt: path.join(root, "install-state.json"), models: path.join(root, "models"), downloads: path.join(root, "downloads"), results: path.join(root, "results") };
  };
  const modelFile = (f) => path.join(paths().models, f.folder, f.filename);
  const readReceipt = async () => {
    try {
      const d = JSON.parse(await readFile(paths().receipt, "utf8"));
      return d && typeof d === "object" ? d : {};
    } catch {
      return {};
    }
  };
  const writeReceipt = async (d) => {
    const f = paths().receipt;
    await mkdir(path.dirname(f), { recursive: true });
    const tmp = `${f}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(d, null, 1));
    await rename(tmp, f);
  };

  const exeOf = (receipt) => (receipt.engine?.exeRel ? path.join(paths().root, receipt.engine.exeRel) : receipt.engine?.executable || "");

  /** 받아 둔 엔진·판(크기가 맞는 파일만, 확인값은 그릴 때 한 번) */
  async function inspect(system) {
    const receipt = await readReceipt();
    const build = imageEngineBuild(system);
    const exe = exeOf(receipt);
    const engineInstalled = !!(receipt.engine?.release === IMAGE_ENGINE_RELEASE && receipt.engine.build === build.id && exe && (await exists(exe)));
    const presentFiles = [];
    const installed = [];
    const seen = new Map();
    for (const v of imageVariants()) {
      let complete = true;
      for (const f of v.files) {
        const key = `${f.folder}/${f.filename}`;
        if (!seen.has(key)) {
          const ok = await stat(modelFile(f)).then((s) => s.size === f.bytes, () => false);
          seen.set(key, ok);
          if (ok) presentFiles.push(key);
        }
        if (!seen.get(key)) complete = false;
      }
      if (complete && engineInstalled && receipt.variants?.includes(v.id)) installed.push(v.id);
    }
    return { engineInstalled, installed, presentFiles, receipt };
  }

  async function state() {
    const system = await getSystem();
    const s = await inspect(system);
    return {
      ...localImageChoices(system, s),
      engineInstalled: s.engineInstalled,
      installed: s.installed,
      defaultId: s.receipt.defaultId || null,
      dir: paths().root,
      isDefault: !getCustomDir(),
      moving: moving ? { ...moving } : null,
      moveError,
    };
  }

  async function findExecutable(dir) {
    const names = process.platform === "win32" ? ["sd-cli.exe", "sd.exe"] : ["sd-cli", "sd"];
    const q = [dir];
    while (q.length) {
      const cur = q.shift();
      for (const e of await readdir(cur, { withFileTypes: true })) {
        const full = path.join(cur, e.name);
        if (e.isDirectory()) q.push(full);
        else if (names.includes(e.name)) return full;
      }
    }
    return null;
  }

  /** sd-cli --help가 우리가 쓰는 옵션을 보여 주면 실행 파일·라이브러리가 이 PC에서 뜬다(원본) */
  function probe(exe) {
    const r = spawnSync(exe, ["--help"], { cwd: path.dirname(exe), timeout: 60000, windowsHide: true, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    const out = `${r.stdout || ""}${r.stderr || ""}`;
    if (!/Usage:/.test(out) || !["--diffusion-model", "--llm", "--offload-to-cpu", "--diffusion-fa"].every((f) => out.includes(f))) throw new Error("그림 엔진을 실행하지 못했습니다. 그래픽 드라이버와 설치 상태를 확인해 주세요.");
  }

  /** 이 PC용 엔진(한 번)과 고른 판의 파일을 받는다. stage(글) */
  async function install(id, { signal, stage = () => {} } = {}) {
    const system = await getSystem();
    const s = await inspect(system);
    const row = localImageChoices(system, s).families.flatMap((f) => f.variants).find((r) => r.id === id);
    const v = findImageVariant(id);
    if (!row || !v) throw new Error("받을 그림 모델을 목록에서 골라 주세요.");
    if (row.status === "unavailable") throw new Error(row.reason || "이 PC에서는 쓸 수 없는 모델입니다.");
    const build = imageEngineBuild(system);
    const p = paths();
    const engineAssets = s.engineInstalled ? [] : build.assets;
    const files = v.files.filter((f) => !s.presentFiles.includes(`${f.folder}/${f.filename}`));
    const total = [...engineAssets, ...files].reduce((a, f) => a + f.bytes, 0) || 1;
    let done = 0;
    const show = (label) => (got) => stage(`${label} 받는 중 · ${(((done + got) / total) * 100).toFixed(0)}% (${((done + got) / GB).toFixed(1)} / ${(total / GB).toFixed(1)}GB)`);
    let engine = s.receipt.engine;
    if (engineAssets.length) {
      const target = path.join(p.runtime, IMAGE_ENGINE_RELEASE, build.id);
      await rm(target, { recursive: true, force: true });
      await mkdir(target, { recursive: true });
      for (const a of engineAssets) {
        const zip = path.join(p.downloads, a.filename);
        await downloadVerified(a, zip, { signal, onProgress: show("그림 엔진") });
        done += a.bytes;
        stage("그림 엔진 압축 푸는 중");
        const r = spawnSync(tarExe(), ["-xf", zip, "-C", target], { windowsHide: true });
        if (r.status !== 0) throw new Error(`압축을 풀지 못했습니다: ${a.filename}`);
        await rm(zip, { force: true });
      }
      const exe = await findExecutable(target);
      if (!exe) throw new Error("그림 엔진 실행 파일을 찾지 못했습니다. 다시 시도해 주세요.");
      stage("그림 엔진 실행 확인 중");
      probe(exe);
      engine = { release: IMAGE_ENGINE_RELEASE, build: build.id, exeRel: path.relative(p.root, exe), installedAt: new Date().toISOString() };
      // 모델 받기가 실패해도 엔진을 다시 받지 않게 바로 기록(원본)
      await writeReceipt({ ...(await readReceipt()), engine, variants: s.receipt.variants || [] });
      log(`🖼 그림 엔진 설치: ${build.label} ${IMAGE_ENGINE_RELEASE} → ${exe}`);
    }
    for (const f of files) {
      await downloadVerified(f, modelFile(f), { signal, onProgress: show(`${v.familyName} ${v.quant}`) });
      done += f.bytes;
    }
    const cur = await readReceipt();
    await writeReceipt({ ...cur, engine, variants: [...new Set([...(cur.variants || []), v.id])] });
    return v.id;
  }

  /** 받아 둔 판 지우기 — 다른 받아 둔 판이 같이 쓰는 파일(글 이해 모델·VAE)은 남긴다 */
  async function remove(id) {
    const v = findImageVariant(id);
    if (!v) return false;
    const r = await readReceipt();
    const left = (r.variants || []).filter((x) => x !== id);
    const keep = new Set(left.flatMap((x) => findImageVariant(x)?.files.map((f) => `${f.folder}/${f.filename}`) || []));
    for (const f of v.files) if (!keep.has(`${f.folder}/${f.filename}`)) await rm(modelFile(f), { force: true });
    await writeReceipt({ ...r, variants: left, defaultId: r.defaultId === id ? null : r.defaultId });
    return true;
  }

  async function setDefault(id) {
    if (!findImageVariant(id)) throw new Error("없는 그림 모델입니다.");
    await writeReceipt({ ...(await readReceipt()), defaultId: id });
  }

  /** 하루 지난 결과 그림 정리 */
  async function sweep() {
    const dir = paths().results;
    for (const n of await readdir(dir).catch(() => [])) {
      const f = path.join(dir, n);
      const s = await stat(f).catch(() => null);
      if (s && Date.now() - s.mtimeMs > 24 * 3600 * 1000) await rm(f, { force: true }).catch(() => {});
    }
  }

  const resultFile = (jobId) => path.join(paths().results, `${String(jobId).replace(/[^0-9a-f-]/gi, "")}.png`);

  /**
   * 대기열 작업 실행 — job.task { prompt(영어), variantId? }. 처음이면 엔진·모델을 받는다. 결과는 results/<작업 번호>.png
   * 엔진이 한글 경로에서 죽어(0xC0000409, 원본 실측) 모델 폴더 안에서 ASCII 상대 경로로 돌린다.
   */
  async function run(job, signal, stage) {
    const prompt = cleanArtPrompt(job.task?.prompt);
    const st = await state();
    const id = job.task?.variantId || st.defaultId || st.installed[0] || st.recommendedId;
    const v = findImageVariant(id);
    if (!v) throw new Error(st.reason || "이 PC에서 쓸 수 있는 그림 모델이 없습니다.");
    if (!st.installed.includes(id)) await install(id, { signal, stage });
    stage("그림 모델 확인 중");
    const verified = (await readReceipt()).verified || {};
    for (const f of v.files) {
      const file = modelFile(f);
      const s = await stat(file);
      const key = `${f.folder}/${f.filename}`;
      if (verified[key] === s.mtimeMs) continue;
      if ((await hashFile(file, signal)) !== f.sha256) {
        await rm(file, { force: true });
        throw new Error(`그림 모델 파일이 손상되어 지웠습니다(${f.filename}). 다시 그리면 새로 받습니다.`);
      }
      verified[key] = s.mtimeMs;
    }
    await writeReceipt({ ...(await readReceipt()), verified });
    const exe = exeOf(await readReceipt());
    const cpu = (await readReceipt()).engine.build === "win-cpu";
    const p = paths();
    const scratch = path.join(p.models, ".render");
    const name = `${randomUUID()}.png`;
    await mkdir(scratch, { recursive: true });
    const [diffusion, vae, llm] = v.files.map((f) => `${f.folder}/${f.filename}`);
    const seed = Number.isInteger(job.task?.seed) ? job.task.seed : Math.floor(Math.random() * 2147483647);
    const args = ["--diffusion-model", diffusion, "--vae", vae, "--llm", llm, "-p", prompt, "--cfg-scale", String(v.cfgScale), "--steps", String(v.steps), "-W", "1024", "-H", "1024", "--offload-to-cpu", "--diffusion-fa", "-s", String(seed), "-o", `.render/${name}`];
    const quietMs = cpu ? 30 * 60000 : 5 * 60000; // 멈춘 실행이 그래픽카드를 붙잡지 않게(CPU는 단계가 느림)
    const started = Date.now();
    log(`🖼 내 PC 그림: ${v.familyName} ${v.quant} 1024×1024`);
    stage("그림 모델 불러오는 중");
    // 그래픽 메모리 최대 사용량(B-3) — NVIDIA 그래픽카드로 그릴 때만
    const vram = !cpu && String((await readReceipt()).engine?.build ?? "").includes("cuda") ? watchVram(execFileImpl) : null;
    await new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason);
      const child = spawnImpl(exe, args, { cwd: p.models, windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PATH: `${path.dirname(exe)}${path.delimiter}${process.env.PATH || ""}` } });
      let tail = "";
      let hung = false;
      let quiet;
      const kill = () => {
        if (process.platform === "win32" && child.pid) spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("error", () => child.kill());
        else child.kill("SIGKILL");
      };
      const watch = () => {
        clearTimeout(quiet);
        quiet = setTimeout(() => ((hung = true), kill()), quietMs);
      };
      watch();
      const onAbort = () => kill();
      signal?.addEventListener("abort", onAbort, { once: true });
      const read = (d) => {
        watch();
        const t = String(d);
        tail = (tail + t).slice(-6000);
        for (const part of t.split(/[\r\n]+/)) {
          const m = /(\d+)\/(\d+)\s*-\s*[\d.]+\s*(?:s\/it|it\/s)/.exec(part);
          if (m) stage(`그림 그리는 중 ${m[1]}/${m[2]}`);
        }
      };
      child.stdout.on("data", read);
      child.stderr.on("data", read);
      child.on("error", (e) => (clearTimeout(quiet), signal?.removeEventListener("abort", onAbort), reject(e)));
      child.on("close", (code) => {
        clearTimeout(quiet);
        signal?.removeEventListener("abort", onAbort);
        if (signal?.aborted) return reject(signal.reason);
        if (hung) return reject(new Error(`그림 엔진이 ${quietMs / 60000}분 동안 응답하지 않아 멈췄습니다.`));
        if (code !== 0) {
          log(tail);
          return reject(new Error(`그림 엔진이 실패했습니다(코드 ${code}). ${tail.split(/\r?\n/).filter(Boolean).slice(-2).join(" ")}`.trim()));
        }
        resolve();
      });
    }).catch(async (e) => {
      await vram?.stop(); // 실패·취소 때도 측정을 멈춘다
      throw e;
    });
    const rendered = path.join(scratch, name);
    try {
      const buf = await readFile(rendered);
      const { width } = checkPng(buf);
      await mkdir(p.results, { recursive: true });
      await sweep();
      await writeFile(resultFile(job.id), buf);
      const seconds = Math.round((Date.now() - started) / 100) / 10;
      const vramPeakGb = vram ? await vram.stop() : null;
      log(`🖼 내 PC 그림 완료: ${seconds}초 (${width}px)${vramPeakGb != null ? ` · 그래픽 메모리 최대 ${vramPeakGb}GB` : ""}`);
      return { variantId: id, model: `${v.familyName} ${v.quant}`, seconds, seed, ...(vramPeakGb != null ? { vramPeakGb } : {}) };
    } finally {
      void vram?.stop();
      await rm(rendered, { force: true }).catch(() => {});
    }
  }

  /**
   * 그림 모델 폴더 바꾸기(0.7.1) — 고른 폴더 안 「ImageModels」로(0.7.1은 「AIMaster-ImageModels」). move: 같은 파일시스템의 빈 목적지는 이름 변경, 나머지는 복사 후 원본 정리 / fresh: 예전 것을 지우고 다음에 그릴 때 새로 받음.
   * 바로 답하고 뒤에서 옮긴다(state().moving). forbid: 고르면 안 되는 폴더(모델 저장 폴더의 옮겨 다니는 항목 등).
   */
  let moving = null;
  let moveError = "";
  async function moveTo(target, mode, { saveDir, busy = () => false, forbid = [] }) {
    if (moving) throw new Error("이미 옮기는 중입니다.");
    if (busy()) throw new Error("그림을 그리는 중입니다. 끝난 뒤 바꿔 주세요.");
    if (mode !== "move" && mode !== "fresh") throw new Error("옮기기 방식이 올바르지 않습니다.");
    if (typeof target !== "string" || !target.trim() || !path.isAbsolute(target.trim())) throw new Error("폴더 경로가 올바르지 않습니다.");
    const from = paths().root;
    const to = path.join(path.resolve(target.trim()), IMAGE_DIR_NAME);
    if (path.resolve(from) === to) throw new Error("지금 쓰는 폴더와 같습니다.");
    if (isInside(to, from) || isInside(from, to)) throw new Error("지금 그림 모델 폴더 안쪽(또는 바깥쪽)은 고를 수 없습니다. 다른 폴더를 골라 주세요.");
    for (const f of forbid) if (isInside(to, f)) throw new Error("모델 저장 폴더가 옮겨 다니는 곳 안쪽은 고를 수 없습니다. 다른 폴더를 골라 주세요.");
    await mkdir(to, { recursive: true });
    const has = await stat(from).then((s) => s.isDirectory(), () => false);
    const total = mode === "move" && has ? await sizeOf(from) : 0;
    // 드라이브 문자 대신 파일시스템 ID로 판단(같은 드라이브 아래 별도 마운트도 구분).
    const canRename = mode === "move" && has &&
      (await stat(from)).dev === (await stat(to)).dev && (await readdir(to)).length === 0;
    const checkCopySpace = async () => {
      const free = await freeBytes(to);
      if (total && free != null && free < total + 1024 ** 3) throw new Error(`그 드라이브 남은 공간이 모자랍니다(필요 약 ${Math.ceil(total / 1024 ** 3) + 1}GB, 남은 ${Math.floor(free / 1024 ** 3)}GB).`);
    };
    if (!canRename) await checkCopySpace();
    moving = { done: 0, total };
    moveError = "";
    log(`🖼 그림 모델 폴더 바꾸기: ${from} → ${to} (${mode === "move" ? "옮기기" : "새로 받기"})`);
    (async () => {
      let renamed = false;
      try {
        if (mode === "move" && has) {
          if (canRename) {
            // 빈 목적지만 제거한다. 기존 모델·다른 파일이 있으면 복사 경로를 쓴다.
            await rmdir(to);
            try {
              await renameImpl(from, to);
              renamed = true;
              moving.done = total;
            } catch (e) {
              await mkdir(to, { recursive: true });
              // 실제 rename이 EXDEV를 반환하면 복사 공간을 다시 검사한다.
              if (e.code !== "EXDEV") throw e;
              await checkCopySpace();
            }
          }
          if (!renamed) await copyTree(from, to, { skip: new Set([".render"]), onBytes: (n) => (moving.done += n) });
          await relativizeReceipt(to, from);
        }
        await saveDir(to);
        if (renamed) {
          // 렌더 임시 파일은 복사 경로와 동일하게 새 폴더에 남기지 않는다.
          await removeBestEffort(path.join(to, ".render"));
        } else if (has) await removeBestEffort(from);
        log(`✔ 그림 모델 폴더: ${to}${renamed ? " (파일 복사 없이 이동)" : ""}`);
      } catch (e) {
        let recovery = "예전 폴더를 그대로 씁니다.";
        if (renamed) {
          try { await renameImpl(to, from); }
          catch (rollbackError) { recovery = `자동 복구하지 못했습니다. 모델 파일은 ${to}에 보관되어 있습니다. ${rollbackError.message}`; }
        }
        moveError = `그림 모델 폴더를 옮기지 못했습니다 — ${recovery} ${e instanceof Error ? e.message : e}`;
        log(`⚠ ${moveError}`);
      } finally {
        moving = null;
      }
    })();
    return { ok: true, dir: to };
  }

  return { paths, state, install, remove, setDefault, run, resultFile, moveTo, isMoving: () => !!moving };
}


/** nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits 출력 → 첫 그래픽카드 사용량(MiB). 못 읽으면 null (B-3, 0.7.5) */
export function parseNvidiaMemUsed(text) {
  const first = String(text ?? "").split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  const m = first ? /\d+(?:\.\d+)?/.exec(first) : null;
  const n = m ? Number(m[0]) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * 그리는 동안 그래픽 메모리 최대 사용량을 잰다(B-3, 0.7.5) — 시작 전 사용량을 뺀 값(GB, 소수 1자리).
 * NVIDIA가 아니거나 nvidia-smi가 없으면 stop()이 null을 돌려준다(그림 그리기에는 영향 없음).
 */
export function watchVram(execFileImpl, everyMs = 1500) {
  const read = () =>
    new Promise((resolve) => {
      try {
        execFileImpl("nvidia-smi", ["--query-gpu=memory.used", "--format=csv,noheader,nounits"], { windowsHide: true, timeout: 5000 }, (err, out) => resolve(err ? null : parseNvidiaMemUsed(out)));
      } catch {
        resolve(null);
      }
    });
  let base = null;
  let peak = null;
  let stopped = false;
  const ready = read().then((v) => {
    base = v;
    peak = v;
  });
  const timer = setInterval(async () => {
    const v = await read();
    if (!stopped && v != null && (peak == null || v > peak)) peak = v;
  }, everyMs);
  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      await ready;
      if (base == null || peak == null) return null;
      return Math.round(Math.max(0, peak - base) / 102.4) / 10;
    },
  };
}
