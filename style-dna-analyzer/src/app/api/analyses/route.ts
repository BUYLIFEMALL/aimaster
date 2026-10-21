import { NextResponse } from "next/server";
import { authorize } from "@/lib/dna/apiGuard";
import { MAX_ANALYSES, signImagePaths, toSummary } from "@/lib/dna/records";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 내 보관함 목록(RLS + user_id 한정) */
export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sda_analyses")
    .select("id, title, mode, image_path, palette, created_at")
    .eq("user_id", gate.auth.user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_ANALYSES);
  if (error) return NextResponse.json({ error: "보관함을 불러오지 못했습니다." }, { status: 500 });
  const signed = await signImagePaths((data ?? []).map((r) => r.image_path as string));
  return NextResponse.json({ analyses: (data ?? []).map((r) => toSummary(r, signed)) });
}
