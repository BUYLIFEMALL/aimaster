// 엔진이 쓰는 도구(uv·ffmpeg)를 처음 켤 때 받는다 — 설치 파일(엔진 0.3.0)에서 회원이 따로 설치하지 않게(2026-11-04).
// 고정 버전 주소 + SHA-256(2026-11-04 직접 받아 계산·uv는 공식 확인값과 대조). ffmpeg는 LGPL 판만(배포 조건).
// 받은 도구는 데이터 폴더 tools/에 두고, 엔진 프로세스 PATH 맨 앞에 넣어 기존 코드(uv run·ffmpeg)가 그대로 쓴다.
import { existsSync } from "node:fs";
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { downloadVerified, untar } from "./download.mjs";

export const TOOLS = {
  uv: {
    label: "파이썬 도구(uv 0.9.29)",
    url: "https://github.com/astral-sh/uv/releases/download/0.9.29/uv-x86_64-pc-windows-msvc.zip",
    bytes: 21791180,
    sha256: "9825b1a5955d8a432b664e56660641aac8886ed30cd9c59a94aacc68ae9116ce",
    exe: "uv.exe",
    binSubdir: "", // zip 맨 위에 uv.exe
  },
  ffmpeg: {
    label: "MP3 변환 도구(ffmpeg 8.1.3 LGPL)",
    url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-09-30-13-08/ffmpeg-n8.1.3-9-g29e619e767-win64-lgpl-shared-8.1.zip",
    bytes: 80733362,
    sha256: "3e47bda1607740550141e37c0e49d1e5182b34699f15adfd137ee266d346811a",
    exe: "ffmpeg.exe",
    binSubdir: "bin", // zip 안 <폴더>/bin/ffmpeg.exe + DLL
  },
};

export const toolsRoot = (dataDir) => path.join(dataDir, "tools");
export const toolBinDir = (dataDir, id) => path.join(toolsRoot(dataDir), id);

/** 받아 둔 도구 폴더를 이 프로세스 PATH 맨 앞에 넣는다(자식 프로세스 uv·ffmpeg가 그대로 찾음) */
export function useTools(dataDir, env = process.env) {
  const dirs = Object.keys(TOOLS)
    .map((id) => toolBinDir(dataDir, id))
    .filter((d) => existsSync(d));
  const key = Object.keys(env).find((k) => k.toLowerCase() === "path") ?? "PATH";
  const parts = String(env[key] ?? "").split(path.delimiter).filter(Boolean);
  env[key] = [...dirs.filter((d) => !parts.includes(d)), ...parts].join(path.delimiter);
  return dirs;
}

/**
 * 없는 도구만 받는다(윈도우 전용 — 맥은 설치 안내 그대로). onStage: 「MP3 변환 도구 받는 중 · 30/77MB」
 * @param {string[]} ids 받을 도구(예: ["uv"] — 이미 PC에 있으면 부르는 쪽이 뺀다)
 */
export async function ensureTools(dataDir, ids, { onStage = () => {}, signal, fetchImpl, platform = process.platform, catalog = TOOLS } = {}) {
  if (platform !== "win32") return [];
  const got = [];
  for (const id of ids) {
    const t = catalog[id];
    const bin = toolBinDir(dataDir, id);
    if (existsSync(path.join(bin, t.exe))) continue;
    const zip = path.join(toolsRoot(dataDir), `${id}.zip`);
    await downloadVerified(t, zip, { signal, fetchImpl, onProgress: (d, total) => onStage(`${t.label} 받는 중 · ${Math.round(d / 2 ** 20)} / ${Math.round(total / 2 ** 20)}MB`) });
    onStage(`${t.label} 푸는 중`);
    const tmp = path.join(toolsRoot(dataDir), `${id}-tmp`);
    await rm(tmp, { recursive: true, force: true });
    await mkdir(tmp, { recursive: true });
    untar(zip, tmp);
    let src = tmp;
    if (t.binSubdir) {
      const [top] = await readdir(tmp);
      src = path.join(tmp, top, t.binSubdir);
    }
    if (!existsSync(path.join(src, t.exe))) throw new Error(`${t.label} 안에서 ${t.exe}를 찾지 못했습니다.`);
    await rm(bin, { recursive: true, force: true });
    await rename(src, bin);
    await rm(tmp, { recursive: true, force: true });
    await rm(zip, { force: true });
    got.push(id);
  }
  return got;
}
