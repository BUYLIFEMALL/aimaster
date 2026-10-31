import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { programAccessUserIds } from "@/lib/accessBatch";
import { collectRegion, notifyUser, Usage, THIS_PROGRAM_SLUG } from "@/lib/trades/collect";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const TIME_BUDGET_MS = 200_000; // 함수 제한 300초 안에서 알림까지 끝낼 여유를 둔다
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${THIS_PROGRAM_SLUG}.buylife.xyz`;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

// 5분마다 깨어나 회원이 고른 지역 중 차례가 된 곳만 받는다. 지역별로 하루 1회라 호출량은 회원 수와 무관하다.
async function dispatch() {
  const started = Date.now();
  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { data: watchRows, error } = await admin.from("commercial_land_watch").select("user_id, sgg_cd, sgg_nm").eq("is_active", true);
  if (error) throw new Error(error.message);
  const watches = (watchRows ?? []) as { user_id: string; sgg_cd: string; sgg_nm: string }[];
  const allUsers = Array.from(new Set(watches.map((w) => w.user_id)));
  if (!allUsers.length) return { regions: 0, notified: 0 };

  // 정지·핸드폰 미등록·권한 없는 회원의 지역은 수집·알림하지 않는다
  const { data: profiles } = await admin.from("profiles").select("id, is_admin, is_suspended, phone").in("id", allUsers);
  const usable = new Set(
    ((profiles ?? []) as { id: string; is_admin: boolean | null; is_suspended: boolean | null; phone: string | null }[])
      .filter((p) => !p.is_suspended && (p.is_admin || /^01[016789]\d{7,8}$/.test(String(p.phone ?? "").replace(/[^0-9]/g, ""))))
      .map((p) => p.id),
  );
  const allowed = await programAccessUserIds(admin, THIS_PROGRAM_SLUG, [...usable], now);
  const active = watches.filter((w) => allowed.has(w.user_id));

  const regions = new Map(active.map((w) => [w.sgg_cd, { sgg_cd: w.sgg_cd, sgg_nm: w.sgg_nm }]));
  const { data: states } = await admin.from("commercial_land_region_state").select("sgg_cd, next_due_at").in("sgg_cd", regions.size ? [...regions.keys()] : [""]);
  const dueAt = new Map(((states ?? []) as { sgg_cd: string; next_due_at: string | null }[]).map((s) => [s.sgg_cd, s.next_due_at]));
  const due = [...regions.values()]
    .filter((r) => {
      const at = dueAt.get(r.sgg_cd);
      return !at || new Date(at) <= now;
    })
    .sort((a, b) => (dueAt.get(a.sgg_cd) ?? "").localeCompare(dueAt.get(b.sgg_cd) ?? ""));

  const usage = await Usage.load(admin, now);
  const done: string[] = [];
  for (const region of due) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    await collectRegion(admin, region, usage, now);
    done.push(region.sgg_cd);
  }
  await usage.save();

  let notified = 0;
  const users = Array.from(new Set(active.filter((w) => done.includes(w.sgg_cd)).map((w) => w.user_id)));
  for (const userId of users) {
    if (Date.now() - started > 280_000) break;
    try {
      notified += await notifyUser(admin, userId, SITE_URL, now);
    } catch (err) {
      console.error("알림 실패:", err);
    }
  }
  return { regions: done.length, waiting: due.length - done.length, notified };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  try {
    return NextResponse.json(await dispatch());
  } catch (err) {
    console.error("수집 실패:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "수집 실패" }, { status: 500 });
  }
}

export const POST = GET;
