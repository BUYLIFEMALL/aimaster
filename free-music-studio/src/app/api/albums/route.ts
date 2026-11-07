import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALBUMS_TABLE, parseAlbumPrompt, parseAlbumTitle } from "@/lib/albums";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 내 앨범 목록·새 앨범(v1.35). 서비스 키로 읽으므로 user_id를 코드에서 직접 건다. 그림 파일은 회원 PC(엔진)에만.
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { data, error } = await createAdminClient()
    .from(ALBUMS_TABLE)
    .select("id, title, art_prompt, created_at")
    .eq("user_id", access.user.id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ albums: data ?? [] });
}

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null);
  const title = parseAlbumTitle(body?.title);
  if (!title.ok) return NextResponse.json({ error: title.error }, { status: 400 });
  const { data, error } = await createAdminClient()
    .from(ALBUMS_TABLE)
    .insert({ user_id: access.user.id, title: title.value, art_prompt: parseAlbumPrompt(body?.art_prompt) })
    .select("id, title, art_prompt, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ album: data });
}
