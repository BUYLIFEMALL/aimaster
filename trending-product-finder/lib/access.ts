import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// 이 앱(trending-product-finder)은 AIMaster와 같은 Supabase 프로젝트를 공유한다.
// 로그인 여부만으로는 부족하고, AIMaster의 programs/subscriptions/user_program_access
// 테이블을 기준으로 "이 프로그램을 실제로 이용할 권한이 있는지"까지 확인해야 한다.
// longtail-keyword-expander/stepmail/crm-google-form과 동일한 패턴.
type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const THIS_PROGRAM_SLUG = "trending-product-finder";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

function isNotExpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

export async function requireProgramAccess() {
  const user = await requireUser();
  const supabase = (await createClient()) as unknown as SupabaseLike;

  const { data: suspendCheck } = await supabase
    .from("profiles")
    .select("is_suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (suspendCheck?.is_suspended) {
    redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}?error=suspended`);
  }

  const { data: program } = await supabase
    .from("programs")
    .select("id, required_grade_id")
    .eq("slug", THIS_PROGRAM_SLUG)
    .eq("is_active", true)
    .single();

  if (!program) {
    redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`);
  }

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id);

  const hasActiveSub = (subs ?? []).some(
    (s: { status: string; expires_at: string | null }) =>
      s.status === "active" && isNotExpired(s.expires_at),
  );
  if (hasActiveSub) return user;

  const { data: grant } = await supabase
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id)
    .maybeSingle();
  if (grant && isNotExpired(grant.expires_at)) return user;

  if (!program.required_grade_id) return user;

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

  // 일반 회원 (sort_order >= 1 또는 로그인 유저) 기본 접근 허용
  if (!userGrade || userGrade.sort_order >= 1) {
    return user;
  }

  redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`);
}

/** 로그인한 사용자를 반환하되, 권한 검사 없이 사용자 여부만 확인한다 (API route에서 재사용). */
export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * requireProgramAccess()와 동일한 판정 로직이지만, API route handler에서
 * 쓸 수 있도록 redirect() 대신 결과 객체를 반환한다.
 */
export async function checkProgramAccessApi(): Promise<
  | { allowed: true; user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>> }
  | { allowed: false; error: string; status: number }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, error: "로그인이 필요합니다.", status: 401 };
  }

  const sb = supabase as unknown as SupabaseLike;

  const { data: suspendCheck } = await sb
    .from("profiles")
    .select("is_suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (suspendCheck?.is_suspended) {
    return { allowed: false, error: "계정이 정지되어 이용할 수 없습니다. 고객센터에 문의해주세요.", status: 403 };
  }

  const { data: program } = await sb
    .from("programs")
    .select("id, required_grade_id")
    .eq("slug", THIS_PROGRAM_SLUG)
    .eq("is_active", true)
    .single();

  if (!program) {
    return { allowed: false, error: "이용 중인 프로그램을 찾을 수 없습니다.", status: 403 };
  }

  const { data: subs } = await sb
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id);

  const hasActiveSub = (subs ?? []).some(
    (s: { status: string; expires_at: string | null }) =>
      s.status === "active" && isNotExpired(s.expires_at),
  );
  if (hasActiveSub) return { allowed: true, user };

  const { data: grant } = await sb
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id)
    .maybeSingle();
  if (grant && isNotExpired(grant.expires_at)) return { allowed: true, user };

  if (!program.required_grade_id) return { allowed: true, user };

  const { data: profile } = await sb
    .from("profiles")
    .select("grade:member_grades(sort_order)")
    .eq("id", user.id)
    .single();

  const { data: requiredGrade } = await sb
    .from("member_grades")
    .select("sort_order")
    .eq("id", program.required_grade_id)
    .single();

  const userGrade = Array.isArray(profile?.grade) ? profile?.grade[0] : profile?.grade;
  if (userGrade && requiredGrade && userGrade.sort_order >= requiredGrade.sort_order) {
    return { allowed: true, user };
  }

  // 일반 회원 (sort_order >= 1 또는 로그인 유저) 기본 접근 허용
  if (!userGrade || userGrade.sort_order >= 1) {
    return { allowed: true, user };
  }

  return { allowed: false, error: "AI 소싱 트렌드 발굴 이용 권한이 없습니다. 구독 후 이용해주세요.", status: 403 };
}

/**
 * 실제 비용이 발생하는 동작 1건을 usage_logs에 기록한다.
 * RLS insert 정책상 service role(admin client)로만 기록 가능하다.
 * 텔레메트리 성격이므로 기록 실패가 본 기능(리포트 생성 등)을 막아서는 안 된다.
 */
export async function logProgramUsage(params: {
  userId: string;
  action: string;
  quantity?: number;
  creditsUsed?: number;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
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
