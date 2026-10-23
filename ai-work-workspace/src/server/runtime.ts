// 원본 litpage 서버를 Next.js 라우트에서 부르기 위한 실행부.
// 원본 app.ts(Hono)가 하던 초기화(기능 명령 합치기·실시간 권한 연결)를 그대로 하되, 로그인은 AIMaster 통합 계정
// (Supabase 세션 + 프로그램 이용 권한)으로 바꾸고, 1단계에서 닫은 명령은 stagePolicy가 막는다.
import 'server-only';
import { handlers, ApiError, type Ctx } from '@/litpage/server/api/handlers.ts';
import { extraHandlers } from '@/litpage/server/api/extra.ts';
import { realtime } from '@/litpage/server/realtime.ts';
import { blockRole, recordRole, UserVisibility } from '@/litpage/server/records.ts';
import { redactDatabaseRecord } from '@/litpage/server/propaccess.ts';
import { getRecord, putRecord, withRequestCache } from '@/litpage/server/db.ts';
import { createUser } from '@/litpage/server/seed.ts';
import { isSpaceMember } from '#shared/permissions.ts';
import type { SpaceRecord, UserRecord } from '#shared/records.ts';
import { newId } from '#shared/ids.ts';
import { stageBlock } from './stagePolicy';

type Handler = (ctx: Ctx, body: any) => any | Promise<any>;

let ready = false;
function init() {
  if (ready) return;
  Object.assign(handlers, extraHandlers);
  realtime.setRoleResolver((table, rec, userId) => recordRole(table, rec, userId));
  realtime.setAccess({
    page: (pageId, userId) => blockRole(pageId, userId) !== 'none',
    space: (spaceId, userId) => isSpaceMember(getRecord<SpaceRecord>('space', spaceId), userId),
    view: (table, rec, userId) => (table === 'lit_user' ? new UserVisibility(userId).user(rec) : redactDatabaseRecord(table, rec, userId)),
  });
  ready = true;
}

export interface Member {
  id: string;
  email: string;
  name: string;
}

/** AIMaster 회원이 처음 들어오면 원본 사용자 레코드(lit_user·user_root·user_settings)를 만든다. 이메일이 바뀌면 맞춘다. */
export function ensureMember(member: Member) {
  const existing = getRecord<UserRecord>('lit_user', member.id);
  if (!existing) {
    createUser(member.id, member.email.toLowerCase(), member.name);
    return;
  }
  const email = member.email.toLowerCase();
  if (email && (existing as { email?: string }).email !== email) {
    putRecord('lit_user', { ...existing, email, version: (existing.version ?? 0) + 1 } as UserRecord);
  }
}

export interface RpcResult {
  status: number;
  body: unknown;
}

/** 원본 /api/rpc/:name 과 같은 응답 모양({errorId, name, message})으로 처리한다. */
export async function runRpc(name: string, body: unknown, member: Member, clientId?: string): Promise<RpcResult> {
  init();
  const handler: Handler | undefined = Object.hasOwn(handlers, name) ? (handlers as Record<string, Handler>)[name] : undefined;
  if (!handler) return { status: 404, body: { errorId: newId(), name: 'NotFound', message: 'Unknown endpoint' } };
  const blocked = stageBlock(name);
  if (blocked) return { status: blocked.status, body: { errorId: newId(), name: 'PermissionError', message: blocked.message } };
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  try {
    const result = await withRequestCache(async () => {
      ensureMember(member);
      const ctx: Ctx = { userId: member.id, clientId: clientId?.slice(0, 100), secure: true, setCookie: () => {} };
      return handler(ctx, input);
    });
    return { status: 200, body: result ?? {} };
  } catch (e: any) {
    const st = typeof e?.status === 'number' && e.status >= 400 && e.status < 600 ? e.status : 500;
    const status = e instanceof ApiError ? e.status : st;
    if (status >= 500) console.error(`[api] ${name} failed`, e);
    else if (status === 403 || (status === 400 && name === 'applyChanges')) console.warn(`[authz] ${name} ${status} user=${member.id}: ${String(e?.message ?? '').slice(0, 300)}`);
    const kind = status === 401 ? 'UnauthorizedError' : status === 403 ? 'PermissionError' : status === 429 ? 'RateLimitedError' : status >= 500 ? 'InternalError' : 'ValidationError';
    // 내부 오류는 기록만 하고 SQL·스택은 보내지 않는다(원본과 같음)
    return { status, body: { errorId: newId(), name: kind, message: status >= 500 ? '요청을 처리하는 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.' : (e?.message ?? 'Error') } };
  }
}
