import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const THIS_PROGRAM_SLUG = "threads-easy-planner";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://www.buylife.xyz";

function noAccessUrl(reason?: "suspended") {
  const productPage = `${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`;
  return reason ? `${productPage}?error=${reason}` : productPage;
}

function isNotExpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export async function requireProgramAccess() {
  const user = await requireUser();
  const supabase = (await createClient()) as unknown as SupabaseLike;


  const { data: suspendCheck } = await supabase
    .from("profiles")
    .select("is_suspended, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (suspendCheck?.is_suspended) {
    redirect(noAccessUrl("suspended"));
  }

  const { data: program } = await supabase
    .from("programs")
    .select("id, required_grade_id, badges")
    .eq("slug", THIS_PROGRAM_SLUG)
    .eq("is_active", true)
    .maybeSingle();

  if (!program) {
    // 아직 programs 테이블에 미등록 시 관리자는 통과
    if (suspendCheck?.is_admin) return user;
    redirect(noAccessUrl());
  }

  // 1. 관리자 및 FREE 배지 프로그램은 가입한 회원이면 누구나 통과
  if (suspendCheck?.is_admin || (program.badges ?? []).includes("free")) {
    return user;
  }

  // 2. 유료 구독 확인
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id);

  const hasActiveSub = (subs ?? []).some(
    (s: { status: string; expires_at: string | null }) => s.status === "active" && isNotExpired(s.expires_at)
  );
  if (hasActiveSub) return user;

  // 3. 개별 부여 권한 확인
  const { data: manualAccess } = await supabase
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id)
    .maybeSingle();

  if (manualAccess && isNotExpired(manualAccess.expires_at)) {
    return user;
  }

  // 4. 회원 등급 + 관리자 부여 사용기간 확인
  const { data: profile } = await supabase
    .from("profiles")
    .select("grade_id, program_access_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.grade_id && isNotExpired(profile.program_access_expires_at)) {
    return user;
  }

  redirect(noAccessUrl());
}
