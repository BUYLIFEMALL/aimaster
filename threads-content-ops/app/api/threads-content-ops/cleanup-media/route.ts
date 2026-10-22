import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { cleanupUserContent } from "@/threads-content-ops/lib/contentCleanup";
import { cleanupUserMedia } from "@/threads-content-ops/lib/mediaCleanup";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/**
 * Threads 콘텐츠 운영 자동화 — 올린 지 30일 지난 이미지·영상 자동 삭제 (v1.59) + 만든 지 30일 지난 글감·보관함 글 삭제 (v1.76).
 * Vercel 크론이 하루 1회 호출한다(vercel.json). CRON_SECRET 환경변수가 있으면 Vercel이 `Authorization: Bearer <CRON_SECRET>`를 붙여 호출한다.
 * CRON_SECRET이 설정돼 있지 않으면 아무도 호출할 수 없게 막는다(회원은 화면을 열 때 본인 몫이 따로 정리된다).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  const bearer = request.headers.get("authorization");
  if (bearer !== `Bearer ${secret}` && request.nextUrl.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const counts = new Map<string, Record<string, number>>();
  const { data: accounts, error } = await service.from("tco_threads_accounts").select("user_id").limit(5000);
  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const userIds = [...new Set(((accounts ?? []) as { user_id: string }[]).map((account) => account.user_id))].slice(0, 500);
  let removed = 0;
  let postsUpdated = 0;
  let failed = 0;
  let viralDeleted = 0;
  let draftsDeleted = 0;
  for (const userId of userIds) {
    try {
      const result = await cleanupUserMedia(service, userId);
      removed += result.removed;
      postsUpdated += result.postsUpdated;
      const content = await cleanupUserContent(service, userId);
      viralDeleted += content.viral;
      draftsDeleted += content.posts;
      if (result.removed || content.viral || content.posts) counts.set(userId, { images: result.removed, posts: content.posts, ideas: content.viral });
    } catch {
      failed += 1;
    }
  }
  await logCleanup(service, counts);
  return NextResponse.json({ users: userIds.length, removed, postsUpdated, viralDeleted, draftsDeleted, failed, loggedOwners: counts.size });
}

// 30일 정리 기록(2026-10-23) — 회원별 usage_logs action `cleanup_expired`(메인 관리자 「30일 자동 정리」 표·「운영 상태」). 기록 실패해도 정리는 계속.
// images = 지운 이미지·영상 파일, posts = 보관함 글, ideas = 글감
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logCleanup(admin: any, counts: Map<string, Record<string, number>>) {
  try {
    if (!counts.size) return;
    const { data: program } = await admin.from("programs").select("id").eq("slug", "threads-content-ops").maybeSingle();
    if (!program) return;
    await admin.from("usage_logs").insert([...counts].map(([user_id, m]) => ({
      user_id, program_id: program.id, action: "cleanup_expired", quantity: Object.values(m).reduce((a, b) => a + b, 0), metadata: m,
    })));
  } catch (e) {
    console.error("[cleanup] usage_logs 기록 실패:", e);
  }
}
