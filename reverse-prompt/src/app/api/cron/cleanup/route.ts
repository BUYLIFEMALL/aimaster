import { createAdminClient } from "@/lib/supabase/admin";
import { json } from "@/lib/aiRoute";
import { BUCKET, TEMP_TTL_MS } from "@/lib/rpa/media";
import { addCleanupCount, logCleanupUsage, type CleanupCounts } from "@/lib/cleanupUsageLog"; // 공용 기준 코드 cleanup-usage-log 사본(30일 정리 기록)

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 30일 자동 삭제(v1.11, 생성일 기준·즐겨찾기 포함 — 회원 생성 데이터 30일 규칙) + 1시간 지난 임시 파일 정리.
// Vercel cron(vercel.json, 매일 03:00 KST)이 부른다. 기록에는 원본 파일이 없고(썸네일만 행 안에) 임시 파일은 버킷에만 있다.
const BATCH = 500;
const MAX_ROUNDS = 20;

export async function GET(request: Request) {
  // 비밀값이 비어 있으면 「Bearer undefined」로 통과되는 사고를 막는다(docs/ERROR_LESSONS.md 2026-10-20).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let rows = 0;
  const counts: CleanupCounts = new Map();
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data: old, error } = await admin.from("reverse_prompt_history").select("id, user_id").lt("created_at", cutoff).limit(BATCH);
    if (error) return json({ error: error.message }, 500);
    if (!old?.length) break;
    const { error: delErr } = await admin.from("reverse_prompt_history").delete().in("id", old.map((r) => r.id as string));
    if (delErr) return json({ error: delErr.message }, 500);
    for (const r of old) addCleanupCount(counts, r.user_id as string, "history");
    rows += old.length;
    if (old.length < BATCH) break;
  }

  // 임시 파일: 회원 폴더마다 1시간 지난 파일(업로드 때만 정리되던 것을 매일 한 번 전체 정리)
  let files = 0;
  const store = admin.storage.from(BUCKET);
  const { data: folders } = await store.list("", { limit: 1000 });
  for (const f of folders ?? []) {
    if (f.id) continue; // 폴더만(파일은 id가 있음)
    const { data: items } = await store.list(f.name, { limit: 1000 });
    const stale = (items ?? []).filter((x) => x.created_at && Date.now() - new Date(x.created_at).getTime() > TEMP_TTL_MS).map((x) => `${f.name}/${x.name}`);
    for (let i = 0; i < stale.length; i += 100) await store.remove(stale.slice(i, i + 100));
    files += stale.length;
  }
  const loggedOwners = await logCleanupUsage(admin, "reverse-prompt", counts);
  return json({ ok: true, cutoff, rows, files, loggedOwners });
}
