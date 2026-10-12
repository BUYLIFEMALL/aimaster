import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReportForWatchlist } from "@/lib/reportEngine";

/** 핸드폰 번호 필수 정책(2026-10-12): 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않는다. 루트 lib/utils/phone.ts 와 같은 규칙. */
async function phoneRegisteredUserIds(client: unknown, userIds: string[]): Promise<Set<string>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return new Set();
  const { data } = await (client as { from: (t: string) => any }).from("profiles").select("id, is_admin, phone").in("id", ids); // eslint-disable-line @typescript-eslint/no-explicit-any
  return new Set(
    ((data ?? []) as { id: string; is_admin: boolean | null; phone: string | null }[])
      .filter((p) => p.is_admin || /^01[016789]\d{7,8}$/.test(String(p.phone ?? "").replace(/[^0-9]/g, "")))
      .map((p) => p.id)
  );
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// crm-google-form/stepmail/real_estate_sales/threads의 CRON_SECRET Bearer 인증 패턴을
// 그대로 재사용. vercel.json에 매일 스케줄로 등록한다.
function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * 활성 관심 목록 전체를 순회하며 리포트를 자동 생성한다. 회원 본인의 네이버/OpenAI/Gemini
 * 키로만 호출되므로(관리자 키 폴백 없음), 키를 등록하지 않은 회원은 자동으로 건너뛴다 —
 * 실패가 아니라 "정상적으로 대상이 아님"으로 취급한다.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: watchlists, error } = await admin
    .from("trend_watchlist")
    .select("id, user_id, category_name, naver_category_code, keywords")
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const details: { watchlistId: string; result: string }[] = [];

  const phoneOkUsers = await phoneRegisteredUserIds(admin, (watchlists ?? []).map((r: { user_id: string }) => r.user_id));
  for (const watchlist of (watchlists ?? []).filter((r: { user_id: string }) => phoneOkUsers.has(r.user_id))) {
    try {
      const result = await generateReportForWatchlist(admin, watchlist, { notify: true });
      if (result.ok) {
        generated++;
        details.push({ watchlistId: watchlist.id, result: "generated" });
      } else if (result.error === "네이버 API 키 미등록") {
        skipped++;
        details.push({ watchlistId: watchlist.id, result: "skipped: no naver key" });
      } else {
        failed++;
        details.push({ watchlistId: watchlist.id, result: `failed: ${result.error}` });
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : "unknown error";
      details.push({ watchlistId: watchlist.id, result: `failed: ${message}` });
      console.error(`[trending-product-finder cron] watchlist ${watchlist.id} 실패:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    total: (watchlists ?? []).length,
    generated,
    skipped,
    failed,
    details,
  });
}
