import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeAiPrefs } from "@/lib/aiModelChoice";

// 회원별 글 AI 설정(플랫폼별 모델·마지막 플랫폼) — 기준: naver-blog-agent /api/generation-preferences(2026-11-08).
// 표(free_music_preferences)가 아직 없거나 읽기에 실패하면 기본값을 돌려준다(화면은 기본 모델로 계속 동작).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const TABLE = "free_music_preferences";
type Admin = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const db = createAdminClient() as unknown as Admin;
  const { data, error } = await db.from(TABLE).select("text_provider, ai_models").eq("user_id", access.user.id).maybeSingle();
  if (error) return NextResponse.json({ preferences: normalizeAiPrefs(null), saved: false });
  return NextResponse.json({ preferences: normalizeAiPrefs(data ? { textProvider: data.text_provider, models: data.ai_models } : null), saved: !!data });
}

export async function PUT(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => ({}));
  const prefs = normalizeAiPrefs({ textProvider: body?.textProvider, models: body?.models });
  const db = createAdminClient() as unknown as Admin;
  const { error } = await db
    .from(TABLE)
    .upsert({ user_id: access.user.id, text_provider: prefs.textProvider, ai_models: prefs.models, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "설정을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  return NextResponse.json({ success: true, preferences: prefs });
}
