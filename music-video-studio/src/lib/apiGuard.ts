import "server-only";
import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";

type Authorized = Awaited<ReturnType<typeof checkProgramAccessApi>> & { allowed: true };

/** 로그인 + 프로그램 이용 권한 확인. 실패하면 그대로 돌려줄 응답을 함께 준다. */
export async function authorize(): Promise<{ ok: true; auth: Authorized } | { ok: false; response: NextResponse }> {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return { ok: false, response: NextResponse.json({ error: access.error }, { status: access.status }) };
  }
  return { ok: true, auth: access as Authorized };
}

/** 회원 본인 Gemini 키만 조회한다(폴백 없음). 없으면 등록 안내 응답을 준다. */
export async function requireGeminiKey(userId: string) {
  const apiKey = await getUserApiKey(userId, "gemini");
  if (!apiKey) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Google Gemini API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록해주세요.", needApiKey: true },
        { status: 400 }
      ),
    };
  }
  return { ok: true as const, apiKey };
}

export const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

export function errorJson(message: string, status = 502) {
  return NextResponse.json({ error: message }, { status });
}
