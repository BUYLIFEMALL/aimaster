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

/** PATCH — 회원 정지 / 정지 해제 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { user_id, is_suspended, reason } = await req.json();
    if (!user_id || typeof is_suspended !== "boolean")
      return NextResponse.json({ error: "user_id와 is_suspended 필수" }, { status: 400 });

    if (user_id === auth.user.id && is_suspended) {
      return NextResponse.json({ error: "본인 계정은 정지할 수 없습니다." }, { status: 400 });
    }

    const service = createServiceClient();
    const { error } = await service
      .from("profiles")
      .update({
        is_suspended,
        suspended_at: is_suspended ? new Date().toISOString() : null,
        suspended_reason: is_suspended ? (reason ?? null) : null,
      })
      .eq("id", user_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("회원 정지 처리 실패:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "정지 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

interface DeleteOneResult {
  user_id: string;
  success: boolean;
  error?: string;
}

/**
 * 회원 1명 삭제를 시도한다 (재무/추천 이력이 있으면 보호를 위해 차단).
 * profiles(id) 참조 FK 중 ON DELETE CASCADE가 아닌 테이블 전부 — payment_records,
 * subscriptions, settlement_requests, affiliate_earnings.referrer_id,
 * profiles.referred_by(다른 회원이 이 회원을 추천인으로 등록한 경우) — 를 확인해야
 * 실제 삭제 시도 시 FK 위반으로 500이 나는 것을 미리 막을 수 있다.
 */
async function deleteOneMember(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<DeleteOneResult> {
  const [
    { count: paymentCount },
    { count: subCount },
    { count: settlementCount },
    { count: affiliateEarningCount },
    { count: referredCount },
  ] = await Promise.all([
    service.from("payment_records").select("id", { count: "exact", head: true }).eq("user_id", userId),
    service.from("subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    service.from("settlement_requests").select("id", { count: "exact", head: true }).eq("user_id", userId),
    service.from("affiliate_earnings").select("id", { count: "exact", head: true }).eq("referrer_id", userId),
    service.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId),
  ]);

  if (
    (paymentCount ?? 0) > 0 ||
    (subCount ?? 0) > 0 ||
    (settlementCount ?? 0) > 0 ||
    (affiliateEarningCount ?? 0) > 0 ||
    (referredCount ?? 0) > 0
  ) {
    return {
      user_id: userId,
      success: false,
      error: "결제·구독·정산·추천 이력이 있어 삭제할 수 없습니다. 정지를 이용해주세요.",
    };
  }

  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) {
    // 이미 삭제된 사용자를 다시 삭제 시도하는 경우(중복 클릭 등)는 결과적으로
    // 목표(계정 없음)를 달성한 상태이므로 성공으로 취급한다.
    const alreadyGone = /not.*found/i.test(error.message);
    if (!alreadyGone) {
      console.error(`회원 삭제 실패 (${userId}):`, error.message);
      return { user_id: userId, success: false, error: error.message };
    }
  }
  return { user_id: userId, success: true };
}

/** DELETE — 회원 삭제 (단건: user_id, 다건: user_ids 배열) */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const targetIds: string[] = Array.isArray(body.user_ids)
      ? body.user_ids
      : body.user_id
        ? [body.user_id]
        : [];

    if (targetIds.length === 0)
      return NextResponse.json({ error: "user_id 또는 user_ids 필수" }, { status: 400 });

    if (targetIds.includes(auth.user.id)) {
      return NextResponse.json({ error: "본인 계정은 삭제할 수 없습니다." }, { status: 400 });
    }

    const service = createServiceClient();
    const results = await Promise.all(targetIds.map((id) => deleteOneMember(service, id)));

    // 단건 요청은 기존 클라이언트 호환을 위해 success/error 형태로도 반환한다.
    if (!Array.isArray(body.user_ids)) {
      const [result] = results;
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 409 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: results.every((r) => r.success), results });
  } catch (err) {
    console.error("회원 삭제 처리 실패:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "삭제 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
