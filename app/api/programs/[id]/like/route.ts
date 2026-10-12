import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS = { "Cache-Control": "private, no-store" };

// 프로그램 추천(♥) 투표 토글. 로그인한 회원 본인 계정으로만, 회원 1명이 프로그램 1개에 1표(다시 누르면 취소).
// 표 수는 DB 트리거가 programs.like_count에 집계한다. 쓰기는 RLS(본인 행만)로 한 번 더 막힌다.
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "프로그램 주소가 올바르지 않습니다." }, { status: 400, headers: HEADERS });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers: HEADERS });

  const { data: profile } = await supabase.from("profiles").select("is_suspended").eq("id", user.id).maybeSingle();
  if (profile?.is_suspended) return NextResponse.json({ error: "정지된 계정은 추천할 수 없습니다." }, { status: 403, headers: HEADERS });

  const { data: program } = await supabase.from("programs").select("id").eq("id", id).eq("is_active", true).maybeSingle();
  if (!program) return NextResponse.json({ error: "프로그램을 찾을 수 없습니다." }, { status: 404, headers: HEADERS });

  const { data: existing } = await supabase.from("program_likes").select("program_id").eq("user_id", user.id).eq("program_id", id).maybeSingle();
  let liked: boolean;
  if (existing) {
    const { error } = await supabase.from("program_likes").delete().eq("user_id", user.id).eq("program_id", id);
    if (error) return NextResponse.json({ error: "추천을 취소하지 못했습니다." }, { status: 500, headers: HEADERS });
    liked = false;
  } else {
    const { error } = await supabase.from("program_likes").insert({ user_id: user.id, program_id: id });
    // 동시에 눌러 이미 들어간 경우(기본키 중복)는 추천된 상태로 본다
    if (error && error.code !== "23505") return NextResponse.json({ error: "추천하지 못했습니다." }, { status: 500, headers: HEADERS });
    liked = true;
  }

  const { data: counted } = await supabase.from("programs").select("like_count").eq("id", id).maybeSingle();
  return NextResponse.json({ liked, count: counted?.like_count ?? 0 }, { headers: HEADERS });
}
