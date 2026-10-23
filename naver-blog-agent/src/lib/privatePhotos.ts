import "server-only";
import { randomUUID } from "node:crypto";
import type { createAdminClient } from "@/lib/supabase/admin";
import { addCleanupCount, ownerFromPath, type CleanupCounts } from "./cleanupUsageLog";
import { MAX_PHOTO_BYTES, MAX_REVIEW_PHOTOS } from "./privatePhotoRules";
export { MAX_PHOTO_BYTES, MAX_REVIEW_PHOTOS } from "./privatePhotoRules";

export const PRIVATE_PHOTO_BUCKET = "nba-private-photos";
const LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const SIGNED_URL_SECONDS = 300;
const PAGE_SIZE = 1000;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PHOTO_PATH = new RegExp(`^(${UUID})/(${UUID})\\.(jpg|png|webp)$`, "i");
const OWNER_FOLDER = new RegExp(`^${UUID}$`, "i");
type PhotoAdmin = Pick<ReturnType<typeof createAdminClient>, "storage">;

export class PrivatePhotoError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export function assertOwnedPhotoPath(path: unknown, userId: string): asserts path is string {
  if (typeof path !== "string" || !PHOTO_PATH.test(path) || path.split("/")[0] !== userId) {
    throw new PrivatePhotoError("사진을 찾을 수 없습니다.", 404);
  }
}

function missingStorage(error: unknown): boolean {
  const value = error as { status?: number; statusCode?: string | number } | null;
  return value?.status === 404 || Number(value?.statusCode) === 404;
}

export async function requirePrivatePhotoBucket(admin: PhotoAdmin, allowMissing = false): Promise<boolean> {
  const { data, error } = await admin.storage.getBucket(PRIVATE_PHOTO_BUCKET);
  if (error || !data) {
    if (allowMissing && missingStorage(error)) return false;
    throw new PrivatePhotoError("비공개 사진 저장소를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
  }
  // service_role은 RLS를 우회하므로 버킷 설정도 매 요청 확인한다.
  if (data.public !== false) throw new PrivatePhotoError("사진 저장소의 비공개 설정 확인이 필요합니다.", 503);
  return true;
}

export function photoFormat(bytes: Uint8Array, mime: string): "jpg" | "png" | "webp" {
  const starts = (...values: number[]) => values.every((value, i) => bytes[i] === value);
  if (mime === "image/jpeg" && bytes.length >= 12 && starts(0xff, 0xd8, 0xff)) return "jpg";
  if (mime === "image/png" && bytes.length >= 24 && starts(137, 80, 78, 71, 13, 10, 26, 10)
    && Buffer.from(bytes.slice(12, 16)).toString("ascii") === "IHDR") return "png";
  if (mime === "image/webp" && bytes.length >= 16
    && Buffer.from(bytes.slice(0, 4)).toString("ascii") === "RIFF"
    && Buffer.from(bytes.slice(8, 12)).toString("ascii") === "WEBP") return "webp";
  throw new PrivatePhotoError("JPEG, PNG, WebP 사진만 등록할 수 있습니다. 파일 형식도 확인해 주세요.", 400);
}

export async function signPrivatePhotos(admin: PhotoAdmin, userId: string, paths: unknown, now = Date.now()) {
  const startedAt = Date.now();
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > MAX_REVIEW_PHOTOS) {
    throw new PrivatePhotoError("사진은 1~6장씩 확인할 수 있습니다.", 400);
  }
  for (const path of paths) assertOwnedPhotoPath(path, userId);
  await requirePrivatePhotoBucket(admin);
  const storage = admin.storage.from(PRIVATE_PHOTO_BUCKET);
  const result = [];
  for (const path of paths as string[]) {
    const { data, error } = await storage.info(path);
    if (error || !data) {
      throw new PrivatePhotoError(missingStorage(error) ? "사진을 찾을 수 없습니다." : "사진 정보를 확인하지 못했습니다.", missingStorage(error) ? 404 : 503);
    }
    const created = Date.parse(data.createdAt);
    if (!Number.isFinite(created) || created > now) throw new PrivatePhotoError("사진의 원래 등록일을 확인하지 못했습니다.", 503);
    const expires = created + LIFETIME_MS;
    // 최소 1초가 남지 않으면 주소 발급을 거부한다. 만료를 넘어서는 서명은 발급하지 않는다.
    const signingAt = now + (Date.now() - startedAt);
    const seconds = Math.min(SIGNED_URL_SECONDS, Math.floor((expires - signingAt) / 1000));
    if (seconds < 1) throw new PrivatePhotoError("보관 기간 30일이 지난 사진입니다. 원고의 사진을 확인해 주세요.", 410);
    const { data: signed, error: signError } = await storage.createSignedUrl(path, seconds);
    if (signError || !signed?.signedUrl) throw new PrivatePhotoError("사진 임시 주소를 발급하지 못했습니다.", 503);
    result.push({ storagePath: path, createdAt: new Date(created).toISOString(), expiresAt: new Date(expires).toISOString(),
      preview: { url: signed.signedUrl, expiresAt: new Date(signingAt + seconds * 1000).toISOString() } });
  }
  return result;
}

export async function uploadPrivatePhoto(admin: PhotoAdmin, userId: string, file: File) {
  if (!OWNER_FOLDER.test(userId)) throw new PrivatePhotoError("회원 정보를 확인하지 못했습니다.", 401);
  if (!file.size || file.size > MAX_PHOTO_BYTES) throw new PrivatePhotoError("사진은 파일당 4MB 이하로 등록해 주세요.", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length !== file.size) throw new PrivatePhotoError("사진 파일을 끝까지 읽지 못했습니다.", 400);
  const extension = photoFormat(bytes, file.type);
  await requirePrivatePhotoBucket(admin);
  const storagePath = `${userId}/${randomUUID()}.${extension}`;
  const { error } = await admin.storage.from(PRIVATE_PHOTO_BUCKET).upload(storagePath, bytes, {
    contentType: file.type, upsert: false, cacheControl: "0",
  });
  if (error) throw new PrivatePhotoError("사진을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
  // 정적 식별자만 반환한다. 미리보기는 별도 조회하므로 서명 실패 후 업로드 재시도로 복제되지 않는다.
  return { storagePath, mimeType: file.type, size: file.size };
}

/** 원고/검수 지문을 변경하지 않고 확장에 전달할 사본에서만 주소를 교체한다. */
export async function resolvePrivatePostPhotos<T extends { images?: unknown }>(admin: PhotoAdmin, userId: string, row: T): Promise<T> {
  if (!Array.isArray(row.images)) return row;
  const privateImages = row.images.filter(image => image && typeof image === "object" && "storagePath" in image);
  if (!privateImages.length) return row;
  const resolved = await signPrivatePhotos(admin, userId, privateImages.map(image => image.storagePath));
  const byPath = new Map(resolved.map(photo => [photo.storagePath, photo.preview.url]));
  return { ...row, images: row.images.map(image => image && typeof image === "object" && "storagePath" in image
    ? { ...image, url: byPath.get(image.storagePath) } : image) };
}

/** 전체 페이지를 먼저 읽고 삭제해 offset 변화로 인한 누락을 방지한다. */
// counts(2026-10-23, 선택): 실제로 지운 사진을 회원별로 센다(cron/cleanup의 usage_logs 정리 기록용)
export async function cleanupPrivatePhotos(admin: PhotoAdmin, dryRun: boolean, now = Date.now(), counts?: CleanupCounts) {
  if (!await requirePrivatePhotoBucket(admin, true)) return { configured: false, expired: 0, removed: 0 };
  const storage = admin.storage.from(PRIVATE_PHOTO_BUCKET);
  const folders: string[] = [];
  const expired: string[] = [];
  let invalidDates = 0;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await storage.list("", { limit: PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" } });
    if (error || !data) throw new PrivatePhotoError("사진 회원 폴더 정리 목록을 읽지 못했습니다.", 503);
    folders.push(...data.filter(item => !item.id && OWNER_FOLDER.test(item.name)).map(item => item.name));
    if (data.length < PAGE_SIZE) break;
  }
  for (const owner of folders) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await storage.list(owner, { limit: PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" } });
      if (error || !data) throw new PrivatePhotoError("사진 파일 정리 목록을 읽지 못했습니다.", 503);
      for (const file of data) {
        const path = `${owner}/${file.name}`;
        if (!file.id || !PHOTO_PATH.test(path)) continue;
        const created = Date.parse(file.created_at || "");
        if (!Number.isFinite(created)) { invalidDates++; continue; }
        if (created + LIFETIME_MS <= now) expired.push(path);
      }
      if (data.length < PAGE_SIZE) break;
    }
  }
  if (invalidDates) throw new PrivatePhotoError("등록일을 확인할 수 없는 사진이 있어 정리를 중단했습니다.", 503);
  let removed = 0;
  if (!dryRun) for (let i = 0; i < expired.length; i += 100) {
    const batch = expired.slice(i, i + 100);
    const { error } = await storage.remove(batch);
    if (error) throw new PrivatePhotoError("만료 사진 삭제를 완료하지 못했습니다. 다음 정리에서 다시 확인합니다.", 503);
    removed += batch.length;
    if (counts) for (const path of batch) addCleanupCount(counts, ownerFromPath(path), "photos");
  }
  return { configured: true, expired: expired.length, removed };
}
