import { retentionExemptStale, setRetentionExemptIds } from "./documentRules";
import { createAdminClient } from "@/lib/supabase/admin";
import "server-only";
import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey, PROVIDER_NAMES, type ApiKeyProvider } from "@/lib/apiKeys";

type Authorized = Awaited<ReturnType<typeof checkProgramAccessApi>> & { allowed: true };

/** 로그인 + 프로그램 이용 권한 확인. 실패하면 그대로 돌려줄 응답을 함께 준다. */
export async function authorize(): Promise<{ ok: true; auth: Authorized } | { ok: false; response: NextResponse }> {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return { ok: false, response: NextResponse.json({ error: access.error }, { status: access.status }) };
  }
  await refreshRetentionExempt();
  return { ok: true, auth: access as Authorized };
}

/** 보관 예외 회원 목록(10분 기억). 읽지 못하면 이전 목록 유지 */
async function refreshRetentionExempt() {
  if (!retentionExemptStale()) return;
  try {
    const { data, error } = await createAdminClient().from("profiles").select("id").eq("retention_exempt", true);
    if (!error) setRetentionExemptIds((data ?? []).map((r: { id: string }) => r.id));
  } catch {
    /* 다음 요청에 다시 */
  }
}

/** 회원 본인 키만 조회한다(폴백 없음). 없으면 등록 안내 응답을 준다. */
export async function requireOwnKey(userId: string, provider: ApiKeyProvider) {
  const apiKey = await getUserApiKey(userId, provider);
  if (!apiKey) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: `${PROVIDER_NAMES[provider]} API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록해주세요.`, needApiKey: true, provider },
        { status: 400 }
      ),
    };
  }
  return { ok: true as const, apiKey };
}
