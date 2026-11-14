import { tx } from '../features/shell/i18n.ts';

export const clientId = crypto.randomUUID();

export class ApiError extends Error {
  status: number;
  override name: string;
  /** the error response body */
  data?: any;
  constructor(status: number, name: string, message: string, data?: any) {
    super(message);
    this.status = status;
    this.name = name;
    this.data = data;
  }
}

/** 이식판 2026-11-14: 로그인 없이 보는 게시 페이지(/public/…) — 명령은 공개 입구(/api/public, 허용 명령만)로 보낸다 */
export const isPublicView = () => typeof location !== 'undefined' && location.pathname.startsWith('/public/');

export async function api<T = any>(name: string, body: unknown = {}, init?: { signal?: AbortSignal }): Promise<T> {
  const res = await fetch(`${isPublicView() ? '/api/public' : '/api/rpc'}/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-lit-client-id': clientId },
    body: JSON.stringify(body ?? {}),
    credentials: 'same-origin',
    signal: init?.signal,
  });
  let json: any = {};
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new ApiError(res.status, json?.name ?? 'Error', json?.message ?? res.statusText, json);
  return json as T;
}

/** `blockId`: the block the file goes into (Settings › Audit log "Uploaded {fileName} to {pageName}"). */
export async function uploadFile(file: File | Blob, name: string, spaceId?: string, blockId?: string): Promise<{ url: string; id: string; name: string; size: number; mime: string }> {
  // 이식판 2026-11-14: 4MB를 넘는 파일(50MB까지)은 서버를 거치지 않고 Storage로 바로 올린다(Vercel 본문 한도 4.5MB)
  if (file.size > 4 * 1024 * 1024) return uploadLargeFile(file, name, spaceId, blockId);
  const q = new URLSearchParams({ name, type: (file as File).type || 'application/octet-stream', ...(spaceId ? { spaceId } : {}), ...(blockId ? { blockId } : {}) });
  const res = await fetch(`/api/upload?${q}`, { method: 'POST', body: file, credentials: 'same-origin' });
  const json = await res.json();
  if (!res.ok) throw new ApiError(res.status, 'UploadError', json?.message ?? tx('Upload failed'));
  return json;
}

/** 이식판 2026-11-14: 큰 파일 — ① 서명된 올리기 주소 받기 ② Storage로 바로 올리기 ③ 끝났다고 알리기 */
async function uploadLargeFile(file: File | Blob, name: string, spaceId?: string, blockId?: string): Promise<{ url: string; id: string; name: string; size: number; mime: string }> {
  const type = (file as File).type || 'application/octet-stream';
  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/upload/large', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, 'UploadError', json?.message ?? tx('Upload failed'), json);
    return json;
  };
  const signed = await post({ step: 'sign', name, type, size: file.size, spaceId });
  const put = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'content-type': type, 'x-upsert': 'false' }, body: file });
  if (!put.ok) throw new ApiError(put.status, 'UploadError', '파일을 올리지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.');
  return post({ step: 'done', id: signed.id, blockId });
}
