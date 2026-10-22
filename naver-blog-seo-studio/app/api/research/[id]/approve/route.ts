import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { approvalHash, type GroundPoint } from "@/lib/grounding";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// BLC-08a (2026-10-22): 「자료부터 집필」 3단계 — 승인은 서버만 기록한다(남길 근거 선택 + 승인 시각 + 지문).
// 원고 생성 때 지문을 다시 계산해 승인 뒤 바뀐 근거로는 쓰지 않는다. { revoke: true }면 승인을 푼다.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const input = await request.json().catch(() => null) as { keep?: unknown; revoke?: unknown } | null;
  const supabase = await createClient();
  const { data: research } = await supabase.from("naver_blog_seo_research").select("id, points")
    .eq("id", id).eq("user_id", access.user.id).maybeSingle();
  if (!research) return NextResponse.json({ error: "내 자료를 찾지 못했습니다." }, { status: 404 });
  const current = (Array.isArray(research.points) ? research.points : []) as GroundPoint[];
  let update: Record<string, unknown>;
  if (input?.revoke === true) update = { approved_at: null, approval_hash: null };
  else {
    const keep = new Set((Array.isArray(input?.keep) ? input.keep : []).filter((v): v is number => Number.isInteger(v)));
    const points = current.map((p, i) => ({ ...p, kept: keep.has(i) }));
    if (!points.some((p) => p.kept)) return NextResponse.json({ error: "남길 근거를 1개 이상 골라주세요." }, { status: 400 });
    update = { points, approved_at: new Date().toISOString(), approval_hash: approvalHash(points) };
  }
  const { data, error } = await supabase.from("naver_blog_seo_research")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", access.user.id)
    .select("id, keyword, sources, points, angle, approved_at, approval_hash, created_at, updated_at").single();
  if (error) return NextResponse.json({ error: "승인 상태를 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ research: data });
}
