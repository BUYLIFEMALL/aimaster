import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

// 「📁 내 템플릿 불러오기」(2026-10-21 v1.12) — AI Prompt 자동화 보관함(표 ai_prompt_templates)을 읽기만 한다.
// 프로그램끼리 서로 호출하지 않고 공용 DB 표를 직접 읽으며, 서비스 롤이므로 반드시 user_id로 거른다(본인 템플릿만).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await createAdminClient()
    .from("ai_prompt_templates")
    .select("id, title, description, content, category")
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: "내 템플릿을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}
