import "server-only";
import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/cardnews/access";
import { getUserApiKey, type ApiKeyProvider } from "@/lib/cardnews/apiKeys";
import { findEngine, isKnownModel } from "@/lib/cardnews/ai/models";

type Authorized = Awaited<ReturnType<typeof checkProgramAccessApi>> & { allowed: true };

/** 로그인 + 프로그램 이용 권한 확인. 실패하면 그대로 돌려줄 응답을 함께 준다. */
export async function authorize(): Promise<{ ok: true; auth: Authorized } | { ok: false; response: NextResponse }> {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return { ok: false, response: NextResponse.json({ error: access.error }, { status: access.status }) };
  }
  return { ok: true, auth: access as Authorized };
}

/** 회원 본인 키만 조회한다(폴백 없음). 없으면 등록 안내 응답을 준다. */
export async function requireOwnKey(userId: string, provider: ApiKeyProvider, label: string) {
  const apiKey = await getUserApiKey(userId, provider);
  if (!apiKey) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: `${label} API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록해주세요.`, needApiKey: true, provider },
        { status: 400 }
      ),
    };
  }
  return { ok: true as const, apiKey };
}

/** 글쓰기 AI(provider/model) 검증 */
export function parseEngine(raw: unknown): { ok: true; provider: ApiKeyProvider; model: string; label: string } | { ok: false; response: NextResponse } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const provider = typeof r.provider === "string" ? r.provider : "";
  const model = typeof r.model === "string" ? r.model : "";
  const engine = findEngine(provider);
  if (!engine || !isKnownModel(provider, model)) {
    return { ok: false, response: NextResponse.json({ error: "지원하지 않는 AI 또는 모델입니다." }, { status: 400 }) };
  }
  return { ok: true, provider: provider as ApiKeyProvider, model, label: engine.label };
}
