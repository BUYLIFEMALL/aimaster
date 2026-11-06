import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 매일 03:40(한국 시간) 모든 회원의 30일 지난 대상·초대 기록을 지운다(관리자·시험 계정은 기한 9999라 남음).
// Vercel Cron이 Authorization: Bearer CRON_SECRET 으로 부른다. 회원 데이터에는 쓰지 않는 운영 정리 작업이다.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const db = createAdminClient();
  const { data, error } = await db.rpc("ncr_cleanup");
  const members = await db.rpc("ncr_member_cleanup"); // 모드 A-1 명단(2026-11-06)
  if (error || members.error) return Response.json({ error: "cleanup_failed" }, { status: 503 });
  return Response.json({ data: { ...(data as object), ...(members.data as object) } });
}
