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
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
