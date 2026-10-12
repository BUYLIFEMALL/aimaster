import { createAdminClient } from "./supabase/admin";

export async function checkProgramAccess(userId: string, programSlug: string): Promise<boolean> {
  const admin = createAdminClient();

  // 1. 유저 정지 여부 확인
  const { data: userProfile } = await admin
    .from("profiles")
    .select("is_suspended")
    .eq("id", userId)
    .single();

  if (userProfile?.is_suspended) {
    return false;
  }

  // 2. 프로그램 정보 확인
  const { data: program } = await admin
    .from("programs")
    .select("id, is_active, badges")
    .eq("slug", programSlug)
    .single();

  if (!program || !program.is_active) {
    return false;
  }

  // 3. FREE 배지가 있는 프로그램은 가입 회원 누구나 무료 접근 허용
  const badges = (program.badges as string[]) || [];
  if (badges.includes("free") || badges.includes("FREE")) {
    return true;
  }

  // 4. 유저 권한/사용기간 확인
  const { data: access } = await admin
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", userId)
    .eq("program_id", program.id)
    .single();

  if (access && new Date(access.expires_at) > new Date()) {
    return true;
  }

  return false;
}
