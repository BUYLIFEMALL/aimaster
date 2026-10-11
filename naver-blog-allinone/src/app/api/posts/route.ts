import { NextResponse } from "next/server";
import { authorize } from "@/lib/apiAccess";
import { MAX_POSTS, sanitizePost } from "@/lib/blog/sanitize";
import { toSavedPost, toSummary } from "@/lib/blog/records";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 내 보관함 목록(RLS + user_id 한정) */
export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("aio_posts")
    .select("id, title, summary, article, images, review_status, created_at, updated_at")
    .eq("user_id", gate.userId)
    .order("updated_at", { ascending: false })
    .limit(MAX_POSTS);
  if (error) return NextResponse.json({ error: "보관함을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ posts: (data ?? []).map(toSummary) });
}

/** 새 글 저장 */
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const clean = sanitizePost(body, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", gate.userId);
  if (!clean.ok) return NextResponse.json({ error: clean.error }, { status: 400 });

  const supabase = await createClient();
  const { count } = await supabase.from("aio_posts").select("id", { count: "exact", head: true }).eq("user_id", gate.userId);
  if ((count ?? 0) >= MAX_POSTS) {
    return NextResponse.json({ error: `보관함은 ${MAX_POSTS}개까지 저장할 수 있습니다. 쓰지 않는 글을 삭제해주세요.` }, { status: 400 });
  }

  const v = clean.value;
  const { data, error } = await supabase
    .from("aio_posts")
    .insert({
      user_id: gate.userId,
      title: v.title,
      summary: v.summary,
      article: v.article,
      tags: v.tags,
      settings: v.settings,
      images: v.images,
      review_status: v.reviewStatus,
      review_note: v.reviewNote,
      steps: v.steps,
    })
    .select("*")
    .single();
  if (error || !data) return NextResponse.json({ error: "글을 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ post: toSavedPost(data) });
}
