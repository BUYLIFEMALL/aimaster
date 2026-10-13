import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ImageSet, ImageVersion, Opt } from "@/lib/tmb/types";
import { MAX_VERSIONS } from "@/lib/tmb/types";
import { imagePath } from "@/lib/tmb/validate";

export const BUCKET = "thumbnail-master-images";
const SIGN_SECONDS = 60 * 60;

/** 모델 응답(PNG 등)을 4.5MB 응답 한도를 피하도록 JPEG(q90)로 바꾼다 */
export async function toJpeg(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes).flatten({ background: "#ffffff" }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

export async function saveImage(userId: string, projectId: string, opt: Opt, jpeg: Buffer): Promise<string> {
  const path = imagePath(userId, projectId, opt, randomUUID());
  const { error } = await createAdminClient().storage.from(BUCKET).upload(path, jpeg, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error("storage-upload");
  return path;
}

export async function readImage(path: string): Promise<Buffer | null> {
  const { data, error } = await createAdminClient().storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeImages(paths: string[]): Promise<void> {
  if (!paths.length) return;
  await createAdminClient().storage.from(BUCKET).remove(paths).catch(() => {});
}

/** 경로 → 1시간짜리 서명 URL */
export async function signUrls(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!paths.length) return out;
  const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrls(paths, SIGN_SECONDS);
  for (const r of data ?? []) if (r.path && r.signedUrl) out[r.path] = r.signedUrl;
  return out;
}

/** DB에서 읽은 값을 안전한 ImageSet으로 정리한다 */
export function cleanSet(raw: unknown): ImageSet {
  const r = (raw && typeof raw === "object" ? raw : {}) as { versions?: unknown; cur?: unknown };
  const versions: ImageVersion[] = (Array.isArray(r.versions) ? r.versions : [])
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object" && typeof (v as { path?: unknown }).path === "string")
    .map((v, i) => ({
      path: String(v.path), v: typeof v.v === "number" ? v.v : i + 1, at: String(v.at ?? ""),
      model: String(v.model ?? ""), ...(typeof v.instruction === "string" ? { instruction: v.instruction.slice(0, 300) } : {}),
    }));
  const cur = typeof r.cur === "number" && r.cur >= 0 && r.cur < versions.length ? r.cur : versions.length - 1;
  return { versions, cur };
}

/** 새 버전을 추가하고 현재 버전으로 만든다. 최근 MAX_VERSIONS개만 남기고 밀려난 경로를 돌려준다. */
export function pushVersion(set: ImageSet, ver: Omit<ImageVersion, "v">): { set: ImageSet; removed: string[] } {
  const v = (set.versions.reduce((m, x) => Math.max(m, x.v), 0)) + 1;
  const versions = [...set.versions, { ...ver, v }];
  const removed: string[] = [];
  while (versions.length > MAX_VERSIONS) {
    const old = versions.shift();
    if (old) removed.push(old.path);
  }
  return { set: { versions, cur: versions.length - 1 }, removed };
}
