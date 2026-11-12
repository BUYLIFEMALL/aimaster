import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { cookieDomainForHost } from "@/lib/supabase/cookieDomain";
import { deviceKindFromUserAgent } from "@/lib/session/deviceKind";

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

  // 같은 계정은 PC 1곳 + 모바일 1곳 (docs/PLAN_20261112_DEVICE_SLOT_LOGIN.md)
  // 같은 기기 종류의 예전 줄만 정리한다. 기기를 알 수 없거나(other) 예외 계정(관리자·시험)이면 정리하지 않는다.
  const kind = deviceKindFromUserAgent(req.headers.get("user-agent") || deviceInfo);
  const { data: exemptRow, error: exemptError } = await service
    .from("profiles")
    .select("concurrent_login_exempt")
    .eq("id", user.id)
    .maybeSingle();
  const exempt = !exemptError && exemptRow?.concurrent_login_exempt === true;

  if (kind !== "other" && !exempt) {
    const { data: rows } = await service
      .from("user_sessions")
      .select("id, device_info, last_active")
      .eq("user_id", user.id);
    type SessionRow = { id: string; device_info: string | null; last_active: string | null };
    const sameKind = ((rows ?? []) as SessionRow[]).filter((r) => deviceKindFromUserAgent(r.device_info) === kind);

    // 5분 이내 활성 세션 확인
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const active = sameKind.filter((r) => r.last_active && new Date(r.last_active).getTime() >= fiveMinAgo);

    if (active.length > 0 && policy === "block_new") {
      return NextResponse.json(
        { error: "이미 다른 기기에서 접속 중입니다. 기존 세션을 종료한 후 다시 시도해주세요." },
        { status: 409 }
      );
    }
    if (policy === "force_logout" && sameKind.length > 0) {
      // force_logout: 같은 기기 종류의 기존 세션만 삭제
      await service
        .from("user_sessions")
        .delete()
        .in("id", sameKind.map((r) => r.id));
    }
  }

  // 새 세션 생성
  const sessionToken = crypto.randomUUID();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;

  const baseRow = {
    user_id: user.id,
    session_token: sessionToken,
    device_info: deviceInfo,
    ip_address: ip,
  };
  let { error } = await service.from("user_sessions").insert({ ...baseRow, device_kind: kind });
  if (error && /device_kind/.test(error.message)) {
    // 운영 DB에 device_kind 칸이 아직 없을 때(마이그레이션 0069 전)
    ({ error } = await service.from("user_sessions").insert(baseRow));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 쿠키에 세션 토큰 저장
  const headerStore = await headers();
  const cookieDomain = cookieDomainForHost(headerStore.get("x-forwarded-host") ?? headerStore.get("host"));
  const cookieStore = await cookies();
  cookieStore.set("session_token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30일
    path: "/",
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });

  return NextResponse.json({ success: true });
}
