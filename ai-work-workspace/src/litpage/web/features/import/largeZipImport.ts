// 큰 ZIP(50MiB 초과) 가져오기의 올리기 순서(2026-11-19 WS-20261119-02, 플랜 docs/PLAN_20261119_LARGE_ZIP_IMPORT.md §3·§9·§10).
//   1) ZIP 목록을 읽어 글 파일·그림으로 나눈다(zipReader.ts)          2) 가져오기 작업을 연다(신고: 그림 수·합계)
//   3) 그림을 50개씩 주소를 받아 하나씩 Storage로 올리고 끝을 알린다   4) 글 파일만 모은 작은 ZIP을 예전 경로로 올린다
//   5) importFiles에 { 글 묶음 주소, 작업 id, 「ZIP 안 경로 → 파일 id」 표 }를 보낸다(부르는 쪽)
//   6) 성공하면 쓰이지 않은 그림을 지우고(import-finish), 서버가 거절하면 이 작업이 올린 것만 지운다(import-cancel)
// 결과가 불확실하면(응답을 못 받음) 지우지도 자동으로 다시 하지도 않고 작업 상태를 한 번 조회한다.
// 서버와의 통신은 deps로 받는다(시험에서 실제 서버 함수에 그대로 연결한다).
import { ZIP_IMPORT_LIMITS } from '#shared/zipPath.ts';
import { ZipReadError, buildStoredZip, planLargeZip, readZipEntry, type SkipReason, type ZipItem } from './zipReader.ts';

export interface LargeZipDeps {
  /** POST /api/upload/large { step: 'import-…', … } — 서버가 거절하면 status가 달린 오류를 던진다 */
  job(body: Record<string, unknown>): Promise<any>;
  /** 서명된 주소로 올리기. 성공 여부만 */
  put(uploadUrl: string, data: Blob, type: string): Promise<boolean>;
  /** 글 파일 묶음을 예전 경로(파일 올리기)로 올린다 */
  uploadPages(zip: Blob, name: string): Promise<{ url: string }>;
  /** 끝나지 않은 큰 가져오기가 이미 있을 때 그것을 취소하고 새로 시작할지 회원에게 묻는다(없으면 취소하지 않는다) */
  confirmReplace?(): Promise<boolean> | boolean;
}

export interface PreparedLargeZip {
  name: string;
  url: string;
  /** 그림이 하나도 없으면 작업 없이 예전처럼 가져온다 */
  job?: { id: string; assets: Record<string, string> };
  skipped: { name: string; reason: SkipReason | 'upload_failed' }[];
  images: number;
}

const IMAGE_MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', avif: 'image/avif' };
const mimeOf = (name: string) => IMAGE_MIME[/\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? ''] ?? 'application/octet-stream';
const baseName = (name: string) => name.split('/').pop() || 'image';
const UPLOAD_CONCURRENCY = 4;

export const isLargeZip = (file: { name: string; size: number }) => /\.zip$/i.test(file.name) && file.size > ZIP_IMPORT_LIMITS.wholeUploadBytes;

/** 1~4단계. 도중에 실패하면 이 작업이 올린 것만 정리하고 오류를 던진다 */
export async function prepareLargeZip(file: Blob, name: string, spaceId: string, deps: LargeZipDeps, onProgress?: (done: number, total: number) => void): Promise<PreparedLargeZip> {
  const L = ZIP_IMPORT_LIMITS;
  const plan = await planLargeZip(file);
  const skipped: PreparedLargeZip['skipped'] = [...plan.skipped];
  if (!plan.pages.length) throw new ZipReadError(`No Markdown, HTML or CSV files found in ${name}`);
  let unpacked = 0;
  const spend = (n: number) => {
    unpacked += n;
    if (unpacked > L.unpackedBytes) throw new ZipReadError('Archive too large');
  };

  // 글 파일 묶음: 예전 경로로 올리므로 묶음 전체가 그 한도(50MiB) 안이어야 한다
  const pageEntries: { name: string; data: Uint8Array }[] = [];
  let pageBytes = 0;
  for (const p of plan.pages) {
    const data = await readZipEntry(p, L.fileBytes);
    if (!data) {
      skipped.push({ name: p.name, reason: 'too_large' });
      continue;
    }
    spend(data.length);
    pageBytes += data.length + 2 * new TextEncoder().encode(p.name).length + 76;
    if (pageBytes > L.wholeUploadBytes - 1024) throw new ZipReadError('The pages in this ZIP are larger than 50 MB in total — split it into smaller exports');
    pageEntries.push({ name: p.name, data });
  }
  if (!pageEntries.length) throw new ZipReadError(`No Markdown, HTML or CSV files found in ${name}`);
  const pagesZip = buildStoredZip(pageEntries);

  const images = plan.images.filter((e) => {
    if (e.size > 0) return true;
    skipped.push({ name: e.name, reason: 'unsupported' });
    return false;
  });
  if (!images.length) return { name, url: (await deps.uploadPages(pagesZip, name)).url, skipped, images: 0 };

  const beginBody = { step: 'import-begin', spaceId, files: images.length, bytes: images.reduce((a, e) => a + e.size, 0) };
  let begun: { jobId: string };
  try {
    begun = await deps.job(beginBody);
  } catch (e) {
    // 열린 작업이 이미 있으면 서버는 지우지 않고 409로 알린다. 회원이 취소에 동의했을 때만 그 작업을 취소하고 한 번 다시 시작한다
    const open = (e as { status?: number; data?: { code?: string; jobId?: string } }) ?? {};
    if (open.status !== 409 || open.data?.code !== 'IMPORT_JOB_OPEN' || !open.data.jobId || !(await deps.confirmReplace?.())) throw e;
    await deps.job({ step: 'import-cancel', jobId: open.data.jobId });
    begun = await deps.job(beginBody);
  }
  const { jobId } = begun;
  const assets: Record<string, string> = {};
  let finished = 0;
  try {
    for (let i = 0; i < images.length; i += L.signBatch) {
      const batch = images.slice(i, i + L.signBatch);
      const signed = (await deps.job({ step: 'import-sign', jobId, items: batch.map((e) => ({ name: baseName(e.name), type: mimeOf(e.name), size: e.size })) })).items as { id: string; uploadUrl: string }[];
      const uploadedIds: { id: string; entry: ZipItem }[] = [];
      let next = 0;
      const worker = async () => {
        for (;;) {
          const k = next++;
          if (k >= batch.length) return;
          const e = batch[k];
          // 주소를 받을 때 알린 크기까지만 받는다(목록의 크기가 거짓이면 여기서 걸러진다)
          const data = await readZipEntry(e, e.size).catch(() => null);
          if (!data || !data.length) {
            skipped.push({ name: e.name, reason: 'too_large' });
          } else {
            spend(data.length);
            if (await deps.put(signed[k].uploadUrl, new Blob([data as BlobPart], { type: mimeOf(e.name) }), mimeOf(e.name))) uploadedIds.push({ id: signed[k].id, entry: e });
            else skipped.push({ name: e.name, reason: 'upload_failed' });
          }
          onProgress?.(++finished, images.length);
        }
      };
      await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, batch.length) }, worker));
      if (!uploadedIds.length) continue;
      const res = (await deps.job({ step: 'import-done', jobId, ids: uploadedIds.map((u) => u.id) })) as { done: string[]; failed: string[] };
      const ok = new Set(res.done);
      for (const u of uploadedIds) {
        if (ok.has(u.id)) assets[u.entry.name] = u.id;
        else skipped.push({ name: u.entry.name, reason: 'upload_failed' });
      }
    }
    const { url } = await deps.uploadPages(pagesZip, name);
    return { name, url, job: { id: jobId, assets }, skipped, images: Object.keys(assets).length };
  } catch (e) {
    // 여기까지는 페이지를 만들기 전이다 — 이 작업이 올린 그림만 지운다(서버가 작업 id와 회원으로 가려낸다)
    await deps.job({ step: 'import-cancel', jobId }).catch(() => {});
    throw e;
  }
}

/**
 * 6단계. `error`가 없으면 성공 마무리. 서버가 분명히 거절한 오류(status 있음)면 취소·정리.
 * 응답을 받지 못한 오류면 상태를 한 번 조회해, 이미 끝났으면 그 결과를 돌려주고(페이지가 두 번 생기지 않게 다시 부르지 않는다)
 * 아직이면 아무것도 지우지 않고 그대로 둔다(하루 뒤 서버가 정리한다).
 */
export async function settleLargeZip(jobId: string, deps: LargeZipDeps, error?: unknown): Promise<{ pageIds: string[]; pages: number; databases: number } | null> {
  if (!error) {
    await deps.job({ step: 'import-finish', jobId }).catch(() => {});
    return null;
  }
  if (typeof (error as { status?: unknown })?.status === 'number') {
    await deps.job({ step: 'import-cancel', jobId }).catch(() => {});
    return null;
  }
  const st = (await deps.job({ step: 'import-status', jobId }).catch(() => null)) as { state?: string; result?: { pageIds: string[]; pages: number; databases: number } | null } | null;
  if (st?.result && (st.state === 'done' || st.state === 'closed')) {
    await deps.job({ step: 'import-finish', jobId }).catch(() => {});
    return st.result;
  }
  return null;
}
