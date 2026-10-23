import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKeys } from "@/lib/apiKeys";
import { toUserError } from "@/lib/gemini";

const NO_STORE = { "Cache-Control": "private, no-store" };
const MAX_BODY = 400_000;

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export function fail(error: unknown) {
  const u = toUserError(error);
  return json({ error: u.message, code: u.code, ...(u.code === "key" ? { needKey: true } : {}) }, u.status);
}

export interface AiContext { userId: string; apiKey: string; body: Record<string, unknown> }

/**
 * AI 라우트 공통 관문: 로그인·프로그램 권한 → 요청 본문 크기·JSON → 회원 본인 Gemini 키.
 * 키가 없으면 운영자·다른 회원 키로 폴백하지 않고 needKey를 돌려준다(최상위 규칙).
 */
export async function guardAi(request: NextRequest, maxBody = MAX_BODY): Promise<AiContext | NextResponse> {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);

  const raw = await request.text();
  if (raw.length > maxBody) return json({ error: "요청 내용이 너무 큽니다." }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "요청 형식이 올바르지 않습니다." }, 400);

  const apiKey = (await getUserApiKeys(access.user.id, ["gemini"])).gemini;
  if (!apiKey) {
    return json(
      { error: "Gemini API 키가 등록되지 않았습니다. [API키등록·플랫폼연동]에서 본인의 Google Gemini API 키를 먼저 등록해 주세요.", needKey: true },
      400,
    );
  }
  return { userId: access.user.id, apiKey, body: body as Record<string, unknown> };
}
