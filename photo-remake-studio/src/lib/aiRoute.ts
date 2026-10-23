import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "./access";
import { getUserApiKeys } from "./apiKeys";
import { toUserError } from "./gemini";
import { InputError } from "./remake/validation";
import { MAX_REQUEST_BYTES } from "./remake/types";
export function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } }); }
export function fail(e: unknown) { if (e instanceof InputError) return json({ error: e.message }, 400); const x = toUserError(e); return json({ error: x.message, code: x.code, needKey: x.code === "key" }, x.status); }
export async function guardAi(request: NextRequest) {
  const access = await checkProgramAccessApi(); if (!access.allowed) return json({ error: access.error }, access.status);
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "요청 출처를 확인할 수 없습니다." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "JSON 요청만 사용할 수 있습니다." }, 400);
  const reader = request.body?.getReader(); if (!reader) return json({ error: "요청 내용이 없습니다." }, 400);
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) { const p = await reader.read(); if (p.done) break; length += p.value.length; if (length > MAX_REQUEST_BYTES) { await reader.cancel(); return json({ error: "사진 용량이 너무 큽니다. 사물 수를 줄여 주세요." }, 413); } chunks.push(p.value); }
  let body: unknown; try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  const apiKey = (await getUserApiKeys(access.user.id, ["gemini"])).gemini;
  if (!apiKey) return json({ error: "본인 Gemini API 키를 등록해 주세요.", needKey: true }, 400);
  return { body, apiKey, userId: access.user.id };
}
