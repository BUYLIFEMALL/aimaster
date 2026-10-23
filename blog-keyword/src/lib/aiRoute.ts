import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKeys } from "@/lib/apiKeys";
import { toUserError } from "@/lib/gemini";
import type { Ctx } from "@/lib/kw/features";

const NO_STORE = { "Cache-Control": "private, no-store" };
const MAX_BODY = 200_000;

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export function fail(error: unknown) {
  const u = toUserError(error);
  return json({ error: u.message, code: u.code, ...(u.needNaver ? { needNaver: true } : {}) }, u.status);
}

export interface RouteContext { userId: string; ctx: Ctx; body: Record<string, unknown> }

/**
 * 분석 라우트 공통 관문: 로그인·프로그램 권한 → 요청 본문 크기·JSON → 회원 본인 키(Gemini·네이버·검색광고).
 * 키가 없으면 운영자·다른 회원 키로 폴백하지 않는다(최상위 규칙).
 * Gemini 키가 필요한 기능은 호출 쪽에서 ctx.gemini가 비어 있으면 needGeminiResponse()를 돌려준다.
 */
export async function guardRoute(request: NextRequest): Promise<RouteContext | NextResponse> {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: "요청 내용이 너무 큽니다." }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "요청 형식이 올바르지 않습니다." }, 400);

  const keys = await getUserApiKeys(access.user.id, [
    "gemini", "naver_client_id", "naver_client_secret", "naver_ads_api_key", "naver_ads_secret_key", "naver_ads_customer_id",
  ]);
  const ctx: Ctx = {
    gemini: keys.gemini ?? "",
    naver: keys.naver_client_id && keys.naver_client_secret ? { clientId: keys.naver_client_id, clientSecret: keys.naver_client_secret } : null,
    ads:
      keys.naver_ads_api_key && keys.naver_ads_secret_key && keys.naver_ads_customer_id
        ? { apiKey: keys.naver_ads_api_key, secretKey: keys.naver_ads_secret_key, customerId: keys.naver_ads_customer_id }
        : null,
  };
  return { userId: access.user.id, ctx, body: body as Record<string, unknown> };
}

export function needGeminiResponse() {
  return json(
    { error: "Gemini API 키가 등록되지 않았습니다. [API키등록·플랫폼연동]에서 본인의 Google Gemini API 키를 먼저 등록해 주세요.", needKey: true },
    400,
  );
}
