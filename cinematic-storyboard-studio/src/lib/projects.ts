import "server-only";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

export const BUCKET = "storyboard-ai";

export interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  topic: string;
  lang: string;
  engine: string;
  status: "created" | "analyzed" | "rendered" | "prompts";
  ref_path: string | null;
  master_path: string | null;
  analysis: unknown;
  video_prompts: unknown;
  video_settings: unknown;
  created_at: string;
  updated_at: string;
}

const refPath = (userId: string, id: string) => `${userId}/${id}/ref.jpg`;
const masterPath = (userId: string, id: string) => `${userId}/${id}/master.jpg`;
export const paths = { ref: refPath, master: masterPath };

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** 본인 프로젝트만 돌려준다(없거나 남의 것이면 null) */
export async function getOwnedProject(userId: string, id: string): Promise<ProjectRow | null> {
  if (!isUuid(id)) return null;
  const { data } = await createAdminClient().from("storyboard_projects").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  return (data as ProjectRow | null) ?? null;
}

export async function uploadImage(path: string, buffer: Buffer, contentType = "image/jpeg"): Promise<boolean> {
  const { error } = await createAdminClient().storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
  return !error;
}

export async function downloadImage(path: string): Promise<Buffer | null> {
  const { data, error } = await createAdminClient().storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function signedUrl(path: string | null, seconds = 3600): Promise<string | null> {
  if (!path) return null;
  const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export async function removeFiles(paths: string[]): Promise<void> {
  if (paths.length) await createAdminClient().storage.from(BUCKET).remove(paths);
}

/** 참조 이미지: 회전 보정 후 긴 변 1600px 이내 JPEG로 정리 */
export async function normalizeReference(input: Buffer): Promise<Buffer> {
  return sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}

/** 마스터 이미지: 보관 용량을 줄이기 위해 긴 변 2400px 이내 JPEG로 저장 */
export async function normalizeMaster(input: Buffer): Promise<Buffer> {
  return sharp(input).resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
}
