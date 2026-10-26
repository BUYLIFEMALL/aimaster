import { createHash, randomBytes } from 'node:crypto';
import type { Access } from '../work-api';
import { parsePostUrl } from '../material-preview';
import { APP_VERSION } from '../version';

type Obj = Record<string, unknown>;
type RpcResult = { data: unknown; error: { message?: string; code?: string } | null };
export type ReaderDependencies = {
  member: () => Promise<Access>;
  user: (userId: string) => Promise<Access>;
  pairingOwner: (hash: string) => Promise<string | null>;
  device: (hash: string) => Promise<{ userId: string; deviceId: string } | null>;
  rpc: (userId: string | null, operation: string, payload: Obj) => Promise<RpcResult>;
};
const object = (x: unknown): x is Obj => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const keys = (x: Obj, names: string[]) => Object.keys(x).every(k => names.includes(k));
const uuid = (x: unknown): x is string => typeof x === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(x);
const blog = (x: unknown): x is string => typeof x === 'string' && /^[a-z0-9_-]{1,50}$/i.test(x);
export const hashSecret = (text: string) => createHash('sha256').update(text).digest('hex');
export const READER_VERSION = APP_VERSION;
const metadata = { relationship: 'unknown', canAutoEngage: false, naverOwnershipIndependentlyVerified: false, aiAnalysisPerformed: false };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: {
  'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Origin', 'X-Content-Type-Options': 'nosniff',
} });
class BadRequest extends Error { constructor(readonly status = 400) { super(); } }
function bad(): never { throw new BadRequest(); }
async function input(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new BadRequest(415);
  const reader = request.body?.getReader(); if (!reader) bad();
  let size = 0; const chunks: Uint8Array[] = [];
  for (;;) {
    const part = await reader.read(); if (part.done) break;
    size += part.value.byteLength; if (size > 128 * 1024) { await reader.cancel(); throw new BadRequest(413); }
    chunks.push(part.value);
  }
  let value: unknown;
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { bad(); }
  if (!object(value) || !keys(value, ['operation', 'payload']) || typeof value.operation !== 'string' || !object(value.payload)) bad();
  return { operation: value.operation, payload: value.payload };
}
function errorReply(error: unknown) {
  if (error instanceof BadRequest) return reply({ error: '요청 형식·출처·입력 크기를 확인해 주세요.' }, error.status);
  return reply({ error: '연결 서버 상태를 확인해 주세요.' }, 503);
}
function rpcReply(result: RpcResult, extra: Obj = {}) {
  if (!result.error) return reply({ data: result.data, ...extra });
  const message = result.error.message ?? '';
  if (message === 'BNC_NOT_FOUND') return reply({ error: '자료 또는 연결을 찾을 수 없습니다.' }, 404);
  if (message === 'BNC_PAIR_INVALID') return reply({ error: '연결 번호가 만료되었거나 이미 사용됐습니다. 새 번호를 받아 주세요.' }, 409);
  if (/^BNC_(READER_(EXPIRED|DISCONNECTED|WRONG_BLOG|WRONG_POST|PENDING|CONTENT_CHANGED|RATE_LIMIT|DEVICE_LIMIT)|ACCOUNT_(REQUIRED|METHOD))$/.test(message)) {
    return reply({ error: '블로그·기기 연결 또는 이전 읽기 결과를 확인해 주세요.', reason: message }, 409);
  }
  if (['23514', '23502', '22P02'].includes(result.error.code ?? '')) return reply({ error: '입력값을 확인해 주세요.' }, 400);
  return reply({ error: '연결 서버 상태를 확인해 주세요.' }, 503);
}

export function createReaderMemberHandler(deps: ReaderDependencies) {
  return async (request: Request) => {
    const url = new URL(request.url), origin = `${url.protocol}//${request.headers.get('host') ?? url.host}`;
    if (request.method !== 'POST') return reply({ error: 'POST 요청이 필요합니다.' }, 405);
    if (request.headers.get('origin') !== origin || request.headers.get('sec-fetch-site') === 'cross-site') return reply({ error: '프로그램 화면에서 요청해 주세요.' }, 403);
    try {
      const access = await deps.member(); if (!access.allowed) return reply({ error: access.error }, access.status);
      const { operation, payload } = await input(request);
      if (operation === 'pair') {
        if (!keys(payload, ['blog_id', 'owner_confirmed']) || !blog(payload.blog_id) || payload.owner_confirmed !== true) bad();
        const code = randomBytes(16).toString('hex');
        const result = await deps.rpc(access.userId, 'pair_issue', { code_hash: hashSecret(code), blog_id: payload.blog_id.toLowerCase() });
        return rpcReply(result, result.error ? {} : { code });
      }
      if (['devices', 'materials'].includes(operation)) {
        if (!keys(payload, [])) bad();
      } else if (operation === 'material') {
        if (!keys(payload, ['id']) || !uuid(payload.id)) bad();
      } else if (operation === 'revoke') {
        if (!keys(payload, ['device_id']) || !uuid(payload.device_id)) bad();
      } else bad();
      return rpcReply(await deps.rpc(access.userId, operation, payload), { ...metadata });
    } catch (error) { return errorReply(error); }
  };
}

export function createReaderExtensionHandler(deps: ReaderDependencies) {
  return async (request: Request) => {
    if (request.method !== 'POST') return reply({ error: 'POST 요청이 필요합니다.' }, 405);
    // No cookie authentication on this endpoint. Only the extension's bearer capability.
    const origin = request.headers.get('origin');
    if (origin && !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) return reply({ error: '확장에서 요청해 주세요.' }, 403);
    try {
      const { operation, payload } = await input(request);
      if (operation === 'connect') {
        if (!keys(payload, ['code', 'device_name', 'protocol']) || typeof payload.code !== 'string' ||
          !/^[a-f0-9]{32}$/.test(payload.code) || typeof payload.device_name !== 'string' ||
          !payload.device_name.trim() || payload.device_name.length > 50 || payload.protocol !== 1) bad();
        const userId = await deps.pairingOwner(hashSecret(payload.code));
        if (!userId) return reply({ error: '연결 번호가 만료되었거나 이미 사용됐습니다.' }, 409);
        const access = await deps.user(userId); if (!access.allowed) return reply({ error: access.error }, access.status);
        const token = randomBytes(32).toString('hex');
        const result = await deps.rpc(access.userId, 'pair_connect', { code_hash: hashSecret(payload.code),
          token_hash: hashSecret(token), device_name: payload.device_name.trim() });
        return rpcReply(result, result.error ? {} : { token, protocol: 1, latestVersion: READER_VERSION });
      }
      const token = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization') ?? '')?.[1];
      if (!token) return reply({ error: '확장 연결이 필요합니다.' }, 401);
      const device = await deps.device(hashSecret(token));
      if (!device) return reply({ error: '확장을 다시 연결해 주세요.' }, 401);
      const access = await deps.user(device.userId); if (!access.allowed) return reply({ error: access.error }, access.status);
      if (!['whoami', 'prepare', 'submit', 'status', 'disconnect'].includes(operation)) bad();
      if (operation === 'whoami' || operation === 'disconnect') {
        if (!keys(payload, [])) bad();
      } else if (operation === 'prepare') {
        if (!keys(payload, ['request_id', 'url']) || !uuid(payload.request_id)) bad();
        const post = parsePostUrl(payload.url); if (!post) bad();
        return rpcReply(await deps.rpc(access.userId, 'prepare', { device_id: device.deviceId, request_id: payload.request_id,
          blog_id: post.blogId, post_id: post.postId }), { ...metadata });
      } else if (operation === 'submit') {
        if (!keys(payload, ['request_id', 'snapshot']) || !uuid(payload.request_id) || !object(payload.snapshot) ||
          !keys(payload.snapshot, ['url', 'title', 'body', 'format']) || payload.snapshot.format !== 'naver-visible-text-v1' ||
          typeof payload.snapshot.title !== 'string' || payload.snapshot.title.length > 500 ||
          typeof payload.snapshot.body !== 'string' || payload.snapshot.body.length > 20000) bad();
        const post = parsePostUrl(payload.snapshot.url); if (!post) bad();
        const normalize = (s: string) => s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\ufeff]/g, '').trim();
        const title = normalize(payload.snapshot.title), body = normalize(payload.snapshot.body); if (!title || !body) bad();
        return rpcReply(await deps.rpc(access.userId, 'submit', { device_id: device.deviceId, request_id: payload.request_id,
          blog_id: post.blogId, post_id: post.postId, title, body }), { ...metadata, source: 'member-initiated-browser-read' });
      } else if (!keys(payload, ['request_id']) || !uuid(payload.request_id)) bad();
      return rpcReply(await deps.rpc(access.userId, operation === 'disconnect' ? 'revoke' : operation,
        { ...payload, device_id: device.deviceId }), { ...metadata, latestVersion: READER_VERSION });
    } catch (error) { return errorReply(error); }
  };
}
