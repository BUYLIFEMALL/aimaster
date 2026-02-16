import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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

// 쿠폰 목록 조회
export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const serviceClient = createServiceClient();
  const { data: coupons, error } = await serviceClient
    .from("coupons")
    .select("*, programs(name), profiles!assigned_user_id(name, email), coupon_usage(user_id, used_at, profiles(name, email))")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 사용된 쿠폰의 구독 상태를 확인하기 위해 구독 정보 조회
  const usageUserProgram: { user_id: string; program_id: string | null }[] = [];
  for (const c of coupons ?? []) {
    const usage = (c as Record<string, unknown>).coupon_usage as { user_id: string }[] | undefined;
    if (usage && usage.length > 0) {
      for (const u of usage) {
        usageUserProgram.push({ user_id: u.user_id, program_id: (c as Record<string, unknown>).program_id as string | null });
      }
    }
  }

  // 관련 구독 조회 (user_id 기준)
  const uniqueUserIds = Array.from(new Set(usageUserProgram.map((u) => u.user_id)));
  let subsByUserProgram: Record<string, { status: string; expires_at: string | null }[]> = {};
  let subsByUser: Record<string, { status: string; expires_at: string | null }[]> = {};
  if (uniqueUserIds.length > 0) {
    const { data: subs } = await serviceClient
      .from("subscriptions")
      .select("user_id, program_id, status, expires_at")
      .in("user_id", uniqueUserIds);
    if (subs) {
      for (const s of subs) {
        const upKey = `${s.user_id}_${s.program_id}`;
        if (!subsByUserProgram[upKey]) subsByUserProgram[upKey] = [];
        subsByUserProgram[upKey].push({ status: s.status, expires_at: s.expires_at });
        if (!subsByUser[s.user_id]) subsByUser[s.user_id] = [];
        subsByUser[s.user_id].push({ status: s.status, expires_at: s.expires_at });
      }
    }
  }

  // profiles → assigned_user, coupon_usage → usage로 매핑 + 구독 상태 추가
  const mapped = (coupons ?? []).map((c: Record<string, unknown>) => {
    const usage = ((c.coupon_usage as Record<string, unknown>[] | undefined) ?? []).map((u: Record<string, unknown>) => {
      const key = `${u.user_id}_${c.program_id}`;
      const subs = subsByUserProgram[key] || subsByUser[u.user_id as string] || [];
      const activeSub = subs.find((s) => s.status === "active");
      let subStatus: "active" | "expired" | "none" = "none";
      if (activeSub) {
        subStatus = (!activeSub.expires_at || new Date(activeSub.expires_at) > new Date()) ? "active" : "expired";
      } else if (subs.length > 0) {
        subStatus = "expired";
      }
      return { ...u, sub_status: subStatus };
    });

    return {
      ...c,
      assigned_user: c.profiles || null,
      usage,
      profiles: undefined,
      coupon_usage: undefined,
    };
  });
  return NextResponse.json(mapped);
}

// 쿠폰 생성
export async function POST(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const body = await req.json();
  const { code, type, value, program_id, max_uses, expires_at } = body;

  if (!code || !type) {
    return NextResponse.json({ error: "코드와 유형은 필수입니다" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient.from("coupons").insert({
    code: code.toUpperCase().trim(),
    type,
    value: value || 0,
    program_id: program_id || null,
    max_uses: max_uses || null,
    expires_at: expires_at || null,
    is_active: true,
    current_uses: 0,
  }).select("*, programs(name)").single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 존재하는 쿠폰 코드입니다" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// 쿠폰 수정
export async function PUT(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  if (updates.code) updates.code = updates.code.toUpperCase().trim();

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("coupons")
    .update(updates)
    .eq("id", id)
    .select("*, programs(name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 쿠폰 삭제
export async function DELETE(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from("coupons").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
