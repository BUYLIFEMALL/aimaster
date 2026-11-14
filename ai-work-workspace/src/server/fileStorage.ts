// 큰 파일(4MB 초과 ~ 50MB) Supabase Storage 저장(2026-11-14 주인님 「진행해」·「나눠서 저장」, 플랜 docs/PLAN_20261114_STORAGE_AND_PUBLIC.md A).
// · 4MB 이하는 지금처럼 워크스페이스 DB(files.content) — AI 첨부 읽기·내보내기·가져오기 등 원본 동작 그대로.
// · 4MB 초과는 브라우저가 Storage로 바로 올린다(서버는 서명된 올리기 주소만 발급) → Vercel 본문 한도(4.5MB)를 피한다.
// · 경로 `<회원 id>/<파일 id>/<이름>` — 메인 사이트 회원 저장 용량 계산(경로 안 회원 번호로 주인 판정)이 그대로 센다.
// · 올리기 전에 회원 저장 용량 확인(공용 storage-quota-client 사본), 가득 차면 「저장공간 늘리기」 안내.
// · 내려받기는 기존 주소(/files/<id>/<이름>) 그대로 — 권한 확인 뒤 5분짜리 서명 주소로 넘긴다.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { newId } from "#shared/ids.ts";
import { isSpaceMember, roleAtLeast } from "#shared/permissions.ts";
import type { BlockRecord, SpaceRecord } from "#shared/records.ts";
import { toPlainText } from "#shared/richtext.ts";
import { db, getRecord, withRequestCache } from "@/litpage/server/db.ts";
import { cleanFileName, cleanMime, fileRow } from "@/litpage/server/content/files.ts";
import { blockRole } from "@/litpage/server/records.ts";
import { pageIdOf } from "@/litpage/server/search.ts";
import { audit } from "@/litpage/server/audit.ts";
import { hit } from "@/litpage/server/ratelimit.ts";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkStorageQuota } from "@/lib/storage/storageQuota";
import { ensureMember, type Member } from "./runtime";

export const WORKSPACE_BUCKET = "workspace-files";
export const SMALL_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_LARGE_FILE_BYTES = 50 * 1024 * 1024;
const PENDING_TTL_MS = 24 * 3_600_000;

type Store = Pick<SupabaseClient["storage"], "from" | "getBucket" | "createBucket">;
let storeImpl: () => Store = () => (createAdminClient() as unknown as SupabaseClient).storage;
let quotaImpl: (userId: string, bytes: number) => Promise<{ allowed: boolean; message: string | null; upgradeUrl: string }> = (userId, bytes) =>
  checkStorageQuota(createAdminClient() as unknown as Parameters<typeof checkStorageQuota>[0], userId, bytes);
/** 시험에서 바꿔 끼움 */
export function setFileStorageForTests(o: { store?: () => Store; quota?: typeof quotaImpl }) {
  if (o.store) storeImpl = o.store;
  if (o.quota) quotaImpl = o.quota;
}

let bucketReady = false;
/** 비공개 버킷이 없으면 만든다(서버 키, 한 번만) — 파일당 50MB */
async function ensureBucket(store: Store) {
  if (bucketReady) return;
  const { data } = await store.getBucket(WORKSPACE_BUCKET);
  if (!data) {
    const { error } = await store.createBucket(WORKSPACE_BUCKET, { public: false, fileSizeLimit: MAX_LARGE_FILE_BYTES });
    if (error && !/exist/i.test(error.message)) throw new Error("파일 저장소를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  bucketReady = true;
}

const pathFor = (userId: string, fileId: string, name: string) => `${userId}/${fileId}/${encodeURIComponent(name).replace(/%/g, "_")}`;

type Res = { status: number; body: Record<string, unknown> };

/** 1단계: 큰 파일 올리기 주소 받기. 파일 줄은 「대기」로 먼저 만든다 */
export async function signLargeUpload(member: Member, q: { name?: unknown; type?: unknown; size?: unknown; spaceId?: unknown }): Promise<Res> {
  const userId = member.id;
  const size = Number(q.size);
  if (!Number.isFinite(size) || size <= SMALL_FILE_BYTES) return { status: 400, body: { message: "4MB 이하 파일은 일반 올리기를 씁니다." } };
  if (size > MAX_LARGE_FILE_BYTES) return { status: 413, body: { message: "파일은 50MB까지 올릴 수 있습니다." } };
  if (!hit(`upload-large:user:${userId}`, 30, 10 * 60_000)) return { status: 429, body: { message: "업로드가 너무 많습니다. 잠시 후 다시 시도해 주세요." } };
  const quota = await quotaImpl(userId, size);
  if (!quota.allowed) return { status: 403, body: { message: quota.message ?? "저장공간이 가득 찼습니다.", code: "STORAGE_FULL", upgradeUrl: quota.upgradeUrl } };
  const store = storeImpl();
  await ensureBucket(store);
  return withRequestCache(async () => {
    ensureMember(member);
    const name = cleanFileName(q.name ?? "file");
    const mime = cleanMime(q.type);
    const sid = typeof q.spaceId === "string" ? q.spaceId : null;
    const spaceId = sid && isSpaceMember(getRecord<SpaceRecord>("space", sid), userId) ? sid : null;
    const id = newId();
    const path = pathFor(userId, id, name);
    const { data, error } = await store.from(WORKSPACE_BUCKET).createSignedUploadUrl(path);
    if (error || !data?.signedUrl) return { status: 502, body: { message: "올리기 주소를 받지 못했습니다. 잠시 후 다시 시도해 주세요." } };
    db.prepare("INSERT INTO files (id, space_id, user_id, name, mime, size, path, created_time, private, render, content, storage_path, pending) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, ?, 1)")
      .run(id, spaceId, userId, name, mime, size, path, Date.now(), path);
    return { status: 200, body: { id, uploadUrl: data.signedUrl, token: data.token } };
  });
}

/** 2단계: 올리기를 끝냈다고 알림 — Storage에 실제로 있는지·크기를 확인하고 「대기」를 푼다 */
export async function finishLargeUpload(member: Member, q: { id?: unknown; blockId?: unknown }): Promise<Res> {
  const userId = member.id;
  const id = typeof q.id === "string" ? q.id : "";
  const row = withRequestCache(() => fileRow(id));
  if (!row || row.user_id !== userId || !row.storage_path) return { status: 404, body: { message: "파일을 찾지 못했습니다." } };
  if (!row.pending) return { status: 200, body: { url: `/files/${row.id}/${encodeURIComponent(row.name)}`, id: row.id, name: row.name, size: row.size, mime: row.mime } };
  const store = storeImpl();
  const dir = row.storage_path.slice(0, row.storage_path.lastIndexOf("/"));
  const file = row.storage_path.slice(row.storage_path.lastIndexOf("/") + 1);
  const { data } = await store.from(WORKSPACE_BUCKET).list(dir, { limit: 5, search: file });
  const obj = (data ?? []).find((o) => o.name === file);
  const size = Number((obj?.metadata as { size?: number } | undefined)?.size ?? 0);
  if (!obj) return { status: 409, body: { message: "파일 올리기가 끝나지 않았습니다. 다시 올려 주세요." } };
  if (size > MAX_LARGE_FILE_BYTES) {
    await store.from(WORKSPACE_BUCKET).remove([row.storage_path]).catch(() => {});
    return { status: 413, body: { message: "파일은 50MB까지 올릴 수 있습니다." } };
  }
  return withRequestCache(() => {
    db.prepare("UPDATE files SET pending = 0, size = ? WHERE id = ? AND user_id = ?").run(size || row.size, row.id, userId);
    const blockId = typeof q.blockId === "string" ? q.blockId : null;
    const target = blockId ? getRecord<BlockRecord>("block", blockId) : undefined;
    const page = target && roleAtLeast(blockRole(target.id, userId), "read_and_write") ? getRecord<BlockRecord>("block", pageIdOf(target)) : undefined;
    const auditSpace = page?.space_id ?? row.space_id;
    if (auditSpace) audit("file_uploaded", { spaceId: auditSpace, actorId: userId, targetId: page?.id ?? null, ip: "", data: { fileName: row.name, ...(page ? { pageName: toPlainText(page.properties?.title) } : {}) } });
    return { status: 200, body: { url: `/files/${row.id}/${encodeURIComponent(row.name)}`, id: row.id, name: row.name, size: size || row.size, mime: row.mime } };
  });
}

/** 내려받기: Storage 파일이면 5분짜리 서명 주소(권한 확인은 부르는 쪽이 끝낸 뒤) */
export async function storageDownloadUrl(path: string, name: string, download: boolean): Promise<string | null> {
  const { data } = await storeImpl().from(WORKSPACE_BUCKET).createSignedUrl(path, 300, download ? { download: name } : undefined);
  return data?.signedUrl ?? null;
}

/** 지운 파일 줄의 Storage 내용도 지운다(정리 작업 뒤) */
export async function removeStorageObjects(paths: string[]): Promise<number> {
  const list = paths.filter(Boolean);
  if (!list.length) return 0;
  let n = 0;
  for (let i = 0; i < list.length; i += 100) {
    const { data } = await storeImpl().from(WORKSPACE_BUCKET).remove(list.slice(i, i + 100));
    n += data?.length ?? 0;
  }
  return n;
}

/** 하루 넘게 「대기」인 줄(올리기를 끝내지 않음)과 그 Storage 내용을 지운다 */
export async function cleanupPendingUploads(now = Date.now()): Promise<number> {
  const rows = withRequestCache(() => db.prepare("SELECT id, storage_path FROM files WHERE pending = 1 AND created_time < ? LIMIT 500").all(now - PENDING_TTL_MS) as { id: string; storage_path: string | null }[]);
  if (!rows.length) return 0;
  await removeStorageObjects(rows.map((r) => r.storage_path ?? ""));
  withRequestCache(() => {
    for (const r of rows) db.prepare("DELETE FROM files WHERE id = ? AND pending = 1").run(r.id);
  });
  return rows.length;
}
