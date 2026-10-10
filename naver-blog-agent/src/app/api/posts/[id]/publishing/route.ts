import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeNaverTags, parseNaverCategory, readNaverCategory, withNaverCategory } from "@/lib/naverPublishing";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
type Context = { params: Promise<{ id: string }> };

async function ownedPost(admin: any, userId: string, id: string) {
  return admin.from("nba_posts").select("id, blog_id, research_summary, status, tags")
    .eq("id", id).eq("user_id", userId).maybeSingle();
}

export async function GET(_req: Request, context: Context) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  if (!/^[\da-f-]{36}$/i.test(id)) return NextResponse.json({ error: "원고를 먼저 보관함에 저장해 주세요." }, { status: 400 });
  const admin: any = createAdminClient();
  const { data: post, error } = await ownedPost(admin, access.userId, id);
  if (error) return NextResponse.json({ error: "발행 설정을 불러오지 못했습니다." }, { status: 500 });
  if (!post) return NextResponse.json({ error: "본인 원고를 찾지 못했습니다." }, { status: 404 });
  const { data: account, error: accountError } = await admin.from("nba_accounts").select("default_category")
    .eq("user_id", access.userId).eq("blog_id", post.blog_id).maybeSingle();
  if (accountError) return NextResponse.json({ error: "블로그 기본 카테고리를 확인하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ userId: access.userId, blogId: post.blog_id,
    category: readNaverCategory(post.research_summary, post.blog_id), defaultCategory: account?.default_category || "", tags: normalizeNaverTags(post.tags) });
}

export async function PUT(req: Request, context: Context) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  if (!/^[\da-f-]{36}$/i.test(id)) return NextResponse.json({ error: "원고를 먼저 보관함에 저장해 주세요." }, { status: 400 });
  let body, category;
  try { body = await req.json(); category = parseNaverCategory(body.category); if (body.setDefault === true && !category) throw new Error("기본값으로 저장할 카테고리를 선택해 주세요."); }
  catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "설정을 확인해 주세요." }, { status: 400 }); }
  const admin: any = createAdminClient();
  const { data: post, error } = await ownedPost(admin, access.userId, id);
  if (error) return NextResponse.json({ error: "원고를 확인하지 못했습니다." }, { status: 500 });
  if (!post) return NextResponse.json({ error: "본인 원고를 찾지 못했습니다." }, { status: 404 });
  if (["queued", "publishing"].includes(post.status)) return NextResponse.json({ error: "대기를 취소한 뒤 발행 설정을 변경해 주세요." }, { status: 409 });
  if (body.tags !== undefined && !Array.isArray(body.tags)) return NextResponse.json({ error: "태그 목록 형식을 확인해 주세요." }, { status: 400 });
  const tags = normalizeNaverTags(body.tags === undefined ? post.tags : body.tags);
  const { data, error: saveError } = await admin.from("nba_posts")
    .update({ research_summary: withNaverCategory(post.research_summary, post.blog_id, category), tags, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", access.userId).not("status", "in", '("queued","publishing")').select("id");
  if (saveError) return NextResponse.json({ error: "카테고리를 저장하지 못했습니다." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "원고 상태가 변경됐습니다. 새로고침해 주세요." }, { status: 409 });
  if (body.setDefault === true) {
    const { data: defaults, error: defaultError } = await admin.from("nba_accounts").update({ default_category: category?.name || null, updated_at: new Date().toISOString() })
      .eq("user_id", access.userId).eq("blog_id", post.blog_id).select("id");
    if (defaultError || !defaults?.length) return NextResponse.json({ error: "원고 카테고리는 저장했지만 블로그 기본값을 저장하지 못했습니다. 블로그 계정 등록을 확인해 주세요." }, { status: 500 });
  }
  return NextResponse.json({ success: true, category, tags });
}
