import { json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import { remove } from "@/lib/files";
import type { OutputItem } from "@/lib/bnc/types";
import { addCleanupCount, logCleanupUsage, ownerFromPath, type CleanupCounts } from "@/lib/cleanupUsageLog"; // 공용 기준 코드 cleanup-usage-log 사본(30일 정리 기록)

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 결과 기록 30일 자동 삭제(v1.14, 생성일 기준·즐겨찾기 포함 — 회원 생성 데이터 30일 규칙). Vercel cron(vercel.json, 매일 03:00 KST)이 부른다.
// 저장소 파일(결과·남은 입력)을 먼저 지우고 행을 지운다. 30건 개수 제한(api/run)은 그대로 둔다.
const BATCH = 500;
const MAX_ROUNDS = 20;

export async function GET(request: Request) {
  // 비밀값이 비어 있으면 「Bearer undefined」로 통과되는 사고를 막는다(docs/ERROR_LESSONS.md 2026-10-20).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  let rows = 0, files = 0;
  const counts: CleanupCounts = new Map();

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data: old, error } = await admin
      .from("banana_canvas_results").select("id, outputs, input_paths").lt("created_at", cutoff).limit(BATCH);
    if (error) return json({ error: error.message }, 500);
    if (!old?.length) break;
    const paths = old.flatMap((r) => [
      ...((r.outputs as OutputItem[] | null) ?? []).map((o) => o.path),
      ...((r.input_paths as string[] | null) ?? []),
    ]).filter(Boolean);
    for (let i = 0; i < paths.length; i += 100) await remove(paths.slice(i, i + 100));
    const { error: delErr } = await admin.from("banana_canvas_results").delete().in("id", old.map((r) => r.id as string));
    if (delErr) return json({ error: delErr.message }, 500);
    for (const r of old) {
      const rp = [...((r.outputs as OutputItem[] | null) ?? []).map((o) => o.path), ...((r.input_paths as string[] | null) ?? [])].filter(Boolean);
      addCleanupCount(counts, ownerFromPath(rp[0]), "images", rp.length);
    }
    rows += old.length;
    files += paths.length;
    if (old.length < BATCH) break;
  }
  const loggedOwners = await logCleanupUsage(admin, "banana-canvas", counts);
  return json({ ok: true, cutoff, rows, files, loggedOwners });
}
