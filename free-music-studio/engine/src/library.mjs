// 내 PC 보관함 — 완성된 음원을 ACE-Step 임시 폴더(작업 기록이 지워지면 사라짐)에서
// 회원이 고른 저장 폴더(기본: 음악\AI 무료음악)로 복사해 두고, 사이트 「모든 음악」이 다시 꺼내 쓴다.
// 파일 이름은 곡 제목이고, 곡 번호(사이트 DB id, uuid) → 파일 경로는 데이터 폴더의 목록 파일에 둔다.
// 0.1.1 때 `데이터 폴더\library\<uuid>.mp3`로 저장한 곡도 시작할 때 목록에 넣어 그대로 쓴다.
import { createReadStream } from "node:fs";
import { access, copyFile, lstat, mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { HEAVY_ENTRIES } from "./storage.mjs";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const exists = (p) => access(p).then(() => true, () => false);
/** 앨범 그림 폴더(0.7.3) — 노래 저장 폴더 안 */
export const ALBUMS_DIR = "Albums";

/** 곡 번호 검사 — 경로 조작을 막으려고 uuid 모양만 받는다. */
export function isTrackId(id) {
  return typeof id === "string" && ID.test(id);
}

/** 기본 저장 폴더 — 윈도우·맥 모두 사용자 「음악」 폴더 안. */
export function defaultLibraryDir(home = os.homedir()) {
  return path.join(home, "Music", "AI 무료음악");
}

/** 곡 제목 → 파일 이름(윈도우·맥에서 못 쓰는 글자 제거, 60자). */
export function safeFileName(title) {
  const base = String(title ?? "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .replace(/[. ]+$/, "");
  return base || "노래";
}

/** 보관하는 음원 형식 — 0.1.4부터 무손실 FLAC 원음이 기본(옛 곡은 MP3). */
export const AUDIO_EXTS = ["flac", "mp3", "wav"];
export const AUDIO_TYPES = { flac: "audio/flac", mp3: "audio/mpeg", wav: "audio/wav" };

/** 엔진 결과 주소(/v1/audio?path=...확장자)에서 형식을 고른다. 모르면 mp3. */
export function extOfAudioRef(file) {
  try {
    const inner = new URL(file, "http://x").searchParams.get("path") ?? "";
    const ext = inner.split(".").pop()?.toLowerCase() ?? "";
    return AUDIO_EXTS.includes(ext) ? ext : "mp3";
  } catch {
    return "mp3";
  }
}

/** 앨범 표지 형식(0.6.8) — 곡 파일과 같은 폴더·같은 이름의 그림이 그 곡의 표지다(「가을 노래.flac」 ↔ 「가을 노래.png」). */
export const ART_EXTS = ["png", "jpg", "webp"];
export const ART_TYPES = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

/** 곡 파일 경로 → 표지 그림 경로(없으면 null) */
export async function artNextTo(songPath) {
  if (!songPath) return null;
  const base = songPath.slice(0, songPath.length - path.extname(songPath).length);
  for (const ext of ART_EXTS) if (await exists(`${base}.${ext}`)) return `${base}.${ext}`;
  return null;
}

async function uniquePath(dir, name, ext = "mp3") {
  let p = path.join(dir, `${name}.${ext}`);
  for (let n = 2; await exists(p); n++) p = path.join(dir, `${name} (${n}).${ext}`);
  return p;
}

/** child가 root 안(root 자신 제외)인가 — 대소문자를 가리지 않는 윈도우도 맞춘다 */
export function isInside(root, child) {
  const norm = (p) => (process.platform === "win32" ? path.resolve(p).toLowerCase() : path.resolve(p));
  const rel = path.relative(norm(root), norm(child));
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * 지워도 되는 곡·표지 파일인가 — 원본 boks-music `electron/trash.mjs`(MIT)의 안전 규칙을 우리 보관함에 맞춤(2026-11-06).
 * 보관함 폴더(지금·예전에 쓴 폴더) 안이고, 모델 폴더 아래가 아니며, 음원·그림 확장자이고, 파일 자신도 위 폴더도 바로가기(링크)가 아니어야 한다.
 */
export async function isOwnedFile(p, roots, exts = [...AUDIO_EXTS, ...ART_EXTS]) {
  if (typeof p !== "string" || !path.isAbsolute(p)) return false;
  if (!exts.includes(path.extname(p).slice(1).toLowerCase())) return false;
  const root = roots.find((r) => isInside(r, p));
  if (!root) return false;
  const rel = path.relative(path.resolve(root), path.resolve(p)).split(path.sep);
  if (rel.slice(0, -1).some((part) => HEAVY_ENTRIES.includes(part) || part.startsWith("."))) return false;
  try {
    if ((await lstat(p)).isSymbolicLink()) return false;
    // 위 폴더가 연결 폴더(정션·링크)면 실제 위치가 보관함 밖일 수 있다
    const real = await realpath(p);
    const realRoot = await realpath(root).catch(() => path.resolve(root));
    if (!isInside(realRoot, real)) return false;
  } catch {
    return false;
  }
  return true;
}

async function moveFile(from, to) {
  try {
    await rename(from, to);
  } catch {
    await copyFile(from, to); // 다른 드라이브로 옮길 때
    await rm(from, { force: true });
  }
}

/**
 * @param {string} dataDir 엔진 데이터 폴더(설정·목록 파일 위치)
 * @param {{ defaultDir?: string }} [opts]
 */
export function createLibrary(dataDir, { defaultDir = defaultLibraryDir() } = {}) {
  const settingsFile = path.join(dataDir, "settings.json");
  const indexFile = path.join(dataDir, "library-index.json");
  const legacyDir = path.join(dataDir, "library");
  let dir = defaultDir;
  /** 저장 폴더로 써 온 폴더들 — 지울 수 있는 곳은 여기 안뿐이다(0.6.9) */
  let knownDirs = [defaultDir];
  /** @type {Record<string, string>} 곡 번호 → 파일 전체 경로 */
  let index = {};

  const remember = (d) => {
    if (!knownDirs.some((k) => path.resolve(k).toLowerCase() === path.resolve(d).toLowerCase())) knownDirs = [...knownDirs, d].slice(-20);
  };
  const saveIndex = () => writeFile(indexFile, JSON.stringify(index, null, 2));
  const saveSettings = () => writeFile(settingsFile, JSON.stringify({ libraryDir: dir, knownDirs }, null, 2));
  /**
   * 곡 파일 경로 — 기록된 자리에 없으면 지금 저장 폴더와 그 아래 세 단계 폴더(모델 폴더·숨김 폴더 제외)에서 같은 파일 이름을 찾아 기록을 고친다
   * (회원이 탐색기로 곡을 장르별 폴더로 옮겨 정리한 경우, 2026-11-04 마스터PC E:\AI-Musc → Song\Best 등)
   */
  const resolve = async (id) => {
    const p = index[id];
    if (!p || (await exists(p))) return p ?? null;
    const name = path.basename(p);
    let level = [dir];
    for (let depth = 0; depth <= 3 && level.length; depth++) {
      for (const folder of level) {
        const moved = path.join(folder, name);
        if (moved === p || !(await exists(moved))) continue;
        index[id] = moved;
        await saveIndex();
        return moved;
      }
      const next = [];
      for (const folder of level) {
        for (const d of await readdir(folder, { withFileTypes: true }).catch(() => [])) {
          if (d.isDirectory() && !d.name.startsWith(".") && !HEAVY_ENTRIES.includes(d.name)) next.push(path.join(folder, d.name));
        }
      }
      level = next;
    }
    return null;
  };

  return {
    get dir() {
      return dir;
    },

    /** 설정·목록을 읽고, 0.1.1 방식(uuid.mp3) 파일을 목록에 넣는다. */
    async init() {
      await mkdir(dataDir, { recursive: true });
      try {
        const s = JSON.parse(await readFile(settingsFile, "utf8"));
        if (typeof s.libraryDir === "string" && path.isAbsolute(s.libraryDir)) dir = s.libraryDir;
        if (Array.isArray(s.knownDirs)) for (const d of s.knownDirs) if (typeof d === "string" && path.isAbsolute(d)) remember(d);
      } catch {}
      remember(dir);
      try {
        index = JSON.parse(await readFile(indexFile, "utf8")) ?? {};
      } catch {
        index = {};
      }
      for (const f of await readdir(legacyDir).catch(() => [])) {
        const id = f.endsWith(".mp3") ? f.slice(0, -4) : "";
        if (isTrackId(id) && !index[id]) index[id] = path.join(legacyDir, f);
      }
      await saveIndex();
      await saveSettings();
    },

    /** 음원 바이트를 받아 저장 폴더에 「곡 제목.확장자」로 보관한다(임시 이름으로 쓴 뒤 바꿈). */
    async save(id, bytes, title, ext = "mp3") {
      await mkdir(dir, { recursive: true });
      const target = await uniquePath(dir, safeFileName(title), AUDIO_EXTS.includes(ext) ? ext : "mp3");
      const tmp = `${target}.part`;
      await writeFile(tmp, bytes);
      await rename(tmp, target);
      index[id] = target;
      await saveIndex();
      return target;
    },

    /** 앨범 그림을 저장 폴더에 「곡 제목.확장자」로(목록에는 넣지 않음, 같은 이름이 있으면 번호를 붙임) */
    async saveArt(bytes, title, ext = "png") {
      await mkdir(dir, { recursive: true });
      const target = await uniquePath(dir, safeFileName(title || "앨범 그림"), ["png", "jpg", "webp"].includes(ext) ? ext : "png");
      await writeFile(target, bytes);
      return target;
    },

    // ── 앨범 그림(0.7.3, 2026-11-07 주인님 「음악 앨범 메뉴」) ─────────────────────
    // 곡과 따로 만드는 앨범 그림을 노래 저장 폴더 안 「Albums/<앨범 번호>.<확장자>」에 둔다(서버에는 올리지 않음).
    // 앨범 번호는 사이트 DB의 번호(uuid)라 이름에 경로 글자가 들어올 수 없다.
    async albumFile(id) {
      if (!isTrackId(id)) return null;
      for (const ext of ["png", "jpg", "webp"]) {
        const f = path.join(dir, ALBUMS_DIR, `${id}.${ext}`);
        if (await exists(f)) return f;
      }
      return null;
    },
    async saveAlbum(id, bytes, ext = "png") {
      if (!isTrackId(id)) throw new Error("앨범 번호가 올바르지 않습니다.");
      const e = ["png", "jpg", "webp"].includes(ext) ? ext : "png";
      const folder = path.join(dir, ALBUMS_DIR);
      await mkdir(folder, { recursive: true });
      const target = path.join(folder, `${id}.${e}`);
      await writeFile(`${target}.part`, bytes);
      await rename(`${target}.part`, target);
      // 같은 앨범의 다른 형식 그림은 지운다(바꿔 그린 경우)
      for (const other of ["png", "jpg", "webp"]) if (other !== e) await rm(path.join(folder, `${id}.${other}`), { force: true });
      return target;
    },
    async listAlbums() {
      const names = await readdir(path.join(dir, ALBUMS_DIR)).catch(() => []);
      return [...new Set(names.map((n) => /^([0-9a-f-]{36})\.(png|jpg|webp)$/i.exec(n)?.[1]?.toLowerCase()).filter((id) => id && isTrackId(id)))];
    },
    async removeAlbum(id) {
      const f = await this.albumFile(id);
      if (!f) return false;
      await rm(f, { force: true });
      return true;
    },

    /** 파일이 실제로 있는 곡 번호만 */
    async list() {
      const ids = [];
      for (const id of Object.keys(index)) if (isTrackId(id) && (await resolve(id))) ids.push(id);
      return ids;
    },

    /** 보관한 파일 경로(없으면 null) */
    pathOf(id) {
      return index[id] ?? null;
    },
    /**
     * 이 곡의 표지를 바꾼다(0.6.9, 원본 「앨범아트 업로드」) — 곡 파일 옆 같은 이름 그림을 새 그림으로. 저장한 경로를 돌려준다.
     * 옛 표지는 보관함 안의 그림일 때만 지운다.
     */
    async setArt(id, bytes, ext = "png") {
      const song = await resolve(id);
      if (!song) return null;
      const base = song.slice(0, song.length - path.extname(song).length);
      const roots = [...knownDirs, legacyDir];
      for (const e of ART_EXTS) {
        const old = `${base}.${e}`;
        if ((await exists(old)) && (await isOwnedFile(old, roots, ART_EXTS))) await rm(old, { force: true });
      }
      const target = `${base}.${ART_EXTS.includes(ext) ? ext : "png"}`;
      await writeFile(`${target}.part`, bytes);
      await rename(`${target}.part`, target);
      return target;
    },
    /** 실제로 있는 곡 파일 경로(옮겨 둔 곳도 찾음, 없으면 null) — 0.6.9 파형 */
    async fileOf(id) {
      return isTrackId(id) ? resolve(id) : null;
    },
    /** 곡의 표지 그림 경로(0.6.8, 없으면 null) */
    async artOf(id) {
      return artNextTo(await resolve(id));
    },
    /** 파일이 있으면 { size, stream, ext }, 없으면 null */
    async open(id) {
      const p = await resolve(id);
      if (!p) return null;
      try {
        const s = await stat(p);
        return { size: s.size, stream: createReadStream(p), ext: path.extname(p).slice(1).toLowerCase() || "mp3" };
      } catch {
        return null;
      }
    },

    /**
     * 곡을 지운다. 보관함 밖·모델 폴더·링크 같은 파일은 지우지 않고 목록에서만 뺀 뒤 skipped로 알려 준다(0.6.9).
     * 결과: { removed: 지운 파일 수, skipped: 남겨 둔 파일 경로들 }
     */
    async remove(id) {
      const p = (await resolve(id)) ?? index[id];
      const roots = [...knownDirs, legacyDir];
      const r = { removed: 0, skipped: /** @type {string[]} */ ([]) };
      if (p && (await exists(p))) {
        const art = await artNextTo(p); // 곡을 지우면 그 곡의 표지도
        for (const f of art ? [p, art] : [p]) {
          if (await isOwnedFile(f, roots)) {
            await rm(f, { force: true });
            r.removed++;
          } else r.skipped.push(f);
        }
      }
      delete index[id];
      await saveIndex();
      return r;
    },

    /**
     * 저장 폴더 바꾸기. 폴더를 만들고 쓰기 시험을 한 뒤 바꾼다.
     * move=true면 목록에 있는 기존 노래를 새 폴더로 옮긴다(titles: 곡 번호 → 제목). 결과: { dir, moved, failed }
     */
    async setDir(newDir, { move = false, titles = {} } = {}) {
      if (typeof newDir !== "string" || !path.isAbsolute(newDir.trim())) throw new Error("폴더 경로가 올바르지 않습니다.");
      const target = path.resolve(newDir.trim());
      await mkdir(target, { recursive: true });
      const probe = path.join(target, ".fms-write-test");
      await writeFile(probe, "ok");
      await rm(probe, { force: true });
      let moved = 0;
      let failed = 0;
      if (move) {
        for (const [id, p] of Object.entries(index)) {
          if (!(await exists(p)) || path.dirname(p) === target) continue;
          const ext = path.extname(p).slice(1).toLowerCase() || "mp3";
          const base = path.basename(p, path.extname(p));
          // 0.1.1 방식(번호 이름) 파일은 사이트가 보낸 곡 제목으로 바꿔 옮긴다.
          const name = isTrackId(base) ? safeFileName(typeof titles[id] === "string" ? titles[id] : "") : base;
          const to = await uniquePath(target, name, ext);
          try {
            const art = await artNextTo(p);
            await moveFile(p, to);
            index[id] = to;
            moved++;
            // 표지도 곡과 같은 이름으로 따라 옮긴다(0.6.8)
            if (art) await moveFile(art, to.slice(0, to.length - path.extname(to).length) + path.extname(art)).catch(() => {});
          } catch {
            failed++;
          }
        }
        await saveIndex();
        // 앨범 그림(0.7.3)도 새 폴더의 「Albums」로 따라 옮긴다
        const fromAlbums = path.join(dir, ALBUMS_DIR);
        const toAlbums = path.join(target, ALBUMS_DIR);
        if (path.resolve(fromAlbums) !== path.resolve(toAlbums)) {
          for (const n of await readdir(fromAlbums).catch(() => [])) {
            if (!/^[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(n)) continue;
            await mkdir(toAlbums, { recursive: true });
            await moveFile(path.join(fromAlbums, n), path.join(toAlbums, n)).catch(() => {});
          }
        }
      }
      dir = target;
      remember(target);
      await saveSettings();
      return { dir, moved, failed };
    },
  };
}
