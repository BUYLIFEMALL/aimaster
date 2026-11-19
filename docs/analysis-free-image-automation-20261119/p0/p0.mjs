// IMG-20261119-P0 실측 도구 — 저장소 코드와 무관한 시험 전용. 유료 호출·업로드·키 0.
// 사용:
//   node p0.mjs download <arc|rtx|rtx-q4> --models <ImageModels 폴더> --work <작업 폴더>
//   node p0.mjs run <z|flux> <q4|q8> <번호 예 1 또는 1-24> <시드 예 1001,2002> --models <…> --work <…> [--engine vulkan|cuda] [--square]
// 필수 파일 하나라도 받기·해시가 실패하면 0이 아닌 값으로 끝나고 압축 해제·실행을 하지 않는다.
// run은 <작업 폴더>/verified.json에 기록된 검증 파일(모델·실행 파일)만 쓰고, 실행 직전에 해시를 다시 대조한다.
// 모델 폴더 구조는 엔진 ImageModels(z-image-turbo·flux2-klein-4b·text-encoders)와 같다. 이미 있고 해시가 맞는 파일은 받지 않는다.
// 공용 모델 폴더에 같은 이름·다른 해시 파일이 있으면 그 파일은 건드리지 않고 <작업 폴더>/models-alt 에 따로 받는다.
// 파일 크기·SHA-256은 free-music-studio/engine/src/imageArt.mjs 고정값(릴리스 master-956-1b0ba10).
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(`--${name}`); return i < 0 ? def : argv[i + 1]; };
const flag = (name) => argv.includes(`--${name}`);
const pos = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && argv[i - 1] !== "--square"));
const MODELS_DIR = opt("models");
const WORK = opt("work");
if (!MODELS_DIR || !WORK) { console.error("--models 와 --work 가 필요합니다."); process.exit(2); }

// Git에 딸린 tar·curl이 먼저 잡히면 드라이브 문자 경로를 못 읽으므로 윈도우 기본 도구를 직접 쓴다
const SYS = path.join(process.env.SystemRoot || "C:/Windows", "System32");
const CURL = path.join(SYS, "curl.exe");
const TAR = path.join(SYS, "tar.exe");
const HF = "https://huggingface.co";
const GH = "https://github.com/leejet/stable-diffusion.cpp/releases/download/master-956-1b0ba10";
const F = {
  vulkan: [`${GH}/sd-master-1b0ba10-bin-win-vulkan-x64.zip`, "engine/sd-vulkan.zip", "9e8b9baff514fe5dfb77e51bf08d85f11e6f10128eac14d4474c87f563309725", "work"],
  cuda: [`${GH}/sd-master-1b0ba10-bin-win-cuda12-x64.zip`, "engine/sd-cuda12.zip", "144b9631bf2eeb9bf6bf7f148cf40aaf05739ce7c49d3ac0ec2ddf6b65765d69", "work"],
  cudart: [`${GH}/cudart-sd-bin-win-cu12-x64.zip`, "engine/cudart-cu12.zip", "fe20366827d357c00797eebb58244dddab7fd9a348d70090c3871004c320f38d", "work"],
  zvae: [`${HF}/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors`, "z-image-turbo/ae.safetensors", "afc8e28272cd15db3919bacdb6918ce9c1ed22e96cb12c4d5ed0fba823529e38"],
  fvae: [`${HF}/Comfy-Org/flux2-klein-4B/resolve/main/split_files/vae/flux2-vae.safetensors`, "flux2-klein-4b/flux2-vae.safetensors", "868fe7b343cc8f3a19dbcfcafbc3d5f888802be3f89bd81b65b3621a066ce8f3"],
  encq4: [`${HF}/unsloth/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf`, "text-encoders/Qwen3-4B-Q4_K_M.gguf", "f6f851777709861056efcdad3af01da38b31223a3ba26e61a4f8bf3a2195813a"],
  encq8: [`${HF}/unsloth/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q8_0.gguf`, "text-encoders/Qwen3-4B-Q8_0.gguf", "eed555233267a33c7e8ee31682762cc7751b3f6d224039086e0e846f05fffa5d"],
  zq4: [`${HF}/leejet/Z-Image-Turbo-GGUF/resolve/main/z_image_turbo-Q4_K.gguf`, "z-image-turbo/z_image_turbo-Q4_K.gguf", "14b375ab4f226bc5378f68f37e899ef3c2242b8541e61e2bc1aff40976086fbd"],
  zq8: [`${HF}/leejet/Z-Image-Turbo-GGUF/resolve/main/z_image_turbo-Q8_0.gguf`, "z-image-turbo/z_image_turbo-Q8_0.gguf", "df1c5baa86d1398c979495a6072dbcee79444fdb884a2445582ba0769c44e9a1"],
  fq4: [`${HF}/leejet/FLUX.2-klein-4B-GGUF/resolve/main/flux-2-klein-4b-Q4_0.gguf`, "flux2-klein-4b/flux-2-klein-4b-Q4_0.gguf", "d1023499ef3f2f82ff7c50e6778495195c1b6cc34835741778868428111f9ff4"],
  fq8: [`${HF}/leejet/FLUX.2-klein-4B-GGUF/resolve/main/flux-2-klein-4b-Q8_0.gguf`, "flux2-klein-4b/flux-2-klein-4b-Q8_0.gguf", "0bba6951258ec8f92d51114a8fa13e66828297bfff58a738f52729b3ef66fa28"],
};
const SETS = {
  arc: ["vulkan", "zvae", "fvae", "encq4", "fq4", "zq4"],
  rtx: ["cuda", "cudart", "zvae", "fvae", "encq8", "fq8", "zq8"],
  "rtx-q4": ["encq4", "fq4", "zq4"],
};
// 모의 시험 전용: 파일 표·구성 바꿔치기(실제 시험에서는 쓰지 않는다)
if (process.env.P0_FILES_JSON) { const t = JSON.parse(fs.readFileSync(process.env.P0_FILES_JSON, "utf8")); Object.assign(F, t.files); Object.assign(SETS, t.sets); }
const ENGINE_KEYS = { vulkan: ["vulkan"], cuda: ["cuda", "cudart"] };
const isWork = (k) => F[k][3] === "work";
const shared = (k) => path.join(isWork(k) ? WORK : MODELS_DIR, F[k][1]);
const alt = (k) => path.join(WORK, "models-alt", F[k][1]);
const MANIFEST = path.join(WORK, "verified.json");
const readManifest = () => (fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : { files: {}, engines: {} });
const writeManifest = (m) => { fs.mkdirSync(WORK, { recursive: true }); fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2)); };
const sha = (file) => new Promise((res, rej) => { const h = createHash("sha256"); fs.createReadStream(file).on("data", (d) => h.update(d)).on("end", () => res(h.digest("hex"))).on("error", rej); });
const stamp = (file) => { const st = fs.statSync(file); return { path: file, bytes: st.size, mtimeMs: st.mtimeMs }; };

/** 한 파일 확보 — 성공하면 검증한 경로, 실패하면 null. 해시가 다른 기존 공용 모델 파일은 건드리지 않고 별도 경로에 받는다. */
async function fetchOne(k) {
  const want = F[k][2];
  let f = shared(k);
  if (fs.existsSync(f)) {
    if ((await sha(f)) === want) { console.log(`OK(있음) ${f}`); return f; }
    if (!isWork(k)) {
      console.log(`불일치(공용 파일 그대로 둠) ${f} → 별도 경로 사용`);
      f = alt(k);
      if (fs.existsSync(f) && (await sha(f)) === want) { console.log(`OK(있음) ${f}`); return f; }
    }
  }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const r = spawnSync(CURL, ["-L", "--fail", "--retry", "5", "--retry-delay", "5", "-C", "-", "-sS", "-o", f, F[k][0]], { stdio: "inherit" });
  if (r.status !== 0) { console.log(`FAIL(받기 ${r.status}) ${f}`); return null; }
  const h = await sha(f);
  if (h !== want) { console.log(`FAIL(해시) ${f} ${h}`); return null; }
  console.log(`OK ${f} ${fs.statSync(f).size}`);
  return f;
}

async function download(set) {
  const keys = SETS[set];
  if (!keys) { console.error(`구성 없음: ${set}`); process.exit(2); }
  const m = readManifest();
  const failed = [];
  for (const k of keys) {
    const f = await fetchOne(k);
    if (f) m.files[k] = { ...stamp(f), sha256: F[k][2] };
    else { delete m.files[k]; failed.push(k); }
  }
  // 실패가 있으면 이 구성의 실행 파일 기록도 지워 run이 막히게 한다
  if (failed.length) for (const [build, ek] of Object.entries(ENGINE_KEYS)) if (ek.some((k) => failed.includes(k))) delete m.engines[build];
  writeManifest(m);
  if (failed.length) { console.error(`중단: 필수 파일 실패 ${failed.join(", ")} — 압축 해제·실행 안 함`); process.exit(1); }
  // 이 구성에 들어 있고 방금 검증한 실행 파일 묶음만, 묶음마다 따로 푼다
  for (const [build, ek] of Object.entries(ENGINE_KEYS)) {
    if (!ek.every((k) => keys.includes(k))) continue;
    const bin = path.join(WORK, "engine", `bin-${build}`);
    delete m.engines[build];
    writeManifest(m);
    fs.rmSync(bin, { recursive: true, force: true });
    fs.mkdirSync(bin, { recursive: true });
    for (const k of ek) {
      const r = spawnSync(TAR, ["-xf", m.files[k].path, "-C", bin], { stdio: "inherit" });
      if (r.status !== 0) { console.error(`중단: 압축 해제 실패 ${m.files[k].path} (${r.status})`); process.exit(1); }
    }
    const exe = ["sd-cli.exe", "sd.exe"].map((n) => path.join(bin, n)).find((f) => fs.existsSync(f));
    if (!exe) { console.error(`중단: ${bin} 에 실행 파일 없음`); process.exit(1); }
    m.engines[build] = { ...stamp(exe), sha256: await sha(exe), from: ek.map((k) => F[k][2]) };
    writeManifest(m);
    console.log(`실행 파일 준비 ${build}: ${exe}`);
  }
  console.log("DONE");
}

/** run 전에 — 검증 기록에 있고, 크기·시각이 같고, 해시가 다시 맞는 파일만 쓴다 */
async function verified(entry, label) {
  if (!entry || !fs.existsSync(entry.path)) throw new Error(`검증 기록 없음: ${label} — 먼저 download`);
  const st = fs.statSync(entry.path);
  if (st.size !== entry.bytes || st.mtimeMs !== entry.mtimeMs || (await sha(entry.path)) !== entry.sha256) throw new Error(`검증 뒤 바뀐 파일: ${entry.path} — 다시 download`);
  return entry.path;
}

const SIZE = { "1:1": [1024, 1024], "16:9": [1344, 768], "9:16": [768, 1344] };
const TAIL = ", no text, no letters, no watermark";
const P = [
  ["1:1", "a Korean woman in her 30s working on a laptop at a bright cafe window, natural light, candid photo"],
  ["16:9", "a Korean family having breakfast at a wooden table in a modern apartment, morning sunlight, lifestyle photo"],
  ["16:9", "a quiet street in Seoul at dusk with warm shop lights, wet pavement, cinematic photo"],
  ["9:16", "a Korean man in his 40s jogging along the Han River park at sunrise, full body, sports photo"],
  ["1:1", "a steaming bowl of Korean bibimbap on a dark stone table, top view, food photography"],
  ["9:16", "a cozy reading corner with a floor lamp, a knitted blanket and a cup of tea, interior photo"],
  ["1:1", "an empty white marble podium with soft shadow on a pastel beige background, studio product backdrop"],
  ["1:1", "a light wooden tabletop with blurred green plants behind, empty center for product placement"],
  ["16:9", "a clean kitchen counter with morning light and blurred shelves, empty foreground space"],
  ["9:16", "a pink gradient background with floating soap bubbles, empty center, cosmetic advertisement backdrop"],
  ["1:1", "dark slate surface with water droplets and dramatic side lighting, premium product backdrop"],
  ["16:9", "a sunny beach sand surface with soft waves at the edge, empty center, summer product backdrop"],
  ["16:9", "a surprised Korean man in his 20s pointing to the right side, plain yellow background, large empty space on the right"],
  ["16:9", "a Korean woman holding a smartphone with a shocked expression, blue background, empty space on the left"],
  ["16:9", "a pile of gold coins and a rising green arrow on a dark background, bold composition, empty top area"],
  ["9:16", "a Korean chef presenting a dish toward the camera, kitchen background blurred, empty space at the top"],
  ["1:1", "a before and after split composition of a messy desk and a tidy desk, clear center dividing line"],
  ["9:16", "a close-up of hands typing on a keyboard with glowing screen light, empty dark area at the bottom"],
  ["1:1", "flat vector illustration of a small online shop with delivery boxes and a friendly Korean shop owner, pastel colors"],
  ["16:9", "isometric illustration of a home office with computer, plants and a cat, soft colors"],
  ["9:16", "watercolor illustration of cherry blossoms along a stream in spring, gentle pink tones"],
  ["1:1", "cute 3D render of a robot assistant holding a paintbrush, soft studio lighting, pastel background"],
  ["16:9", "minimal line art illustration of a mountain landscape at sunset, two colors only"],
  ["9:16", "children book style illustration of a Korean girl flying a kite on a green hill, bright colors"],
];

// 1초마다 프로세스 최대 메모리·그래픽 메모리(성능 카운터, NVIDIA는 nvidia-smi도)를 재서 파일에 최댓값을 남긴다
const SAMPLER = `$p=0;$s=0;$d=0;$n=0;while($true){try{$c=(Get-Counter '\\GPU Adapter Memory(*)\\Shared Usage','\\GPU Adapter Memory(*)\\Dedicated Usage' -ErrorAction Stop).CounterSamples;$x=($c|?{$_.Path -like '*shared*'}|measure CookedValue -Maximum).Maximum;$y=($c|?{$_.Path -like '*dedicated*'}|measure CookedValue -Maximum).Maximum;if($x -gt $s){$s=$x};if($y -gt $d){$d=$y}}catch{};try{$v=[int]((& nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits 2>$null)|select -First 1);if($v -gt $n){$n=$v}}catch{};$q=Get-Process sd-cli,sd -ErrorAction SilentlyContinue|measure PeakWorkingSet64 -Maximum;if($q.Maximum -gt $p){$p=$q.Maximum};"$([int]($p/1MB)),$([int]($s/1MB)),$([int]($d/1MB)),$n"|Set-Content -Path $env:P0_SAMPLE;Start-Sleep -Milliseconds 1000}`;

async function run(mk, quant, range = "1", seedArg = "1001") {
  const fam = { z: { key: `z${quant}`, vae: "zvae", steps: 8, name: "z-image-turbo" }, flux: { key: `f${quant}`, vae: "fvae", steps: 4, name: "flux2-klein-4b" } }[mk];
  if (!fam || !F[fam.key]) throw new Error("모델은 z|flux, 양자화는 q4|q8");
  const m = readManifest();
  const builds = Object.keys(m.engines);
  const build = opt("engine", builds.length === 1 ? builds[0] : "");
  if (!m.engines[build]) throw new Error(`실행 파일 지정 필요: --engine ${Object.keys(ENGINE_KEYS).join("|")} (검증된 것: ${builds.join(", ") || "없음"})`);
  const exe = await verified(m.engines[build], `실행 파일 ${build}`);
  const diffusion = await verified(m.files[fam.key], fam.key);
  const vae = await verified(m.files[fam.vae], fam.vae);
  const llm = await verified(m.files[`enc${quant}`], `enc${quant}`);
  const tag = `${fam.name}-${quant}-${build}`;
  const [a, b] = range.split("-").map(Number);
  const nums = Array.from({ length: (b || a) - a + 1 }, (_, i) => a + i);
  const outDir = path.join(WORK, "out", tag);
  const logs = path.join(WORK, "logs");
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(logs, { recursive: true });
  const csv = path.join(logs, "results-v2.csv");
  if (!fs.existsSync(csv)) fs.writeFileSync(csv, "time,model,no,ratio,w,h,seed,exit,seconds,bytes,peakRamMB,gpuSharedPeakMB,gpuDedicatedPeakMB,nvidiaUsedPeakMB,note\n");
  const sq = flag("square");
  for (const no of nums) for (const seed of seedArg.split(",").map(Number)) {
    const [ratio, text] = P[no - 1];
    const [w, h] = sq ? SIZE["1:1"] : SIZE[ratio];
    const name = `${String(no).padStart(2, "0")}-${seed}${sq ? "-sq" : ""}.png`;
    const out = path.join(outDir, name);
    const sampleFile = path.join(logs, "sample.tmp");
    fs.writeFileSync(sampleFile, "0,0,0,0");
    const sampler = spawn("powershell", ["-NoProfile", "-Command", SAMPLER], { env: { ...process.env, P0_SAMPLE: sampleFile }, stdio: "ignore" });
    const args = ["--diffusion-model", diffusion, "--vae", vae, "--llm", llm, "-p", text + TAIL, "--cfg-scale", "1", "--steps", String(fam.steps), "-W", String(w), "-H", String(h), "--offload-to-cpu", "--diffusion-fa", "-s", String(seed), "-o", out];
    const t0 = Date.now();
    const r = spawnSync(exe, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000 });
    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    sampler.kill();
    fs.writeFileSync(path.join(logs, `${tag}-${name}.log`), `ARGS ${args.join(" ")}\n\n${r.stdout || ""}\n--- stderr\n${r.stderr || ""}`);
    const bytes = fs.existsSync(out) ? fs.statSync(out).size : 0;
    const s = fs.readFileSync(sampleFile, "utf8").trim();
    const note = r.error ? String(r.error.code || r.error.message) : bytes ? "" : (r.stderr || r.stdout || "").trim().split(/\r?\n/).slice(-1)[0].slice(0, 160).replace(/,/g, ";");
    fs.appendFileSync(csv, `${new Date().toISOString()},${tag},${no},${ratio},${w},${h},${seed},${r.status},${sec},${bytes},${s},${note}\n`);
    console.log(`${tag} #${no} ${w}x${h} seed ${seed}: exit ${r.status} ${sec}s ${bytes}B [ram,gpu공유,gpu전용,nvidia MB] ${s} ${note}`);
  }
}

if (pos[0] === "download") await download(pos[1]);
else if (pos[0] === "run") await run(pos[1], pos[2], pos[3], pos[4]).catch((e) => { console.error(`중단: ${e.message}`); process.exit(1); });
else { console.error("download 또는 run"); process.exit(2); }
