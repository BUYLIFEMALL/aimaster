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
import { ZIP_IMPORT_LIMITS } from "#shared/zipPath.ts";
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
let fetchImpl: (url: string) => Promise<Response> = (url) => fetch(url);
/** 시험에서 바꿔 끼움 */
export function setFileStorageForTests(o: { store?: () => Store; quota?: typeof quotaImpl; fetch?: typeof fetchImpl }) {
  if (o.store) storeImpl = o.store;
  if (o.quota) quotaImpl = o.quota;
  if (o.fetch) fetchImpl = o.fetch;
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

/**
 * 가져오기 전용(2026-11-19 WS-20261119-02): Storage에 둔 올린 파일 하나를 읽는다. 버킷은 서버 고정(WORKSPACE_BUCKET).
 * · 경로 첫 칸이 그 회원 번호가 아니면 읽지 않는다(부르는 쪽 import.ts도 소유·완료·경로를 먼저 확인한다 — 이중 확인).
 * · 실제로 받은 바이트를 세며 읽고 maxBytes를 넘는 순간 끊는다(머리글의 크기를 믿지 않음).
 * · 결과는 부른 요청에만 돌려준다. 어디에도 보관하지 않는다.
 */
export async function readImportUpload(userId: string, storagePath: string, maxBytes: number): Promise<Buffer | null> {
  const parts = storagePath.split("/");
  if (parts.length !== 3 || parts[0] !== userId || parts.some((p) => !p || p === "." || p === "..")) return null;
  if (!Number.isFinite(maxBytes) || maxBytes <= 0 || maxBytes > MAX_LARGE_FILE_BYTES) return null;
  try {
    const { data } = await storeImpl().from(WORKSPACE_BUCKET).createSignedUrl(storagePath, 60);
    if (!data?.signedUrl) return null;
    const res = await fetchImpl(data.signedUrl);
    if (!res.ok || !res.body) return null;
    const declared = Number(res.headers.get("content-length") ?? 0);
    const reader = res.body.getReader();
    if (declared > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks, total);
  } catch {
    return null;
  }
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

/**
 * Storage에서 지우고, **없어진 것이 확인된 경로**만 돌려준다(2026-11-19 Master msg_547f81d99092).
 * · 지웠다는 답이 온 경로, 또는 · 답에 없어 다시 찾아봤더니 실제로 없는 경로(올리기를 끝내지 못해 애초에 없던 것).
 * 삭제나 확인이 실패한 경로는 넣지 않는다 — 부르는 쪽은 여기 든 경로의 파일 줄만 지워, 줄만 사라지고 Storage에 남는 일이 없게 한다.
 */
async function removeConfirmed(paths: string[]): Promise<Set<string>> {
  const gone = new Set<string>();
  const list = [...new Set(paths.filter(Boolean))];
  const bucket = storeImpl().from(WORKSPACE_BUCKET);
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    const rm = await bucket.remove(chunk).catch(() => ({ data: null, error: { message: "failed" } }));
    if (rm.error) continue;
    for (const o of rm.data ?? []) gone.add(o.name);
    for (const p of chunk) {
      if (gone.has(p)) continue;
      const cut = p.lastIndexOf("/");
      const found = await bucket.list(p.slice(0, cut), { limit: 5, search: p.slice(cut + 1) }).catch(() => ({ data: null, error: { message: "failed" } }));
      if (!found.error && !(found.data ?? []).some((o) => o.name === p.slice(cut + 1))) gone.add(p);
    }
  }
  return gone;
}

/** 하루 넘게 「대기」인 줄(올리기를 끝내지 않음)과 그 Storage 내용을 지운다 */
export async function cleanupPendingUploads(now = Date.now()): Promise<number> {
  // 2026-11-19: 하루 넘은 큰 ZIP 가져오기 작업도 같은 주기에 정리한다(그 작업이 올린 파일만)
  await cleanupStaleImportJobs(now).catch(() => 0);
  // 큰 ZIP 가져오기 작업의 파일(import_job_id 있음)은 여기서 다루지 않는다 — 작업 정리만 책임진다
  // (작업 정리에서 Storage 삭제가 실패했을 때 이쪽이 줄을 지워 버리면 Storage에 남은 파일을 다시 지울 길이 없어진다).
  const rows = withRequestCache(() => db.prepare("SELECT id, storage_path FROM files WHERE pending = 1 AND import_job_id IS NULL AND created_time < ? LIMIT 500").all(now - PENDING_TTL_MS) as { id: string; storage_path: string | null }[]);
  if (!rows.length) return 0;
  // Storage에서 없어진 것이 확인된 줄만 지운다(실패한 줄은 남겨 다음 회차가 다시 한다)
  const gone = await removeConfirmed(rows.map((r) => r.storage_path ?? ""));
  let n = 0;
  withRequestCache(() => {
    for (const r of rows) {
      if (r.storage_path && !gone.has(r.storage_path)) continue;
      db.prepare("DELETE FROM files WHERE id = ? AND pending = 1 AND import_job_id IS NULL").run(r.id);
      n++;
    }
  });
  return n;
}

// ---------------------------------------------------------------------------------------------------------------
// 큰 ZIP 가져오기 작업(2026-11-19 WS-20261119-02, 플랜 docs/PLAN_20261119_LARGE_ZIP_IMPORT.md §9·§10)
// 50MiB를 넘는 ZIP은 브라우저가 안의 그림을 하나씩 Storage로 올리고, 서버에는 글 파일 묶음과 「ZIP 안 경로 → 파일 id」 표만 보낸다.
// 그 올리기를 「가져오기 작업」 하나로 묶어, 그 작업에서 그 회원이 올린 파일만 쓰이고 지워지게 한다.
//   import-begin  { spaceId, files, bytes }                → { jobId }                        작업 열기(신고한 개수·합계, 용량 확인). 열린 작업이 있으면 409 { code: IMPORT_JOB_OPEN, jobId }
//   import-sign   { jobId, items: [{ name, type, size }] } → { items: [{ id, uploadUrl }] }   한 번에 50개까지
//   import-pages  { jobId, name, size }                    → { id, uploadUrl }                글 파일 묶음(ZIP) 올리기 주소 — 작업당 하나, 이 작업의 「글 묶음」으로 표시
//   import-done   { jobId, ids }                           → { done, failed }                 실제로 올라갔는지·크기 확인
//   import-finish { jobId }                                → { removed }                      가져오기 뒤 쓰이지 않은 파일 지우기
//   import-cancel { jobId }                                → { removed }                      실패·취소: 이 작업이 올린 파일만 지우기
//   import-status { jobId }                                → { state, result }                결과가 불확실할 때 조회(자동 재시도 없음)
// 표 import_jobs와 files.import_job_id는 import.ts가 만든다(가져오기 명령이 같은 표를 읽으므로 거기 둔다).
const JOB_TTL_MS = 24 * 3_600_000;
const SIGN_URL_BATCH = ZIP_IMPORT_LIMITS.signBatch;
type JobRow = { id: string; user_id: string; space_id: string; state: string; declared_files: number; declared_bytes: number; files: number; bytes: number; created_time: number; result: string | null };

const bad = (status: number, message: string, extra: Record<string, unknown> = {}): Res => ({ status, body: { message, ...extra } });
const intIn = (v: unknown, min: number, max: number): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

/** 그 회원의 작업 줄(남의 작업·없는 작업은 똑같이 undefined — 있는지 알려 주지 않는다) */
function ownJob(jobId: unknown, userId: string): JobRow | undefined {
  if (typeof jobId !== "string" || !/^[0-9a-f-]{36}$/i.test(jobId)) return undefined;
  const row = db.prepare("SELECT id, user_id, space_id, state, declared_files, declared_bytes, files, bytes, created_time, result FROM import_jobs WHERE id = ?").get(jobId) as JobRow | undefined;
  if (!row || row.user_id !== userId) return undefined;
  return { ...row, declared_files: Number(row.declared_files), declared_bytes: Number(row.declared_bytes), files: Number(row.files), bytes: Number(row.bytes), created_time: Number(row.created_time) };
}

/**
 * 이 작업이 올린 파일만 지운다 — 조건은 항상 「작업 id + 회원 id」 둘 다. `keep`에 든 파일은 남긴다.
 * Storage에서 지워진 것이 확인된 줄만 지운다(줄만 사라지고 Storage에 파일이 남는 일을 막는다. 남은 줄은 다음 정리가 다시 시도).
 */
async function removeJobFiles(jobId: string, userId: string, keep: Set<string> = new Set()): Promise<number> {
  const rows = withRequestCache(() => db.prepare("SELECT id, storage_path FROM files WHERE import_job_id = ? AND user_id = ?").all(jobId, userId) as { id: string; storage_path: string | null }[])
    .filter((r) => !keep.has(r.id));
  let removed = 0;
  const gone = await removeConfirmed(rows.map((r) => r.storage_path ?? ""));
  withRequestCache(() => {
    for (const r of rows) {
      if (r.storage_path && !gone.has(r.storage_path)) continue;
      db.prepare("DELETE FROM files WHERE id = ? AND import_job_id = ? AND user_id = ?").run(r.id, jobId, userId);
      removed++;
    }
  });
  return removed;
}

/**
 * 열린 작업을 취소로 바꾸고, **바꾸는 데 성공했을 때만** 그 작업의 파일을 지운다(2026-11-19 Master msg_2e22cd4b41c3).
 * 같은 작업의 가져오기(importFiles)가 먼저 끝났으면 상태가 이미 done이라 전환이 0줄이고, 그때는 아무것도 지우지 않는다
 * (본문이 쓰는 그림을 지우지 않게). 전환하지 못했으면 null.
 */
async function cancelOpenJob(jobId: string, userId: string): Promise<number | null> {
  const r = withRequestCache(() => db.prepare("UPDATE import_jobs SET state = 'cancelled' WHERE id = ? AND user_id = ? AND state = 'open'").run(jobId, userId));
  if (!r.changes) return null;
  return removeJobFiles(jobId, userId);
}

/**
 * 끝난 작업(done)의 쓰이지 않은 그림을 지운다. done은 「무엇이 쓰였는지」가 굳은 상태라 여러 번 해도 결과가 같다.
 * 쓰이지 않은 것이 하나도 남지 않았을 때만 closed로 바꾼다(Storage 삭제가 실패해 남았으면 done으로 두어 다음 정리가 다시 한다).
 */
async function sweepDoneJob(jobId: string, userId: string, result: string | null): Promise<number> {
  const used = new Set<string>((JSON.parse(result ?? "{}") as { used?: string[] }).used ?? []);
  const removed = await removeJobFiles(jobId, userId, used);
  const left = withRequestCache(() => db.prepare("SELECT id FROM files WHERE import_job_id = ? AND user_id = ?").all(jobId, userId) as { id: string }[]).filter((f) => !used.has(f.id)).length;
  if (!left) withRequestCache(() => db.prepare("UPDATE import_jobs SET state = 'closed' WHERE id = ? AND user_id = ? AND state = 'done'").run(jobId, userId));
  return removed;
}

export async function importJobStep(member: Member, q: Record<string, unknown>): Promise<Res> {
  const userId = member.id;
  const step = q.step;
  if (step === "import-begin") {
    const files = intIn(q.files, 1, ZIP_IMPORT_LIMITS.entries);
    const bytes = intIn(q.bytes, 1, ZIP_IMPORT_LIMITS.zipBytes);
    if (files === null) return bad(400, `그림은 한 번에 ${ZIP_IMPORT_LIMITS.entries.toLocaleString("ko-KR")}개까지 가져올 수 있습니다.`);
    if (bytes === null) return bad(413, "그림 합계는 1GB까지 가져올 수 있습니다.");
    const sid = typeof q.spaceId === "string" ? q.spaceId : "";
    const isMember = withRequestCache(() => {
      ensureMember(member);
      const sp = getRecord<SpaceRecord>("space", sid);
      return !!sp && isSpaceMember(sp, userId);
    });
    if (!isMember) return bad(403, "이 워크스페이스의 구성원이 아닙니다.");
    if (!hit(`import-job:user:${userId}`, 10, 60 * 60_000)) return bad(429, "큰 가져오기를 너무 자주 시작했습니다. 잠시 후 다시 시도해 주세요.");
    const quota = await quotaImpl(userId, bytes);
    if (!quota.allowed) return bad(403, quota.message ?? "저장공간이 가득 찼습니다.", { code: "STORAGE_FULL", upgradeUrl: quota.upgradeUrl });
    // 한 회원에 열린 작업은 하나다. 열린 작업이 있으면 여기서 지우지 않고 409로 알린다(회원이 직접 취소하거나 끝낸 뒤 다시 시작).
    // 하루 넘게 열려 있던 것(탭이 닫혀 남은 것)만 만료로 보고 정리한 뒤 새로 연다.
    const openBusy = (jobId: string) => bad(409, "아직 끝나지 않은 큰 가져오기가 있습니다. 끝난 뒤 다시 시도하거나 그 가져오기를 취소해 주세요.", { code: "IMPORT_JOB_OPEN", jobId });
    const openNow = () => withRequestCache(() => db.prepare("SELECT id, created_time FROM import_jobs WHERE user_id = ? AND state = 'open'").all(userId) as { id: string; created_time: number }[]);
    for (const o of openNow()) {
      if (Number(o.created_time) >= Date.now() - JOB_TTL_MS) return openBusy(o.id);
      await cancelOpenJob(o.id, userId);
    }
    await ensureBucket(storeImpl());
    const id = newId();
    try {
      // 동시에 두 번 시작해도 하나만 열린다 — 부분 고유 색인 import_jobs_one_open(회원당 open 하나)이 두 번째 줄을 막는다
      withRequestCache(() => db.prepare("INSERT INTO import_jobs (id, user_id, space_id, state, declared_files, declared_bytes, files, bytes, created_time, result) VALUES (?, ?, ?, 'open', ?, ?, 0, 0, ?, NULL)")
        .run(id, userId, sid, files, bytes, Date.now()));
    } catch (e) {
      const other = openNow()[0];
      if (other) return openBusy(other.id);
      throw e;
    }
    return { status: 200, body: { jobId: id } };
  }

  const job = withRequestCache(() => ownJob(q.jobId, userId));
  if (!job) return bad(404, "가져오기 작업을 찾지 못했습니다.");

  if (step === "import-status") {
    const result = job.result ? (JSON.parse(job.result) as { pageIds: string[]; pages: number; databases: number }) : null;
    return { status: 200, body: { state: job.state, result: result ? { pageIds: result.pageIds, pages: result.pages, databases: result.databases } : null } };
  }
  if (step === "import-cancel") {
    // 이미 취소된 작업: 지난번에 Storage 삭제가 실패해 남은 것이 있으면 다시 지운다(취소된 작업의 파일은 어디에도 쓰이지 않는다)
    if (job.state === "cancelled") return { status: 200, body: { removed: await removeJobFiles(job.id, userId) } };
    if (job.state !== "open") return bad(409, "이미 끝난 가져오기 작업입니다.");
    const removed = await cancelOpenJob(job.id, userId);
    // 읽은 뒤 그사이 가져오기가 끝났으면(전환 0줄) 지우지 않는다
    if (removed === null) return bad(409, "이미 끝난 가져오기 작업입니다.");
    return { status: 200, body: { removed } };
  }
  if (step === "import-finish") {
    if (job.state === "closed") return { status: 200, body: { removed: 0 } };
    if (job.state !== "done") return bad(409, "가져오기가 끝나지 않았습니다.");
    return { status: 200, body: { removed: await sweepDoneJob(job.id, userId, job.result) } };
  }

  if (job.state !== "open") return bad(409, "이미 끝난 가져오기 작업입니다.");
  if (job.created_time < Date.now() - JOB_TTL_MS) return bad(410, "가져오기 작업이 만료됐습니다. 처음부터 다시 시작해 주세요.");

  if (step === "import-sign") {
    const items = Array.isArray(q.items) ? q.items : [];
    if (!items.length || items.length > SIGN_URL_BATCH) return bad(400, `한 번에 ${SIGN_URL_BATCH}개까지 요청할 수 있습니다.`);
    const sizes: number[] = [];
    for (const it of items) {
      const size = intIn((it as { size?: unknown } | null)?.size, 1, MAX_LARGE_FILE_BYTES);
      if (size === null) return bad(413, "파일은 50MB까지 올릴 수 있습니다.");
      sizes.push(size);
    }
    const sum = sizes.reduce((a, b) => a + b, 0);
    // 신고한 개수·합계를 넘겨 받지 않는다(브라우저 값은 믿지 않고 서버가 다시 센다)
    if (job.files + items.length > job.declared_files || job.bytes + sum > job.declared_bytes) return bad(413, "처음에 알린 개수·크기보다 많이 올릴 수 없습니다.");
    const store = storeImpl();
    const out: { id: string; uploadUrl: string }[] = [];
    const made: { id: string; name: string; mime: string; size: number; path: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = (items[i] ?? {}) as { name?: unknown; type?: unknown };
      const id = newId();
      const name = cleanFileName(it.name ?? "file");
      const path = pathFor(userId, id, name);
      const { data, error } = await store.from(WORKSPACE_BUCKET).createSignedUploadUrl(path);
      if (error || !data?.signedUrl) return bad(502, "올리기 주소를 받지 못했습니다. 잠시 후 다시 시도해 주세요.");
      out.push({ id, uploadUrl: data.signedUrl });
      made.push({ id, name, mime: cleanMime(it.type), size: sizes[i], path });
    }
    const ok = withRequestCache(() => {
      // 다른 탭이 같은 작업으로 동시에 받아 가는 경우까지 셈이 맞도록 조건을 걸어 더한다
      const r = db.prepare("UPDATE import_jobs SET files = files + ?, bytes = bytes + ? WHERE id = ? AND user_id = ? AND state = 'open' AND files + ? <= declared_files AND bytes + ? <= declared_bytes")
        .run(made.length, sum, job.id, userId, made.length, sum) as { changes?: number };
      if (!r.changes) return false;
      const ins = db.prepare("INSERT INTO files (id, space_id, user_id, name, mime, size, path, created_time, private, render, content, storage_path, pending, import_job_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, ?, 1, ?)");
      for (const m of made) ins.run(m.id, job.space_id, userId, m.name, m.mime, m.size, m.path, Date.now(), m.path, job.id);
      return true;
    });
    if (!ok) return bad(413, "처음에 알린 개수·크기보다 많이 올릴 수 없습니다.");
    return { status: 200, body: { items: out } };
  }

  if (step === "import-pages") {
    // 글 파일 묶음도 이 작업의 파일로 올린다(작업당 하나). 가져오기는 여기 적힌 파일 id만 글 묶음으로 받는다
    const size = intIn(q.size, 1, MAX_LARGE_FILE_BYTES);
    if (size === null) return bad(413, "파일은 50MB까지 올릴 수 있습니다.");
    const id = newId();
    const name = cleanFileName(q.name ?? "pages.zip");
    const path = pathFor(userId, id, name);
    const { data, error } = await storeImpl().from(WORKSPACE_BUCKET).createSignedUploadUrl(path);
    if (error || !data?.signedUrl) return bad(502, "올리기 주소를 받지 못했습니다. 잠시 후 다시 시도해 주세요.");
    const ok = withRequestCache(() => {
      const r = db.prepare("UPDATE import_jobs SET pages_file_id = ?, files = files + 1, bytes = bytes + ? WHERE id = ? AND user_id = ? AND state = 'open' AND pages_file_id IS NULL AND files + 1 <= declared_files AND bytes + ? <= declared_bytes")
        .run(id, size, job.id, userId, size);
      if (!r.changes) return false;
      db.prepare("INSERT INTO files (id, space_id, user_id, name, mime, size, path, created_time, private, render, content, storage_path, pending, import_job_id) VALUES (?, ?, ?, ?, 'application/zip', ?, ?, ?, 0, 0, NULL, ?, 1, ?)")
        .run(id, job.space_id, userId, name, size, path, Date.now(), path, job.id);
      return true;
    });
    if (!ok) return bad(409, "이 가져오기의 글 묶음은 이미 올렸거나 처음에 알린 크기를 넘습니다.");
    return { status: 200, body: { id, uploadUrl: data.signedUrl } };
  }

  if (step === "import-done") {
    const ids = (Array.isArray(q.ids) ? q.ids : []).filter((x): x is string => typeof x === "string");
    if (!ids.length || ids.length > SIGN_URL_BATCH) return bad(400, `한 번에 ${SIGN_URL_BATCH}개까지 요청할 수 있습니다.`);
    const store = storeImpl();
    const done: string[] = [];
    const failed: string[] = [];
    for (const id of new Set(ids)) {
      const row = withRequestCache(() => db.prepare("SELECT id, user_id, size, storage_path, pending, import_job_id FROM files WHERE id = ?").get(id) as { id: string; user_id: string; size: number; storage_path: string | null; pending: number; import_job_id: string | null } | undefined);
      if (!row || row.user_id !== userId || row.import_job_id !== job.id || !row.storage_path) {
        failed.push(id);
        continue;
      }
      if (!Number(row.pending)) {
        done.push(id);
        continue;
      }
      const dir = row.storage_path.slice(0, row.storage_path.lastIndexOf("/"));
      const file = row.storage_path.slice(row.storage_path.lastIndexOf("/") + 1);
      const { data } = await store.from(WORKSPACE_BUCKET).list(dir, { limit: 5, search: file });
      const obj = (data ?? []).find((o) => o.name === file);
      const size = Number((obj?.metadata as { size?: number } | undefined)?.size ?? 0);
      if (!obj) {
        failed.push(id);
        continue;
      }
      // 주소를 받을 때 알린 크기보다 크게 올라왔으면 지우고 실패로 둔다(합계 한도를 돌아가지 못하게)
      if (!(size > 0) || size > Number(row.size) || size > MAX_LARGE_FILE_BYTES) {
        // Storage에서 지워진 것이 확인됐을 때만 줄을 지운다. 실패하면 대기 줄로 남아 작업 정리(취소·마무리·만료)가 다시 지운다
        if ((await removeConfirmed([row.storage_path])).has(row.storage_path)) {
          withRequestCache(() => db.prepare("DELETE FROM files WHERE id = ? AND import_job_id = ? AND user_id = ? AND pending = 1").run(row.id, job.id, userId));
        }
        failed.push(id);
        continue;
      }
      withRequestCache(() => db.prepare("UPDATE files SET pending = 0, size = ? WHERE id = ? AND import_job_id = ? AND user_id = ?").run(size, row.id, job.id, userId));
      done.push(id);
    }
    return { status: 200, body: { done, failed } };
  }
  return bad(400, "알 수 없는 단계입니다.");
}

/** 하루 넘게 열려 있는 작업(탭이 닫힘)은 그 작업 파일을 지우고, 끝났지만 마무리가 안 된 작업은 쓰이지 않은 파일만 지운다 */
export async function cleanupStaleImportJobs(now = Date.now()): Promise<number> {
  const rows = withRequestCache(() => db.prepare("SELECT id, user_id, state, result FROM import_jobs WHERE state IN ('open', 'done') AND created_time < ? LIMIT 50").all(now - JOB_TTL_MS) as { id: string; user_id: string; state: string; result: string | null }[]);
  let n = 0;
  for (const j of rows) {
    // 열린 작업: 취소로 바꾸는 데 성공했을 때만 지운다(그사이 가져오기가 끝났으면 건너뛰고, 다음 정리에서 done으로 다룬다)
    if (j.state === "open") n += (await cancelOpenJob(j.id, j.user_id)) ?? 0;
    else n += await sweepDoneJob(j.id, j.user_id, j.result);
  }
  // 취소됐지만 Storage 삭제가 실패해 파일 줄이 남은 작업은 다시 지운다(취소된 작업의 파일은 쓰이는 곳이 없다)
  const leftover = withRequestCache(() => db.prepare("SELECT j.id, j.user_id FROM import_jobs j WHERE j.state = 'cancelled' AND EXISTS (SELECT 1 FROM files f WHERE f.import_job_id = j.id) LIMIT 50").all() as { id: string; user_id: string }[]);
  for (const j of leftover) n += await removeJobFiles(j.id, j.user_id);
  return n;
}
