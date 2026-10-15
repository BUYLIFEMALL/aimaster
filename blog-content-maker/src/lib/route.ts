import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "./access";
import { UserError } from "./errors";
export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
export function fail(error: unknown) { return error instanceof UserError ? json({ error: error.message, ...error.extra }, error.status) : json({ error: "작업을 완료하지 못했습니다. 저장된 작업과 입력 내용을 확인해 주세요." }, 500); }
export async function guard(req: NextRequest) {
  const a = await checkProgramAccessApi(); if (!a.allowed) throw new UserError(a.status, a.error);
  if (req.method !== "GET" && req.headers.get("origin") !== req.nextUrl.origin) throw new UserError(403, "허용되지 않은 요청 출처입니다.");
  let body: Record<string, unknown> = {};
  if (req.method !== "GET") {
    if (!req.headers.get("content-type")?.startsWith("application/json")) throw new UserError(400, "JSON 요청만 사용할 수 있습니다.");
    const reader = req.body?.getReader(); let length = 0; const chunks: Uint8Array[] = [];
    if (reader) for (;;) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > 4200000) { await reader.cancel(); throw new UserError(413, "요청이 큽니다. 이미지를 줄이거나 원문을 나눠 주세요."); } chunks.push(part.value); }
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); if (!body || Array.isArray(body) || typeof body !== "object") throw new Error(); } catch { throw new UserError(400, "요청 형식이 올바르지 않습니다."); }
  }
  return { userId: a.user.id, body };
}
