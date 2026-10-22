import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { normalizeStyle, profileHash, withStyleApproval } from "@/lib/style";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// BLC-08b (2026-10-22): 본인 문체 3단계 — 승인은 서버만 기록한다(승인 시각 + 프로필 지문). { revoke: true }면 승인을 푼다.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const input = await request.json().catch(() => null) as { revoke?: unknown } | null;
  const supabase = await createClient();
  const { data: style } = await supabase.from("naver_blog_seo_styles").select("id, profile")
    .eq("id", id).eq("user_id", access.user.id).maybeSingle();
  if (!style) return NextResponse.json({ error: "내 문체 자료를 찾지 못했습니다." }, { status: 404 });
  let update: Record<string, unknown>;
  if (input?.revoke === true) update = { approved_at: null, approval_hash: null };
  else {
    const profile = normalizeStyle(style.profile);
    if (!profile) return NextResponse.json({ error: "먼저 문체를 분석해주세요." }, { status: 400 });
    update = { approved_at: new Date().toISOString(), approval_hash: profileHash(profile) };
  }
  const { data, error } = await supabase.from("naver_blog_seo_styles")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", access.user.id)
    .select("id, name, blog_id, samples, posts, profile, approved_at, approval_hash, created_at, updated_at").single();
  if (error) return NextResponse.json({ error: "승인 상태를 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ style: withStyleApproval(data) });
}
