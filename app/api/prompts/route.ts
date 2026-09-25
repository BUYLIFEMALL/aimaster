import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 프로그램별 공개 프롬프트 목록 조회 API (활성화된 항목만)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const programSlug = searchParams.get("program") || searchParams.get("program_slug");
  const category = searchParams.get("category");

  const serviceClient = createServiceClient();
  let query = serviceClient
    .from("program_prompts")
    .select("id, program_slug, category, title, prompt_text, description, tags, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (programSlug && programSlug !== "all") {
    query = query.or(`program_slug.eq.${programSlug},program_slug.eq.all`);
  }
  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ prompts: [] });
  }
  return NextResponse.json({ prompts: data ?? [] });
}
