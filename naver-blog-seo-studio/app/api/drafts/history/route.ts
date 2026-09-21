import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("naver_blog_seo_drafts")
    .select("id, topic, keywords, strategy, title, body, seo_report, status, created_at")
    .eq("user_id", access.user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ error: "생성 기록을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ drafts: data ?? [] });
}
