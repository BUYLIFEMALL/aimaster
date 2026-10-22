import { json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/images";
import { CLEANUP_ACTION, cleanupByUser, imagePathsOf, projectFolder, retentionCutoff } from "@/lib/tmb/retention";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// v1.19 프로젝트 30일 자동 삭제(생성일 기준 — 회원 생성 데이터 30일 규칙). Vercel Cron(vercel.json, 매일 03:50 KST)이 부른다.
// 이미지 폴더(`<회원>/<프로젝트>/`)를 먼저 지우고 행을 지운 뒤, 회원별 정리 기록(usage_logs cleanup_expired)을 남긴다. `?dry=1`은 미리보기(아무것도 안 지움).
const BATCH = 200;
const MAX_ROUNDS = 20;

export async function GET(request: Request) {
  // 비밀값이 비어 있으면 「Bearer undefined」로 통과되는 사고를 막는다(docs/ERROR_LESSONS.md 2026-10-20).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);
  const dryRun = new URL(request.url).searchParams.get("dry") === "1";
  const cutoff = retentionCutoff();
  const admin = createAdminClient();
  const storage = admin.storage.from(BUCKET);
  const done: { userId: string; images: number }[] = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data: old, error } = await admin
      .from("thumbnail_master_projects").select("id, user_id, images_a, images_b").lt("created_at", cutoff).limit(BATCH);
    if (error) return json({ error: error.message }, 500);
    if (!old?.length) break;
    for (const row of old) {
      const folder = projectFolder(row.user_id, row.id);
      const { data: files } = await storage.list(folder, { limit: 1000 });
      const paths = [...new Set([...imagePathsOf(row), ...(files ?? []).filter((f) => f.id !== null).map((f) => `${folder}/${f.name}`)])];
      if (!dryRun) {
        if (paths.length) {
          const { error: rmErr } = await storage.remove(paths);
          if (rmErr) return json({ error: rmErr.message, done: done.length }, 500);
        }
        const { error: delErr } = await admin.from("thumbnail_master_projects").delete().eq("id", row.id).eq("user_id", row.user_id);
        if (delErr) return json({ error: delErr.message, done: done.length }, 500);
      }
      done.push({ userId: row.user_id, images: paths.length });
    }
    if (dryRun || old.length < BATCH) break;
  }

  let loggedUsers = 0;
  if (!dryRun && done.length) {
    const { data: program } = await admin.from("programs").select("id").eq("slug", "thumbnail-master").maybeSingle();
    if (program) {
      for (const [userId, c] of Object.entries(cleanupByUser(done))) {
        const { error: logErr } = await admin.from("usage_logs").insert({
          user_id: userId, program_id: program.id, action: CLEANUP_ACTION, quantity: c.projects + c.images, credits_used: 0,
          metadata: { projects: c.projects, images: c.images },
        });
        if (!logErr) loggedUsers += 1;
      }
    }
  }
  const images = done.reduce((n, d) => n + d.images, 0);
  console.log(`[thumbnail-master cleanup] cutoff ${cutoff} projects ${done.length} images ${images} logged ${loggedUsers}${dryRun ? " (dry-run)" : ""}`);
  return json({ retentionDays: 30, cutoff, projects: done.length, images, loggedUsers, dryRun });
}
