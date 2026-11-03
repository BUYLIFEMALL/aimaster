// 사이트 안 「폴더 고르기」 화면용 — 회원 PC의 폴더 목록을 돌려준다(파일은 보여 주지 않음).
// 윈도우 기본 폴더 창은 PC 표시 언어(영어 윈도우면 영어)를 따르므로, 화면은 사이트가 한글로 그린다.
import { access, mkdir, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const exists = (p) => access(p).then(() => true, () => false);
const HIDDEN = new Set(["System Volume Information", "$RECYCLE.BIN", "$Recycle.Bin", "Recovery", "Config.Msi", "node_modules"]);

/** 처음 화면: 자주 쓰는 폴더(한글 이름) + 드라이브 */
export async function browseRoots(home = os.homedir()) {
  const places = [
    { name: "바탕화면", path: path.join(home, "Desktop") },
    { name: "문서", path: path.join(home, "Documents") },
    { name: "음악", path: path.join(home, "Music") },
    { name: "다운로드", path: path.join(home, "Downloads") },
  ];
  const quick = [];
  for (const p of places) if (await exists(p.path)) quick.push(p);
  const drives = [];
  if (process.platform === "win32") {
    for (const letter of "CDEFGHIJKLMNOPQRSTUVWXYZ") {
      const root = `${letter}:\\`;
      if (await exists(root)) drives.push({ name: `${letter} 드라이브`, path: root });
    }
  } else {
    drives.push({ name: "이 컴퓨터", path: "/" });
    for (const v of await readdir("/Volumes").catch(() => [])) drives.push({ name: v, path: path.join("/Volumes", v) });
  }
  return { path: "", parent: null, dirs: [], quick, drives };
}

/** 한 폴더 안의 하위 폴더 목록(숨김·시스템 폴더 제외, 이름 순) */
export async function browseDir(dir) {
  if (typeof dir !== "string" || !path.isAbsolute(dir)) throw new Error("폴더 경로가 올바르지 않습니다.");
  const full = path.resolve(dir);
  let entries;
  try {
    entries = await readdir(full, { withFileTypes: true });
  } catch {
    throw new Error("이 폴더는 열 수 없습니다(권한이 없거나 없는 폴더).");
  }
  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("$") && !HIDDEN.has(e.name))
    .map((e) => ({ name: e.name, path: path.join(full, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const parent = path.dirname(full) === full ? null : path.dirname(full);
  return { path: full, parent, dirs };
}

/** 새 폴더 만들기 — 이름에 못 쓰는 글자는 거절 */
export async function makeDir(parent, name) {
  const clean = String(name ?? "").trim();
  if (!clean || /[\\/:*?"<>|\u0000-\u001f]/.test(clean) || clean === "." || clean === "..") throw new Error("폴더 이름에 쓸 수 없는 글자가 있습니다.");
  if (typeof parent !== "string" || !path.isAbsolute(parent)) throw new Error("폴더 경로가 올바르지 않습니다.");
  const target = path.join(path.resolve(parent), clean);
  await mkdir(target, { recursive: true });
  return target;
}
