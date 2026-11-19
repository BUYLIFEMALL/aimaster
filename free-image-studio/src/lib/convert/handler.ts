// 변환 요청(POST /api/convert)의 처리 순서. Next·Supabase 없이 시험할 수 있게 경로 파일에서 떼어 냈다(판정·키 읽기·fetch는 주입).
// 순서: 이용 권한 → 출처(정확한 origin) → 본문 크기(바이트, 읽는 도중 초과하면 끊음) → JSON → 동의 표시 → 변환.
// 앞 단계에서 걸리면 뒤 단계는 하지 않는다 — 특히 **키 조회와 AI 호출은 모든 검사를 통과한 뒤에만** 일어난다.
import { ConvertError } from "./protocol.ts";
import { convertBatch, type ConvertDeps } from "./service.ts";
import type { ConvertProvider } from "./models.ts";

/**
 * 요청 본문 상한(바이트). 가장 큰 정상 요청 — 24줄 × 한글 300자(UTF-8 3바이트) + 줄 번호·JSON 틀 — 이 약 23KB라 여유를 두었다.
 * 글자 수가 아니라 **바이트**로 센다.
 */
export const MAX_BODY_BYTES = 32 * 1024;

export type Reply = { status: number; body: Record<string, unknown> };
const fail = (error: string, status: number, code: string): Reply => ({ status, body: { error, code } });

/**
 * 같은 사이트에서 온 요청인가 — 스킴·호스트·포트가 모두 같은 **정확한 origin**일 때만 참.
 * Origin 머리글이 없거나, "null"이거나, 읽을 수 없으면 거짓(회원 키로 유료 호출이 나가는 경로라 모르는 출처는 받지 않는다).
 */
export function sameOrigin(originHeader: string | null | undefined, requestUrl: string): boolean {
  if (typeof originHeader !== "string" || !originHeader || originHeader === "null") return false;
  try {
    const sent = new URL(originHeader);
    // Origin 머리글은 경로·질의가 없는 값이어야 한다(브라우저가 보내는 모양 그대로만 받는다).
    if (sent.origin !== originHeader) return false;
    return sent.origin === new URL(requestUrl).origin;
  } catch {
    return false;
  }
}

/**
 * 본문을 바이트 상한 안에서 읽는다. Content-Length가 상한을 넘으면 읽지 않고, 흘려 읽는 도중 상한을 넘으면 그 자리에서 읽기를 끊는다.
 * 돌려주는 값: 글(UTF-8로 온전히 읽힌 경우) 또는 문제 종류.
 */
export async function readLimitedText(request: Request, maxBytes: number): Promise<{ text: string } | { problem: "tooLarge" | "unreadable" }> {
  const declared = request.headers.get("content-length");
  if (declared !== null && declared !== "") {
    const n = Number(declared);
    if (!Number.isFinite(n) || n < 0) return { problem: "unreadable" };
    if (n > maxBytes) {
      await request.body?.cancel().catch(() => {});
      return { problem: "tooLarge" };
    }
  }
  if (!request.body) return { text: "" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {}); // 더 읽지 않는다
        return { problem: "tooLarge" };
      }
      chunks.push(value);
    }
  } catch {
    return { problem: "unreadable" };
  }
  const bytes = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.byteLength;
  }
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) }; // 깨진 UTF-8은 받지 않는다
  } catch {
    return { problem: "unreadable" };
  }
}

export type HandlerDeps = {
  /** 로그인 + 이 프로그램 이용 권한 */
  checkAccess: () => Promise<{ allowed: true; userId: string } | { allowed: false; error: string; status: number }>;
  /** 그 회원이 등록한 그 플랫폼의 본인 키(없으면 null) */
  getKey: (userId: string, provider: ConvertProvider) => Promise<string | null>;
  fetcher?: ConvertDeps["fetcher"];
  now?: ConvertDeps["now"];
};

export async function handleConvertPost(request: Request, deps: HandlerDeps): Promise<Reply> {
  const access = await deps.checkAccess();
  if (!access.allowed) return fail(access.error, access.status, "access");
  if (!sameOrigin(request.headers.get("origin"), request.url)) {
    await request.body?.cancel().catch(() => {});
    return fail("이 프로그램 화면에서 다시 요청해 주세요.", 403, "origin");
  }
  const read = await readLimitedText(request, MAX_BODY_BYTES);
  if ("problem" in read) return read.problem === "tooLarge" ? fail("요청이 너무 큽니다.", 413, "invalid") : fail("요청 내용을 읽지 못했습니다.", 400, "invalid");
  let body: unknown;
  try {
    body = JSON.parse(read.text);
  } catch {
    return fail("요청 내용을 읽지 못했습니다.", 400, "invalid");
  }
  // 화면이 비용 안내에 동의한 뒤에만 붙이는 표시. 실수로 만들어진 요청이 유료 호출로 이어지지 않게 서버에서도 본다.
  // (동의 여부를 서버에 저장하지는 않는다 — 회원별 동의 기록은 브라우저에만 있다.)
  if (!body || typeof body !== "object" || Array.isArray(body) || (body as Record<string, unknown>).consent !== true)
    return fail("유료 호출 안내에 동의한 뒤 변환할 수 있습니다. 변환을 켜고 다시 시도해 주세요.", 400, "needConsent");
  const userId = access.userId;
  try {
    const out = await convertBatch(body, { getKey: (provider) => deps.getKey(userId, provider), fetcher: deps.fetcher, signal: request.signal, now: deps.now });
    return { status: 200, body: out };
  } catch (e) {
    if (e instanceof ConvertError) return fail(e.message, e.status, e.code);
    // 플랫폼·DB 오류 원문에는 키나 내부 정보가 섞일 수 있어 그대로 내보내지 않는다.
    return fail("변환하지 못했습니다. 설명은 그대로 두었습니다. 잠시 뒤 직접 다시 시도해 주세요.", 500, "error");
  }
}
