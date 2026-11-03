// 연결 문 — 우리 사이트(브라우저)가 부르는 유일한 입구. 허용 주소만 받고, 생성 관련 요청은
// 짝짓기 토큰을 확인한 뒤 내부 ACE-Step 서버로 그대로 넘긴다(파일 업로드 포함, 본문을 해석하지 않음).
import http from "node:http";
import { bearer, corsHeaders, isAllowedOrigin, newPairCode, newToken, sameSecret } from "./security.mjs";
import { isTrackId } from "./library.mjs";
import { pickFolder, revealFolder } from "./folderDialog.mjs";
import { mkdir } from "node:fs/promises";

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
    if (!target && !isLibrary) return json(res, 404, { error: "없는 주소입니다." }, origin);
    const token = bearer(req.headers.authorization);
    if (!token || ![...ctx.tokens].some((t) => sameSecret(t, token))) {
      return json(res, 401, { error: "PC 연결이 필요합니다.", needPair: true }, origin);
    }
    if (isLibrary) return handleLibrary(req, res, url, origin, ctx, json);
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
 *  GET /library            → { ids: [...], dir } 이 PC에 있는 곡 번호·저장 폴더
 *  POST /library/save      { id, file, title } → ACE-Step 결과(/v1/audio?…)를 받아 「제목.mp3」로 보관
 *  POST /library/pick-folder → { path|null } PC에 폴더 고르기 창
 *  POST /library/folder    { path, move, titles } → 저장 폴더 바꾸기(기존 노래 옮기기 선택)
 *  POST /library/reveal    → 저장 폴더를 탐색기로 열기
 *  GET /library/<id>       → 음원(audio/mpeg)
 *  DELETE /library/<id>    → 지우기
 */
async function handleLibrary(req, res, url, origin, ctx, json) {
  const lib = ctx.library;
  const rest = url.pathname.slice("/library".length).replace(/^\//, "");

  if (req.method === "GET" && !rest) return json(res, 200, { ids: await lib.list(), dir: lib.dir }, origin);

  // 저장 폴더: 고르기 창(PC에 뜸) → 바꾸기(기존 노래 옮기기 선택) · 탐색기로 열기
  if (req.method === "POST" && rest === "pick-folder") {
    try {
      return json(res, 200, { path: await pickFolder(lib.dir) }, origin);
    } catch (e) {
      return json(res, 501, { error: e.message }, origin);
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
      const saved = await lib.save(id, Buffer.from(await r.arrayBuffer()), title);
      return json(res, 200, { ok: true, path: saved }, origin);
    } catch {
      return json(res, 500, { error: "보관 폴더에 저장하지 못했습니다. 디스크 공간을 확인해 주세요." }, origin);
    }
  }

  if (!isTrackId(rest)) return json(res, 404, { error: "없는 주소입니다." }, origin);

  if (req.method === "GET") {
    const f = await lib.open(rest);
    if (!f) return json(res, 404, { error: "이 PC에 이 곡의 음원이 없습니다." }, origin);
    res.writeHead(200, { "content-type": "audio/mpeg", "content-length": f.size, ...corsHeaders(origin) });
    return f.stream.pipe(res);
  }
  if (req.method === "DELETE") {
    await lib.remove(rest);
    return json(res, 200, { ok: true }, origin);
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
