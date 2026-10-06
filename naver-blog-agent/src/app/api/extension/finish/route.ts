import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim();

    if (!token) {
      return NextResponse.json({ error: "인증 토큰이 누락되었습니다." }, { status: 401 });
    }

    const admin = createAdminClient() as any;

    const { data: tokenRecord } = await admin
      .from("nba_extension_tokens")
      .select("user_id")
      .eq("token", token)
      .maybeSingle();

    if (!tokenRecord) {
      return NextResponse.json({ error: "인증 실패" }, { status: 401 });
    }

    const { taskId, success, postUrl, error } = await req.json();

    if (!taskId) {
      return NextResponse.json({ error: "taskId가 필요합니다." }, { status: 400 });
    }

    await admin
      .from("nba_posts")
      .update({
        status: success ? "published" : "failed",
        post_url: postUrl || null,
        error_message: error || null,
        published_at: success ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("user_id", tokenRecord.user_id);

    return NextResponse.json({ success: true, message: "발행 결과가 정상 반영되었습니다." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
