// 연결 문 — 우리 사이트(브라우저)가 부르는 유일한 입구. 허용 주소만 받고, 생성 관련 요청은
// 짝짓기 토큰을 확인한 뒤 내부 ACE-Step 서버로 그대로 넘긴다(파일 업로드 포함, 본문을 해석하지 않음).
import http from "node:http";
import { bearer, corsHeaders, isAllowedOrigin, newPairCode, newToken, sameSecret } from "./security.mjs";

export const GATEWAY_PORT = 47821;
const MAX_BODY = 60 * 1024 * 1024; // 커버 원곡 업로드 상한
const FORWARD = new Map([
  ["POST /release_task", "/release_task"],
  ["POST /query_result", "/query_result"],
  ["GET /v1/audio", "/v1/audio"],
]);

/**
 * @param {{ version: string, getState: () => object, tokens: Set<string>, saveTokens: () => Promise<void>,
 *           acestepPort: number, acestepKey: string, onPairCode?: (code: string) => void }} ctx
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
      if (!origin) return json(res, 403, { error: "사이트에서만 짝짓기할 수 있습니다." });
      if (Date.now() < lockedUntil) return json(res, 429, { error: "잠시 뒤 다시 시도해 주세요." }, origin);
      const body = await readSmall(req).catch(() => null);
      const code = body && typeof body.code === "string" ? body.code.trim() : "";
      if (!sameSecret(code, pairCode)) {
        failures += 1;
        if (failures >= 5) {
          lockedUntil = Date.now() + 60_000;
          failures = 0;
        }
        return json(res, 401, { error: "짝짓기 코드가 맞지 않습니다. 엔진 창의 6자리 숫자를 확인해 주세요." }, origin);
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
    if (!target) return json(res, 404, { error: "없는 주소입니다." }, origin);
    const token = bearer(req.headers.authorization);
    if (!token || ![...ctx.tokens].some((t) => sameSecret(t, token))) {
      return json(res, 401, { error: "짝짓기가 필요합니다.", needPair: true }, origin);
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

async function readSmall(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > 4096) throw new Error("too large");
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
