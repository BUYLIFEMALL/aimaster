import { NextResponse } from "next/server";
import { BUCKET } from "@/lib/dna/records";
import { createAdminClient } from "@/lib/supabase/admin";
import { addCleanupCount, logCleanupUsage, ownerFromPath, type CleanupCounts } from "@/lib/cleanupUsageLog"; // 공용 기준 코드 cleanup-usage-log 사본(30일 정리 기록)

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 분석 기록·원본 이미지 30일 자동 삭제(v1.23, 생성일 기준). Vercel cron(vercel.json, 매일 03:00 KST)이 부른다.
// 저장소 파일을 먼저 지우고 행을 지운다(행이 지워지면 파일 위치를 알 수 없어서).
const BATCH = 500;
const MAX_ROUNDS = 20;

export async function GET(request: Request) {
  // 비밀값이 비어 있으면 「Bearer undefined」로 통과되는 사고를 막는다(docs/ERROR_LESSONS.md 2026-10-20).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  let rows = 0, files = 0;
  const counts: CleanupCounts = new Map();

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data: old, error } = await admin
      .from("sda_analyses")
      .select("id, image_path")
      .lt("created_at", cutoff)
      .limit(BATCH);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!old?.length) break;

    const paths = old.map((r) => r.image_path as string).filter(Boolean);
    for (let i = 0; i < paths.length; i += 100) {
      const { error: rmErr } = await admin.storage.from(BUCKET).remove(paths.slice(i, i + 100));
      if (rmErr) return NextResponse.json({ error: `storage remove failed: ${rmErr.message}` }, { status: 500 });
    }
    const { error: delErr } = await admin.from("sda_analyses").delete().in("id", old.map((r) => r.id as string));
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    for (const r of old) addCleanupCount(counts, ownerFromPath(r.image_path as string), "images");
    rows += old.length;
    files += paths.length;
    if (old.length < BATCH) break;
  }

  const loggedOwners = await logCleanupUsage(admin, "style-dna-analyzer", counts);
  return NextResponse.json({ ok: true, cutoff, rows, files, loggedOwners });
}
