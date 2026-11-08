import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanBannedWords } from "@/lib/lyricRules";

// 금지어를 회원 계정에(백로그 A-4, 2026-11-08) — 표 free_music_preferences.banned_words. 표·칸이 없으면 빈 목록(화면은 계속 동작).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const TABLE = "free_music_preferences";
type Admin = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const db = createAdminClient() as unknown as Admin;
  const { data, error } = await db.from(TABLE).select("banned_words").eq("user_id", access.user.id).maybeSingle();
  if (error) return NextResponse.json({ words: [], saved: false });
  return NextResponse.json({ words: cleanBannedWords(data?.banned_words ?? []), saved: !!data });
}

export async function PUT(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => ({}));
  const words = cleanBannedWords(body?.words);
  const db = createAdminClient() as unknown as Admin;
  const { error } = await db
    .from(TABLE)
    .upsert({ user_id: access.user.id, banned_words: words, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "금지어를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  return NextResponse.json({ success: true, words });
}
