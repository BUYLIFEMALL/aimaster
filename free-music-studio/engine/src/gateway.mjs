// 연결 문 — 우리 사이트(브라우저)가 부르는 유일한 입구. 허용 주소만 받고, 생성 관련 요청은
// 짝짓기 토큰을 확인한 뒤 내부 ACE-Step 서버로 그대로 넘긴다(파일 업로드 포함, 본문을 해석하지 않음).
import http from "node:http";
import { bearer, corsHeaders, isAllowedOrigin, newPairCode, newToken, sameSecret } from "./security.mjs";
import { AUDIO_TYPES, extOfAudioRef, isTrackId } from "./library.mjs";
import { pickFolder, revealFolder } from "./folderDialog.mjs";
import { browseDir, browseRoots, makeDir } from "./folderBrowse.mjs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

/** FLAC 원음 → MP3 320kbps(ffmpeg). 끝나면 true. */
function toMp3(src, dest) {
  return new Promise((resolve) => {
    const tmp = dest + ".part.mp3";
    const child = spawn("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", src, "-codec:a", "libmp3lame", "-b:a", "320k", "-ar", "48000", tmp], { windowsHide: true });
    child.on("error", () => resolve(false));
    child.on("close", async (code) => {
      if (code !== 0) return resolve(false);
      try {
        await rename(tmp, dest);
        resolve(true);
      } catch {
        resolve(false);
      }
    });
  });
}

export const GATEWAY_PORT = 47821;
const MAX_BODY = 60 * 1024 * 1024; // 커버 원곡 업로드 상한
const FORWARD = new Map([
  ["POST /release_task", "/release_task"],
  ["POST /query_result", "/query_result"],
  ["GET /v1/audio", "/v1/audio"],
]);

/**
 * @param {{ version: string, getState: () => object, tokens: Set<string>, saveTokens: () => Promise<void>,
 *           acestepPort: number, acestepKey: string, library: ReturnType<typeof import("./library.mjs").createLibrary>,
 *           onPairCode?: (code: string) => void }} ctx
 */
export function createGateway(ctx) {
  let pairCode = newPairCode();
  let failures = 0;
  let lockedUntil = 0;
  ctx.onPairCode?.(pairCode);

  const json = (res, status, body, origin) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) });
    res.end(JSON.stringify(body));
  };

  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    // 다른 사이트에서 온 요청은 막는다(브라우저 밖 도구는 Origin이 없음 — 상태 확인만 허용).
    if (origin && !isAllowedOrigin(origin)) return json(res, 403, { error: "허용되지 않은 사이트입니다." });
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders(origin));
      return res.end();
    }

    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const key = `${req.method} ${url.pathname}`;

    if (key === "GET /status") {
      return json(res, 200, { name: "AI 무료음악 자동화 엔진", version: ctx.version, ...ctx.getState() }, origin);
    }

    if (key === "POST /pair") {
      if (!origin) return json(res, 403, { error: "사이트에서만 연결할 수 있습니다." });
      if (Date.now() < lockedUntil) return json(res, 429, { error: "잠시 뒤 다시 시도해 주세요." }, origin);
      const body = await readSmall(req).catch(() => null);
      const code = body && typeof body.code === "string" ? body.code.trim() : "";
      if (!sameSecret(code, pairCode)) {
        failures += 1;
        if (failures >= 5) {
          lockedUntil = Date.now() + 60_000;
          failures = 0;
        }
        return json(res, 401, { error: "연결 코드가 맞지 않습니다. 엔진 창의 6자리 숫자를 확인해 주세요." }, origin);
      }
      failures = 0;
      const token = newToken();
      ctx.tokens.add(token);
      await ctx.saveTokens();
      pairCode = newPairCode(); // 한 번 쓴 코드는 바꾼다
      ctx.onPairCode?.(pairCode);
      return json(res, 200, { token }, origin);
    }

    const target = FORWARD.get(key);
    const isLibrary = url.pathname === "/library" || url.pathname.startsWith("/library/");
    const isSystem = key === "GET /system" || key === "POST /quality";
    const isQueue = !!ctx.queue && (url.pathname === "/queue" || url.pathname.startsWith("/queue/"));
    if (!target && !isLibrary && !isSystem && !isQueue) return json(res, 404, { error: "없는 주소입니다." }, origin);
    const token = bearer(req.headers.authorization);
    if (!token || ![...ctx.tokens].some((t) => sameSecret(t, token))) {
      return json(res, 401, { error: "PC 연결이 필요합니다.", needPair: true }, origin);
    }
    if (isLibrary) return handleLibrary(req, res, url, origin, ctx, json);
    // 작업 대기열 — 엔진이 준비 중이어도 넣어 둘 수 있다(준비되면 차례로 만든다)
    if (isQueue) return handleQueue(req, res, url, origin, ctx, json);
    // PC 검사(다시 검사할 때마다 새로 읽음)·음악 모델 구성 바꾸기 — 엔진이 준비 중이어도 된다
    if (key === "GET /system") {
      try {
        return json(res, 200, await ctx.systemReport(), origin);
      } catch (e) {
        return json(res, 500, { error: `PC 정보를 읽지 못했습니다. ${e.message}` }, origin);
      }
    }
    if (key === "POST /quality") {
      const body = await readSmall(req).catch(() => null);
      const r = await ctx.setQuality(typeof body?.tier === "string" ? body.tier : "");
      return r.ok ? json(res, 200, r, origin) : json(res, r.status, { error: r.error }, origin);
    }
    if (!ctx.getState().ready) return json(res, 503, { error: "엔진을 준비하는 중입니다." }, origin);
    if (Number(req.headers["content-length"] ?? 0) > MAX_BODY) return json(res, 413, { error: "파일이 너무 큽니다(60MB까지)." }, origin);

    const headers = { authorization: `Bearer ${ctx.acestepKey}` };
    if (req.headers["content-type"]) headers["content-type"] = req.headers["content-type"];
    if (req.headers["content-length"]) headers["content-length"] = req.headers["content-length"];
    const up = http.request(
      { host: "127.0.0.1", port: ctx.acestepPort, method: req.method, path: target + url.search, headers },
      (r) => {
        const out = { ...corsHeaders(origin) };
        for (const h of ["content-type", "content-length", "content-disposition"]) if (r.headers[h]) out[h] = r.headers[h];
        res.writeHead(r.statusCode ?? 502, out);
        r.pipe(res);
      }
    );
    up.on("error", () => json(res, 502, { error: "음악 엔진이 응답하지 않습니다. 엔진 창을 확인해 주세요." }, origin));
    req.pipe(up);
  });
}

/**
 * 내 PC 보관함(library.mjs) — 토큰 확인을 마친 요청만 온다.
 *  GET /library            → { ids: [...], formats: {id: ext}, dir } 이 PC에 있는 곡 번호·원음 형식·저장 폴더
 *  POST /library/save      { id, file, title } → ACE-Step 결과(/v1/audio?…)를 받아 「제목.mp3」로 보관
 *  GET /library/browse?path= → { path, parent, dirs } (path 없으면 자주 쓰는 폴더·드라이브) — 사이트 안 한글 폴더 고르기
 *  POST /library/mkdir     { parent, name } → { path } 새 폴더
 *  POST /library/pick-folder → { path|null } PC에 윈도우 기본 폴더 창(0.1.2 화면용, 지금은 안 씀)
 *  POST /library/folder    { path, move, titles } → 저장 폴더 바꾸기(기존 노래 옮기기 선택)
 *  POST /library/reveal    → 저장 폴더를 탐색기로 열기
 *  GET /library/<id>       → 음원(원음 FLAC 등, x-audio-format 머리글) · ?format=mp3 → MP3 320kbps(ffmpeg 필요)
 *  DELETE /library/<id>    → 지우기
 */
async function handleLibrary(req, res, url, origin, ctx, json) {
  const lib = ctx.library;
  const rest = url.pathname.slice("/library".length).replace(/^\//, "");

  if (req.method === "GET" && !rest) {
    const ids = await lib.list();
    const formats = Object.fromEntries(ids.map((id) => [id, path.extname(lib.pathOf(id) ?? "").slice(1).toLowerCase() || "mp3"]));
    return json(res, 200, { ids, formats, dir: lib.dir }, origin);
  }

  // 저장 폴더: 고르기 창(PC에 뜸) → 바꾸기(기존 노래 옮기기 선택) · 탐색기로 열기
  if (req.method === "POST" && rest === "pick-folder") {
    try {
      return json(res, 200, { path: await pickFolder(lib.dir) }, origin);
    } catch (e) {
      return json(res, 501, { error: e.message }, origin);
    }
  }
  if (req.method === "GET" && rest === "browse") {
    const dir = url.searchParams.get("path") ?? "";
    try {
      return json(res, 200, dir ? await browseDir(dir) : await browseRoots(), origin);
    } catch (e) {
      return json(res, 400, { error: e.message }, origin);
    }
  }
  if (req.method === "POST" && rest === "mkdir") {
    const body = await readSmall(req).catch(() => null);
    try {
      return json(res, 200, { path: await makeDir(body?.parent, body?.name) }, origin);
    } catch (e) {
      return json(res, 400, { error: e.message }, origin);
    }
  }
  if (req.method === "POST" && rest === "folder") {
    const body = await readSmall(req, 256 * 1024).catch(() => null);
    try {
      const r = await lib.setDir(body?.path, { move: body?.move === true, titles: body?.titles && typeof body.titles === "object" ? body.titles : {} });
      return json(res, 200, r, origin);
    } catch (e) {
      return json(res, 400, { error: `그 폴더를 쓸 수 없습니다. ${e.message}` }, origin);
    }
  }
  if (req.method === "POST" && rest === "reveal") {
    await mkdir(lib.dir, { recursive: true });
    await revealFolder(lib.dir);
    return json(res, 200, { ok: true }, origin);
  }

  if (req.method === "POST" && rest === "save") {
    const body = await readSmall(req).catch(() => null);
    const id = body?.id;
    const title = typeof body?.title === "string" ? body.title : "";
    const file = typeof body?.file === "string" ? body.file : "";
    if (!isTrackId(id) || !file.startsWith("/v1/audio?")) return json(res, 400, { error: "곡 번호나 음원 주소가 올바르지 않습니다." }, origin);
    if (!ctx.getState().ready) return json(res, 503, { error: "엔진을 준비하는 중입니다." }, origin);
    try {
      const r = await fetch(`http://127.0.0.1:${ctx.acestepPort}${file}`, { headers: { authorization: `Bearer ${ctx.acestepKey}` } });
      if (!r.ok) return json(res, 502, { error: "음악 엔진에서 음원을 찾지 못했습니다(오래돼 지워졌을 수 있음)." }, origin);
      const saved = await lib.save(id, Buffer.from(await r.arrayBuffer()), title, extOfAudioRef(file));
      return json(res, 200, { ok: true, path: saved }, origin);
    } catch {
      return json(res, 500, { error: "보관 폴더에 저장하지 못했습니다. 디스크 공간을 확인해 주세요." }, origin);
    }
  }

  if (!isTrackId(rest)) return json(res, 404, { error: "없는 주소입니다." }, origin);

  if (req.method === "GET") {
    const f = await lib.open(rest);
    if (!f) return json(res, 404, { error: "이 PC에 이 곡의 음원이 없습니다." }, origin);
    // MP3로 달라고 하면 무손실 원음에서 320kbps로 바꿔 준다(한 번 바꾼 것은 다시 씀).
    if (url.searchParams.get("format") === "mp3" && f.ext !== "mp3") {
      f.stream.destroy();
      if (!ctx.ffmpeg) return json(res, 501, { error: "이 PC에 MP3 변환 도구(ffmpeg)가 없어 FLAC 원음만 받을 수 있습니다." }, origin);
      const cached = path.join(ctx.mp3CacheDir, rest + ".mp3");
      const have = await stat(cached).then(() => true, () => false);
      if (!have) {
        await mkdir(ctx.mp3CacheDir, { recursive: true });
        if (!(await toMp3(lib.pathOf(rest), cached))) return json(res, 500, { error: "MP3로 바꾸지 못했습니다." }, origin);
      }
      const s = await stat(cached);
      res.writeHead(200, { "content-type": "audio/mpeg", "content-length": s.size, ...corsHeaders(origin) });
      return createReadStream(cached).pipe(res);
    }
    res.writeHead(200, { "content-type": AUDIO_TYPES[f.ext] ?? "audio/mpeg", "content-length": f.size, "x-audio-format": f.ext, ...corsHeaders(origin) });
    return f.stream.pipe(res);
  }
  if (req.method === "DELETE") {
    await lib.remove(rest);
    await rm(path.join(ctx.mp3CacheDir, rest + ".mp3"), { force: true });
    return json(res, 200, { ok: true }, origin);
  }
  return json(res, 404, { error: "없는 주소입니다." }, origin);
}

const QUEUE_KINDS = new Set(["text2music", "cover", "repaint"]);
const AUDIO_EXT = /\.(mp3|wav|flac|ogg|m4a|aac|opus)$/i;

/** 대기열에 넣을 기록 정보 검사 — 곡 번호는 사이트가 만든 uuid(보관함 파일 이름) */
function parseQueueMeta(m) {
  if (!m || typeof m !== "object") return null;
  const kind = m.kind;
  const title = typeof m.title === "string" ? m.title.trim().slice(0, 80) : "";
  const track = m.track && typeof m.track === "object" ? m.track : null;
  if (!QUEUE_KINDS.has(kind) || !title || !track || !isTrackId(track.id)) return null;
  return { kind, title, track };
}

/**
 *  GET    /queue                 → { jobs } 대기열(최근 끝난 작업 포함)
 *  POST   /queue                 { kind:"text2music", title, track, task } → { job }
 *  POST   /queue/edit            multipart: meta(JSON { kind:"cover"|"repaint", title, track, fields }) + src_audio → { job }
 *  POST   /queue/<id>/cancel     대기 중·만드는 중 취소
 *  POST   /queue/<id>/rerun      { trackId } 중단·실패 작업 다시 하기
 *  POST   /queue/<id>/recorded   사이트가 「모든 음악」 기록을 남김
 *  DELETE /queue/<id>            끝난 작업을 목록에서 지우기
 */
async function handleQueue(req, res, url, origin, ctx, json) {
  const q = ctx.queue;
  const parts = url.pathname.split("/").filter(Boolean); // ["queue", id?, action?]
  if (req.method === "GET" && parts.length === 1) return json(res, 200, { jobs: q.list() }, origin);

  try {
    if (req.method === "POST" && parts.length === 1) {
      const body = await readSmall(req, 256 * 1024).catch(() => null);
      const meta = parseQueueMeta(body);
      if (!meta || meta.kind !== "text2music" || !body.task || typeof body.task !== "object") return json(res, 400, { error: "작업 내용이 올바르지 않습니다." }, origin);
      return json(res, 200, { job: await q.add({ ...meta, task: body.task }) }, origin);
    }

    if (req.method === "POST" && parts.length === 2 && parts[1] === "edit") {
      if (Number(req.headers["content-length"] ?? 0) > MAX_BODY) return json(res, 413, { error: "파일이 너무 큽니다(60MB까지)." }, origin);
      const form = await new Request("http://127.0.0.1/queue/edit", { method: "POST", headers: req.headers, body: req, duplex: "half" }).formData();
      let meta = null;
      try {
        meta = JSON.parse(String(form.get("meta") ?? ""));
      } catch {}
      const parsed = parseQueueMeta(meta);
      const file = form.get("src_audio");
      if (!parsed || parsed.kind === "text2music" || !meta.fields || typeof meta.fields !== "object" || !file || typeof file === "string") {
        return json(res, 400, { error: "작업 내용이나 원곡 파일이 올바르지 않습니다." }, origin);
      }
      const name = String(file.name || "source.mp3").slice(-120);
      const ext = (name.match(AUDIO_EXT)?.[0] ?? ".mp3").toLowerCase();
      const saved = `${crypto.randomUUID()}${ext}`;
      await mkdir(ctx.queueSourceDir, { recursive: true });
      await writeFile(path.join(ctx.queueSourceDir, saved), Buffer.from(await file.arrayBuffer()));
      const fields = Object.fromEntries(Object.entries(meta.fields).map(([k, v]) => [k, String(v)]));
      return json(res, 200, { job: await q.add({ ...parsed, fields, source: { file: saved, name } }) }, origin);
    }

    const id = parts[1];
    const job = id ? q.get(id) : null;
    if (!job) return json(res, 404, { error: "그 작업을 찾지 못했습니다." }, origin);

    if (req.method === "POST" && parts[2] === "cancel") {
      await q.cancel(id);
      return json(res, 200, { ok: true }, origin);
    }
    if (req.method === "POST" && parts[2] === "rerun") {
      const body = await readSmall(req).catch(() => null);
      if (!isTrackId(body?.trackId)) return json(res, 400, { error: "곡 번호가 올바르지 않습니다." }, origin);
      return json(res, 200, { job: await q.rerun(id, body.trackId) }, origin);
    }
    if (req.method === "POST" && parts[2] === "recorded") {
      await q.markRecorded(id);
      return json(res, 200, { ok: true }, origin);
    }
    if (req.method === "DELETE" && parts.length === 2) {
      const source = job.source?.file;
      if (await q.dismiss(id)) {
        if (source) await rm(path.join(ctx.queueSourceDir, source), { force: true });
        return json(res, 200, { ok: true }, origin);
      }
      return json(res, 400, { error: "끝난 작업만 지울 수 있습니다." }, origin);
    }
  } catch (e) {
    return json(res, 400, { error: e instanceof Error ? e.message : "대기열 요청을 처리하지 못했습니다." }, origin);
  }
  return json(res, 404, { error: "없는 주소입니다." }, origin);
}

async function readSmall(req, max = 4096) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > max) throw new Error("too large");
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
