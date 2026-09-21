import "server-only";

import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

export async function verifyExtensionToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const supabase = createServiceClient();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const { data: tokenRow } = await supabase
    .from("personal_access_tokens")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    // 기존 Web 확장 토큰도 새 SEO Studio API에서 계속 사용할 수 있도록 하위 호환한다.
    .in("program_slug", ["naver-blog-seo-studio", "naver-blog-auto-poster-web"])
    .is("revoked_at", null)
    .maybeSingle();
  if (!tokenRow) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, name, is_admin, is_suspended, grade_id, grade:member_grades(sort_order)")
    .eq("id", tokenRow.user_id)
    .maybeSingle();
  if (!profile || profile.is_suspended) return null;

  const { data: program } = await supabase
    .from("programs")
    .select("id, required_grade_id, badges")
    .eq("slug", "naver-blog-seo-studio")
    .eq("is_active", true)
    .maybeSingle();
  if (!program) return null;

  const isFree = (program.badges ?? []).includes("free");
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", tokenRow.user_id)
    .eq("program_id", program.id);
  const hasSubscription = (subscription ?? []).some((item) => item.status === "active" && (!item.expires_at || new Date(item.expires_at) > new Date()));
  const { data: grant } = await supabase
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", tokenRow.user_id)
    .eq("program_id", program.id)
    .maybeSingle();
  const hasGrant = Boolean(grant && (!grant.expires_at || new Date(grant.expires_at) > new Date()));
  const userGrade = Array.isArray(profile.grade) ? profile.grade[0] : profile.grade;
  const { data: requiredGrade } = program.required_grade_id
    ? await supabase.from("member_grades").select("sort_order").eq("id", program.required_grade_id).maybeSingle()
    : { data: null };
  const hasGrade = userGrade?.sort_order != null && requiredGrade?.sort_order != null && userGrade.sort_order >= requiredGrade.sort_order;
  if (!profile.is_admin && !isFree && !hasSubscription && !hasGrant && !hasGrade) return null;

  await supabase.from("personal_access_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tokenRow.id);
  return { userId: tokenRow.user_id, email: profile.email, name: profile.name };
}
