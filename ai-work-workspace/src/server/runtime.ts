// 원본 litpage 서버를 Next.js 라우트에서 부르기 위한 실행부.
// 원본 app.ts(Hono)가 하던 초기화(기능 명령 합치기·실시간 권한 연결)를 그대로 하되, 로그인은 AIMaster 통합 계정
// (Supabase 세션 + 프로그램 이용 권한)으로 바꾸고, 1단계에서 닫은 명령은 stagePolicy가 막는다.
import 'server-only';
import { handlers, ApiError, type Ctx } from '@/litpage/server/api/handlers.ts';
import { extraHandlers } from '@/litpage/server/api/extra.ts';
import { realtime } from '@/litpage/server/realtime.ts';
import { applyTransactions, blockRole, RecordMapBuilder, recordRole, setStrictUserVisibility, UserVisibility } from '@/litpage/server/records.ts';
import { redactDatabaseRecord } from '@/litpage/server/propaccess.ts';
import { getRecord, putRecord, withRequestCache } from '@/litpage/server/db.ts';
import { createUser, createWorkspace } from '@/litpage/server/seed.ts';
import { KOREAN_TEAM, KOREAN_WELCOME } from './koreanSeed';
import { isSpaceMember } from '#shared/permissions.ts';
import type { BlockRecord, SpaceRecord, UserRecord, UserSettingsRecord } from '#shared/records.ts';
import { newId } from '#shared/ids.ts';
import { stageBlock, stageBodyBlock } from './stagePolicy';
import { installAutofillHook } from '@/litpage/server/ai/autofillAuto.ts';
import { workInboxHandlers } from './workInbox';
import { receiptHandlers } from './receipts';
import { calendarHandlers } from './calendarSync';
import { resolveInvitees, sharingChangeProblem } from './collab';
import './agentRuns'; // U12: 에이전트 백그라운드 실행을 주인 회원 본인 키로 감싸는 연결(불러오면 바로 설치됨)

type Handler = (ctx: Ctx, body: any) => any | Promise<any>;

let ready = false;
function init() {
  if (ready) return;
  Object.assign(handlers, extraHandlers);
  installAutofillHook(); // U3: 원본은 AI 라우트 등록 때 켰음 — 데이터베이스 AI 자동 채우기(회원 본인 키로만 동작)
  setStrictUserVisibility(true); // U13: 다른 사용자 프로필은 같은 워크스페이스·함께 공유된 페이지 사람에게만
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
  /** 처음 사용자 레코드를 만들 때 메인 사이트 프로필 이름을 읽는다(없으면 name 사용) */
  resolveName?: () => Promise<string>;
}

/** AIMaster 회원이 처음 들어오면 원본 사용자 레코드(lit_user·user_root·user_settings)를 만든다. 이메일이 바뀌면 맞춘다. */
export function ensureMember(member: Member) {
  const existing = getRecord<UserRecord>('lit_user', member.id);
  if (!existing) {
    createUser(member.id, member.email.toLowerCase(), member.name);
    // AIMaster 회원 기본값: 한국어 화면·서울 시간대(원본은 영어·서버 시간대 — Vercel 서버는 UTC)
    const settings = getRecord<UserSettingsRecord>('user_settings', member.id);
    if (settings) {
      putRecord('user_settings', {
        ...settings,
        version: (settings.version ?? 0) + 1,
        settings: { ...settings.settings, locale: 'ko-KR', time_zone: 'Asia/Seoul' },
      } as UserSettingsRecord);
    }
    return;
  }
  const email = member.email.toLowerCase();
  if (email && (existing as { email?: string }).email !== email) {
    putRecord('lit_user', { ...existing, email, version: (existing.version ?? 0) + 1 } as UserRecord);
  }
}

/** 이식판에서 원본 명령 대신 쓰는 명령(돌려주는 모양은 원본과 같음) */
const OVERRIDES: Record<string, Handler> = {
  // U13 협업(2026-11-11): 초대는 AIMaster 회원 + 이 프로그램 이용 권한이 있는 사람만. 내부 사용자를 그 회원 id로 먼저 만든 뒤 원본 명령에 넘긴다
  async inviteMembers(ctx, input) {
    if (!ctx.userId) throw new ApiError('Unauthorized', 401);
    const people = await resolveInvitees(input?.emails, [], ctx.userId);
    for (const p of people) ensureMember(p);
    return handlers.inviteMembers(ctx, { ...input, emails: people.map((p) => p.email) });
  },
  async invitePagePermissions(ctx, input) {
    if (!ctx.userId) throw new ApiError('Unauthorized', 401);
    const people = await resolveInvitees(input?.emails, input?.userIds, ctx.userId);
    for (const p of people) ensureMember(p);
    // 워크스페이스 최상위 페이지의 권한 목록이 비어 있으면 「멤버 모두 각자 역할」이라는 뜻 — 사람만 넣으면 멤버·본인이 빠지므로
    // 화면 공유 메뉴(ShareMenu)처럼 먼저 「멤버 모두 편집 가능」 + 「공유하는 사람 전체 권한」을 넣는다
    const page = getRecord<BlockRecord>('block', String(input?.pageId ?? ''));
    if (page && page.parent_table === 'space' && !(page.permissions ?? []).length && blockRole(page.id, ctx.userId) !== 'none') {
      applyTransactions(ctx.userId, [{
        id: newId(), spaceId: page.space_id, debug: { userAction: 'invitePagePermissions' },
        operations: [{ pointer: { table: 'block', id: page.id, spaceId: page.space_id }, path: [], command: 'update', args: { permissions: [
          { type: 'space_permission', role: 'read_and_write', added_timestamp: Date.now() },
          { type: 'user_permission', role: 'editor', user_id: ctx.userId, added_timestamp: Date.now() },
        ] } }],
      }] as any, ctx.clientId);
    }
    return (handlers as Record<string, Handler>).invitePagePermissions(ctx, { ...input, emails: people.map((p) => p.email), userIds: [] });
  },
  // 한국어 환영 문서·팀 이름으로 워크스페이스를 만든다(원본 handlers.createWorkspace와 같은 결과 모양)
  createWorkspace(ctx, { name, icon }) {
    if (!ctx.userId) throw new ApiError('Unauthorized', 401);
    const { space } = createWorkspace(ctx.userId, String(name || '내 워크스페이스').slice(0, 200), icon, { welcome: KOREAN_WELCOME, team: KOREAN_TEAM });
    return { spaceId: space.id, recordMap: new RecordMapBuilder(ctx.userId).map };
  },
  // U7 업무 받은편지함(src/server/workInbox.ts)
  ...workInboxHandlers,
  // 영수증·세금계산서(2026-11-11, src/server/receipts.ts)
  ...receiptHandlers,
  // 구글 캘린더 연동(2026-11-11, src/server/calendarSync.ts)
  ...calendarHandlers,
};

/** U3: AI 스트림 라우트용 — 초기화와 회원 레코드 준비(RPC와 같은 순서). */
export async function readyMember(member: Member): Promise<Member> {
  init();
  if (member.resolveName && !getRecord<UserRecord>('lit_user', member.id)) member = { ...member, name: await member.resolveName() };
  ensureMember(member);
  return member;
}

export interface RpcResult {
  status: number;
  body: unknown;
}

/** 원본 /api/rpc/:name 과 같은 응답 모양({errorId, name, message})으로 처리한다. */
export async function runRpc(name: string, body: unknown, member: Member, clientId?: string): Promise<RpcResult> {
  init();
  const handler: Handler | undefined = Object.hasOwn(OVERRIDES, name)
    ? OVERRIDES[name]
    : Object.hasOwn(handlers, name) ? (handlers as Record<string, Handler>)[name] : undefined;
  if (!handler) return { status: 404, body: { errorId: newId(), name: 'NotFound', message: 'Unknown endpoint' } };
  const blocked = stageBlock(name);
  if (blocked) return { status: blocked.status, body: { errorId: newId(), name: 'PermissionError', message: blocked.message } };
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const blockedBody = stageBodyBlock(name, input);
  if (blockedBody) return { status: blockedBody.status, body: { errorId: newId(), name: 'PermissionError', message: blockedBody.message } };
  try {
    const result = await withRequestCache(async () => {
      if (member.resolveName && !getRecord<UserRecord>('lit_user', member.id)) member = { ...member, name: await member.resolveName() };
      ensureMember(member);
      if (name === 'applyChanges') {
        const problem = sharingChangeProblem(input, {
          block: (id) => getRecord<BlockRecord>('block', id) as any,
          isMember: (sid, uid) => { const sp = getRecord<SpaceRecord>('space', sid); return !!sp && isSpaceMember(sp, uid); },
        });
        if (problem) throw new ApiError(problem, 403);
      }
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
