import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "인증 필요", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "관리자 권한 필요", status: 403 };
  return { user };
}

/**
 * PATCH — 구독 1건을 중지/재개하거나 만료일을 연장한다.
 * action: "suspend"(status→cancelled) | "reactivate"(status→active) | "extend"(days만큼 연장)
 * 연장은 이미 지난 만료일(또는 지금)부터가 아니라 "현재 만료일"부터 더한다 — 아직 남은
 * 기간 위에 추가되는 게 자연스럽다(이미 만료된 구독을 연장하는 경우만 지금 시각 기준으로).
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { subscription_id, action, days } = await req.json();
    if (!subscription_id || !action)
      return NextResponse.json({ error: "subscription_id와 action 필수" }, { status: 400 });

    const service = createServiceClient();

    if (action === "suspend") {
      const { error } = await service
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("id", subscription_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "reactivate") {
      const { error } = await service
        .from("subscriptions")
        .update({ status: "active" })
        .eq("id", subscription_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "extend") {
      const extendDays = Number(days);
      if (!Number.isFinite(extendDays) || extendDays <= 0)
        return NextResponse.json({ error: "유효한 days 값이 필요합니다." }, { status: 400 });

      const { data: sub, error: fetchError } = await service
        .from("subscriptions")
        .select("expires_at")
        .eq("id", subscription_id)
        .single();
      if (fetchError || !sub)
        return NextResponse.json({ error: fetchError?.message ?? "구독을 찾을 수 없습니다." }, { status: 404 });

      // 평생(expires_at=null) 구독은 연장할 대상이 없다.
      if (sub.expires_at === null)
        return NextResponse.json({ error: "평생 이용권은 연장할 수 없습니다." }, { status: 400 });

      const base = new Date(sub.expires_at) > new Date() ? new Date(sub.expires_at) : new Date();
      const newExpiresAt = new Date(base.getTime() + extendDays * 24 * 60 * 60 * 1000);

      const { error } = await service
        .from("subscriptions")
        .update({ expires_at: newExpiresAt.toISOString(), status: "active" })
        .eq("id", subscription_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, expires_at: newExpiresAt.toISOString() });
    }

    return NextResponse.json({ error: "알 수 없는 action입니다." }, { status: 400 });
  } catch (err) {
    console.error("구독 관리 처리 실패:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
