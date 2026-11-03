// 고정 주소에서 받기 — 받으면서 SHA-256을 계산하고 맞을 때만 저장한다(YuE2·도구 받기가 함께 씀).
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import path from "node:path";

/** 받으면서 SHA-256을 함께 계산하고, 맞을 때만 이름을 바꾼다(중간에 끊기면 다시 받음) */
export async function downloadVerified({ url, bytes, sha256 }, dest, { onProgress, signal, fetchImpl = fetch } = {}) {
  await mkdir(path.dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  const res = await fetchImpl(url, { redirect: "follow", signal });
  if (!res.ok || !res.body) throw new Error(`받지 못했습니다(HTTP ${res.status}): ${path.basename(dest)}`);
  const hash = createHash("sha256");
  const out = createWriteStream(part);
  let done = 0;
  let last = 0;
  try {
    for await (const chunk of Readable.fromWeb(res.body)) {
      hash.update(chunk);
      if (!out.write(chunk)) await new Promise((r) => out.once("drain", r));
      done += chunk.length;
      if (Date.now() - last > 1000) {
        last = Date.now();
        onProgress?.(done, bytes);
      }
    }
  } finally {
    await new Promise((r) => out.end(r));
  }
  if (done !== bytes) throw new Error(`받은 크기가 다릅니다: ${path.basename(dest)}(${done}/${bytes})`);
  if (hash.digest("hex") !== sha256) throw new Error(`파일 확인값(SHA-256)이 맞지 않습니다: ${path.basename(dest)}`);
  await rename(part, dest);
}

/** 폴더 안(하위 포함)에서 이름이 같은 파일 찾기 */
export async function findFile(dir, name) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isFile() && e.name.toLowerCase() === name.toLowerCase()) return p;
    if (e.isDirectory()) {
      const f = await findFile(p, name);
      if (f) return f;
    }
  }
  return null;
}

/** zip 풀기 — 윈도우 10 이상·맥 기본 tar */
export function untar(zip, to) {
  const r = spawnSync(process.platform === "win32" ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar", ["-xf", zip, "-C", to], { windowsHide: true });
  if (r.status !== 0) throw new Error(`압축을 풀지 못했습니다: ${path.basename(zip)}`);
}
