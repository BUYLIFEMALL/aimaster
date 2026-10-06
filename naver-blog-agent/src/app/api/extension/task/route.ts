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

    // 1. 토큰으로 사용자 확인 및 하트비트 갱신
    const { data: tokenRecord, error: tokenErr } = await admin
      .from("nba_extension_tokens")
      .select("user_id")
      .eq("token", token)
      .maybeSingle();

    if (tokenErr || !tokenRecord) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다. 다시 페어링해주세요." }, { status: 401 });
    }

    await admin
      .from("nba_extension_tokens")
      .update({ last_ping_at: new Date().toISOString() })
      .eq("token", token);

    // 2. 요청 본문(현재 활성화된 블로그 ID 등)
    const body = await req.json().catch(() => ({}));
    const { blogId } = body;

    // 3. 해당 사용자의 queued 상태인 글 1건 조회
    let query = admin
      .from("nba_posts")
      .select("*")
      .eq("user_id", tokenRecord.user_id)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1);

    if (blogId) {
      query = query.eq("blog_id", blogId);
    }

    const { data: posts, error: postErr } = await query;

    if (postErr || !posts || posts.length === 0) {
      return NextResponse.json({ task: null });
    }

    const task = posts[0];

    // 4. 상태를 publishing으로 업데이트
    await admin
      .from("nba_posts")
      .update({
        status: "publishing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    return NextResponse.json({
      task: {
        id: task.id,
        blogId: task.blog_id,
        category: task.category_name,
        title: task.title,
        article: task.content,
        tags: task.tags || [],
        images: task.images || [],
        isReserved: task.is_reserved || false,
        scheduledAt: task.scheduled_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
