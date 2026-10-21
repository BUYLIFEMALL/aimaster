import { createAdminClient } from "@/lib/supabase/server";
import { BUCKET, storagePathOf } from "@/lib/imageStorage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 생성 이미지 30일 자동 삭제(v1.23). Vercel cron(vercel.json, 매일 03:00 KST)이 부른다.
// 저장소 파일을 먼저 지우고 기록(usage_logs)을 지운다(기록이 지워지면 파일 위치를 알 수 없어서).
const AI_IMAGE_STUDIO_PROGRAM_ID = "26b9f0b2-b48b-4f9d-b751-ecb88e98e95e";
const BATCH = 500;
const MAX_ROUNDS = 20;

export async function GET(request: Request) {
  // 비밀값이 비어 있으면 「Bearer undefined」로 통과되는 사고를 막는다(docs/ERROR_LESSONS.md 2026-10-20).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  let rows = 0, files = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data: old, error } = await admin
      .from("usage_logs")
      .select("id, metadata")
      .eq("program_id", AI_IMAGE_STUDIO_PROGRAM_ID)
      .lt("created_at", cutoff)
      .limit(BATCH);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!old?.length) break;

    const paths = old.map((r) => storagePathOf(r.metadata)).filter((p): p is string => !!p);
    for (let i = 0; i < paths.length; i += 100) {
      const { error: rmErr } = await admin.storage.from(BUCKET).remove(paths.slice(i, i + 100));
      if (rmErr) return Response.json({ error: `storage remove failed: ${rmErr.message}` }, { status: 500 });
    }
    const { error: delErr } = await admin.from("usage_logs").delete().in("id", old.map((r) => r.id));
    if (delErr) return Response.json({ error: delErr.message }, { status: 500 });
    rows += old.length;
    files += paths.length;
    if (old.length < BATCH) break;
  }

  return Response.json({ ok: true, cutoff, rows, files });
}
