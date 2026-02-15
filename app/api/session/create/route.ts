import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const deviceInfo = body.device_info ?? null;

  const service = createServiceClient();

  // 동시 접속 정책 확인
  const { data: setting } = await service
    .from("site_settings")
    .select("value")
    .eq("key", "concurrent_login_policy")
    .single();

  const policy = (setting?.value as string) ?? "force_logout";

  // 5분 이내 활성 세션 확인
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: activeSessions } = await service
    .from("user_sessions")
    .select("id")
    .eq("user_id", user.id)
    .gte("last_active", fiveMinAgo);

  if (activeSessions && activeSessions.length > 0) {
    if (policy === "block_new") {
      return NextResponse.json(
        { error: "이미 다른 기기에서 접속 중입니다. 기존 세션을 종료한 후 다시 시도해주세요." },
        { status: 409 }
      );
    }
    // force_logout: 기존 세션 삭제
    await service
      .from("user_sessions")
      .delete()
      .eq("user_id", user.id);
  }

  // 새 세션 생성
  const sessionToken = crypto.randomUUID();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;

  const { error } = await service.from("user_sessions").insert({
    user_id: user.id,
    session_token: sessionToken,
    device_info: deviceInfo,
    ip_address: ip,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 쿠키에 세션 토큰 저장
  const cookieStore = await cookies();
  cookieStore.set("session_token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30일
    path: "/",
  });

  return NextResponse.json({ success: true });
}
