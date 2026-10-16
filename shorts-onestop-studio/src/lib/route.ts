import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { AiError } from "@/lib/ai";
import { UserError } from "@/lib/errors";

// blog-workroom/src/lib/route.ts 패턴: 권한 확인 + 같은 출처 + JSON 본문(크기 제한) + 오류를 회원용 문구로.
const NO_STORE = { "Cache-Control": "private, no-store" };
export function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: NO_STORE }); }

export function fail(e: unknown) {
  if (e instanceof UserError) return json({ error: e.message, ...e.extra }, e.status);
  if (e instanceof AiError) return json({ error: e.message, code: e.code, needKey: e.code === "key" }, e.status);
  console.error("[shorts-onestop-studio]", e instanceof Error ? e.message : "unknown");
  return json({ error: "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, 500);
}

export async function guard(request: NextRequest, maxBytes = 400_000): Promise<{ userId: string; body: Record<string, unknown> } | NextResponse> {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  if (request.method !== "GET") {
    if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "요청 출처를 확인할 수 없습니다." }, 403);
    if (request.method !== "DELETE" && !request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "JSON 요청만 사용할 수 있습니다." }, 400);
  }
  let body: Record<string, unknown> = {};
  if (request.method !== "GET" && request.method !== "DELETE" && request.body) {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const p = await reader.read(); if (p.done) break;
      size += p.value.length;
      if (size > maxBytes) { await reader.cancel(); return json({ error: "요청 내용이 너무 큽니다. 참고 자료를 줄여 주세요." }, 413); }
      chunks.push(p.value);
    }
    try { const v = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); if (v && typeof v === "object" && !Array.isArray(v)) body = v; } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  }
  return { userId: access.user.id, body };
}
