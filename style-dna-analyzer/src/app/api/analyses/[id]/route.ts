import { NextResponse } from "next/server";
import { authorize } from "@/lib/dna/apiGuard";
import { BUCKET, toSignedRecord, UUID_RE } from "@/lib/dna/records";
import { appendTrend, cleanCheckSpots } from "@/lib/dna/checkSpots";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "분석 기록 주소가 올바르지 않습니다." }, { status: 400 });
  const supabase = await createClient();
  const { data } = await supabase.from("sda_analyses").select("*").eq("id", id).eq("user_id", gate.auth.user.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "분석 기록을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ record: await toSignedRecord(data) });
}

/**
 * v1.32: 결과 테스트 점검 지점 저장(본인 기록에만, 최대 8곳 — 값은 서버에서 다시 검사)
 * v1.34: `trendAdd`({at, avg, n})를 보내면 추세 기록(check_trend)에 한 점을 붙인다(최근 20개). check_trend 칸이 필요(마이그레이션 20261022_v1_34_check_trend.sql)
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "분석 기록 주소가 올바르지 않습니다." }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { checkSpots?: unknown; trendAdd?: unknown } | null;
  const supabase = await createClient();
  if (body && body.trendAdd && typeof body.trendAdd === "object") {
    const { data: row } = await supabase.from("sda_analyses").select("check_trend").eq("id", id).eq("user_id", gate.auth.user.id).maybeSingle();
    if (!row) return NextResponse.json({ error: "분석 기록을 찾을 수 없습니다." }, { status: 404 });
    const checkTrend = appendTrend(row.check_trend, { ...(body.trendAdd as Record<string, unknown>), at: new Date().toISOString() });
    const { error: trendError } = await supabase.from("sda_analyses").update({ check_trend: checkTrend }).eq("id", id).eq("user_id", gate.auth.user.id);
    if (trendError) return NextResponse.json({ error: "추세를 기록하지 못했습니다." }, { status: 500 });
    return NextResponse.json({ checkTrend });
  }
  if (!body || !Array.isArray(body.checkSpots)) return NextResponse.json({ error: "저장할 점검 지점이 없습니다." }, { status: 400 });
  const checkSpots = cleanCheckSpots(body.checkSpots);
  const { data, error } = await supabase
    .from("sda_analyses")
    .update({ check_spots: checkSpots, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", gate.auth.user.id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "점검 지점을 저장하지 못했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "분석 기록을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ checkSpots });
}

/** 기록과 저장된 원본 이미지를 함께 삭제한다(본인 폴더의 파일만). */
export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "분석 기록 주소가 올바르지 않습니다." }, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase.from("sda_analyses").select("image_path").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return NextResponse.json({ error: "분석 기록을 찾을 수 없습니다." }, { status: 404 });

  const { error } = await supabase.from("sda_analyses").delete().eq("id", id).eq("user_id", userId);
  if (error) return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 500 });

  const path = data.image_path as string;
  if (path.startsWith(`${userId}/`)) await createAdminClient().storage.from(BUCKET).remove([path]);
  return NextResponse.json({ success: true });
}
