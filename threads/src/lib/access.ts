import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 이 앱(threads)은 AIMaster와 같은 Supabase 프로젝트를 공유한다.
// 로그인 여부만으로는 부족하고, AIMaster의 programs/subscriptions/user_program_access
// 테이블을 기준으로 "이 프로그램을 실제로 이용할 권한이 있는지"까지 확인해야 한다.
// 앞으로 추가되는 모든 AI 프로그램(sibling app)은 이 파일과 동일한 패턴을 따른다.
//
// AIMaster Database 타입에는 없는 테이블이라 제네릭 타입 충돌을 피하기 위해
// from()의 반환값만 느슨하게 받는다 (AIMaster의 lib/access/checkProgramAccess.ts와 동일 패턴).
type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const THIS_PROGRAM_SLUG = "auto-threads-posting";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

function isNotExpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

/**
 * 로그인 + "auto-threads-posting" 프로그램 이용 권한을 함께 확인한다.
 * 권한이 없으면 AIMaster의 프로그램 구매 페이지로 리다이렉트한다.
 */
export async function requireProgramAccess() {
  const user = await requireUser();
  const supabase = (await createClient()) as unknown as SupabaseLike;

  const { data: program } = await supabase
    .from("programs")
    .select("id, required_grade_id")
    .eq("slug", THIS_PROGRAM_SLUG)
    .eq("is_active", true)
    .single();

  if (!program) {
    redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`);
  }

  // 1. 활성 구독
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id);

  const hasActiveSub = (subs ?? []).some(
    (s: { status: string; expires_at: string | null }) =>
      s.status === "active" && isNotExpired(s.expires_at)
  );
  if (hasActiveSub) return user;

  // 2. 관리자 개별 부여 권한
  const { data: grant } = await supabase
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id)
    .maybeSingle();
  if (grant && isNotExpired(grant.expires_at)) return user;

  // 3. 등급 제한이 없는 프로그램이면 로그인 사용자 전체 허용
  if (!program.required_grade_id) return user;

  // 4. 등급 기반 접근 (계층적)
  const { data: profile } = await supabase
    .from("profiles")
    .select("grade:member_grades(sort_order)")
    .eq("id", user.id)
    .single();

  const { data: requiredGrade } = await supabase
    .from("member_grades")
    .select("sort_order")
    .eq("id", program.required_grade_id)
    .single();

  const userGrade = Array.isArray(profile?.grade) ? profile?.grade[0] : profile?.grade;
  if (userGrade && requiredGrade && userGrade.sort_order >= requiredGrade.sort_order) {
    return user;
  }

  redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`);
}

/**
 * OpenAI 호출처럼 실제 비용이 발생하는 동작 1건을 usage_logs에 기록한다.
 * RLS insert 정책상 service role(admin client)로만 기록 가능하다.
 * 텔레메트리 성격이므로 기록 실패가 본 기능(AI 생성 등)을 막아서는 안 된다.
 */
export async function logProgramUsage(params: {
  userId: string;
  action: string;
  quantity?: number;
  creditsUsed?: number;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient() as unknown as SupabaseLike;
    const { data: program } = await admin
      .from("programs")
      .select("id")
      .eq("slug", THIS_PROGRAM_SLUG)
      .single();

    if (!program) return;

    await admin.from("usage_logs").insert({
      user_id: params.userId,
      program_id: program.id,
      action: params.action,
      quantity: params.quantity ?? 1,
      credits_used: params.creditsUsed ?? 0,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    console.error("usage_logs 기록 실패:", err);
  }
}
