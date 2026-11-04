import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { buildPyJob, checkWav, fixLfsFiles, heartTags, isInstalledState, levoDescriptions, levoLyric, parseLfsPointer, parsePyLine, pyCatalog, pyErrorCause, pyEngine, pyPaths, pySupport, stepArgs, weightsKey, weightsPlan } from "../src/pyengines.mjs";

const win = { platform: "win32", nvidia: true };

test("목록: 1차 엔진 3개 + 2차 MiniMax Music 3, 분류·고정 판이 있다", () => {
  const ids = pyCatalog().engines.map((e) => e.id);
  assert.deepEqual(ids, ["heartmula", "stableaudio3", "levo2", "minimax3"]);
  for (const e of pyCatalog().engines) {
    assert.ok(["commercial", "noncommercial"].includes(e.license), e.id);
    if (e.source) assert.match(e.source.commit, /^[0-9a-f]{40}$/, e.id);
    for (const w of e.weights) assert.match(w.revision, /^[0-9a-f]{40}$/, `${e.id} ${w.repo}`);
  }
  assert.equal(pyEngine("levo2").license, "noncommercial");
  assert.equal(pyEngine("stableaudio3").hfToken, true);
});

test("LFS 자리표시 글 찾기·진짜 파일로 바꾸기(확인값 맞을 때만)", async () => {
  const { mkdtemp, mkdir: md, writeFile: wf, readFile: rf, rm: rmf } = await import("node:fs/promises");
  const os = await import("node:os");
  const { createHash } = await import("node:crypto");
  const real = Buffer.from("진짜 프롬프트 파일 내용".repeat(20));
  const oid = createHash("sha256").update(real).digest("hex");
  const pointer = `version https://git-lfs.github.com/spec/v1\noid sha256:${oid}\nsize ${real.length}\n`;
  assert.deepEqual(parseLfsPointer(pointer), { oid, size: real.length });
  assert.equal(parseLfsPointer("import torch\n"), null);
  const root = await mkdtemp(path.join(os.tmpdir(), "fms-lfs-"));
  try {
    const e = pyEngine("levo2");
    const p = { src: path.join(root, "src") };
    await md(path.join(p.src, "tools"), { recursive: true });
    await wf(path.join(p.src, "tools", "new_prompt.pt"), pointer);
    await wf(path.join(p.src, "generate.py"), "print('hi')\n");
    const asked = [];
    const fetchImpl = async (url) => (asked.push(url), new Response(real));
    assert.equal(await fixLfsFiles(e, p, { fetchImpl }), 1);
    assert.deepEqual(asked, [`https://media.githubusercontent.com/media/levo-demo/LeVo/${e.source.commit}/tools/new_prompt.pt`]);
    assert.deepEqual(await rf(path.join(p.src, "tools", "new_prompt.pt")), real);
    // 확인값이 틀리면 바꾸지 않고 실패
    await wf(path.join(p.src, "tools", "new_prompt.pt"), pointer);
    await assert.rejects(fixLfsFiles(e, p, { fetchImpl: async () => new Response(Buffer.from("x".repeat(real.length))) }), /확인값/);
    assert.equal(String(await rf(path.join(p.src, "tools", "new_prompt.pt"))), pointer);
  } finally {
    await rmf(root, { recursive: true, force: true });
  }
});

test("파이썬 오류 줄 찾기 — 「코드 1」 대신 원인을 화면에", () => {
  assert.equal(pyErrorCause("ModuleNotFoundError: No module named 'flashy'"), "ModuleNotFoundError: No module named 'flashy'");
  assert.equal(pyErrorCause("  torch.OutOfMemoryError: CUDA out of memory. Tried to allocate 2.00 GiB"), "torch.OutOfMemoryError: CUDA out of memory. Tried to allocate 2.00 GiB");
  assert.equal(pyErrorCause("KeyboardInterrupt"), "KeyboardInterrupt");
  assert.equal(pyErrorCause('  File "generate.py", line 10, in <module>'), "");
  assert.equal(pyErrorCause("FMS_STAGE LeVo 2 · 곡 만드는 중"), "");
  assert.equal(pyErrorCause("loading Error-free model"), "");
});

test("MiniMax Music 3 — 원본 코드 없이 정식 패키지, diffusers용 구성만 받기, 작업 정보", () => {
  const e = pyEngine("minimax3");
  const p = pyPaths("C:/d", e);
  assert.equal(e.source, undefined);
  assert.equal(e.license, "commercial");
  assert.match(e.licenseCondition, /MiniMax-Music3/);
  const [torch, pkgs] = e.steps.map((s) => stepArgs(s, p));
  assert.ok(torch.includes("--extra-index-url"));
  assert.ok(pkgs.includes("diffusers==0.41.0") && pkgs.includes("transformers==5.19.0"));
  assert.ok(!pkgs.includes("-e"), "원본 코드 설치 없음");
  const [plan] = weightsPlan(e, p);
  assert.equal(plan.dir, undefined, "보관 폴더(HF_HOME)로 — 파이프라인이 저장소 이름으로 찾음");
  assert.ok(plan.allow.includes("transformer/*") && !plan.allow.some((a) => /qwen_7B|flowmatching|dav/.test(a)));
  // 설치 기록: 원본 판이 없으면 "none"으로 비교
  assert.ok(isInstalledState({ status: "installed", commit: "none", weights: weightsKey(e), runtime: true }, e));
  const job = buildPyJob(e, { track: { style_prompt: "k-pop ballad", lyrics: "[Verse]\n가을", duration_sec: 999 } }, { p, out: "C:/o.wav", vramGb: 16 });
  assert.deepEqual({ style: job.style, lyrics: job.lyrics, durationSec: job.durationSec, repo: job.repo }, { style: "k-pop ballad", lyrics: "[Verse]\n가을", durationSec: 300, repo: "MiniMaxAI/MiniMax-Music3" });
  // 24GB 이상 전용(2026-11-05 — 16GB는 3분 곡이 1시간 넘게 걸림)
  assert.equal(pySupport(e, { ...win, vramGb: 24 }).ok, true);
  assert.equal(pySupport(e, { ...win, vramGb: 16 }).ok, false);
});

test("되는 PC: 윈도우 + NVIDIA + 그래픽 메모리", () => {
  const e = pyEngine("levo2");
  assert.equal(pySupport(e, { ...win, vramGb: 16 }).ok, true);
  assert.match(pySupport(e, { ...win, vramGb: 8 }).reason, /12GB 이상/);
  assert.match(pySupport(e, { platform: "darwin", nvidia: false, vramGb: 16 }).reason, /윈도우/);
  assert.match(pySupport(e, { platform: "win32", nvidia: false, vramGb: null }).reason, /NVIDIA/);
});

test("설치 명령: torch는 cu128에서, {src}는 원본 폴더로, LeVo는 덮어쓰기 파일", () => {
  const e = pyEngine("levo2");
  const p = pyPaths("C:/d", e);
  const [torch, req] = e.steps.map((s) => stepArgs(s, p));
  assert.deepEqual(torch.slice(0, 10), ["pip", "install", "--python", p.python, "--exclude-newer", "2026-10-20T00:00:00Z", "--extra-index-url", "https://download.pytorch.org/whl/cu128", "--index-strategy", "unsafe-best-match"]);
  assert.ok(!torch.includes("--index-url"), "PyTorch 저장소만 쓰면 딸린 패키지가 날짜 제한에 걸린다");
  assert.ok(req.includes("--override"));
  assert.ok(req.includes(path.join(p.src) + "/requirements.txt"));
});

test("모델 받기 목록: 폴더 있는 것은 models 아래, 원본 폴더({src})는 그대로, 없는 것은 보관 폴더", () => {
  const lv = pyEngine("levo2");
  const p = pyPaths("C:/d", lv);
  const plan = weightsPlan(lv, p);
  assert.equal(plan[0].dir, p.src);
  assert.equal(plan[1].dir, path.join(p.models, "songgeneration_base_full"));
  const sa = weightsPlan(pyEngine("stableaudio3"), pyPaths("C:/d", pyEngine("stableaudio3")));
  assert.equal(sa[0].dir, undefined);
});

test("설치 상태: 판이 바뀌면 다시 설치", () => {
  const e = pyEngine("heartmula");
  assert.equal(isInstalledState({ status: "installed", commit: e.source.commit, weights: weightsKey(e), runtime: true, runtimeRev: e.runtimeRev }, e), true);
  assert.equal(isInstalledState({ status: "installed", commit: "0".repeat(40), weights: weightsKey(e) }, e), false);
  assert.equal(isInstalledState({ status: "installing", commit: e.source.commit }, e), false);
});

test("LeVo 2: setuptools 단계가 있고, 예전 실행 환경으로 설치된 PC는 한 번 다시 맞춘다(pkg_resources 없음 오류)", () => {
  const e = pyEngine("levo2");
  assert.ok(e.steps.some((s) => s.args.includes("setuptools<81")));
  const done = { status: "installed", commit: e.source.commit, weights: weightsKey(e), runtime: true };
  assert.equal(isInstalledState(done, e), false);
  assert.equal(isInstalledState({ ...done, runtimeRev: e.runtimeRev }, e), true);
  const h = pyEngine("heartmula");
  assert.equal(isInstalledState({ status: "installed", commit: h.source?.commit ?? "none", weights: weightsKey(h), runtime: true }, h), true);
});

test("LeVo 가사: 구간 이름·문장 마침표·세미콜론 구분", () => {
  const out = levoLyric("[Intro]\n\n[Verse]\n바람이 분다\n너를 부른다.\n\n[Chorus]\n사랑해;\n\n[Guitar Solo]\n\n[Outro]");
  assert.equal(out, "[intro-short] ; [verse] 바람이 분다. 너를 부른다. ; [chorus] 사랑해. ; [inst-short] ; [outro-short]");
  assert.equal(levoLyric(""), "[intro-medium] ; [inst-medium] ; [inst-medium] ; [outro-medium]");
  assert.match(levoLyric("가사만 있는 줄"), /^\[intro-short\] ; \[verse\] 가사만 있는 줄\. ; \[outro-short\]$/);
});

test("태그: 문장은 빼고 짧은 말만", () => {
  assert.equal(levoDescriptions("Female, K-pop, Energetic, a very long descriptive sentence here"), "female, k-pop, energetic");
  assert.equal(heartTags("Piano, Happy\nWedding"), "piano,happy,wedding");
});

test("작업 내용: 엔진별 칸, 길이는 엔진 최대까지", () => {
  const job = { track: { id: "t1", style_prompt: "Lo-fi, chill", lyrics: "", duration_sec: 600 } };
  const sa = pyEngine("stableaudio3");
  const j = buildPyJob(sa, job, { p: pyPaths("C:/d", sa), out: "o.wav", vramGb: 16 });
  assert.equal(j.durationSec, 380);
  assert.equal(j.style, "Lo-fi, chill");
  const lv = pyEngine("levo2");
  const k = buildPyJob(lv, job, { p: pyPaths("C:/d", lv), out: "o.flac", vramGb: 16 });
  assert.equal(k.bgm, true);
  const hm = pyEngine("heartmula");
  const h = buildPyJob(hm, { track: { ...job.track, lyrics: "[Verse]\nhi" } }, { p: pyPaths("C:/d", hm), out: "o.wav", vramGb: 16 });
  assert.equal(h.durationSec, 240);
  assert.equal(h.modelDir, path.join(pyPaths("C:/d", hm).models, "ckpt"));
});

test("출력 줄 읽기", () => {
  assert.deepEqual(parsePyLine("FMS_STAGE HeartMuLa · 음악 만드는 중 40%"), { stage: "HeartMuLa · 음악 만드는 중 40%" });
  assert.deepEqual(parsePyLine("FMS_ERROR 권한 없음"), { error: "권한 없음" });
  assert.deepEqual(parsePyLine("FMS_DONE"), { done: true });
  assert.equal(parsePyLine("100%|████| 3/3"), null);
});

function wav(bits, samples, value = 0, format = 1) {
  const bytes = bits / 8;
  const data = Buffer.alloc(samples * bytes * 2);
  for (let i = 0; i < samples * 2; i++) {
    if (bits === 16) data.writeInt16LE(value, i * 2);
    else if (bits === 24) data.writeIntLE(value, i * 3, 3);
    else if (format === 3) data.writeFloatLE(value, i * 4);
    else data.writeInt32LE(value, i * 4);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(format, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(48000, 24);
  h.writeUInt32LE(48000 * 2 * bytes, 28);
  h.writeUInt16LE(2 * bytes, 32);
  h.writeUInt16LE(bits, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

test("WAV 검사: 무음은 실패, 소리는 길이", () => {
  assert.throws(() => checkWav(wav(24, 48000, 0)), /무음/);
  assert.equal(Math.round(checkWav(wav(24, 48000, 5000)).seconds), 1);
  assert.equal(Math.round(checkWav(wav(16, 96000, 300)).seconds), 2);
  assert.equal(Math.round(checkWav(wav(32, 48000, 0.2, 3)).seconds), 1);
  assert.throws(() => checkWav(Buffer.from("nope")), /WAV/);
});
