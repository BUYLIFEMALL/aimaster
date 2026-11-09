import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { BUCKET, RETENTION_DAYS, type GenerationRow } from "@/lib/generations";
import { addCleanupCount, logCleanupUsage, type CleanupCounts } from "@/lib/cleanupUsageLog";
import { PROGRAM_SLUG } from "@/lib/access";
import { loadRetentionExemptIds, retentionExemptFilter } from "@/lib/retentionExempt"; // 30일 삭제 예외 회원(2026-11-03)
import { isOrphanUpload, isUuid, UPLOAD_FILE_NAME, type FolderFile } from "@/lib/uploadOrphans";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 30일 자동 삭제(최상위 규칙: 생성 데이터는 회원별 보관, 생성일 기준 30일 후 삭제). Vercel cron 매일 03:30 KST.
// 진행 중(running)인 행은 건드리지 않는다. 파일을 먼저 지우고 행을 지운다. 한 번에 최대 200건.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const exemptFilter = await retentionExemptFilter(admin); // 예외 회원(관리자·시험 계정)은 지우지 않는다. 못 읽으면 오류로 멈춤
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("avs_generations")
    .select("id, user_id, outputs, status, start_image, end_image")
    .lt("created_at", cutoff).not("user_id", "in", exemptFilter)
    .neq("status", "running")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Pick<GenerationRow, "id" | "user_id" | "outputs" | "status" | "start_image" | "end_image">[];
  const counts: CleanupCounts = new Map();
  let removed = 0;
  for (const row of rows) {
    const paths = [...(row.outputs ?? []).map((o) => o.path), row.start_image, row.end_image].filter((p): p is string => !!p);
    if (paths.length) {
      const { error: e } = await admin.storage.from(BUCKET).remove(paths);
      if (e) continue;
    }
    const { error: d } = await admin.from("avs_generations").delete().eq("id", row.id);
    if (d) continue;
    removed++;
    addCleanupCount(counts, row.user_id, "videos", Math.max(1, paths.length));
  }
  // v1.05 영상 합치기 편집본(avs_edits): 음성·완성 영상 파일을 먼저 지우고 행을 지운다
  const { data: edits } = await admin
    .from("avs_edits")
    .select("id, user_id, voice_paths, output_path")
    .lt("created_at", cutoff).not("user_id", "in", exemptFilter)
    .order("created_at", { ascending: true })
    .limit(200);
  let removedEdits = 0;
  for (const e of (edits ?? []) as { id: string; user_id: string; voice_paths: string[] | null; output_path: string | null }[]) {
    const paths = [...(e.voice_paths ?? []), e.output_path].filter((p): p is string => !!p);
    if (paths.length) {
      const { error: re } = await admin.storage.from(BUCKET).remove(paths);
      if (re) continue;
    }
    const { error: de } = await admin.from("avs_edits").delete().eq("id", e.id);
    if (de) continue;
    removedEdits++;
    addCleanupCount(counts, e.user_id, "videos", Math.max(1, paths.length));
  }
  // v1.19 내 프롬프트(avs_user_prompts): 만료(저장 30일)된 줄만 지운다. 표가 아직 없으면 건너뛴다
  const { data: prompts } = await admin
    .from("avs_user_prompts")
    .select("id, user_id")
    .lt("expires_at", new Date().toISOString()).not("user_id", "in", exemptFilter)
    .limit(1000);
  let removedPrompts = 0;
  const promptRows = (prompts ?? []) as { id: string; user_id: string }[];
  if (promptRows.length) {
    const { error: dp } = await admin.from("avs_user_prompts").delete().in("id", promptRows.map((p) => p.id));
    if (!dp) {
      removedPrompts = promptRows.length;
      for (const p of promptRows) addCleanupCount(counts, p.user_id, "prompts");
    }
  }
  // v1.28 본인 사용판 실행 기록(own_content_rights_log, V2·V5 공용 — video-to-gif 줄도 여기서): 30일 지난 줄만. 표가 아직 없으면 건너뛴다
  const { data: rights } = await admin
    .from("own_content_rights_log")
    .select("id, user_id")
    .lt("expires_at", new Date().toISOString()).not("user_id", "in", exemptFilter)
    .limit(1000);
  let removedRights = 0;
  const rightsRows = (rights ?? []) as { id: string; user_id: string }[];
  if (rightsRows.length) {
    const { error: dr } = await admin.from("own_content_rights_log").delete().in("id", rightsRows.map((r) => r.id));
    if (!dr) {
      removedRights = rightsRows.length;
      for (const r of rightsRows) addCleanupCount(counts, r.user_id, "logs");
    }
  }
  // v1.30 내 영상 올리기 중 멈춘 파일(보관함 줄 없음): 판정 규칙은 lib/uploadOrphans.ts. 예외 회원 폴더는 건드리지 않는다. 한 번에 최대 100개
  const exemptIds = await loadRetentionExemptIds(admin);
  let removedOrphans = 0;
  const { data: userDirs } = await admin.storage.from(BUCKET).list("", { limit: 1000 });
  for (const dir of (userDirs ?? []).filter((d) => d.id === null && isUuid(d.name) && !exemptIds.has(d.name))) {
    if (removedOrphans >= 100) break;
    const { data: subs } = await admin.storage.from(BUCKET).list(dir.name, { limit: 1000 });
    const folderIds = (subs ?? []).filter((s) => s.id === null && isUuid(s.name)).map((s) => s.name);
    if (!folderIds.length) continue;
    const { data: known, error: ke } = await admin.from("avs_generations").select("id").eq("user_id", dir.name).in("id", folderIds);
    if (ke) continue; // 줄을 못 읽으면 지우지 않는다
    const has = new Set(((known ?? []) as { id: string }[]).map((k) => k.id));
    for (const fid of folderIds) {
      if (has.has(fid) || removedOrphans >= 100) continue;
      const { data: files } = await admin.storage.from(BUCKET).list(`${dir.name}/${fid}`, { limit: 5 });
      if (!isOrphanUpload(fid, (files ?? []) as FolderFile[], false)) continue;
      const { error: re } = await admin.storage.from(BUCKET).remove([`${dir.name}/${fid}/${UPLOAD_FILE_NAME}`]);
      if (re) continue;
      removedOrphans++;
      addCleanupCount(counts, dir.name, "videos");
    }
  }
  const loggedUsers = await logCleanupUsage(admin, PROGRAM_SLUG, counts);
  return NextResponse.json({ ok: true, scanned: rows.length, removed, removedEdits, removedPrompts, removedRights, removedOrphans, loggedUsers });
}
