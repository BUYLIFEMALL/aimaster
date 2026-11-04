// 모델 저장 공간 관리(엔진 0.5.0, 2026-11-04 주인님: 「사용안하는 모델 삭제기능과 관련 내용을 표시해줘야 할것 같고」
// 「설치할 폴더를 사용자가 지정하게 해주면 더 좋아 — 여유있는 다른 드라이브에 다운로드 받아 둘수 있으니까」).
// 무거운 것(모델·실행 환경·설치 패키지 보관함)만 「모델 저장 폴더」에 두고, 가벼운 것(연결 정보·설정·대기열·기록)은 원래 데이터 폴더에 둔다.
// 플랜: docs/PLAN_20261104_MODEL_STORAGE.md
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, rename, rm, rmdir, stat, statfs, unlink } from "node:fs/promises";
import path from "node:path";

/** 모델 저장 폴더로 옮기는 것 — 나머지(paired.json·settings.json·queue.json·기록 파일·tools)는 그대로 */
export const HEAVY_ENTRIES = ["acestep", "install-state.json", "yue2", "engines", "mp3-cache", "uv-cache"];
/** 옮기면 고장 나는 파이썬 실행 환경(절대 경로가 박힘) — 옮기지 않고 새 자리에서 다시 만든다 */
export const SKIP_DIRS = new Set([".venv"]);

/** ACE-Step 모델 폴더 이름 → 화면 이름·크기(GB) */
export const ACE_MODELS = {
  "acestep-v15-xl-sft": { label: "XL 최고 품질 음악 모델", gb: 10 },
  "acestep-v15-xl-turbo": { label: "XL 빠른 음악 모델", gb: 10 },
  "acestep-v15-turbo": { label: "기본 음악 모델(turbo)", gb: 4.5 },
  "acestep-5Hz-lm-4B": { label: "가사·구성 이해 모델 4B", gb: 8 },
  "acestep-5Hz-lm-1.7B": { label: "가사·구성 이해 모델 1.7B", gb: 3.5 },
  "acestep-5Hz-lm-0.6B": { label: "가사·구성 이해 모델 0.6B", gb: 1.3 },
};

// ── 순수 함수(시험) ───────────────────────────────────────

/** child가 parent 안(같은 곳 포함)에 있는가 */
export function isInside(child, parent) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * 고른 폴더 검사 — 문제가 있으면 { error }, 없으면 { dir }(드라이브 맨 위를 고르면 그 안에 FreeMusicEngine 폴더)
 * @param {string} target
 * @param {{ current: string }} where 지금 모델 저장 폴더
 */
export function checkTarget(target, { current }) {
  if (typeof target !== "string" || !target.trim() || !path.isAbsolute(target.trim())) return { error: "폴더 경로가 올바르지 않습니다." };
  let dir = path.resolve(target.trim());
  if (path.parse(dir).root === dir) dir = path.join(dir, "FreeMusicEngine");
  if (path.resolve(current) === dir) return { error: "지금 쓰는 폴더와 같습니다." };
  for (const e of HEAVY_ENTRIES) if (isInside(dir, path.join(current, e))) return { error: "지금 모델 폴더 안쪽은 고를 수 없습니다. 다른 폴더를 골라 주세요." };
  return { dir };
}

/**
 * 저장 공간 항목 목록(크기는 부르는 쪽이 잰다).
 * @param {{ acestepDir: string, aceEntries: string[], checkpoints: string[], profile: { dit?: string, lm?: string },
 *           yue2Root: string, yue2Exists: boolean, pyEngines: { id: string, name: string, root: string, exists: boolean }[],
 *           uvCache: string, uvCacheExists: boolean, oldUvCache?: string, oldUvCacheExists?: boolean,
 *           mp3Cache: string, mp3Exists: boolean, busy: Set<string>, working: boolean }} s
 *   busy: 대기·만드는 중 작업이 쓰는 엔진 id · working: 지금 무엇이든 만드는 중(설치 포함)
 */
export function listItems(s) {
  const items = [];
  const ckpt = (n) => path.join(s.acestepDir, "checkpoints", n);
  // ACE-Step — 실행 환경·공통 모델은 기본 엔진이라 지우지 않는다(보기만)
  const runtime = s.aceEntries.filter((n) => n !== "checkpoints").map((n) => path.join(s.acestepDir, n));
  if (runtime.length) items.push({ id: "ace-runtime", engine: "acestep", label: "ACE-Step 실행 환경", paths: runtime, removable: false, inUse: true, note: "기본 음악 엔진이라 지울 수 없습니다." });
  const common = s.checkpoints.filter((n) => !ACE_MODELS[n]);
  if (common.length) items.push({ id: "ace-common", engine: "acestep", label: "ACE-Step 공통 모델(소리 복원·글자 이해)", paths: common.map(ckpt), removable: false, inUse: true, note: "모든 구성이 함께 쓰는 모델입니다." });
  for (const n of s.checkpoints.filter((n) => ACE_MODELS[n])) {
    const inUse = n === s.profile.dit || n === s.profile.lm;
    items.push({
      id: `ace:${n}`,
      engine: "acestep",
      label: `ACE-Step ${ACE_MODELS[n].label}`,
      paths: [ckpt(n)],
      removable: !inUse,
      inUse,
      note: inUse ? "지금 음질 구성이 쓰는 모델입니다. 다른 구성으로 바꾸면 지울 수 있습니다." : `지금 구성에서는 안 씁니다. 지우면 이 모델을 쓰는 구성으로 바꿀 때 약 ${ACE_MODELS[n].gb}GB를 다시 받습니다.`,
      reGb: ACE_MODELS[n].gb,
    });
  }
  if (s.yue2Exists) {
    const busy = s.busy.has("yue2");
    items.push({ id: "yue2", engine: "yue2", label: "YuE2 모델·실행 도구", paths: [s.yue2Root], removable: !busy, inUse: busy, note: busy ? "이 엔진으로 만드는 작업이 끝난 뒤 지울 수 있습니다." : "지우면 YuE2를 다시 고를 때 처음부터 받습니다." });
  }
  for (const e of s.pyEngines.filter((e) => e.exists)) {
    const busy = s.busy.has(e.id);
    items.push({ id: `py:${e.id}`, engine: e.id, label: `${e.name} 모델·실행 환경`, paths: [e.root], removable: !busy, inUse: busy, note: busy ? "이 엔진으로 만드는 작업이 끝난 뒤 지울 수 있습니다." : `지우면 ${e.name}을(를) 다시 고를 때 처음부터 받습니다.` });
  }
  if (s.uvCacheExists) items.push({ id: "uv-cache", engine: "", label: "설치 패키지 보관함", paths: [s.uvCache], removable: !s.working, inUse: s.working, note: s.working ? "곡을 만드는(설치하는) 중에는 지울 수 없습니다." : "엔진을 설치할 때 받은 패키지 묶음입니다. 지워도 지금 엔진은 그대로 쓰이고, 다음에 새 엔진을 설치할 때만 다시 받습니다." });
  if (s.oldUvCache && s.oldUvCacheExists) items.push({ id: "uv-cache-old", engine: "", label: "예전 설치 패키지 보관함(처음 폴더)", paths: [s.oldUvCache], removable: !s.working, inUse: s.working, note: "모델 저장 폴더를 바꾸기 전에 쓰던 보관함입니다. 지워도 됩니다." });
  if (s.mp3Exists) items.push({ id: "mp3-cache", engine: "", label: "MP3 변환 보관", paths: [s.mp3Cache], removable: true, inUse: false, note: "MP3로 한 번 바꾼 파일입니다. 지우면 다음에 MP3로 받을 때 다시 바꿉니다." });
  return items;
}

// ── 파일 다루기 ───────────────────────────────────────────

/** 폴더(또는 파일) 크기(바이트) — skip 이름의 폴더는 빼고 잰다 */
export async function sizeOf(p, skip = new Set()) {
  const s = await stat(p).catch(() => null);
  if (!s) return 0;
  if (!s.isDirectory()) return s.size;
  let total = 0;
  for (const e of await readdir(p, { withFileTypes: true }).catch(() => [])) {
    if (e.isDirectory() && skip.has(e.name)) continue;
    total += e.isDirectory() ? await sizeOf(path.join(p, e.name), skip) : e.isFile() ? (await stat(path.join(p, e.name)).catch(() => ({ size: 0 }))).size : 0;
  }
  return total;
}

/** 있는 부모까지 올라가 그 드라이브의 남은 공간(바이트) */
export async function freeBytes(dir) {
  let p = path.resolve(dir);
  for (let i = 0; i < 12; i++) {
    try {
      const s = await statfs(p);
      return Number(s.bavail) * Number(s.bsize);
    } catch {
      const up = path.dirname(p);
      if (up === p) break;
      p = up;
    }
  }
  return null;
}

/** 지울 수 있는 것은 다 지운다(사용 중인 파일 하나 때문에 전부 남지 않게). 다 지웠으면 true */
export async function removeBestEffort(p) {
  try {
    await rm(p, { recursive: true, force: true, maxRetries: 2 });
    return true;
  } catch {}
  const s = await stat(p).catch(() => null);
  if (!s) return true;
  if (!s.isDirectory()) {
    await unlink(p).catch(() => {});
    return !existsSync(p);
  }
  for (const n of await readdir(p).catch(() => [])) await removeBestEffort(path.join(p, n));
  await rmdir(p).catch(() => {});
  return !existsSync(p);
}

/** 복사(skip 폴더 빼고) — 파일 하나를 복사할 때마다 onBytes(크기) */
export async function copyTree(src, dst, { skip = SKIP_DIRS, onBytes = () => {}, signal } = {}) {
  const s = await stat(src);
  if (!s.isDirectory()) {
    await mkdir(path.dirname(dst), { recursive: true });
    await copyFile(src, dst);
    onBytes(s.size);
    return;
  }
  await mkdir(dst, { recursive: true });
  for (const e of await readdir(src, { withFileTypes: true })) {
    if (signal?.aborted) throw new Error("옮기기를 멈췄습니다.");
    if (e.isDirectory() && skip.has(e.name)) continue;
    await copyTree(path.join(src, e.name), path.join(dst, e.name), { skip, onBytes, signal });
  }
}

/** 실행 환경(.venv)을 지운다 — ACE-Step과 추가 엔진 폴더마다 */
export async function dropVenvs(root) {
  await removeBestEffort(path.join(root, "acestep", ".venv"));
  for (const n of await readdir(path.join(root, "engines")).catch(() => [])) await removeBestEffort(path.join(root, "engines", n, ".venv"));
}

/**
 * 무거운 것을 from → to로 옮긴다. 같은 드라이브면 이름만 바꾸고, 다르면 복사(실행 환경 빼고)한 뒤 원래 것은 부르는 쪽이 지운다.
 * 중간에 실패하면 원래 것은 그대로 두고 오류를 던진다(다시 하면 덮어쓰며 이어서 복사).
 * @returns {Promise<{ copied: string[] }>} 복사로 옮긴 원래 경로(부르는 쪽이 지워야 하는 것)
 */
export async function moveHeavy(from, to, { onProgress = () => {}, signal, uvCacheFrom = "" } = {}) {
  // uvCacheFrom: 처음 폴더에서 옮길 때 uv 기본 보관함(%LOCALAPPDATA%\uv\cache)도 새 폴더 uv-cache로 — 실행 환경을 다시 만들 때 패키지를 다시 받지 않게(미니PC 실측: 4.3GB를 4MB/s로 다시 받음)
  const moves = HEAVY_ENTRIES.filter((e) => existsSync(path.join(from, e))).map((e) => ({ name: e, src: path.join(from, e) }));
  if (uvCacheFrom && existsSync(uvCacheFrom) && !moves.some((m) => m.name === "uv-cache")) moves.push({ name: "uv-cache", src: uvCacheFrom });
  let total = 0;
  for (const m of moves) total += await sizeOf(m.src, SKIP_DIRS);
  let done = 0;
  onProgress(0, total);
  await mkdir(to, { recursive: true });
  const copied = [];
  for (const m of moves) {
    const e = m.name;
    const src = m.src;
    const dst = path.join(to, e);
    const bytes = await sizeOf(src, SKIP_DIRS);
    let renamed = false;
    if (!existsSync(dst)) {
      try {
        await rename(src, dst);
        renamed = true;
      } catch {}
    }
    if (renamed) {
      done += bytes;
      onProgress(done, total);
      continue;
    }
    await copyTree(src, dst, { onBytes: (b) => ((done += b), onProgress(done, total)), signal });
    copied.push(src);
  }
  await dropVenvs(to);
  return { copied };
}

/** 무거운 것만 지운다(「새로 받기」) */
export async function removeHeavy(dir) {
  for (const e of HEAVY_ENTRIES) await removeBestEffort(path.join(dir, e));
}
