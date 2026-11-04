import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkTarget, isInside, listItems, moveHeavy, removeBestEffort, removeHeavy, sizeOf, SKIP_DIRS } from "../src/storage.mjs";

const base = {
  acestepDir: "/d/acestep",
  aceEntries: [".venv", "acestep", "pyproject.toml", "checkpoints"],
  checkpoints: ["acestep-v15-xl-sft", "acestep-5Hz-lm-1.7B", "acestep-v15-turbo", "vae", "Qwen3-Embedding-0.6B"],
  profile: { dit: "acestep-v15-xl-sft", lm: "acestep-5Hz-lm-1.7B" },
  yue2Root: "/d/yue2",
  yue2Exists: true,
  pyEngines: [
    { id: "heartmula", name: "HeartMuLa 3B", root: "/d/engines/heartmula", exists: true },
    { id: "levo2", name: "LeVo 2", root: "/d/engines/levo2", exists: false },
  ],
  uvCache: "/d/uv-cache",
  uvCacheExists: true,
  mp3Cache: "/d/mp3-cache",
  mp3Exists: false,
  busy: new Set(),
  working: false,
};

test("폴더 안쪽 판정", () => {
  assert.ok(isInside("/a/b/c", "/a/b"));
  assert.ok(isInside("/a/b", "/a/b"));
  assert.ok(!isInside("/a/bc", "/a/b"));
  assert.ok(!isInside("/a", "/a/b"));
});

test("고른 폴더 검사 — 상대 경로·같은 폴더·모델 폴더 안쪽은 막고, 드라이브 맨 위는 그 안 폴더로", () => {
  const current = path.resolve("/data/FreeMusicEngine");
  assert.ok(checkTarget("models", { current }).error);
  assert.ok(checkTarget("", { current }).error);
  assert.ok(checkTarget(current, { current }).error);
  assert.ok(checkTarget(path.join(current, "acestep", "x"), { current }).error);
  assert.equal(checkTarget(path.resolve("/other/models"), { current }).dir, path.resolve("/other/models"));
  const root = path.parse(path.resolve("/")).root;
  assert.equal(checkTarget(root, { current }).dir, path.join(root, "FreeMusicEngine"));
  // 데이터 폴더 바로 안(연결 정보와 같은 곳)의 새 폴더는 된다
  assert.equal(checkTarget(path.join(current, "models"), { current }).dir, path.join(current, "models"));
});

test("항목 목록 — 지금 구성 모델·공통 모델·실행 환경은 못 지우고, 안 쓰는 구성 모델은 지울 수 있음", () => {
  const items = listItems(base);
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  assert.equal(byId["ace-runtime"].removable, false);
  assert.equal(byId["ace-common"].removable, false);
  assert.deepEqual(byId["ace-common"].paths.length, 2);
  assert.equal(byId["ace:acestep-v15-xl-sft"].removable, false);
  assert.equal(byId["ace:acestep-5Hz-lm-1.7B"].inUse, true);
  assert.equal(byId["ace:acestep-v15-turbo"].removable, true);
  assert.equal(byId["ace:acestep-v15-turbo"].reGb, 4.5);
  assert.equal(byId.yue2.removable, true);
  assert.equal(byId["py:heartmula"].removable, true);
  assert.equal(byId["py:levo2"], undefined, "받지 않은 엔진은 목록에 없음");
  assert.equal(byId["uv-cache"].removable, true);
  assert.equal(byId["mp3-cache"], undefined);
});

test("항목 목록 — 작업이 쓰는 엔진·만드는 중에는 지우기 막음", () => {
  const items = listItems({ ...base, busy: new Set(["heartmula", "yue2"]), working: true });
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  assert.equal(byId["py:heartmula"].removable, false);
  assert.equal(byId.yue2.removable, false);
  assert.equal(byId["uv-cache"].removable, false);
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "fms-storage-"));
  const from = path.join(root, "from");
  const f = async (p, n) => (await mkdir(path.dirname(path.join(from, p)), { recursive: true }), writeFile(path.join(from, p), Buffer.alloc(n)));
  await f("acestep/pyproject.toml", 10);
  await f("acestep/checkpoints/acestep-v15-turbo/model.bin", 1000);
  await f("acestep/.venv/Lib/big.dll", 5000);
  await f("engines/heartmula/ckpt/w.bin", 2000);
  await f("engines/heartmula/.venv/python.exe", 3000);
  await f("yue2/models/m.gguf", 700);
  await writeFile(path.join(from, "install-state.json"), JSON.stringify({ status: "installed" }));
  await writeFile(path.join(from, "paired.json"), "{}"); // 가벼운 것 — 옮기지 않음
  return { root, from };
}

test("크기 — 실행 환경을 빼고 잴 수 있음", async () => {
  const { root, from } = await fixture();
  try {
    assert.equal(await sizeOf(path.join(from, "acestep")), 6010);
    assert.equal(await sizeOf(path.join(from, "acestep"), SKIP_DIRS), 1010);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("옮기기 — 무거운 것만, 실행 환경은 빼고, 가벼운 연결 정보는 그대로", async () => {
  const { root, from } = await fixture();
  const to = path.join(root, "to");
  try {
    const seen = [];
    await moveHeavy(from, to, { onProgress: (d, t) => seen.push([d, t]) });
    assert.ok(existsSync(path.join(to, "acestep/checkpoints/acestep-v15-turbo/model.bin")));
    assert.ok(existsSync(path.join(to, "engines/heartmula/ckpt/w.bin")));
    assert.ok(existsSync(path.join(to, "yue2/models/m.gguf")));
    assert.ok(!existsSync(path.join(to, "acestep/.venv")), "ACE-Step 실행 환경은 새로 만든다");
    assert.ok(!existsSync(path.join(to, "engines/heartmula/.venv")), "추가 엔진 실행 환경도");
    assert.ok(!existsSync(path.join(to, "paired.json")));
    assert.ok(existsSync(path.join(from, "paired.json")));
    assert.equal(JSON.parse(await readFile(path.join(to, "install-state.json"), "utf8")).status, "installed");
    const [, total] = seen.at(-1);
    assert.equal(total, 10 + 1000 + 2000 + 700 + (await sizeOf(path.join(to, "install-state.json"))));
    assert.equal(seen.at(-1)[0], total);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("옮기기 — 처음 폴더에서 옮길 때 uv 기본 보관함도 새 폴더 uv-cache로(다시 받지 않게)", async () => {
  const { root, from } = await fixture();
  const uv = path.join(root, "uv-default-cache");
  const to = path.join(root, "to");
  try {
    await mkdir(path.join(uv, "wheels-v5"), { recursive: true });
    await writeFile(path.join(uv, "wheels-v5", "torch.whl"), Buffer.alloc(400));
    await moveHeavy(from, to, { uvCacheFrom: uv });
    assert.ok(existsSync(path.join(to, "uv-cache", "wheels-v5", "torch.whl")));
    assert.ok(!existsSync(uv), "같은 드라이브면 이름만 바꿔 옮김");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("옮기기 — 받는 쪽에 반쯤 복사된 폴더가 있으면 덮어쓰며 이어서 복사", async () => {
  const { root, from } = await fixture();
  const to = path.join(root, "to");
  try {
    await mkdir(path.join(to, "acestep/checkpoints"), { recursive: true });
    await writeFile(path.join(to, "acestep/checkpoints/half.part"), "x");
    const { copied } = await moveHeavy(from, to);
    assert.ok(copied.includes(path.join(from, "acestep")), "이미 있는 곳은 복사로 — 원래 것은 부르는 쪽이 지움");
    assert.ok(existsSync(path.join(to, "acestep/checkpoints/acestep-v15-turbo/model.bin")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("새로 받기 — 무거운 것만 지우고 연결 정보는 남김", async () => {
  const { root, from } = await fixture();
  try {
    await removeHeavy(from);
    assert.ok(!existsSync(path.join(from, "acestep")));
    assert.ok(!existsSync(path.join(from, "engines")));
    assert.ok(!existsSync(path.join(from, "install-state.json")));
    assert.ok(existsSync(path.join(from, "paired.json")));
    assert.equal(await removeBestEffort(path.join(from, "없는 폴더")), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
