import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IMAGE_BUCKET } from "@/lib/we/types";
import { imagePathsIn } from "@/lib/we/util";
import { isInRetentionGrace, retentionCutoff, RETENTION_DAYS, RETENTION_GRACE_END } from "@/lib/retention";
import { exemptInFilter, loadRetentionExemptIds } from "@/lib/retentionExempt";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const TABLE = "ai_writing_editor_documents";
const DOCS_PER_RUN = 200;
const LIST_LIMIT = 1000;

// CRON_SECRET Bearer 인증. 비어 있으면 통과시키지 않는다.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

type Admin = ReturnType<typeof createAdminClient>;

async function listEntries(admin: Admin, prefix: string) {
  const { data, error } = await admin.storage.from(IMAGE_BUCKET).list(prefix, { limit: LIST_LIMIT });
  if (error) throw new Error(`목록 실패: ${error.message}`);
  return data ?? [];
}

async function removePaths(admin: Admin, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await admin.storage.from(IMAGE_BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw new Error(`파일 삭제 실패: ${error.message}`);
  }
}

/**
 * 2026-11-13 생성 문서 30일 자동 정리. 매일 1회(vercel.json).
 * 기존 「회원당 30개 초과 시 오래된 문서부터 삭제」(src/lib/documents.ts prune)는 그대로 두고 날짜 기준을 더한다.
 * ① 만든 지 30일 지난 문서 행을 지운다(예외 회원 제외).
 * ② 회원 폴더(<uid>/)의 이미지 중 남은 문서 어디에도 쓰이지 않으면서
 *    (30일 지났거나 ①에서 지운 문서에 들어 있던) 파일을 지운다.
 * 대상 아님: 말투 페르소나(persona_style_personas — 회원 설정), 키.
 * 로그·응답에는 개수만 남긴다.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isInRetentionGrace()) {
    return NextResponse.json({ skipped: "grace", graceEnd: RETENTION_GRACE_END, retentionDays: RETENTION_DAYS });
  }

  const admin = createAdminClient();
  const cutoff = retentionCutoff();
  let exempt: Set<string>;
  try {
    exempt = await loadRetentionExemptIds(admin);
  } catch {
    return NextResponse.json({ error: "자동 삭제 예외 회원 목록을 읽지 못해 정리를 멈췄습니다." }, { status: 503 });
  }
  const exemptFilter = exemptInFilter(exempt);
  const errors: string[] = [];
  let documentsDeleted = 0;
  let imagesDeleted = 0;
  const releasedPaths = new Set<string>(); // ①에서 지운 문서에 들어 있던 이미지 경로

  // ① 만료 문서
  let query = admin.from(TABLE).select("id, user_id, content").lt("created_at", cutoff);
  if (exemptFilter) query = query.not("user_id", "in", exemptFilter);
  const { data: expired, error: expiredError } = await query.limit(DOCS_PER_RUN);
  if (expiredError) errors.push(`${TABLE}: ${expiredError.message}`);

  for (const doc of expired ?? []) {
    const { error } = await admin.from(TABLE).delete().eq("id", doc.id).eq("user_id", doc.user_id);
    if (error) {
      errors.push(`${TABLE} 삭제: ${error.message}`);
      continue;
    }
    documentsDeleted += 1;
    for (const p of imagePathsIn(String(doc.content ?? ""), IMAGE_BUCKET)) {
      if (p.startsWith(`${doc.user_id}/`)) releasedPaths.add(p);
    }
  }

  // ② 쓰이지 않는 이미지
  try {
    for (const folder of await listEntries(admin, "")) {
      if (folder.id) continue; // 루트에 바로 놓인 파일은 이 앱이 만들지 않는다
      const userId = folder.name;
      if (exempt.has(userId)) continue;
      const files = (await listEntries(admin, userId)).filter((f) => f.id);
      if (!files.length) continue;
      const { data: docs, error } = await admin.from(TABLE).select("content").eq("user_id", userId);
      if (error) throw new Error(`${TABLE}: ${error.message}`);
      const referenced = new Set<string>();
      for (const d of docs ?? []) for (const p of imagePathsIn(String(d.content ?? ""), IMAGE_BUCKET)) referenced.add(p);
      const stale: string[] = [];
      for (const f of files) {
        const path = `${userId}/${f.name}`;
        if (referenced.has(path)) continue;
        const old = !!f.created_at && f.created_at < cutoff;
        if (old || releasedPaths.has(path)) stale.push(path);
      }
      await removePaths(admin, stale);
      imagesDeleted += stale.length;
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const result = { cutoff, retentionDays: RETENTION_DAYS, documentsDeleted, imagesDeleted };
  console.log("[cleanup-generated]", JSON.stringify(result), errors.length ? `errors=${errors.length}` : "");
  if (errors.length) return NextResponse.json({ ...result, errors }, { status: 500 });
  return NextResponse.json(result);
}
