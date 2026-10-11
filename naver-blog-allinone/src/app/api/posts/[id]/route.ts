import { NextResponse } from "next/server";
import { authorize } from "@/lib/apiAccess";
import { BUCKET, imagePaths, removedImagePaths, sanitizePost } from "@/lib/blog/sanitize";
import { toSavedPost, UUID_RE } from "@/lib/blog/records";
import type { ImageSlot } from "@/lib/blog/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ id: string }> };
const SUPA = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "글 주소가 올바르지 않습니다." }, { status: 400 });
  const supabase = await createClient();
  const { data } = await supabase.from("aio_posts").select("*").eq("id", id).eq("user_id", gate.userId).maybeSingle();
  if (!data) return NextResponse.json({ error: "저장된 글을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ post: toSavedPost(data) });
}

/** 글 수정. 더 이상 쓰지 않는 내 이미지 파일은 함께 지운다. */
export async function PUT(request: Request, ctx: Ctx) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "글 주소가 올바르지 않습니다." }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const clean = sanitizePost(body, SUPA(), gate.userId);
  if (!clean.ok) return NextResponse.json({ error: clean.error }, { status: 400 });

  const supabase = await createClient();
  const { data: before } = await supabase.from("aio_posts").select("images").eq("id", id).eq("user_id", gate.userId).maybeSingle();
  if (!before) return NextResponse.json({ error: "저장된 글을 찾을 수 없습니다." }, { status: 404 });

  const v = clean.value;
  const { data, error } = await supabase
    .from("aio_posts")
    .update({
      title: v.title,
      summary: v.summary,
      article: v.article,
      tags: v.tags,
      settings: v.settings,
      images: v.images,
      review_status: v.reviewStatus,
      review_note: v.reviewNote,
      steps: v.steps,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", gate.userId)
    .select("*")
    .single();
  if (error || !data) return NextResponse.json({ error: "글을 저장하지 못했습니다." }, { status: 500 });

  const gone = removedImagePaths((before.images as ImageSlot[]) ?? [], v.images, SUPA(), gate.userId);
  if (gone.length) await createAdminClient().storage.from(BUCKET).remove(gone);
  return NextResponse.json({ post: toSavedPost(data) });
}

/** 글의 카테고리만 바꾼다(보관함에서 글 이동). categoryId가 비어 있으면 미분류로 둔다. */
export async function PATCH(request: Request, ctx: Ctx) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "글 주소가 올바르지 않습니다." }, { status: 400 });
  let body: { categoryId?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId.trim().slice(0, 80) : "";
  const supabase = await createClient();
  const { data } = await supabase.from("aio_posts").select("settings").eq("id", id).eq("user_id", gate.userId).maybeSingle();
  if (!data) return NextResponse.json({ error: "저장된 글을 찾을 수 없습니다." }, { status: 404 });
  const settings = { ...((data.settings as Record<string, unknown>) ?? {}) };
  if (categoryId) settings.categoryId = categoryId;
  else delete settings.categoryId;
  const { error } = await supabase.from("aio_posts").update({ settings }).eq("id", id).eq("user_id", gate.userId);
  if (error) return NextResponse.json({ error: "카테고리를 바꾸지 못했습니다." }, { status: 500 });
  return NextResponse.json({ success: true });
}

/** 글과 그 글의 이미지 파일을 함께 삭제한다(본인 폴더의 파일만). */
export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "글 주소가 올바르지 않습니다." }, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase.from("aio_posts").select("images").eq("id", id).eq("user_id", gate.userId).maybeSingle();
  if (!data) return NextResponse.json({ error: "저장된 글을 찾을 수 없습니다." }, { status: 404 });

  const { error } = await supabase.from("aio_posts").delete().eq("id", id).eq("user_id", gate.userId);
  if (error) return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 500 });

  const paths = imagePaths((data.images as ImageSlot[]) ?? [], SUPA(), gate.userId);
  if (paths.length) await createAdminClient().storage.from(BUCKET).remove(paths);
  return NextResponse.json({ success: true });
}
