import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return profile?.is_admin ? user : null;
}

// 선택한 회원들에게 일괄 쿠폰 발행
export async function POST(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { userIds, type, value, program_id, max_uses, expires_at } = await req.json();

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "회원을 선택해주세요" }, { status: 400 });
  }
  if (!type) {
    return NextResponse.json({ error: "쿠폰 유형을 선택해주세요" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const created = [];
  const errors = [];

  for (const userId of userIds) {
    // 고유 코드 생성 (충돌 시 재시도)
    let code = generateCode();
    let retries = 0;
    while (retries < 5) {
      const { data, error } = await serviceClient.from("coupons").insert({
        code,
        type,
        value: type === "free" ? 0 : (value || 0),
        program_id: program_id || null,
        assigned_user_id: userId,
        max_uses: max_uses || 1,
        current_uses: 0,
        expires_at: expires_at || null,
        is_active: true,
      }).select("id, code").single();

      if (error) {
        if (error.code === "23505") {
          // 코드 중복 - 재생성
          code = generateCode();
          retries++;
          continue;
        }
        errors.push({ userId, error: error.message });
        break;
      } else {
        created.push({ userId, couponId: data.id, code: data.code });
        break;
      }
    }
  }

  return NextResponse.json({
    created: created.length,
    errors: errors.length,
    coupons: created,
    errorDetails: errors.length > 0 ? errors : undefined,
  });
}
