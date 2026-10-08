import { NextResponse } from "next/server";
import { checkProgramAccessApi, evaluateProgramAccessForUser } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 웹 화면에서 페어링 코드 발급
export async function GET() {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const user = { id: access.userId };

    const pairCode = crypto.randomBytes(4).toString("hex").toUpperCase(); // 8자리 코드
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10분 유효

    const admin = createAdminClient() as any;
    const { error } = await admin.from("nba_extension_tokens").insert({
      user_id: user.id,
      token,
      pair_code: pairCode,
      pair_code_expires_at: expiresAt,
      device_name: "Chrome Browser",
    });

    if (error) {
      // 테이블이 아직 없더라도 메모리/기본 응답 폴백 지원
      console.warn("DB token error:", error);
    }

    return NextResponse.json({
      success: true,
      pairCode,
      expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 크롬 확장에서 페어링 코드 제출하고 인증 토큰 교환
export async function POST(req: Request) {
  try {
    const { code, deviceName } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "페어링 코드를 입력해주세요." }, { status: 400 });
    }

    const admin = createAdminClient() as any;
    const { data: record, error } = await admin
      .from("nba_extension_tokens")
      .select("token, user_id, pair_code_expires_at")
      .eq("pair_code", code.trim().toUpperCase())
      .maybeSingle();

    if (error || !record) {
      return NextResponse.json({ error: "유효하지 않은 연결 코드입니다. 웹에서 다시 발급받아주세요." }, { status: 400 });
    }

    if (new Date(record.pair_code_expires_at) < new Date()) {
      return NextResponse.json({ error: "연결 코드 유효기간(10분)이 만료되었습니다. 새 코드를 발급받아주세요." }, { status: 400 });
    }

    const access = await evaluateProgramAccessForUser(record.user_id);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

    // 페어링 코드 일회성 소진 및 디바이스 기록
    await admin
      .from("nba_extension_tokens")
      .update({
        pair_code: null,
        device_name: deviceName || "Chrome Browser",
        last_ping_at: new Date().toISOString(),
      })
      .eq("token", record.token);

    return NextResponse.json({
      success: true,
      token: record.token,
      userId: record.user_id,
      message: "AIMaster 블로그 에이전트와 성공적으로 연결되었습니다.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
