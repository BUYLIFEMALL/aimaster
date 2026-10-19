import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { formatPhoneNumber } from "@/lib/utils/format";
import { isValidPhone } from "@/lib/utils/phone";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * PUT — 관리자가 회원 정보(이름·핸드폰·이메일) 수정 (2026-10-19 주인님 지시: 잘못 입력한 회원 정보 바로잡기).
 * 이름·핸드폰 규칙은 회원 본인 수정(/api/user/profile)과 같다. 핸드폰은 비우면 미등록(null).
 * 이메일은 로그인 아이디(auth.users)이므로 auth를 먼저 바꾸고(확인 메일 없이 즉시), profiles 저장이 실패하면 auth를 되돌린다.
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { user_id, name, phone, email } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id 필수" }, { status: 400 });

    const cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    const rawPhone = typeof phone === "string" ? phone.trim() : "";
    if (rawPhone && !isValidPhone(rawPhone))
      return NextResponse.json({ error: "핸드폰 번호를 정확히 입력해주세요. (예: 010-1234-5678, 비우면 미등록)" }, { status: 400 });
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(cleanEmail)) return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });

    const service = createServiceClient();
    const { data: current, error: curErr } = await service.from("profiles").select("email").eq("id", user_id).single();
    if (curErr || !current) return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });

    const emailChanged = (current.email ?? "").toLowerCase() !== cleanEmail;
    if (emailChanged) {
      const { count } = await service.from("profiles").select("id", { count: "exact", head: true }).ilike("email", cleanEmail.replace(/[\\%_]/g, "\\$&")).neq("id", user_id); // _·% 를 글자 그대로 비교
      if ((count ?? 0) > 0) return NextResponse.json({ error: "이미 다른 회원이 쓰는 이메일입니다." }, { status: 409 });
      const { error: authErr } = await service.auth.admin.updateUserById(user_id, { email: cleanEmail, email_confirm: true });
      if (authErr) return NextResponse.json({ error: `로그인 이메일 변경 실패: ${authErr.message}` }, { status: 400 });
    }

    const { data, error } = await service
      .from("profiles")
      .update({ name: cleanName.slice(0, 50), phone: rawPhone ? formatPhoneNumber(rawPhone) : null, email: cleanEmail })
      .eq("id", user_id)
      .select("id, name, phone, email")
      .single();

    if (error) {
      if (emailChanged && current.email) {
        await service.auth.admin.updateUserById(user_id, { email: current.email, email_confirm: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, member: data, emailChanged });
  } catch (err) {
    console.error("회원 정보 수정 실패:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "회원 정보 수정 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
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
    if (alreadyGone) return { user_id: userId, success: true };

    // Admin API(GoTrue)가 원인 불명으로 실패하는 계정이 관찰되어(SQL로는 문제없이
    // 삭제/롤백 확인됨), public.admin_delete_user RPC(auth.users 직접 DELETE,
    // service_role 전용)로 한 번 더 시도한다.
    console.error(`회원 삭제 실패, RPC로 재시도 (${userId}):`, error.message);
    const { error: rpcError } = await service.rpc("admin_delete_user", { target_id: userId });
    if (rpcError) {
      console.error(`회원 삭제 RPC 재시도도 실패 (${userId}):`, rpcError.message);
      return { user_id: userId, success: false, error: rpcError.message };
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
