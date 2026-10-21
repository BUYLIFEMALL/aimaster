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
// v1.10: 렌더 결과는 매번 새 이름으로 올린다 — 동시에 끝난 옛 결과가 같은 파일을 덮어쓰지 않게(D-02-01)
export const newMasterPath = (userId: string, id: string) => `${userId}/${id}/master-${Date.now()}.jpg`;

/** 프로젝트 폴더(<user>/<project>/) 안의 파일을 모두 지운다 — 삭제·30일 정리용(이름이 바뀐 옛 마스터까지) */
export async function removeProjectFolder(userId: string, id: string): Promise<number> {
  const store = createAdminClient().storage.from(BUCKET);
  const { data } = await store.list(`${userId}/${id}`, { limit: 100 });
  const names = (data ?? []).filter((f) => f.id).map((f) => `${userId}/${id}/${f.name}`);
  if (names.length) await store.remove(names);
  return names.length;
}

/**
 * 렌더 선점(v1.10, D-02-01): 읽은 뒤 바뀌지 않았을 때만 updated_at을 새로 찍는다.
 * 같은 프로젝트에 동시에 들어온 두 번째 렌더는 여기서 null을 받아 유료 생성 전에 멈춘다. 성공하면 새 updated_at을 돌려준다.
 */
export async function claimProject(userId: string, id: string, expectedUpdatedAt: string): Promise<string | null> {
  const stamp = new Date().toISOString();
  const { data } = await createAdminClient()
    .from("storyboard_projects")
    .update({ updated_at: stamp })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("updated_at", expectedUpdatedAt)
    .select("updated_at")
    .maybeSingle();
  return data ? (data.updated_at as string) : null;
}

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
