import test from "node:test";
import assert from "node:assert/strict";
import { chooseDevice, qualityProfile } from "../src/device.mjs";
import { profileEnv } from "../src/acestep.mjs";
import { bearer, corsHeaders, isAllowedOrigin, newPairCode, sameSecret } from "../src/security.mjs";
import { createLibrary, extOfAudioRef, isTrackId, safeFileName } from "../src/library.mjs";

test("음질: 그래픽 메모리별 가장 좋은 조합(XL·4B는 24GB 이상)", () => {
  assert.equal(qualityProfile({ device: "cuda", vramGb: 32 }).dit, "acestep-v15-xl-sft");
  assert.equal(qualityProfile({ device: "cuda", vramGb: 32 }).lm, "acestep-5Hz-lm-4B");
  assert.equal(qualityProfile({ device: "cuda", vramGb: 32 }).steps, 50);
  const rtx5080 = qualityProfile({ device: "cuda", vramGb: 15.9 });
  assert.deepEqual([rtx5080.dit, rtx5080.lm, rtx5080.offload, rtx5080.steps], ["acestep-v15-xl-turbo", "acestep-5Hz-lm-1.7B", true, 8]);
  assert.equal(qualityProfile({ device: "cuda", vramGb: 8 }).lm, "acestep-5Hz-lm-0.6B");
  assert.equal(qualityProfile({ device: "cpu", vramGb: null }).lm, null);
  assert.deepEqual(profileEnv(qualityProfile({ device: "cpu", vramGb: null })), { ACESTEP_CONFIG_PATH: "acestep-v15-turbo", ACESTEP_INIT_LLM: "false" });
  assert.equal(profileEnv(rtx5080).ACESTEP_OFFLOAD_DIT_TO_CPU, "true");
});

test("보관함: 엔진 결과 주소에서 원음 형식 고르기", () => {
  assert.equal(extOfAudioRef("/v1/audio?path=%2Ftmp%2Fa.flac"), "flac");
  assert.equal(extOfAudioRef("/v1/audio?path=C%3A%5Cx%5Cb.MP3"), "mp3");
  assert.equal(extOfAudioRef("/v1/audio?path=x.exe"), "mp3");
});
import { browseDir, browseRoots, makeDir } from "../src/folderBrowse.mjs";

test("폴더 고르기: 하위 폴더만·숨김 제외·이름 순, 새 폴더 만들기", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "fms-browse-"));
  try {
    await mkdir(path.join(base, "나"), { recursive: true });
    await mkdir(path.join(base, "가"), { recursive: true });
    await mkdir(path.join(base, ".숨김"), { recursive: true });
    await writeFile(path.join(base, "파일.txt"), "x");
    const r = await browseDir(base);
    assert.deepEqual(r.dirs.map((d) => d.name), ["가", "나"]);
    assert.equal(r.parent, path.dirname(path.resolve(base)));
    const made = await makeDir(base, "새 노래");
    assert.equal(made, path.join(path.resolve(base), "새 노래"));
    await assert.rejects(() => makeDir(base, "a/b"));
    await assert.rejects(() => makeDir(base, ".."));
    await assert.rejects(() => browseDir("상대경로"));
    const roots = await browseRoots(base);
    assert.ok(roots.drives.length > 0);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { flacCoverArgs, mp3Args } from "../src/gateway.mjs";
import { tmpdir } from "node:os";
import path from "node:path";

test("보관함: 곡 번호는 uuid 모양만(경로 조작 거절)", () => {
  assert.equal(isTrackId("3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab"), true);
  assert.equal(isTrackId("../paired"), false);
  assert.equal(isTrackId("3F2B8C1E-1A2B-4C3D-8E9F-0123456789AB"), false);
  assert.equal(isTrackId(undefined), false);
});

test("보관함: 파일 이름은 곡 제목(못 쓰는 글자 제거)", () => {
  assert.equal(safeFileName("비 오는 오후"), "비 오는 오후");
  assert.equal(safeFileName('a/b:c*?"<>|'), "a_b_c______");
  assert.equal(safeFileName("  ...  "), "노래");
  assert.equal(safeFileName("끝에 점."), "끝에 점");
});

test("보관함: 제목으로 저장 → 같은 제목은 (2) → 목록·꺼내기·지우기", async () => {
  const data = await mkdtemp(path.join(tmpdir(), "fms-lib-"));
  try {
    const lib = createLibrary(data, { defaultDir: path.join(data, "음악") });
    await lib.init();
    const a = "3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab";
    const b = "4f2b8c1e-1a2b-4c3d-8e9f-0123456789ab";
    assert.deepEqual(await lib.list(), []);
    const pa = await lib.save(a, Buffer.from("ID3abc"), "비 오는 오후");
    const pf = await lib.save("6f2b8c1e-1a2b-4c3d-8e9f-0123456789ab", Buffer.from("fLaC"), "원음", "flac");
    assert.equal(path.basename(pf), "원음.flac");
    assert.equal((await lib.open("6f2b8c1e-1a2b-4c3d-8e9f-0123456789ab")).ext, "flac");
    await lib.remove("6f2b8c1e-1a2b-4c3d-8e9f-0123456789ab");
    const pb = await lib.save(b, Buffer.from("ID3x"), "비 오는 오후");
    assert.equal(path.basename(pa), "비 오는 오후.mp3");
    assert.equal(path.basename(pb), "비 오는 오후 (2).mp3");
    assert.deepEqual((await lib.list()).sort(), [a, b]);
    const f = await lib.open(a);
    assert.equal(f.size, 6);
    f.stream.destroy();
    await lib.remove(a);
    assert.deepEqual(await lib.list(), [b]);
    assert.equal(await lib.open(a), null);
  } finally {
    await rm(data, { recursive: true, force: true });
  }
});

test("보관함: 0.1.1 번호 파일을 읽고, 폴더를 바꾸며 제목 이름으로 옮김(설정은 다음 실행에도 유지)", async () => {
  const data = await mkdtemp(path.join(tmpdir(), "fms-lib-"));
  try {
    const old = "5f2b8c1e-1a2b-4c3d-8e9f-0123456789ab";
    await mkdir(path.join(data, "library"), { recursive: true });
    await writeFile(path.join(data, "library", `${old}.mp3`), "ID3old");
    const lib = createLibrary(data, { defaultDir: path.join(data, "음악") });
    await lib.init();
    assert.deepEqual(await lib.list(), [old]);
    const target = path.join(data, "새 폴더");
    const r = await lib.setDir(target, { move: true, titles: { [old]: "옛 노래" } });
    assert.deepEqual(r, { dir: target, moved: 1, failed: 0 });
    assert.equal(await readFile(path.join(target, "옛 노래.mp3"), "utf8"), "ID3old");
    const again = createLibrary(data, { defaultDir: path.join(data, "음악") });
    await again.init();
    assert.equal(again.dir, target);
    assert.deepEqual(await again.list(), [old]);
    await assert.rejects(() => again.setDir("상대경로"));
  } finally {
    await rm(data, { recursive: true, force: true });
  }
});

test("보관함: 탐색기로 저장 폴더에 옮긴 곡도 같은 파일 이름으로 찾아 기록을 고친다", async () => {
  const data = await mkdtemp(path.join(tmpdir(), "fms-lib-"));
  try {
    const id = "6a2b8c1e-1a2b-4c3d-8e9f-0123456789ab";
    const root = path.join(data, "AI-Musc");
    const lib = createLibrary(data, { defaultDir: root });
    await lib.init();
    await lib.save(id, Buffer.from("fLaC"), "가을 노래", "flac");
    const song = path.join(root, "Song");
    await mkdir(song, { recursive: true });
    await rename(path.join(root, "가을 노래.flac"), path.join(song, "가을 노래.flac"));
    await lib.setDir(song);
    assert.deepEqual(await lib.list(), [id]);
    assert.equal(lib.pathOf(id), path.join(song, "가을 노래.flac"));
    assert.equal((await lib.open(id))?.ext, "flac");
    // 저장 폴더를 그대로 두고 한 단계 아래 폴더로 옮겨도 찾는다(모델 폴더 안은 뒤지지 않음)
    await lib.setDir(root);
    const best = path.join(root, "Best");
    await mkdir(best, { recursive: true });
    await rename(path.join(song, "가을 노래.flac"), path.join(best, "가을 노래.flac"));
    assert.deepEqual(await lib.list(), [id]);
    assert.equal(lib.pathOf(id), path.join(best, "가을 노래.flac"));
    // 장르 폴더 안의 폴더(세 단계 아래)도 찾는다
    const deep = path.join(root, "Song", "발라드", "2026-11");
    await mkdir(deep, { recursive: true });
    await rename(path.join(best, "가을 노래.flac"), path.join(deep, "가을 노래.flac"));
    assert.deepEqual(await lib.list(), [id]);
    assert.equal(lib.pathOf(id), path.join(deep, "가을 노래.flac"));
    await mkdir(path.join(root, "engines"), { recursive: true });
    await rename(path.join(deep, "가을 노래.flac"), path.join(root, "engines", "가을 노래.flac"));
    assert.deepEqual(await lib.list(), []);
  } finally {
    await rm(data, { recursive: true, force: true });
  }
});

test("보관함: 앨범 그림은 저장 폴더에 「곡 제목.png」, 같은 이름이면 번호를 붙이고 목록에는 넣지 않는다", async () => {
  const data = await mkdtemp(path.join(tmpdir(), "fms-art-"));
  try {
    const lib = createLibrary(data, { defaultDir: path.join(data, "Song") });
    await lib.init();
    const a = await lib.saveArt(Buffer.from([0x89, 0x50]), "가을 노래", "png");
    const b = await lib.saveArt(Buffer.from([0x89, 0x50]), "가을 노래", "png");
    assert.equal(path.basename(a), "가을 노래.png");
    assert.notEqual(a, b);
    assert.equal(path.extname(b), ".png");
    assert.deepEqual(await lib.list(), []);
  } finally {
    await rm(data, { recursive: true, force: true });
  }
});

test("보관함: 앨범 그림(0.7.3) — Albums/<번호>에 저장·바꾸기·목록·지우기, 번호가 아니면 거절, 폴더를 옮기면 따라간다", async () => {
  const data = await mkdtemp(path.join(tmpdir(), "fms-album-"));
  try {
    const lib = createLibrary(data, { defaultDir: path.join(data, "Song") });
    await lib.init();
    const a = "aaaaaaaa-2222-4333-8444-555555555555";
    assert.deepEqual(await lib.listAlbums(), []);
    const f = await lib.saveAlbum(a, Buffer.from([0x89, 0x50]), "png");
    assert.equal(f, path.join(data, "Song", "Albums", `${a}.png`));
    // 다른 형식으로 다시 그리면 예전 그림은 지운다
    await lib.saveAlbum(a, Buffer.from([0xff, 0xd8]), "jpg");
    assert.equal(path.basename(await lib.albumFile(a)), `${a}.jpg`);
    assert.equal(await stat(f).then(() => true, () => false), false);
    assert.deepEqual(await lib.listAlbums(), [a]);
    await assert.rejects(lib.saveAlbum("../../evil", Buffer.from([1]), "png"));
    assert.equal(await lib.albumFile("../x"), null);
    // 앨범 그림은 곡 목록에 섞이지 않는다
    assert.deepEqual(await lib.list(), []);
    await lib.setDir(path.join(data, "New"), { move: true });
    assert.equal(await lib.albumFile(a), path.join(data, "New", "Albums", `${a}.jpg`));
    assert.equal(await lib.removeAlbum(a), true);
    assert.equal(await lib.removeAlbum(a), false);
    assert.deepEqual(await lib.listAlbums(), []);
  } finally {
    await rm(data, { recursive: true, force: true });
  }
});

test("보관함: 같은 이름 그림이 곡 표지, 지우면 표지도 지우고 폴더를 옮기면 표지도 따라간다(0.6.8)", async () => {
  const data = await mkdtemp(path.join(tmpdir(), "fms-cover-"));
  try {
    const lib = createLibrary(data, { defaultDir: path.join(data, "Song") });
    await lib.init();
    const id = "11111111-2222-4333-8444-555555555555";
    const id2 = "11111111-2222-4333-8444-666666666666";
    await lib.save(id, Buffer.from([1, 2]), "가을 노래", "flac");
    await lib.save(id2, Buffer.from([1, 2]), "겨울 노래", "flac");
    assert.equal(await lib.artOf(id), null);
    await lib.saveArt(Buffer.from([0x89, 0x50]), "가을 노래", "png");
    assert.equal(path.basename(await lib.artOf(id)), "가을 노래.png");
    assert.equal(await lib.artOf(id2), null);
    const r = await lib.setDir(path.join(data, "New"), { move: true });
    assert.equal(r.moved, 2);
    assert.equal(await lib.artOf(id), path.join(data, "New", "가을 노래.png"));
    await lib.remove(id);
    assert.equal(await stat(path.join(data, "New", "가을 노래.png")).then(() => true, () => false), false);
  } finally {
    await rm(data, { recursive: true, force: true });
  }
});

test("보관함 지우기 안전(0.6.9): 보관함 밖·모델 폴더·음원 아닌 파일은 남기고, 예전 저장 폴더 곡은 지운다", async () => {
  const data = await mkdtemp(path.join(tmpdir(), "fms-safe-"));
  try {
    const root = path.join(data, "Song");
    const lib = createLibrary(data, { defaultDir: root });
    await lib.init();
    const [a, b, c, d] = ["a", "b", "c", "d"].map((x) => `${x.repeat(8)}-1a2b-4c3d-8e9f-0123456789ab`);
    // 예전 폴더(Song)에 저장한 뒤 새 폴더로 바꿔도(옮기지 않음) 예전 곡은 지울 수 있다
    const old = await lib.save(a, Buffer.from("fLaC"), "예전 곡", "flac");
    await lib.setDir(path.join(data, "New"));
    const r1 = await lib.remove(a);
    assert.deepEqual(r1, { removed: 1, skipped: [] });
    assert.equal(await stat(old).then(() => true, () => false), false);

    // 목록 파일이 보관함 밖을 가리키면 지우지 않는다
    const outside = path.join(data, "중요한 문서.mp3");
    await writeFile(outside, "keep");
    const idx = path.join(data, "library-index.json");
    const index = JSON.parse(await readFile(idx, "utf8"));
    const heavy = path.join(data, "New", "engines", "모델.mp3");
    await mkdir(path.dirname(heavy), { recursive: true });
    await writeFile(heavy, "keep");
    const notAudio = path.join(data, "New", "설정.json");
    await writeFile(notAudio, "{}");
    Object.assign(index, { [b]: outside, [c]: heavy, [d]: notAudio });
    await writeFile(idx, JSON.stringify(index));
    const again = createLibrary(data, { defaultDir: root });
    await again.init();
    for (const [id, f] of [[b, outside], [c, heavy], [d, notAudio]]) {
      const r = await again.remove(id);
      assert.equal(r.removed, 0);
      assert.deepEqual(r.skipped, [f]);
      assert.equal(await readFile(f, "utf8").then(() => true), true);
    }
  } finally {
    await rm(data, { recursive: true, force: true });
  }
});

test("보관함 표지 바꾸기(0.6.9): 곡 옆 같은 이름으로, 옛 표지(다른 형식)는 지움, 없는 곡은 null", async () => {
  const data = await mkdtemp(path.join(tmpdir(), "fms-setart-"));
  try {
    const lib = createLibrary(data, { defaultDir: path.join(data, "Song") });
    await lib.init();
    const id = "12121212-2222-4333-8444-555555555555";
    await lib.save(id, Buffer.from([1]), "봄 노래", "flac");
    await lib.saveArt(Buffer.from([0x89]), "봄 노래", "png");
    const p = await lib.setArt(id, Buffer.from([0xff, 0xd8]), "jpg");
    assert.equal(path.basename(p), "봄 노래.jpg");
    assert.equal(await lib.artOf(id), p);
    assert.equal(await stat(path.join(data, "Song", "봄 노래.png")).then(() => true, () => false), false);
    assert.equal(await lib.setArt("99999999-2222-4333-8444-555555555555", Buffer.from([1])), null);
  } finally {
    await rm(data, { recursive: true, force: true });
  }
});

test("MP3 인자: 표지 있으면 attached_pic, 원음이 MP3면 소리 복사, webp는 png로", () => {
  const plain = mp3Args("a.flac", "o.mp3");
  assert.ok(plain.includes("libmp3lame") && !plain.includes("attached_pic"));
  const withArt = mp3Args("a.flac", "o.mp3", "a.png");
  assert.ok(withArt.includes("attached_pic") && withArt.includes("1:v") && withArt[withArt.indexOf("-c:v") + 1] === "copy");
  const mp3 = mp3Args("a.mp3", "o.mp3", "a.webp");
  assert.equal(mp3[mp3.indexOf("-codec:a") + 1], "copy");
  assert.equal(mp3[mp3.indexOf("-c:v") + 1], "png");
});

test("장치: NVIDIA 윈도우는 고품질(cuda, 언어 모델 켬)", () => {
  const d = chooseDevice({ platform: "win32", arch: "x64", nvidia: true });
  assert.equal(d.device, "cuda");
  assert.equal(d.initLlm, true);
});

test("장치: 그래픽카드 없는 윈도우는 CPU 모드(언어 모델 끔)", () => {
  const d = chooseDevice({ platform: "win32", arch: "x64", nvidia: false });
  assert.equal(d.device, "cpu");
  assert.equal(d.initLlm, false);
});

test("장치: Intel 맥은 미지원, Apple Silicon은 mps", () => {
  assert.equal(chooseDevice({ platform: "darwin", arch: "x64", nvidia: false }).supported, false);
  assert.equal(chooseDevice({ platform: "darwin", arch: "arm64", nvidia: false }).device, "mps");
});

test("보안: 우리 사이트·내 PC 개발 주소만 허용", () => {
  assert.equal(isAllowedOrigin("https://free-music-studio.buylife.xyz"), true);
  assert.equal(isAllowedOrigin("http://localhost:3000"), true);
  assert.equal(isAllowedOrigin("https://evil.example.com"), false);
  assert.equal(isAllowedOrigin("https://free-music-studio.buylife.xyz.evil.com"), false);
  assert.equal(isAllowedOrigin(undefined), false);
  assert.deepEqual(corsHeaders("https://evil.example.com"), {});
});

test("보안: 짝짓기 코드 6자리, 토큰 비교, Bearer 꺼내기", () => {
  assert.match(newPairCode(), /^\d{6}$/);
  assert.equal(sameSecret("abc", "abc"), true);
  assert.equal(sameSecret("abc", "abd"), false);
  assert.equal(sameSecret("abc", "abcd"), false);
  assert.equal(bearer("Bearer tok123"), "tok123");
  assert.equal(bearer("Basic x"), null);
});

import { checkItems, qualityOptions, QUALITY_TIERS } from "../src/device.mjs";
import { inspectSystem } from "../src/system.mjs";

test("모델 구성: CPU는 기본만, 나머지는 이유와 함께 막음", () => {
  const o = qualityOptions({ device: "cpu", vramGb: null, freeGb: 100 });
  assert.equal(o.length, QUALITY_TIERS.length);
  assert.deepEqual(o.filter((x) => x.supported).map((x) => x.id), ["basic"]);
  assert.equal(o.find((x) => x.recommended).id, "basic");
  assert.match(o.find((x) => x.id === "high").reason, /CPU 모드/);
});

test("모델 구성: RTX 5080(15.9GB)은 XL 고품질 추천, 20GB 이상 구성은 막음", () => {
  const o = qualityOptions({ device: "cuda", vramGb: 15.9, freeGb: 200 });
  assert.equal(o.find((x) => x.recommended).id, "xlturbo");
  assert.equal(o.find((x) => x.id === "max").supported, false);
  assert.match(o.find((x) => x.id === "max").reason, /20GB 이상/);
  assert.deepEqual(o.filter((x) => x.supported).map((x) => x.id), ["xlturbo", "high", "standard", "basic"]);
});

test("모델 구성: 저장 공간이 모자라면 막되, 받아 둔 구성은 공간과 상관없이 허용", () => {
  const o = qualityOptions({ device: "cuda", vramGb: 16, freeGb: 12, installedModels: ["acestep-v15-turbo", "acestep-5Hz-lm-1.7B"] });
  assert.equal(o.find((x) => x.id === "xlturbo").supported, false);
  assert.match(o.find((x) => x.id === "xlturbo").reason, /저장 공간/);
  assert.equal(o.find((x) => x.id === "high").supported, true);
  assert.equal(o.find((x) => x.id === "high").installed, true);
  assert.equal(qualityOptions({ device: "", vramGb: null, freeGb: 1 }).some((x) => x.supported), false);
});

test("PC 검사: CPU PC는 주의, 메모리 4GB·공간 부족은 설치 불가", () => {
  const dev = { supported: true, device: "cpu", reason: "" };
  const sys = { os: "Windows 11", cpu: "Intel", cores: 8, ramGb: 16, gpu: "Intel Graphics", vramGb: null, freeGb: 80, ffmpeg: true };
  const basic = qualityOptions({ device: "cpu", vramGb: null, freeGb: 80 }).find((x) => x.recommended);
  const a = checkItems(sys, dev, basic);
  assert.equal(a.verdict, "warn");
  assert.equal(a.items.find((i) => i.label === "그래픽카드").status, "warn");
  const b = checkItems({ ...sys, ramGb: 4, freeGb: 5 }, dev, basic);
  assert.equal(b.verdict, "fail");
  assert.equal(b.items.find((i) => i.label === "저장 공간").status, "fail");
  assert.equal(checkItems(sys, { supported: false, device: "", reason: "Intel 맥 미지원" }, null).verdict, "fail");
});

test("사양 읽기: nvidia-smi 결과에서 이름·그래픽 메모리·드라이버", async () => {
  const fakeExec = async (cmd, args) => {
    if (cmd === "nvidia-smi" && args[0] === "--query-gpu=compute_cap") return { stdout: "12.0\n" };
    if (cmd === "nvidia-smi") return { stdout: "NVIDIA GeForce RTX 5080, 16303, 581.57\n" };
    if (cmd === "powershell.exe") return { stdout: "Microsoft Windows 11 Pro\n" };
    throw new Error("없음");
  };
  const fakeOs = { type: () => "Windows_NT", release: () => "10.0", cpus: () => [{ model: "AMD Ryzen 9 " }, {}], totalmem: () => 32 * 2 ** 30 };
  const sys = await inspectSystem(
    { storageDir: "C:/없는/폴더", checkpointsDir: "C:/없는/폴더/checkpoints", ffmpeg: false },
    { platform: "win32", arch: "x64", exec: fakeExec, os: fakeOs, statfs: async () => ({ bavail: 100 * 2 ** 18, bsize: 4096 }) }
  );
  assert.deepEqual([sys.gpu, sys.gpuVendor, sys.vramGb, sys.driver], ["NVIDIA GeForce RTX 5080", "NVIDIA", 15.9, "581.57"]);
  assert.deepEqual([sys.os, sys.cpu, sys.cores, sys.ramGb, sys.freeGb], ["Microsoft Windows 11 Pro", "AMD Ryzen 9", 2, 32, 100]);
  assert.deepEqual(sys.installedModels, []);
  assert.deepEqual([sys.computeCapability, sys.bf16], ["12.0", true]); // 0.6.9 원본 host-profile 참고
});

test("0.7.4 B-7 원음 FLAC에 표지 넣기 인자 — 소리는 복사, 표지는 앞표지 그림 칸, webp는 png로", () => {
  const a = flacCoverArgs("s.flac", "o.flac", "c.png");
  assert.deepEqual(a.slice(a.indexOf("-map"), a.indexOf("-map") + 4), ["-map", "0:a", "-map", "1:v"]);
  assert.equal(a[a.indexOf("-c:a") + 1], "copy");
  assert.equal(a[a.indexOf("-c:v") + 1], "copy");
  assert.equal(a[a.indexOf("-disposition:v") + 1], "attached_pic");
  assert.equal(a.at(-1), "o.flac");
  const w = flacCoverArgs("s.flac", "o.flac", "c.WEBP");
  assert.equal(w[w.indexOf("-c:v") + 1], "png");
});
