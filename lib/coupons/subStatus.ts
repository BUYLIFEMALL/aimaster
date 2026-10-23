// 쿠폰 사용 내역에 사용자의 구독 상태(sub_status)를 붙여주는 공용 로직.
// admin coupons GET/PUT, admin coupons 페이지(SSR)에서 공통으로 사용한다.

// Supabase 클라이언트의 제네릭 타입은 매우 깊게 중첩되어 있어(select 문자열 파싱 등),
// 이를 그대로 파라미터 타입으로 받으면 TS가 "Type instantiation is excessively deep" 오류를
// 낼 수 있다. from()의 반환값만 any로 느슨하게 받고 결과는 아래에서 직접 캐스팅한다.
type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

interface SubscriptionRow {
  user_id: string;
  program_id: string | null;
  status: string;
  expires_at: string | null;
}

interface UsageRow {
  user_id: string;
  [key: string]: unknown;
}

/**
 * 쿠폰 목록(coupon_usage, profiles JOIN 포함)에 사용자별 구독 활성 상태를 계산해 붙인다.
 * - 프로그램 지정 쿠폰: 해당 프로그램 구독만 확인
 * - 전체 프로그램 쿠폰(program_id null): 사용자의 구독 중 하나라도 활성이면 active로 간주
 * - status="active"이면서 만료일이 지나지 않은 구독만 "active"로 취급 (오래된 active 행이 섞여 있어도 안전)
 *
 * coupons는 Supabase의 select 결과(깊게 중첩된 제네릭 타입)를 그대로 받으므로
 * Record<string, unknown>[]로 느슨하게 받는다 — 호출부에서 (coupons ?? []) as unknown as Record<string, unknown>[] 로 넘긴다.
 */
export async function attachCouponUsageStatus(
  client: SupabaseLike,
  coupons: Record<string, unknown>[]
) {
  const usageUserIds = new Set<string>();
  for (const c of coupons) {
    const usage = c.coupon_usage as UsageRow[] | undefined;
    for (const u of usage ?? []) usageUserIds.add(u.user_id);
  }

  const subsByUserProgram: Record<string, SubscriptionRow[]> = {};
  const subsByUser: Record<string, SubscriptionRow[]> = {};

  if (usageUserIds.size > 0) {
    const { data: subs } = (await client
      .from("subscriptions")
      .select("user_id, program_id, status, expires_at")
      .in("user_id", Array.from(usageUserIds))) as { data: SubscriptionRow[] | null };

    for (const s of subs ?? []) {
      const upKey = `${s.user_id}_${s.program_id}`;
      (subsByUserProgram[upKey] ??= []).push(s);
      (subsByUser[s.user_id] ??= []).push(s);
    }
  }

  const now = new Date();

  function resolveSubStatus(programId: string | null, userId: string): "active" | "expired" | "none" {
    // program_id가 있는 쿠폰은 해당 프로그램 구독만, 전체 프로그램 쿠폰만 사용자의 아무 구독이나 참고
    const subs = programId ? subsByUserProgram[`${userId}_${programId}`] ?? [] : subsByUser[userId] ?? [];
    if (subs.length === 0) return "none";
    const activeSub = subs.find(
      (s) => s.status === "active" && (!s.expires_at || new Date(s.expires_at) > now)
    );
    return activeSub ? "active" : "expired";
  }

  return coupons.map((c) => {
    const programId = c.program_id as string | null;
    const usage = ((c.coupon_usage as UsageRow[] | undefined) ?? []).map((u) => ({
      ...u,
      sub_status: resolveSubStatus(programId, u.user_id),
    }));

    return {
      ...c,
      assigned_user: c.profiles ?? null,
      usage,
      profiles: undefined,
      coupon_usage: undefined,
    };
  });
}
