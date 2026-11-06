// 고정 주소에서 받기 — 받으면서 SHA-256을 계산하고 맞을 때만 저장한다(YuE2·도구·노래 엔진 받기가 함께 씀).
// 0.6.9: 원본 boks-music `electron/download.mjs`(MIT, © 2026 boksajang) 방식으로 — 끊기면 받은 부분부터 이어받기(Range),
// 60초 동안 아무것도 안 오면 다시 연결, 최대 5번 시도, 받기 전 남은 공간 확인, 이미 다 받은 파일은 확인만 하고 다시 쓰기.
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat, statfs } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";

/** 파일 전체의 SHA-256 */
export async function hashFile(file, signal) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) {
    signal?.throwIfAborted();
    hash.update(chunk);
  }
  return hash.digest("hex");
}

const permanent = (message) => Object.assign(new Error(message), { permanent: true });
const pause = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), reject(signal.reason)), { once: true });
  });

/** 받을 폴더에 need 바이트(+여유 512MB)가 없으면 받기 전에 멈춘다(재지 못하면 그냥 진행) */
async function ensureSpace(dir, need) {
  try {
    const s = await statfs(dir);
    const free = Number(s.bavail) * Number(s.bsize);
    if (free < need + 512 * 2 ** 20) {
      throw permanent(`저장 공간이 부족합니다: ${Math.ceil(need / 2 ** 30)}GB가 더 필요한데 ${Math.floor(free / 2 ** 30)}GB 남았습니다. 공간을 비우거나 모델 폴더를 다른 드라이브로 옮겨 주세요.`);
    }
  } catch (e) {
    if (e?.permanent) throw e;
  }
}

/**
 * 받으면서 SHA-256을 함께 계산하고, 맞을 때만 이름을 바꾼다.
 * 연결이 끊기거나 stallMs 동안 멈추면 받은 부분(`.part`)부터 이어받는다(attempts번까지). 크기·확인값이 틀리거나
 * 4xx 오류·취소면 받은 부분을 지운다. 여러 번 끊긴 끝에 실패하면 받은 부분을 남겨 다음 번에 이어받는다.
 * onProgress(받은 바이트, 전체 바이트)
 */
export async function downloadVerified(
  { url, bytes, sha256 },
  dest,
  { onProgress, signal, fetchImpl = fetch, stallMs = 60_000, attempts = 5, retryDelayMs = 2_000 } = {}
) {
  const name = path.basename(dest);
  const expected = String(sha256).toLowerCase();
  await mkdir(path.dirname(dest), { recursive: true });
  // 이미 다 받아 둔 파일이면 확인만
  try {
    if ((await stat(dest)).size === bytes && (await hashFile(dest, signal)) === expected) return;
  } catch (e) {
    if (signal?.aborted) throw e;
  }
  const part = `${dest}.part`;
  let offset = await stat(part).then((s) => s.size, () => 0);
  if (offset > bytes) {
    await rm(part, { force: true });
    offset = 0;
  }
  await ensureSpace(path.dirname(dest), bytes - offset);
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const ctl = new AbortController();
    const forward = () => ctl.abort(signal.reason);
    signal?.addEventListener("abort", forward, { once: true });
    let stall;
    const arm = () => {
      clearTimeout(stall);
      stall = setTimeout(() => ctl.abort(new Error("stalled")), stallMs);
    };
    try {
      signal?.throwIfAborted();
      offset = await stat(part).then((s) => s.size, () => 0);
      // 지난번에 끝까지 받고 이름만 못 바꾼 경우
      if (offset === bytes) {
        if ((await hashFile(part, signal)) === expected) return void (await rename(part, dest));
        await rm(part, { force: true });
        offset = 0;
      }
      let hash = createHash("sha256");
      if (offset > 0) for await (const chunk of createReadStream(part)) hash.update(chunk);
      arm();
      const res = await fetchImpl(url, { redirect: "follow", signal: ctl.signal, ...(offset ? { headers: { Range: `bytes=${offset}-` } } : {}) });
      if (!res.ok || !res.body) {
        const err = new Error(`받지 못했습니다(HTTP ${res.status}): ${name}`);
        if (res.status >= 400 && res.status < 500 && ![408, 429].includes(res.status)) err.permanent = true;
        throw err;
      }
      // 이어받기를 무시하는 서버는 처음부터 다시 보낸다
      if (offset && res.status !== 206) {
        offset = 0;
        hash = createHash("sha256");
      }
      let received = offset;
      let last = 0;
      const verify = new Transform({
        transform(chunk, _enc, cb) {
          arm();
          received += chunk.length;
          if (received > bytes) return cb(permanent(`받은 크기가 다릅니다: ${name}(${received}/${bytes})`));
          hash.update(chunk);
          if (Date.now() - last > 1000) {
            last = Date.now();
            onProgress?.(received, bytes);
          }
          cb(null, chunk);
        },
      });
      await pipeline(Readable.fromWeb(res.body), verify, createWriteStream(part, { flags: offset ? "a" : "w" }), { signal: ctl.signal });
      clearTimeout(stall);
      if (received !== bytes) throw permanent(`받은 크기가 다릅니다: ${name}(${received}/${bytes})`);
      if (hash.digest("hex") !== expected) throw permanent(`파일 확인값(SHA-256)이 맞지 않습니다: ${name}`);
      await rename(part, dest);
      return;
    } catch (e) {
      clearTimeout(stall);
      if (signal?.aborted || e?.permanent) {
        await rm(part, { force: true }).catch(() => {});
        throw e;
      }
      lastError = e;
      if (attempt < attempts) await pause(Math.min(retryDelayMs * attempt, 10_000), signal);
    } finally {
      signal?.removeEventListener("abort", forward);
    }
  }
  throw new Error(`${name} 받기가 여러 번 끊겼습니다. 인터넷 연결을 확인하고 다시 시도해 주세요. 받은 부분은 남겨 두어 다음에 이어받습니다.`, { cause: lastError });
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
