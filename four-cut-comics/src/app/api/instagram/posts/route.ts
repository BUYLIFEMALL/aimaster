import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberInstagramAccount, INSTA_CONNECT_URL } from "@/lib/instagram/memberAccount";
import { MAX_INSTA_CAPTION, validInstaPaths } from "@/lib/instagram/schedulerConfig";
import { insertPost, POSTS_TABLE, removeImages } from "@/lib/instagram/posting";
import { MAX_PENDING_PER_USER, validateScheduleTime } from "@/lib/instagram/schedule";
import { ensureMemberSchedulerRunning, memberCronjobKey, memberSchedulerMode, platformSchedulerEnabled } from "@/lib/instagram/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 인스타 게시 기록·예약 게시 — 공용 기준 코드 `insta-posts-route`(기준 ai-webtoon-studio, 사본 직접 수정 금지). 지침: 루트 docs/SCHEDULER_POLICY.md

/** 예약 전 확인: 회원이 고른 실행 방식이 준비됐는가. 「내 cron-job.org」면 본인 키를 돌려준다(예약 뒤 작업을 켜는 데 씀). */
async function checkScheduleReady(userId: string): Promise<{ error?: string; cronjobKey: string | null }> {
  const service = createAdminClient() as unknown as SupabaseClient;
  if ((await memberSchedulerMode(service, userId)) === "cronjob") {
    const key = await memberCronjobKey(service, userId);
    if (!key) return { cronjobKey: null, error: "「내 cron-job.org」 방식은 API 키가 필요합니다. 🔑 API키등록·플랫폼연동 → ⏰ 예약 발행에서 키를 등록하거나 AIMaster 기본(Vercel) 방식을 선택해 주세요." };
    return { cronjobKey: key };
  }
  if (!platformSchedulerEnabled()) return { cronjobKey: null, error: "이 사이트는 Vercel 예약 호출이 꺼져 있습니다. 🔑 API키등록·플랫폼연동 → ⏰ 예약 발행에서 「내 cron-job.org」를 선택하고 키를 등록해 주세요." };
  return { cronjobKey: null };
}

const COLUMNS = "id, title, caption, image_paths, page_count, status, scheduled_at, published_at, permalink, ig_username, error_message, created_at";

/** 한국 시간 6일 전 0시(UTC ISO) — 「최근 7일」 그래프의 시작(lib/weekChart/bucket.ts weekStartIso와 같은 계산, 이 사본을 쓰는 프로그램에 그 파일이 없을 수 있어 여기 둠) */
function weekStartIso(now = Date.now()): string {
  const KST = 9 * 3600_000;
  const k = new Date(now + KST);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - KST - 6 * 86400_000).toISOString();
}

/** GET — 내 인스타 게시 기록(최근 30일, 최신순 30건). ?week=1 이면 최근 7일 게시 완료만(게시 시각순, 최대 500건 — 7일 그래프용) */
export async function GET(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const base = createAdminClient().from(POSTS_TABLE).select(COLUMNS).eq("user_id", access.user.id);
  const week = new URL(request.url).searchParams.get("week") === "1";
  const { data, error } = week
    ? await base.eq("status", "published").gte("published_at", weekStartIso()).order("published_at", { ascending: false }).limit(500)
    : await base.order("created_at", { ascending: false }).limit(30);
  if (error) return NextResponse.json({ error: "게시 기록을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

/** POST — 예약 게시 등록. 사진은 미리 올려 둔 회원 폴더 경로(예약 시각까지 보관), 시각은 10분 뒤~60일 안 */
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const userId = access.user.id;
  const body = (await request.json().catch(() => ({}))) as { paths?: unknown; caption?: unknown; scheduledAt?: unknown };
  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === "string") : [];
  const caption = typeof body.caption === "string" ? body.caption.slice(0, MAX_INSTA_CAPTION) : "";
  const fail = async (error: string, status = 400, extra: Record<string, unknown> = {}) => {
    if (validInstaPaths(userId, paths)) await removeImages(paths);
    return NextResponse.json({ error, ...extra }, { status });
  };
  if (!validInstaPaths(userId, paths)) return NextResponse.json({ error: "예약할 사진 정보가 올바르지 않습니다. 다시 시도해주세요." }, { status: 400 });
  if (!caption.trim()) return fail("게시 문구(캡션)를 입력해 주세요.");
  const when = validateScheduleTime(body.scheduledAt);
  if (!when.ok) return fail(when.error);
  const account = await getMemberInstagramAccount(userId);
  if (!account) return fail("연결된 인스타그램 계정이 없습니다. INSTA 포스팅 자동화에서 한 번 연결해 주세요.", 400, { connectUrl: INSTA_CONNECT_URL, needConnect: true });
  if (account.expired) return fail("인스타그램 연결이 만료되었습니다. INSTA 포스팅 자동화에서 다시 연결해 주세요.", 400, { connectUrl: INSTA_CONNECT_URL, needConnect: true });
  const ready = await checkScheduleReady(userId);
  if (ready.error) return fail(ready.error);
  const { count } = await createAdminClient().from(POSTS_TABLE).select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "scheduled");
  if ((count ?? 0) >= MAX_PENDING_PER_USER) return fail(`대기 중인 예약이 ${MAX_PENDING_PER_USER}건이라 더 예약할 수 없습니다. 지난 예약이 게시되거나 취소한 뒤 다시 시도해 주세요.`);
  try {
    const id = await insertPost({ userId, paths, caption }, { status: "scheduled", scheduled_at: when.at.toISOString(), ig_username: account.username });
    // 「내 cron-job.org」 회원이면 작업을 켠다. 켜지 못하면 「예약됐는데 안 올라가는」 상태를 만들지 않도록 예약을 취소한다
    if (ready.cronjobKey) {
      try {
        await ensureMemberSchedulerRunning(createAdminClient() as unknown as SupabaseClient, userId, ready.cronjobKey);
      } catch (err) {
        await createAdminClient().from(POSTS_TABLE).update({ status: "canceled", updated_at: new Date().toISOString() }).eq("id", id).eq("status", "scheduled");
        return fail(`예약 실행 작업을 켜지 못해 예약을 취소했습니다. ${err instanceof Error ? err.message : ""}`.trim());
      }
    }
    return NextResponse.json({ success: true, id, scheduledAt: when.at.toISOString(), username: account.username });
  } catch {
    return fail("예약을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 500);
  }
}

/** DELETE — 예약 취소(아직 게시 전인 내 예약만). 올려 둔 사진도 지운다. */
export async function DELETE(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "취소할 예약을 찾지 못했습니다." }, { status: 400 });
  const { data } = await createAdminClient()
    .from(POSTS_TABLE)
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", access.user.id)
    .eq("status", "scheduled")
    .select("image_paths")
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "이미 게시 중이거나 끝난 예약이라 취소할 수 없습니다." }, { status: 409 });
  await removeImages(data.image_paths ?? []);
  return NextResponse.json({ success: true });
}
