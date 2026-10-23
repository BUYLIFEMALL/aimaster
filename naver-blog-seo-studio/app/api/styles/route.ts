import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { purgeExpiredStyles } from "@/lib/draftRetention";
import { fetchBlogStylePosts } from "@/lib/naverRss";
import { cleanSamples, parseBlogId, withStyleApproval } from "@/lib/style";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// BLC-08b (2026-10-22): 본인 문체 1단계 — 문체 자료 만들기(AI 호출 없음).
// 내 글 표본(40자 이상, 최대 10개) 또는 네이버 블로그 ID의 공개 RSS 최신 글 5/10개.
const COLUMNS = "id, name, blog_id, samples, posts, profile, approved_at, approval_hash, created_at, updated_at";

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const supabase = await createClient();
  await purgeExpiredStyles(supabase, access.user.id);
  const { data, error } = await supabase.from("naver_blog_seo_styles").select(COLUMNS)
    .eq("user_id", access.user.id).order("created_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: "내 문체 목록을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ styles: (data ?? []).map(withStyleApproval) });
}

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { name?: unknown; blog?: unknown; samples?: unknown; depth?: unknown } | null;
  const blogInput = typeof input?.blog === "string" ? input.blog.trim() : "";
  const blogId = blogInput ? parseBlogId(blogInput) : null;
  if (blogInput && !blogId) return NextResponse.json({ error: "네이버 블로그 주소 또는 블로그 ID를 확인해주세요. 예) https://blog.naver.com/아이디" }, { status: 400 });
  const samples = cleanSamples(input?.samples);
  if (!blogId && !samples.length) return NextResponse.json({ error: "블로그 주소를 입력하거나 40자 이상의 내 글 표본을 붙여 넣어주세요." }, { status: 400 });
  const depth = input?.depth === 5 ? 5 : 10;
  let name = typeof input?.name === "string" && input.name.trim() ? input.name.trim().slice(0, 60) : "내 문체";
  let posts: { title: string; link: string; text: string }[] = [];
  if (blogId) {
    try {
      const feed = await fetchBlogStylePosts(blogId, depth);
      posts = feed.posts;
      if (!(typeof input?.name === "string" && input.name.trim())) name = feed.name.slice(0, 60);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "블로그 글을 읽지 못했습니다." }, { status: 502 });
    }
  }
  const supabase = await createClient();
  await purgeExpiredStyles(supabase, access.user.id);
  const { data, error } = await supabase.from("naver_blog_seo_styles")
    .insert({ user_id: access.user.id, name, blog_id: blogId, samples, posts })
    .select(COLUMNS).single();
  if (error) return NextResponse.json({ error: "문체 자료를 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ style: withStyleApproval(data) });
}
