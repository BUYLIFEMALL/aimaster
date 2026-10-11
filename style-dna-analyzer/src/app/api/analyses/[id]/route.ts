import { NextResponse } from "next/server";
import { authorize } from "@/lib/dna/apiGuard";
import { BUCKET, toRecord, UUID_RE } from "@/lib/dna/records";
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
  return NextResponse.json({ record: toRecord(data) });
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
