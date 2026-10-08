import { NextResponse } from "next/server";
import { authenticateExtension, buildBridgePayload } from "@/lib/extensionBridge";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 크롬 확장이 발행 대기(queued) 원고 1건을 가져가는 경로 (확장 폴링)
export async function POST(req: Request) {
  try {
    const auth = await authenticateExtension(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { admin, userId, token } = auth;

    await admin.from("nba_extension_tokens").update({ last_ping_at: new Date().toISOString() }).eq("token", token);

    const body = await req.json().catch(() => ({}));
    const blogId = typeof body?.blogId === "string" ? body.blogId : "";

    let query = admin
      .from("nba_posts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1);
    if (blogId) query = query.eq("blog_id", blogId);

    const { data: posts, error: postErr } = await query;
    if (postErr || !posts || posts.length === 0) return NextResponse.json({ task: null });

    const row = posts[0];

    // 동시에 두 번 폴링해도 한 번만 가져가도록 queued일 때만 전환
    const { data: claimed } = await admin
      .from("nba_posts")
      .update({ status: "publishing", error_message: null, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("user_id", userId)
      .eq("status", "queued")
      .select("id");
    if (!claimed || claimed.length === 0) return NextResponse.json({ task: null });

    return NextResponse.json({
      task: {
        id: row.id,
        type: "publish",
        platform: "naver",
        blogId: row.blog_id,
        payload: buildBridgePayload(row),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
