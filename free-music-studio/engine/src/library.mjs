// 내 PC 보관함 — 완성된 음원을 ACE-Step 임시 폴더(작업 기록이 지워지면 사라짐)에서
// 회원이 고른 저장 폴더(기본: 음악\AI 무료음악)로 복사해 두고, 사이트 「모든 음악」이 다시 꺼내 쓴다.
// 파일 이름은 곡 제목이고, 곡 번호(사이트 DB id, uuid) → 파일 경로는 데이터 폴더의 목록 파일에 둔다.
// 0.1.1 때 `데이터 폴더\library\<uuid>.mp3`로 저장한 곡도 시작할 때 목록에 넣어 그대로 쓴다.
import { createReadStream } from "node:fs";
import { access, copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const exists = (p) => access(p).then(() => true, () => false);

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

async function uniquePath(dir, name, ext = "mp3") {
  let p = path.join(dir, `${name}.${ext}`);
  for (let n = 2; await exists(p); n++) p = path.join(dir, `${name} (${n}).${ext}`);
  return p;
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
  /** @type {Record<string, string>} 곡 번호 → 파일 전체 경로 */
  let index = {};

  const saveIndex = () => writeFile(indexFile, JSON.stringify(index, null, 2));
  const saveSettings = () => writeFile(settingsFile, JSON.stringify({ libraryDir: dir }, null, 2));

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
      } catch {}
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

    /** 파일이 실제로 있는 곡 번호만 */
    async list() {
      const ids = [];
      for (const [id, p] of Object.entries(index)) if (isTrackId(id) && (await exists(p))) ids.push(id);
      return ids;
    },

    /** 보관한 파일 경로(없으면 null) */
    pathOf(id) {
      return index[id] ?? null;
    },

    /** 파일이 있으면 { size, stream, ext }, 없으면 null */
    async open(id) {
      const p = index[id];
      if (!p) return null;
      try {
        const s = await stat(p);
        return { size: s.size, stream: createReadStream(p), ext: path.extname(p).slice(1).toLowerCase() || "mp3" };
      } catch {
        return null;
      }
    },

    async remove(id) {
      const p = index[id];
      if (p) await rm(p, { force: true });
      delete index[id];
      await saveIndex();
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
            await moveFile(p, to);
            index[id] = to;
            moved++;
          } catch {
            failed++;
          }
        }
        await saveIndex();
      }
      dir = target;
      await saveSettings();
      return { dir, moved, failed };
    },
  };
}
