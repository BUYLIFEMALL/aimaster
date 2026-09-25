import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연동 토큰이거나 이용 권한이 없습니다." }, { status: 401 });
  const { data, error } = await createServiceClient().from("naver_blog_seo_drafts")
    .select("id, topic, keywords, title, body, extension_handoff_at")
    .eq("user_id", user.userId).not("extension_handoff_at", "is", null)
    .order("extension_handoff_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: "웹 초안 목록을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ drafts: data ?? [] });
}
