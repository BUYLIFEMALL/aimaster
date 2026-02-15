import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return NextResponse.json({ error: "세션 없음" }, { status: 401 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("user_sessions")
    .update({ last_active: new Date().toISOString() })
    .eq("session_token", token)
    .select("id")
    .single();

  if (error || !data) {
    // 세션이 삭제됨 (다른 기기에서 접속으로 강제 종료)
    cookieStore.set("session_token", "", { maxAge: 0, path: "/" });
    return NextResponse.json({ error: "세션이 만료되었습니다" }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
