import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, purgeExpiredSaved } from "@/lib/saved";
import { logCleanupUsage } from "@/lib/cleanupUsageLog"; // 공용 기준 코드 cleanup-usage-log

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 서버 보관함 매일 정리(v1.25): 모든 회원 폴더(<user_id>/index.json)를 돌며 만료 작품(저장한 만료일 또는 만든 날 + 30일)을 지운다.
// 예전엔 그 회원이 목록을 열거나 저장할 때만 지워져, 접속하지 않는 회원 작품이 30일을 넘겨 남았다. Vercel cron(vercel.json, 매일 03:00 KST).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PAGE = 1000;
const MAX_PAGES = 10;

export async function GET(request: Request) {
  // 비밀값이 비어 있으면 「Bearer undefined」로 통과되는 사고를 막는다(docs/ERROR_LESSONS.md 2026-10-20).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const store = admin.storage.from(BUCKET);
  const counts = new Map<string, Record<string, number>>();
  let members = 0, removed = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await store.list("", { limit: PAGE, offset: page * PAGE });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const folders = (data ?? []).filter((f) => !f.id && UUID.test(f.name)).map((f) => f.name);
    for (const userId of folders) {
      const n = await purgeExpiredSaved(userId);
      removed += n;
      if (n > 0) counts.set(userId, { images: n });
      members += 1;
    }
    if ((data ?? []).length < PAGE) break;
  }
  await logCleanupUsage(admin, "four-cut-comics", counts);
  return NextResponse.json({ ok: true, members, removed, loggedOwners: counts.size });
}
