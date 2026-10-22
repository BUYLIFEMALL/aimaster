// 최상위 규칙(docs/TOP_RULE_PERSONAL_ACCOUNT_API.md): 이 프로그램은 로그인한 회원 본인으로만 동작한다.
// 비로그인 방문자를 다른 회원으로 대신하지 않고, API 키도 로그인한 회원 본인의 것만 쓴다(타인·운영자 키 폴백 없음).
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { checkProgramAccess } from "./access/checkProgramAccess";

export const PROGRAM_SLUG = "ai-video-studio";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://www.buylife.xyz";

async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

/** 로그인한 회원. 비로그인이면 로그인 화면으로 보낸다(페이지·서버 컴포넌트용). */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    const currentPath = headers().get("x-pathname") ?? "/create";
    redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }
  return user;
}

/** 로그인 + 이 프로그램 이용 권한. 권한 판정 테이블은 RLS에 막히지 않도록 관리자 클라이언트로 조회한다. */
export async function requireProgramAccess() {
  const user = await requireUser();
  const access = await checkProgramAccess(createAdminClient(), user.id, PROGRAM_SLUG);
  if (!access.allowed) {
    if (access.reason === "phone_required") redirect(`${MAIN_SITE_URL}/settings?need_phone=1`);
    redirect(`${MAIN_SITE_URL}/programs/${PROGRAM_SLUG}${access.reason === "suspended" ? "?error=suspended" : ""}`);
  }
  return { user, access };
}

const DENIED_MESSAGE: Record<string, string> = {
  suspended: "정지된 계정은 프로그램을 이용할 수 없습니다.",
  not_found: "현재 이용 가능한 프로그램 정보를 찾을 수 없습니다.",
  phone_required: "핸드폰 번호를 입력 후 사용해주세요!",
};

/**
 * API 라우트용: redirect 대신 JSON 오류 응답을 돌려준다.
 * 사용: `const { user, errorResponse } = await checkProgramAccessApi(); if (errorResponse) return errorResponse;`
 */
export async function checkProgramAccessApi() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, access: null, errorResponse: Response.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  const access = await checkProgramAccess(createAdminClient(), user.id, PROGRAM_SLUG);
  if (!access.allowed) {
    const error = DENIED_MESSAGE[access.reason] ?? "이 프로그램을 이용할 권한이 없습니다.";
    return { user: null, access, errorResponse: Response.json({ error }, { status: 403 }) };
  }
  return { user, access, errorResponse: null };
}

/** 모든 회원이 공유하는 데이터(추천 프롬프트 등)를 바꾸는 API용: 로그인 + 이용 권한 + 관리자. */
export async function checkAdminApi() {
  const result = await checkProgramAccessApi();
  if (result.errorResponse) return result;
  if (result.access?.reason !== "admin") {
    return {
      user: null,
      access: result.access,
      errorResponse: Response.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 }),
    };
  }
  return result;
}

/** 로그인한 회원 본인이 등록한 API 키만 돌려준다. 없으면 null — 다른 회원·운영자 키로 대신하지 않는다. */
export async function getUserApiKey(userId: string, provider: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  return data?.api_key ?? null;
}

/** 비용이 드는 동작 1건을 공용 usage_logs에 기록한다(관리자 사용 현황). 기록 실패가 본 기능을 막지 않는다. */
export async function logProgramUsage(userId: string, action: string, quantity = 1, metadata: Record<string, unknown> = {}) {
  try {
    const admin = createAdminClient();
    const { data: program } = await admin.from("programs").select("id").eq("slug", PROGRAM_SLUG).maybeSingle();
    if (!program) return;
    await admin.from("usage_logs").insert({ user_id: userId, program_id: program.id, action, quantity, credits_used: 0, metadata });
  } catch (e) {
    console.error("usage_logs 기록 실패:", e);
  }
}
