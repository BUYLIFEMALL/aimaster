import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 서버 보관함(선택 기능): 회원이 직접 켠 경우에만 "생성 결과"를 비공개 버킷에 저장한다. 원본 사진은 저장하지 않는다.
// 모든 쿼리는 service role로 실행되므로 반드시 user_id로 직접 거른다(멀티테넌시 원칙 2번).

export const BUCKET = "portrait-photo-files";
export const MAX_SAVED = 30;
/** 업로드 base64 한도(클라이언트가 JPEG ≤2048px로 줄여 보낸다). Vercel 본문 4.5MB 이하 */
export const MAX_SAVED_B64 = 3_000_000;
export const SIGNED_URL_SECONDS = 3600;
/** 보관 기간(일). 0 = 직접 삭제할 때까지 */
export const RETENTION_DAYS = [0, 7, 30, 90] as const;
export function normalizeRetention(v: unknown): number {
  return typeof v === "number" && (RETENTION_DAYS as readonly number[]).includes(v) ? v : 30;
}
export function expiresAtFor(days: number, now: Date = new Date()): string | null {
  return days > 0 ? new Date(now.getTime() + days * 86_400_000).toISOString() : null;
}

export interface SavedRow { id: string; path: string; purpose_label: string; aspect: string; model: string; bytes: number; created_at: string; expires_at: string | null }
export interface SavedItem { id: string; url: string | null; purposeLabel: string; aspect: string; model: string; bytes: number; createdAt: string; expiresAt: string | null }

const UUID = /^[0-9a-f-]{36}$/i;

/** 보관 기간이 지난 사진을 저장소와 목록에서 지운다(목록·저장 때마다 실행) */
export async function purgeExpired(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("portrait_photo_saved")
    .select("id, path")
    .eq("user_id", userId)
    .lt("expires_at", new Date().toISOString())
    .limit(200);
  const rows = (data ?? []) as { id: string; path: string }[];
  if (rows.length === 0) return 0;
  await admin.storage.from(BUCKET).remove(rows.map((r) => r.path));
  await admin.from("portrait_photo_saved").delete().eq("user_id", userId).in("id", rows.map((r) => r.id));
  return rows.length;
}

export async function listSaved(userId: string): Promise<SavedItem[]> {
  await purgeExpired(userId);
  const admin = createAdminClient();
  const { data } = await admin
    .from("portrait_photo_saved")
    .select("id, path, purpose_label, aspect, model, bytes, created_at, expires_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MAX_SAVED);
  const rows = (data ?? []) as SavedRow[];
  if (rows.length === 0) return [];
  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.path), SIGNED_URL_SECONDS);
  const urlByPath = new Map<string, string | null>((signed ?? []).map((s) => [s.path ?? "", s.signedUrl ?? null]));
  return rows.map((r) => ({
    id: r.id, url: urlByPath.get(r.path) ?? null, purposeLabel: r.purpose_label, aspect: r.aspect, model: r.model, bytes: r.bytes, createdAt: r.created_at, expiresAt: r.expires_at,
  }));
}

export async function saveImage(userId: string, o: { base64: string; mimeType: string; purposeLabel: string; aspect: string; model: string; retentionDays?: number }): Promise<{ id: string } | null> {
  const admin = createAdminClient();
  await purgeExpired(userId);
  const ext = o.mimeType === "image/png" ? "png" : o.mimeType === "image/webp" ? "webp" : "jpg";
  const buf = Buffer.from(o.base64, "base64");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const up = await admin.storage.from(BUCKET).upload(path, buf, { contentType: o.mimeType, upsert: false, cacheControl: "3600" });
  if (up.error) return null;
  const { data, error } = await admin
    .from("portrait_photo_saved")
    .insert({ user_id: userId, path, purpose_label: o.purposeLabel.slice(0, 40), aspect: o.aspect.slice(0, 8), model: o.model.slice(0, 40), bytes: buf.length, expires_at: expiresAtFor(normalizeRetention(o.retentionDays)) })
    .select("id")
    .single();
  if (error || !data) { await admin.storage.from(BUCKET).remove([path]); return null; }
  // 회원당 최대 개수 유지 — 오래된 것부터 정리
  const { data: old } = await admin
    .from("portrait_photo_saved")
    .select("id, path")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(MAX_SAVED, MAX_SAVED + 100);
  const extra = (old ?? []) as { id: string; path: string }[];
  if (extra.length) {
    await admin.storage.from(BUCKET).remove(extra.map((e) => e.path));
    await admin.from("portrait_photo_saved").delete().eq("user_id", userId).in("id", extra.map((e) => e.id));
  }
  return { id: data.id as string };
}

export async function deleteSaved(userId: string, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const admin = createAdminClient();
  const { data } = await admin.from("portrait_photo_saved").select("path").eq("user_id", userId).eq("id", id).maybeSingle();
  if (!data) return false;
  await admin.storage.from(BUCKET).remove([data.path as string]);
  const { error } = await admin.from("portrait_photo_saved").delete().eq("user_id", userId).eq("id", id);
  return !error;
}

export async function deleteAllSaved(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin.from("portrait_photo_saved").select("id, path").eq("user_id", userId).limit(500);
  const rows = (data ?? []) as { id: string; path: string }[];
  if (rows.length === 0) return 0;
  await admin.storage.from(BUCKET).remove(rows.map((r) => r.path));
  await admin.from("portrait_photo_saved").delete().eq("user_id", userId).in("id", rows.map((r) => r.id));
  return rows.length;
}
