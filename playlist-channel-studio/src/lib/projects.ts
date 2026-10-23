import "server-only";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectContent, ThumbSettings } from "@/lib/playlist/types";

export const BUCKET = "playlist-thumbs";

export interface ProjectRow {
  id: string;
  user_id: string;
  genre: string;
  title: string | null;
  titles: string[];
  content: ProjectContent;
  thumb_path: string | null;
  thumb_settings: Partial<ThumbSettings> | null;
  thumb_prompt: string | null;
  status: "created" | "titled" | "content";
  created_at: string;
  updated_at: string;
}

export const thumbPath = (userId: string, id: string) => `${userId}/${id}/thumb.jpg`;

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** 본인 프로젝트만 돌려준다(없거나 남의 것이면 null) */
export async function getOwnedProject(userId: string, id: string): Promise<ProjectRow | null> {
  if (!isUuid(id)) return null;
  const { data } = await createAdminClient().from("playlist_projects").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  return (data as ProjectRow | null) ?? null;
}

/** 본인 프로젝트의 일부 필드를 갱신한다(user_id 조건 포함) */
export async function updateOwnedProject(userId: string, id: string, patch: Record<string, unknown>): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("playlist_projects")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

export async function uploadImage(path: string, buffer: Buffer, contentType = "image/jpeg"): Promise<boolean> {
  const { error } = await createAdminClient().storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
  return !error;
}

export async function downloadForEdit(path: string): Promise<Buffer | null> {
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

/** 썸네일 배경: 16:9, 1280x720 JPEG로 정리해 보관 용량을 줄인다 */
export async function normalizeThumb(input: Buffer): Promise<Buffer> {
  return sharp(input).rotate().resize({ width: 1280, height: 720, fit: "cover", position: "centre" }).jpeg({ quality: 88 }).toBuffer();
}

/** 페르소나 참고 이미지: 긴 변 1280px 이내 JPEG */
export async function normalizePersona(input: Buffer): Promise<Buffer> {
  return sharp(input).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}

/** 화면에 내려줄 형태로 바꾼다(서명 URL 포함) */
export async function toClient(p: ProjectRow) {
  return {
    id: p.id,
    genre: p.genre,
    title: p.title,
    titles: p.titles ?? [],
    content: p.content ?? {},
    status: p.status,
    thumbUrl: await signedUrl(p.thumb_path),
    thumbSettings: p.thumb_settings ?? null,
    thumbPrompt: p.thumb_prompt,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}
