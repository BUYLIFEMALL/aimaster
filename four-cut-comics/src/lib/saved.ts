import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { addToIndex, expiresAtFor, isSavedId, normalizeRetention, parseIndex, splitExpired } from "@/lib/comic/savedIndex";
import type { SavedMeta } from "@/lib/comic/savedIndex";
import type { Script } from "@/lib/comic/script";

// 서버 보관함(선택 기능, v1.05): 회원이 [서버 보관함에 저장]을 누른 완성작만 비공개 버킷에 저장한다.
// DB 테이블 없이 `<userId>/index.json`(목록)과 `<userId>/<id>.jpg`(이미지)를 쓴다. 버킷은 비공개라
// service role(서버)만 접근하고, 모든 경로는 로그인 회원의 user.id 폴더로만 만든다(멀티테넌시 원칙 2번).

export const BUCKET = "four-cut-comics-files";
/** 업로드 base64 한도(클라이언트가 JPEG 긴 변 1400px로 줄여 보낸다). Vercel 본문 4.5MB 이하 */
export const MAX_SAVED_B64 = 3_000_000;
const SIGNED_URL_SECONDS = 3600;

export interface SavedItem extends Omit<SavedMeta, "script"> { url: string | null; script: Script }

const indexPath = (userId: string) => `${userId}/index.json`;
const imagePath = (userId: string, id: string) => `${userId}/${id}.jpg`;

async function readIndex(userId: string): Promise<SavedMeta[]> {
  const { data, error } = await createAdminClient().storage.from(BUCKET).download(indexPath(userId));
  if (error || !data) return [];
  try { return parseIndex(JSON.parse(await data.text())); } catch { return []; }
}

async function writeIndex(userId: string, list: SavedMeta[]): Promise<boolean> {
  const body = Buffer.from(JSON.stringify(list), "utf8");
  const { error } = await createAdminClient().storage.from(BUCKET).upload(indexPath(userId), body, { contentType: "application/json", upsert: true, cacheControl: "0" });
  return !error;
}

async function removeImages(userId: string, ids: string[]) {
  if (ids.length) await createAdminClient().storage.from(BUCKET).remove(ids.map((id) => imagePath(userId, id)));
}

/** 만료된 항목을 지운 뒤의 목록 */
async function liveIndex(userId: string): Promise<SavedMeta[]> {
  const list = await readIndex(userId);
  const { keep, expired } = splitExpired(list);
  if (expired.length) { await removeImages(userId, expired.map((m) => m.id)); await writeIndex(userId, keep); }
  return keep;
}

export async function listSaved(userId: string): Promise<SavedItem[]> {
  const list = await liveIndex(userId);
  if (!list.length) return [];
  const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrls(list.map((m) => imagePath(userId, m.id)), SIGNED_URL_SECONDS);
  const urlByPath = new Map<string, string | null>((data ?? []).map((s) => [s.path ?? "", s.signedUrl ?? null]));
  return list.map((m) => ({ ...m, url: urlByPath.get(imagePath(userId, m.id)) ?? null }));
}

export async function saveComic(userId: string, o: {
  base64: string; title: string; episode: number; panelCount: number; aspect: string; styleId: string; script: Script; retentionDays: unknown;
}): Promise<{ id: string; dropped: number } | null> {
  const id = crypto.randomUUID();
  const buf = Buffer.from(o.base64, "base64");
  const up = await createAdminClient().storage.from(BUCKET).upload(imagePath(userId, id), buf, { contentType: "image/jpeg", upsert: false, cacheControl: "3600" });
  if (up.error) return null;
  const meta: SavedMeta = {
    id, title: o.title.slice(0, 80), episode: o.episode, panelCount: o.panelCount, aspect: o.aspect.slice(0, 8), styleId: o.styleId.slice(0, 40),
    script: o.script, bytes: buf.length, createdAt: new Date().toISOString(), expiresAt: expiresAtFor(normalizeRetention(o.retentionDays)),
  };
  const { keep, drop } = addToIndex(await liveIndex(userId), meta);
  if (!(await writeIndex(userId, keep))) { await removeImages(userId, [id]); return null; }
  await removeImages(userId, drop.map((m) => m.id));
  return { id, dropped: drop.length };
}

/** 회원 본인 폴더의 파일(목록·이미지)을 모두 지운다. 지운 작품 수를 돌려준다 */
export async function deleteAllSaved(userId: string): Promise<number> {
  const count = (await readIndex(userId)).length;
  const bucket = createAdminClient().storage.from(BUCKET);
  // 목록에서 빠진 이미지가 남지 않도록 폴더 안 파일을 직접 나열해 지운다(최대 1000개씩)
  for (let round = 0; round < 5; round++) {
    const { data } = await bucket.list(userId, { limit: 1000 });
    const files = (data ?? []).filter((f) => f.id).map((f) => `${userId}/${f.name}`);
    if (!files.length) break;
    await bucket.remove(files);
  }
  return count;
}

export async function deleteSaved(userId: string, id: string): Promise<boolean> {
  if (!isSavedId(id)) return false;
  const list = await readIndex(userId);
  if (!list.some((m) => m.id === id)) return false;
  await removeImages(userId, [id]);
  return writeIndex(userId, list.filter((m) => m.id !== id));
}
