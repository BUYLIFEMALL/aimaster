// 연결 문 — 우리 사이트(브라우저)가 부르는 유일한 입구. 허용 주소만 받고, 생성 관련 요청은
// 짝짓기 토큰을 확인한 뒤 내부 ACE-Step 서버로 그대로 넘긴다(파일 업로드 포함, 본문을 해석하지 않음).
import http from "node:http";
import { bearer, corsHeaders, isAllowedOrigin, newPairCode, newToken, sameSecret } from "./security.mjs";
import { ART_TYPES, AUDIO_TYPES, extOfAudioRef, isTrackId } from "./library.mjs";
import { pickFolder, revealFolder } from "./folderDialog.mjs";
import { browseDir, browseRoots, makeDir } from "./folderBrowse.mjs";
import { audioWaveform } from "./waveform.mjs";
import { validateMasteringOptions } from "./mastering.mjs";
import { cleanArtPrompt, findImageVariant } from "./imageArt.mjs";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

/** ffmpeg 인자 — FLAC 원음 → MP3 320kbps, 표지가 있으면 ID3 표지로 넣는다(0.6.8). 원음이 이미 MP3면 소리는 그대로 복사. */
export function mp3Args(src, dest, art = null) {
  const already = path.extname(src).toLowerCase() === ".mp3";
  const audio = already ? ["-codec:a", "copy"] : ["-codec:a", "libmp3lame", "-b:a", "320k", "-ar", "48000"];
  if (!art) return ["-y", "-hide_banner", "-loglevel", "error", "-i", src, ...audio, dest];
  const cover = path.extname(art).toLowerCase() === ".webp" ? "png" : "copy"; // ID3는 webp를 못 담아 png로
  return [
    "-y", "-hide_banner", "-loglevel", "error", "-i", src, "-i", art,
    "-map", "0:a", "-map", "1:v", ...audio,
    "-c:v", cover, "-id3v2_version", "3", "-metadata:s:v", "title=Album cover", "-metadata:s:v", "comment=Cover (front)", "-disposition:v", "attached_pic",
    dest,
  ];
}

/** MP3 만들기(ffmpeg). 끝나면 true. */
function toMp3(src, dest, art = null) {
  return new Promise((resolve) => {
    const tmp = dest + ".part.mp3";
    const child = spawn("ffmpeg", mp3Args(src, tmp, art), { windowsHide: true });
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
    const removeMatch = req.method === "POST" ? /^\/engines\/([a-z0-9]{2,20})\/remove$/.exec(url.pathname) : null;
    const isSystem = key === "GET /system" || key === "POST /quality" || !!removeMatch;
    const isQueue = !!ctx.queue && (url.pathname === "/queue" || url.pathname.startsWith("/queue/"));
    const isStorage = !!ctx.storage && ["GET /storage", "POST /storage/remove", "POST /storage/move"].includes(key);
    const isVideo = !!ctx.video && /^\/videos?(\/|$)/.test(url.pathname);
    const isImage = !!ctx.imageArt && /^\/image-(models|art)(\/|$)/.test(url.pathname);
    if (!target && !isLibrary && !isSystem && !isQueue && !isStorage && !isVideo && !isImage) return json(res, 404, { error: "없는 주소입니다." }, origin);
    // 영상 재생(<video>)은 머리글을 못 붙여 주소의 t=토큰도 받는다(GET 파일만, 0.6.9)
    const fileView = req.method === "GET" && /^\/videos\/[0-9a-f-]{36}\/file$/.test(url.pathname);
    const token = bearer(req.headers.authorization) ?? (fileView ? url.searchParams.get("t") : null);
    if (!token || ![...ctx.tokens].some((t) => sameSecret(t, token))) {
      return json(res, 401, { error: "PC 연결이 필요합니다.", needPair: true }, origin);
    }
    if (isLibrary) return handleLibrary(req, res, url, origin, ctx, json);
    if (isVideo) return handleVideo(req, res, url, origin, ctx, json);
    if (isImage) return handleImage(req, res, url, origin, ctx, json);
    // 작업 대기열 — 엔진이 준비 중이어도 넣어 둘 수 있다(준비되면 차례로 만든다)
    if (isQueue) return handleQueue(req, res, url, origin, ctx, json);
    // 저장 공간(0.5.0) — GET /storage 항목·크기·남은 공간 · POST /storage/remove { id } · POST /storage/move { path, mode: "move"|"fresh" }
    if (isStorage) {
      try {
        if (key === "GET /storage") return json(res, 200, await ctx.storage.report(), origin);
        const body = await readSmall(req).catch(() => null);
        const r = key === "POST /storage/remove" ? await ctx.storage.remove(typeof body?.id === "string" ? body.id : "") : await ctx.storage.move(typeof body?.path === "string" ? body.path : "", body?.mode);
        return r.ok ? json(res, 200, r, origin) : json(res, r.status, { error: r.error }, origin);
      } catch (e) {
        return json(res, 500, { error: `저장 공간을 처리하지 못했습니다. ${e.message}` }, origin);
      }
    }
    // PC 검사(다시 검사할 때마다 새로 읽음)·음악 모델 구성 바꾸기 — 엔진이 준비 중이어도 된다
    if (key === "GET /system") {
      try {
        return json(res, 200, await ctx.systemReport(), origin);
      } catch (e) {
        return json(res, 500, { error: `PC 정보를 읽지 못했습니다. ${e.message}` }, origin);
      }
    }
    // 받은 추가 엔진 모델·실행 환경 지우기(0.4.0) — POST /engines/<id>/remove
    if (removeMatch) {
      const r = (await ctx.removeEngine?.(removeMatch[1])) ?? { ok: false, status: 404, error: "없는 주소입니다." };
      return r.ok ? json(res, 200, { ok: true }, origin) : json(res, r.status, { error: r.error }, origin);
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
    const arts = [];
    for (const id of ids) if (await lib.artOf(id)) arts.push(id); // 표지가 있는 곡(0.6.8)
    return json(res, 200, { ids, formats, arts, dir: lib.dir }, origin);
  }

  // 앨범 그림(0.7.3) — GET /library/albums → { ids } · GET/POST/DELETE /library/albums/<앨범 번호>
  if (rest === "albums" && req.method === "GET") return json(res, 200, { ids: await lib.listAlbums() }, origin);
  const albumMatch = /^albums\/([0-9a-f-]{36})$/.exec(rest);
  if (albumMatch && isTrackId(albumMatch[1])) {
    const id = albumMatch[1];
    if (req.method === "GET") {
      const f = await lib.albumFile(id);
      if (!f) return json(res, 404, { error: "이 PC에 이 앨범 그림이 없습니다." }, origin);
      const s = await stat(f);
      res.writeHead(200, { "content-type": ART_TYPES[path.extname(f).slice(1).toLowerCase()] ?? "image/png", "content-length": s.size, ...corsHeaders(origin) });
      return createReadStream(f).pipe(res);
    }
    if (req.method === "POST") {
      const body = await readSmall(req, 12 * 1024 * 1024).catch(() => null);
      const mime = typeof body?.mimeType === "string" ? body.mimeType : "image/png";
      const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
      const bytes = typeof body?.base64 === "string" ? Buffer.from(body.base64, "base64") : null;
      if (!bytes?.length || bytes.length > 9 * 1024 * 1024) return json(res, 400, { error: "그림 파일이 올바르지 않습니다(9MB까지)." }, origin);
      try {
        return json(res, 200, { ok: true, path: await lib.saveAlbum(id, bytes, ext) }, origin);
      } catch {
        return json(res, 500, { error: "앨범 그림을 저장하지 못했습니다. 디스크 공간을 확인해 주세요." }, origin);
      }
    }
    if (req.method === "DELETE") return json(res, 200, { ok: true, removed: await lib.removeAlbum(id) }, origin);
  }

  // 곡 표지 바꾸기(0.6.9) — POST /library/<id>/art { base64, mimeType } (사이트가 1:1·형식·크기를 먼저 확인)
  const setArtMatch = req.method === "POST" ? /^([0-9a-f-]{36})\/art$/.exec(rest) : null;
  if (setArtMatch && isTrackId(setArtMatch[1])) {
    const body = await readSmall(req, 12 * 1024 * 1024).catch(() => null);
    const mime = typeof body?.mimeType === "string" ? body.mimeType : "image/png";
    const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
    const bytes = typeof body?.base64 === "string" ? Buffer.from(body.base64, "base64") : null;
    if (!bytes?.length || bytes.length > 9 * 1024 * 1024) return json(res, 400, { error: "그림 파일이 올바르지 않습니다(9MB까지)." }, origin);
    try {
      const saved = await lib.setArt(setArtMatch[1], bytes, ext);
      if (!saved) return json(res, 404, { error: "이 PC에 이 곡의 음원이 없어 표지를 붙일 수 없습니다." }, origin);
      return json(res, 200, { ok: true, path: saved }, origin);
    } catch {
      return json(res, 500, { error: "표지를 저장하지 못했습니다. 디스크 공간을 확인해 주세요." }, origin);
    }
  }

  // 곡 파형(0.6.9) — GET /library/<id>/waveform → { peaks(1600칸, 0~1), duration }
  const waveMatch = req.method === "GET" ? /^([0-9a-f-]{36})\/waveform$/.exec(rest) : null;
  if (waveMatch && isTrackId(waveMatch[1])) {
    const p = await lib.fileOf(waveMatch[1]);
    if (!p) return json(res, 404, { error: "이 PC에 이 곡의 음원이 없습니다." }, origin);
    try {
      // 바꾼 WAV는 MP3 변환 보관 폴더 안 임시 폴더에 잠깐 두고 지운다
      const w = await audioWaveform(p, { ffmpeg: ctx.ffmpeg ? "ffmpeg" : null, tmpDir: ctx.mp3CacheDir });
      return json(res, 200, { peaks: w.peaks.map((v) => Math.round(v * 1000) / 1000), duration: w.duration }, origin);
    } catch (e) {
      return json(res, 422, { error: e instanceof Error ? e.message : "파형을 읽지 못했습니다." }, origin);
    }
  }

  // Stem 분리 결과(0.6.9) — GET /library/<id>/stems → { stems: [{ id, mode, createdAt, dir, files:[{label,size,missing}] }] }
  //   GET /library/<id>/stems/<stemId>/<n> → n번째 트랙 WAV · DELETE /library/<id>/stems/<stemId> → 지우기(「Stem」 폴더 안 파일만)
  const stemMatch = /^([0-9a-f-]{36})\/stems(?:\/([0-9a-f-]{36})(?:\/(\d+))?)?$/.exec(rest);
  if (stemMatch && isTrackId(stemMatch[1]) && ctx.stems) {
    const [, sourceId, stemId, n] = stemMatch;
    if (req.method === "GET" && !stemId) return json(res, 200, { stems: await ctx.stems.listFor(sourceId) }, origin);
    if (req.method === "GET" && stemId && n !== undefined) {
      const f = await ctx.stems.fileOf(stemId, Number(n));
      if (!f) return json(res, 404, { error: "Stem 파일이 없습니다(옮기거나 지웠을 수 있음)." }, origin);
      const s = await stat(f.file);
      res.writeHead(200, { "content-type": "audio/wav", "content-length": s.size, ...corsHeaders(origin) });
      return createReadStream(f.file).pipe(res);
    }
    if (req.method === "DELETE" && stemId && n === undefined) {
      return (await ctx.stems.remove(stemId)) ? json(res, 200, { ok: true }, origin) : json(res, 404, { error: "그 분리 결과를 찾지 못했습니다." }, origin);
    }
  }

  // 곡 표지 그림(0.6.8) — GET /library/<id>/art
  const artMatch = req.method === "GET" ? /^([0-9a-f-]{36})\/art$/.exec(rest) : null;
  if (artMatch && isTrackId(artMatch[1])) {
    const art = await lib.artOf(artMatch[1]);
    if (!art) return json(res, 404, { error: "이 곡의 표지 그림이 없습니다." }, origin);
    const s = await stat(art);
    res.writeHead(200, { "content-type": ART_TYPES[path.extname(art).slice(1).toLowerCase()] ?? "image/png", "content-length": s.size, ...corsHeaders(origin) });
    return createReadStream(art).pipe(res);
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

  // 앨범 그림(엔진 0.6.7, 2026-11-05): 사이트가 회원 본인 Gemini 키로 만든 그림을 노래 저장 폴더에 「곡 제목.png」로
  if (req.method === "POST" && rest === "art") {
    const body = await readSmall(req, 12 * 1024 * 1024).catch(() => null);
    const title = typeof body?.title === "string" ? body.title : "";
    const mime = typeof body?.mimeType === "string" ? body.mimeType : "image/png";
    const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
    const bytes = typeof body?.base64 === "string" ? Buffer.from(body.base64, "base64") : null;
    if (!bytes?.length || bytes.length > 9 * 1024 * 1024) return json(res, 400, { error: "그림 파일이 올바르지 않습니다." }, origin);
    try {
      return json(res, 200, { ok: true, path: await lib.saveArt(bytes, title, ext) }, origin);
    } catch {
      return json(res, 500, { error: "노래 저장 폴더에 그림을 저장하지 못했습니다. 디스크 공간을 확인해 주세요." }, origin);
    }
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
    // 표지가 있으면 MP3 안에 넣는다(0.6.8) — 표지를 바꾸면 파일 시각이 달라져 새로 만든다.
    const art = url.searchParams.get("format") === "mp3" ? await lib.artOf(rest) : null;
    if (url.searchParams.get("format") === "mp3" && f.ext !== "mp3" && !ctx.ffmpeg) {
      f.stream.destroy();
      return json(res, 501, { error: "이 PC에 MP3 변환 도구(ffmpeg)가 없어 FLAC 원음만 받을 수 있습니다." }, origin);
    }
    if (url.searchParams.get("format") === "mp3" && (f.ext !== "mp3" || art) && ctx.ffmpeg) {
      f.stream.destroy();
      const artTime = art ? Math.round((await stat(art)).mtimeMs) : 0;
      const cached = path.join(ctx.mp3CacheDir, `${rest}${art ? `-c${artTime}` : ""}.mp3`);
      const have = await stat(cached).then(() => true, () => false);
      if (!have) {
        await mkdir(ctx.mp3CacheDir, { recursive: true });
        if (!(await toMp3(lib.pathOf(rest), cached, art))) return json(res, 500, { error: "MP3로 바꾸지 못했습니다." }, origin);
      }
      const s = await stat(cached);
      res.writeHead(200, { "content-type": "audio/mpeg", "content-length": s.size, ...corsHeaders(origin) });
      return createReadStream(cached).pipe(res);
    }
    res.writeHead(200, { "content-type": AUDIO_TYPES[f.ext] ?? "audio/mpeg", "content-length": f.size, "x-audio-format": f.ext, ...corsHeaders(origin) });
    return f.stream.pipe(res);
  }
  if (req.method === "DELETE") {
    const r = await lib.remove(rest);
    for (const f of await readdir(ctx.mp3CacheDir).catch(() => [])) if (f.startsWith(rest)) await rm(path.join(ctx.mp3CacheDir, f), { force: true });
    // skipped: 보관함 밖·모델 폴더·링크라서 지우지 않고 남긴 파일(0.6.9)
    return json(res, 200, { ok: true, removed: r.removed, skipped: r.skipped }, origin);
  }
  return json(res, 404, { error: "없는 주소입니다." }, origin);
}

/**
 * 플레이리스트 영상(0.6.9, video.mjs) — 토큰 확인을 마친 요청만 온다.
 *  POST   /video                     { title, template, tracks:[{id,title}], options } → { session } (음원 분석 시작)
 *  GET    /video/<sid>               → 작업 상태(분석 → 화면이 그림 → 담기 → 완성)
 *  GET    /video/<sid>/analysis/<i>  → i번째 곡 분석(JSON, 화면이 스펙트럼을 그림)
 *  POST   /video/<sid>/chunk         H.264 조각(본문 그대로, X-Offset: 지금까지 보낸 크기) → { written }
 *  POST   /video/<sid>/finish        { frames, written, hardware, codec } → 담기·반복·검증 시작
 *  POST   /video/<sid>/cancel
 *  GET    /videos                    → { videos, dir } 이 PC에서 만든 영상(회원 PC에만 기록)
 *  GET    /videos/<vid>/file         → 영상 파일(Range 지원)
 *  POST   /videos/reveal             → 영상 폴더 열기
 *  DELETE /videos/<vid>?file=1       → 목록에서 지우기(file=1이면 파일도)
 */
async function handleVideo(req, res, url, origin, ctx, json) {
  const v = ctx.video;
  const parts = url.pathname.split("/").filter(Boolean);
  const uuid = (s) => typeof s === "string" && /^[0-9a-f-]{36}$/.test(s);
  try {
    if (parts[0] === "videos") {
      if (req.method === "GET" && parts.length === 1) return json(res, 200, { videos: await v.list(), dir: v.outDir }, origin);
      if (req.method === "POST" && parts[1] === "reveal" && parts.length === 2) {
        await mkdir(v.outDir, { recursive: true });
        await revealFolder(v.outDir);
        return json(res, 200, { ok: true }, origin);
      }
      if (!uuid(parts[1])) return json(res, 404, { error: "없는 주소입니다." }, origin);
      if (req.method === "GET" && parts[2] === "file" && parts.length === 3) {
        const file = await v.fileOf(parts[1]);
        if (!file) return json(res, 404, { error: "영상 파일이 없습니다(옮기거나 지웠을 수 있음)." }, origin);
        const size = (await stat(file)).size;
        const type = file.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4";
        const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
        if (m && (m[1] || m[2])) {
          const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
          const end = m[1] && m[2] ? Math.min(size - 1, Number(m[2])) : size - 1;
          if (start > end || start >= size) {
            res.writeHead(416, { "content-range": `bytes */${size}`, ...corsHeaders(origin) });
            return res.end();
          }
          res.writeHead(206, { "content-type": type, "content-length": end - start + 1, "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes", ...corsHeaders(origin) });
          return createReadStream(file, { start, end }).pipe(res);
        }
        res.writeHead(200, { "content-type": type, "content-length": size, "accept-ranges": "bytes", ...corsHeaders(origin) });
        return createReadStream(file).pipe(res);
      }
      if (req.method === "DELETE" && parts.length === 2) {
        const r = await v.remove(parts[1], { removeFile: url.searchParams.get("file") === "1" });
        return r.ok ? json(res, 200, r, origin) : json(res, r.status, { error: r.error }, origin);
      }
      return json(res, 404, { error: "없는 주소입니다." }, origin);
    }

    // /video …
    if (req.method === "POST" && parts.length === 1) {
      const body = await readSmall(req, 256 * 1024).catch(() => null);
      const r = await v.start(body);
      return r.ok ? json(res, 200, { session: r.session }, origin) : json(res, r.status, { error: r.error }, origin);
    }
    const sid = parts[1];
    if (!uuid(sid)) return json(res, 404, { error: "없는 주소입니다." }, origin);
    if (req.method === "GET" && parts.length === 2) {
      const s = v.get(sid);
      return s ? json(res, 200, { session: s }, origin) : json(res, 404, { error: "그 영상 작업을 찾지 못했습니다(엔진을 다시 켰으면 처음부터 만들어 주세요)." }, origin);
    }
    if (req.method === "GET" && parts[2] === "analysis" && parts.length === 4) {
      const text = await v.analysis(sid, Number(parts[3]));
      if (text === null) return json(res, 404, { error: "곡 분석이 없습니다." }, origin);
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", ...corsHeaders(origin) });
      return res.end(text);
    }
    if (req.method === "POST" && parts[2] === "chunk" && parts.length === 3) {
      const offset = Number(req.headers["x-offset"]);
      if (!Number.isSafeInteger(offset) || offset < 0) return json(res, 400, { error: "조각 위치가 올바르지 않습니다." }, origin);
      const bytes = await readRaw(req, 32 * 1024 * 1024).catch(() => null);
      if (!bytes?.length) return json(res, 400, { error: "조각이 비었거나 너무 큽니다(32MB까지)." }, origin);
      const r = await v.append(sid, offset, bytes);
      return r.ok ? json(res, 200, { written: r.written }, origin) : json(res, r.status, { error: r.error, written: r.written }, origin);
    }
    if (req.method === "POST" && parts[2] === "finish" && parts.length === 3) {
      const body = await readSmall(req).catch(() => null);
      const r = await v.finish(sid, { frames: body?.frames, written: body?.written, hardware: body?.hardware === true, codec: body?.codec });
      return r.ok ? json(res, 200, { session: r.session }, origin) : json(res, r.status, { error: r.error }, origin);
    }
    if (req.method === "POST" && parts[2] === "cancel" && parts.length === 3) {
      await v.cancel(sid);
      return json(res, 200, { ok: true }, origin);
    }
  } catch (e) {
    return json(res, 500, { error: e instanceof Error ? e.message : "영상 요청을 처리하지 못했습니다." }, origin);
  }
  return json(res, 404, { error: "없는 주소입니다." }, origin);
}

async function readRaw(req, max) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > max) throw new Error("too large");
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

const QUEUE_KINDS = new Set(["text2music", "cover", "repaint", "master", "stems", "align", "art"]);

/**
 * 내 PC 앨범 그림(0.7.0)
 *  GET    /image-models               → 판 목록·상태·추천·받아 둔 판·기본 판
 *  POST   /image-models/<id>/default  → 기본 판으로
 *  DELETE /image-models/<id>          → 받아 둔 판 지우기(다른 판이 같이 쓰는 파일은 남김)
 *  GET    /image-art/<작업 번호>        → 그린 PNG(하루 보관)
 *  POST   /image-models/folder        { path, mode: "move"|"fresh" } → 그림 모델만 다른 폴더로(0.7.1, 뒤에서 옮김 — GET의 moving)
 */
async function handleImage(req, res, url, origin, ctx, json) {
  const parts = url.pathname.split("/").filter(Boolean);
  const id = decodeURIComponent(parts[1] || "");
  try {
    if (parts[0] === "image-art" && req.method === "GET" && /^[0-9a-f-]{36}$/.test(id)) {
      const buf = await readFile(ctx.imageArt.resultFile(id)).catch(() => null);
      if (!buf) return json(res, 404, { error: "그린 그림이 없습니다(하루 지나면 지워집니다)." }, origin);
      res.writeHead(200, { ...corsHeaders(origin), "content-type": "image/png", "content-length": buf.length, "cache-control": "no-store" });
      return res.end(buf);
    }
    if (parts[0] === "image-models") {
      if (req.method === "GET" && parts.length === 1) return json(res, 200, await ctx.imageArt.state(), origin);
      if (req.method === "POST" && parts.length === 2 && parts[1] === "folder") {
        const body = await readSmall(req).catch(() => null);
        if (!ctx.moveImageModels) return json(res, 501, { error: "이 엔진은 그림 모델 폴더를 바꿀 수 없습니다." }, origin);
        return json(res, 200, await ctx.moveImageModels(typeof body?.path === "string" ? body.path : "", body?.mode), origin);
      }
      if (req.method === "POST" && parts.length === 3 && parts[2] === "default") {
        await ctx.imageArt.setDefault(id);
        return json(res, 200, { ok: true }, origin);
      }
      if (req.method === "DELETE" && parts.length === 2) {
        if (ctx.queue?.list().some((j) => j.kind === "art" && (j.status === "queued" || j.status === "running"))) return json(res, 409, { error: "그림 작업이 끝난 뒤에 지울 수 있습니다." }, origin);
        return (await ctx.imageArt.remove(id)) ? json(res, 200, { ok: true }, origin) : json(res, 404, { error: "없는 그림 모델입니다." }, origin);
      }
    }
    return json(res, 404, { error: "없는 주소입니다." }, origin);
  } catch (e) {
    return json(res, 400, { error: e instanceof Error ? e.message : "그림 모델을 처리하지 못했습니다." }, origin);
  }
}
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
      // 마스터링(0.6.9) — task { sourceId: 원곡 번호(이 PC 보관함), options } · 결과는 새 곡(kind master)
      if (meta?.kind === "master") {
        const sourceId = body?.task?.sourceId;
        if (!isTrackId(sourceId) || !(await ctx.library.fileOf(sourceId))) return json(res, 400, { error: "이 PC 보관함에 원곡 음원이 없습니다." }, origin);
        if (!ctx.ffmpeg) return json(res, 501, { error: "이 PC에 ffmpeg가 없어 마스터링할 수 없습니다. 엔진을 다시 켜면 받습니다." }, origin);
        let options;
        try {
          options = validateMasteringOptions(body.task.options ?? {});
        } catch (e) {
          return json(res, 400, { error: e instanceof Error ? e.message : "마스터링 설정이 올바르지 않습니다." }, origin);
        }
        const license = body.license === "noncommercial" ? "noncommercial" : "commercial"; // 원곡 사용 범위를 따른다
        return json(res, 200, { job: await q.add({ ...meta, task: { sourceId, options }, engine: "master", license }) }, origin);
      }
      // Stem 분리(0.6.9) — task { sourceId, mode: "two"|"multi" } · 결과는 곡이 아니라 노래 저장 폴더 「Stem」의 WAV(GET /library/<id>/stems)
      if (meta?.kind === "stems") {
        const sourceId = body?.task?.sourceId;
        if (!ctx.stems) return json(res, 501, { error: "이 엔진은 Stem 분리를 할 수 없습니다." }, origin);
        if (!isTrackId(sourceId) || !(await ctx.library.fileOf(sourceId))) return json(res, 400, { error: "이 PC 보관함에 원곡 음원이 없습니다." }, origin);
        const mode = body.task.mode === "multi" ? "multi" : "two";
        return json(res, 200, { job: await q.add({ ...meta, task: { sourceId, mode }, engine: "stems", license: body.license === "noncommercial" ? "noncommercial" : "commercial" }) }, origin);
      }
      // 가사 자동 맞추기(0.6.9) — task { sourceId, lyrics, previousTiming } · 결과 { sourceId, timing }를 사이트가 곡 기록에 저장
      if (meta?.kind === "align") {
        const sourceId = body?.task?.sourceId;
        const lyrics = body?.task?.lyrics;
        if (!ctx.lyrics) return json(res, 501, { error: "이 엔진은 가사 자동 맞추기를 할 수 없습니다." }, origin);
        if (!isTrackId(sourceId) || !(await ctx.library.fileOf(sourceId))) return json(res, 400, { error: "이 PC 보관함에 원곡 음원이 없습니다." }, origin);
        if (typeof lyrics !== "string" || !lyrics.trim() || lyrics.length > 10000) return json(res, 400, { error: "가사가 올바르지 않습니다(10,000자까지)." }, origin);
        const previousTiming = body.task.previousTiming && typeof body.task.previousTiming === "object" ? body.task.previousTiming : null;
        return json(res, 200, { job: await q.add({ ...meta, task: { sourceId, lyrics, previousTiming }, engine: "align", license: body.license === "noncommercial" ? "noncommercial" : "commercial" }) }, origin);
      }
      // 내 PC 앨범 그림(0.7.0) — task { prompt(영어), variantId? } · 결과 PNG는 GET /image-art/<작업 번호>
      if (meta?.kind === "art") {
        if (!ctx.imageArt) return json(res, 501, { error: "이 엔진은 내 PC 그림을 그릴 수 없습니다." }, origin);
        let prompt;
        try {
          prompt = cleanArtPrompt(body?.task?.prompt);
        } catch (e) {
          return json(res, 400, { error: e.message }, origin);
        }
        const variantId = typeof body.task.variantId === "string" && findImageVariant(body.task.variantId) ? body.task.variantId : undefined;
        return json(res, 200, { job: await q.add({ ...meta, task: { prompt, variantId }, engine: "art", license: "commercial" }) }, origin);
      }
      if (!meta || meta.kind !== "text2music" || !body.task || typeof body.task !== "object") return json(res, 400, { error: "작업 내용이 올바르지 않습니다." }, origin);
      // 음악 엔진: acestep(상업용, 기본) | yue2·추가 엔진(새 곡 만들기만, 0.4.0) — 분류는 엔진 쪽 목록이 정한다
      const engine = body.engine === undefined ? "acestep" : body.engine;
      const license = engine === "acestep" ? "commercial" : ctx.engineLicense?.(engine);
      if (!license) return json(res, 400, { error: "없는 음악 엔진입니다." }, origin);
      // 회원 본인 Hugging Face 토큰(모델을 처음 받을 때만 씀) — 대기열 파일에 남기지 않고 엔진 메모리에만
      if (typeof body.hfToken === "string" && body.hfToken.trim()) ctx.setHfToken?.(body.hfToken.trim().slice(0, 200));
      return json(res, 200, { job: await q.add({ ...meta, task: body.task, engine, license }) }, origin);
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
