import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isInRetentionGrace, retentionCutoff, RETENTION_DAYS, RETENTION_GRACE_END } from "@/lib/retention";
import { exemptInFilter, loadRetentionExemptIds } from "@/lib/retentionExempt";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const TABLE = "tarot_readings";
const BUCKET = "tarot-card-images";
const READINGS_PER_RUN = 500;
const LIST_LIMIT = 1000;

// CRON_SECRET Bearer 인증. 비어 있으면 통과시키지 않는다.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

type Admin = ReturnType<typeof createAdminClient>;

/** 공개 주소에서 버킷 안 경로(<uid>/파일)를 꺼낸다 */
function pathFromUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  return path && !path.includes("..") ? path : null;
}

function imagePathsOf(cardImages: unknown): string[] {
  if (!cardImages || typeof cardImages !== "object") return [];
  return Object.values(cardImages as Record<string, unknown>).map(pathFromUrl).filter((p): p is string => !!p);
}

async function listEntries(admin: Admin, prefix: string) {
  const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: LIST_LIMIT });
  if (error) throw new Error(`목록 실패: ${error.message}`);
  return data ?? [];
}

async function removePaths(admin: Admin, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await admin.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw new Error(`파일 삭제 실패: ${error.message}`);
  }
}

/**
 * 2026-11-13 생성 자료 30일 자동 정리. 매일 1회(vercel.json).
 * ① 만든 지 30일 지난 리딩 행(tarot_readings)을 지운다(예외 회원 제외).
 * ② 카드 그림 버킷 회원 폴더(<uid>/)의 파일 중 남은 리딩 어디에도 쓰이지 않으면서
 *    (30일 지났거나 ①에서 지운 리딩에 들어 있던) 파일을 지운다.
 *    리딩으로 저장되지 않고 남은 그림도 30일이 지나면 함께 지워진다.
 * 메인 중앙 정리(app/api/cron/storage-retention)는 보관 연장 회원만 다루므로 일반 회원 정리는 여기서 한다.
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
  let readingsDeleted = 0;
  let imagesDeleted = 0;
  const releasedPaths = new Set<string>();

  // ① 만료 리딩
  let query = admin.from(TABLE).select("id, user_id, card_images").lt("created_at", cutoff);
  if (exemptFilter) query = query.not("user_id", "in", exemptFilter);
  const { data: expired, error: expiredError } = await query.limit(READINGS_PER_RUN);
  if (expiredError) errors.push(`${TABLE}: ${expiredError.message}`);

  const expiredRows = expired ?? [];
  for (let i = 0; i < expiredRows.length; i += 100) {
    const chunk = expiredRows.slice(i, i + 100);
    const { error } = await admin.from(TABLE).delete().in("id", chunk.map((r) => r.id));
    if (error) {
      errors.push(`${TABLE} 삭제: ${error.message}`);
      continue;
    }
    readingsDeleted += chunk.length;
    for (const r of chunk) {
      for (const p of imagePathsOf(r.card_images)) if (p.startsWith(`${r.user_id}/`)) releasedPaths.add(p);
    }
  }

  // ② 쓰이지 않는 카드 그림
  try {
    for (const folder of await listEntries(admin, "")) {
      if (folder.id) continue; // 루트에 바로 놓인 파일은 이 앱이 만들지 않는다
      const userId = folder.name;
      if (exempt.has(userId)) continue;
      const files = (await listEntries(admin, userId)).filter((f) => f.id);
      if (!files.length) continue;
      const { data: rows, error } = await admin.from(TABLE).select("card_images").eq("user_id", userId);
      if (error) throw new Error(`${TABLE}: ${error.message}`);
      const referenced = new Set<string>();
      for (const r of rows ?? []) for (const p of imagePathsOf(r.card_images)) referenced.add(p);
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

  const result = { cutoff, retentionDays: RETENTION_DAYS, readingsDeleted, imagesDeleted };
  console.log("[cleanup-generated]", JSON.stringify(result), errors.length ? `errors=${errors.length}` : "");
  if (errors.length) return NextResponse.json({ ...result, errors }, { status: 500 });
  return NextResponse.json(result);
}
