import { NextResponse } from "next/server";
import { authorize } from "@/lib/chat/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { webViaStats, type Source } from "@/lib/chat/core";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** GET — 내 웹 검색 경로 통계(최근 30일 답변 기준): Tavily MCP 처리 / REST 대체 횟수 */
export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data, error } = await createAdminClient()
    .from("dcb_messages")
    .select("sources")
    .eq("user_id", gate.auth.user.id)
    .eq("role", "assistant")
    .gte("created_at", since)
    .limit(2000);
  if (error) return NextResponse.json({ error: "통계를 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json(webViaStats((data ?? []) as { sources: Source[] }[]));
}
