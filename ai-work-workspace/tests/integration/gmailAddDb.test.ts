// WS-20261117-25 E4 A2-1 — 고른 Gmail 메일 → 받은 업무, DB 함수 public.gmail_inbox_add(루트 supabase/migrations/0075) 실제 DB 시험.
// 대상: Docker aww-pg-test(127.0.0.1:55432) 안의 **전용 DB qa_gmail_a2**(이 시험이 만들고 끝에 지움). aww·aww_dev는 건드리지 않음.
// 받은 업무 표는 원본 마이그레이션(ai-work-workspace/supabase/migrations/20261024001700·20261025000100) 그대로, 0075도 원문 그대로 적용.
// Supabase 기본 권한(public 표에 anon·authenticated·service_role 모두 권한, service_role은 RLS 건너뜀)은 시험 DB에서 같은 모양으로 흉내 냄.
// 실제 PostgREST(rpc) 호출은 없음 — 서버의 rpc 결과 해석은 모의로만 확인(미검증 표시).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';

const rpcMock = vi.hoisted(() => ({ reply: { data: null as unknown, error: null as null | { code?: string; message: string } }, calls: [] as { name: string; args: any }[] }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc: async (name: string, args: any) => { rpcMock.calls.push({ name, args }); return rpcMock.reply; } }),
}));

const ADMIN = 'postgres://postgres:awwlocal@127.0.0.1:55432/aww';
const DB = 'qa_gmail_a2';
const URL_DB = `postgres://postgres:awwlocal@127.0.0.1:55432/${DB}`;
const find = (rel: string) => ['.', '..', '../..'].map((d) => resolve(process.cwd(), d, rel)).find((f) => existsSync(f))!;
const SQL_INBOX = readFileSync(find('ai-work-workspace/supabase/migrations/20261024001700_work_inbox.sql'), 'utf8');
const SQL_TARGET = readFileSync(find('ai-work-workspace/supabase/migrations/20261025000100_work_inbox_target.sql'), 'utf8');
const SQL_0075 = readFileSync(find('supabase/migrations/0075_gmail_inbox_claims.sql'), 'utf8');
const U1 = 'd1111111-1111-4111-8111-111111111111';
const U2 = 'd2222222-2222-4222-8222-222222222222';
const H1 = 'a'.repeat(64);
const H2 = 'b'.repeat(64);
const link = (id: string) => `https://mail.google.com/mail/u/0/#all/${id}`;

let su: postgres.Sql; // 관리(시험 준비)
let a: postgres.Sql; // service_role 연결 1
let b: postgres.Sql; // service_role 연결 2(독립)
let gm: typeof import('../../src/server/gmailInbox.ts');

const asRole = (role: string) => postgres(URL_DB, { max: 1, onnotice: () => {}, connection: { options: `-c role=${role}` } as any });
const add = (db: postgres.Sql, user: string, hash: string, msg: string, title = '메일 확인', url = link(msg)) =>
  db`select status, inbox_id from public.gmail_inbox_add(${user}::uuid, ${hash}, ${msg}, ${title}, ${url})`.then((r) => r[0] as { status: string; inbox_id: string });
const count = async (sql: string) => (await su.unsafe(sql))[0].n as number;

beforeAll(async () => {
  const admin = postgres(ADMIN, { max: 1, onnotice: () => {} });
  await admin.unsafe(`drop database if exists ${DB}`);
  await admin.unsafe(`create database ${DB}`);
  await admin.end();
  su = postgres(URL_DB, { max: 1, onnotice: () => {} });
  await su.unsafe(`create schema if not exists auth;
    create table if not exists auth.users (id uuid primary key);
    create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`).simple();
  await su.unsafe(SQL_INBOX).simple();
  await su.unsafe(SQL_TARGET).simple();
  // Supabase 기본 권한 흉내(운영은 기본 권한으로 이미 이렇게 되어 있음 — 0075가 work_inbox 권한을 바꾸지 않음)
  await su.unsafe(`grant usage on schema public to anon, authenticated, service_role;
    grant all on public.work_inbox to anon, authenticated, service_role;`).simple();
  await su.unsafe(SQL_0075).simple();
  await su`insert into auth.users (id) values (${U1}), (${U2})`;
  a = asRole('service_role');
  b = asRole('service_role');
  gm = await import('../../src/server/gmailInbox.ts');
}, 60_000);
afterAll(async () => {
  await a?.end();
  await b?.end();
  await su?.end();
  const admin = postgres(ADMIN, { max: 1, onnotice: () => {} });
  await admin.unsafe(`drop database if exists ${DB} with (force)`);
  await admin.end();
});

describe('0075 보안 정의', () => {
  it('함수: SECURITY INVOKER·search_path 빈 값·service_role만 실행, 표: RLS 켜짐·정책 0·회원 역할 권한 0', async () => {
    const f = (await su`select p.prosecdef, p.proconfig, has_function_privilege('anon', p.oid, 'execute') as anon_x, has_function_privilege('authenticated', p.oid, 'execute') as auth_x, has_function_privilege('service_role', p.oid, 'execute') as svc_x
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'gmail_inbox_add'`)[0];
    expect(f).toEqual({ prosecdef: false, proconfig: ['search_path=""'], anon_x: false, auth_x: false, svc_x: true });
    const t = (await su`select c.relrowsecurity, (select count(*)::int from pg_policies where tablename = 'gmail_inbox_claims') as policies,
      has_table_privilege('anon', 'public.gmail_inbox_claims', 'select') as anon_s, has_table_privilege('authenticated', 'public.gmail_inbox_claims', 'select') as auth_s
      from pg_class c where c.oid = 'public.gmail_inbox_claims'::regclass`)[0];
    expect(t).toEqual({ relrowsecurity: true, policies: 0, anon_s: false, auth_s: false });
  });
  it.each(['anon', 'authenticated'])('%s 역할이 함수를 부르면 권한 거절(42501), 넣은 것 0', async (role) => {
    const c = asRole(role);
    try {
      const e: any = await add(c, U1, H1, 'mX').catch((x) => x);
      expect(e.code).toBe('42501');
    } finally {
      await c.end();
    }
    expect(await count(`select count(*)::int as n from public.gmail_inbox_claims`)).toBe(0);
    expect(await count(`select count(*)::int as n from public.work_inbox`)).toBe(0);
  });
});

describe('넣기·멱등·입력 검사(service_role)', () => {
  it('처음은 added, 같은 메일 다시(응답 유실 뒤 재시도 흉내)는 existing·같은 번호, 받은 업무는 1줄(제목·링크만)', async () => {
    const r1 = await add(a, U1, H1, 'm1', '  견적 회신  ');
    expect(r1.status).toBe('added');
    const r2 = await add(b, U1, H1, 'm1', '다른 제목');
    expect(r2).toEqual({ status: 'existing', inbox_id: r1.inbox_id });
    const rows = await su`select user_id, source_slug, kind, title, body_md, data, source_url, target_slug from public.work_inbox where id = ${r1.inbox_id}`;
    expect(rows).toEqual([{ user_id: U1, source_slug: 'ai-work-workspace', kind: 'link', title: '견적 회신', body_md: '', data: {}, source_url: link('m1'), target_slug: 'ai-work-workspace' }]);
    expect(await count(`select count(*)::int as n from public.work_inbox`)).toBe(1);
    expect((await su`select inbox_id from public.gmail_inbox_claims where user_id = ${U1} and message_id = 'm1'`)[0].inbox_id).toBe(r1.inbox_id);
  });
  it.each([
    ['해시 형식 위반', U1, 'not-hex', 'm9', '제목', link('m9')],
    ['메시지 번호 형식 위반', U1, H1, '../x', '제목', link('../x')],
    ['제목 비어 있음', U1, H1, 'm9', '   ', link('m9')],
    ['제목 201자', U1, H1, 'm9', 'x'.repeat(201), link('m9')],
    ['다른 주소(위조)', U1, H1, 'm9', '제목', 'https://evil.example/#all/m9'],
    ['다른 메시지 링크', U1, H1, 'm9', '제목', link('m8')],
  ])('%s → 22023 거절, 넣은 것 0', async (_n, user, hash, msg, title, url) => {
    const before = await count(`select count(*)::int as n from public.work_inbox`);
    const e: any = await add(a, user, hash, msg, title, url).catch((x) => x);
    expect(e.code).toBe('22023');
    expect(await count(`select count(*)::int as n from public.work_inbox`)).toBe(before);
    expect(await count(`select count(*)::int as n from public.gmail_inbox_claims where message_id = 'm9'`)).toBe(0);
  });
  it('격리: 다른 회원·다른 계정 해시·다른 메시지는 각각 따로 added', async () => {
    const x = await add(a, U2, H1, 'm1');
    const y = await add(a, U1, H2, 'm1');
    const z = await add(a, U1, H1, 'm2');
    expect([x.status, y.status, z.status]).toEqual(['added', 'added', 'added']);
    expect(new Set([x.inbox_id, y.inbox_id, z.inbox_id]).size).toBe(3);
    expect((await su`select user_id from public.work_inbox where id = ${x.inbox_id}`)[0].user_id).toBe(U2);
  });
});

describe('동시성·실패·삭제 경합(독립 연결 2개)', () => {
  it('같은 메일을 두 연결이 동시에: 뒤 요청은 앞 거래 커밋을 기다려 existing·같은 번호, 받은 업무 1줄(빈 번호 노출 0)', async () => {
    const before = await count(`select count(*)::int as n from public.work_inbox`);
    let first: any;
    const t1 = a.begin(async (tx) => {
      first = (await tx`select status, inbox_id from public.gmail_inbox_add(${U1}::uuid, ${H1}, 'm3', '동시 1', ${link('m3')})`)[0];
      await tx`select pg_sleep(0.4)`;
    });
    await new Promise((r) => setTimeout(r, 100));
    const second = await add(b, U1, H1, 'm3', '동시 2');
    await t1;
    expect(first.status).toBe('added');
    expect(second).toEqual({ status: 'existing', inbox_id: first.inbox_id });
    expect(second.inbox_id).not.toBeNull();
    expect(await count(`select count(*)::int as n from public.work_inbox`)).toBe(before + 1);
  });
  it('클레임을 넣은 뒤 받은 업무 넣기가 실패 → 함수 전체 되돌림(클레임·업무 0, 고아 0)', async () => {
    await su.unsafe(`create function public.qa_boom() returns trigger language plpgsql as $$ begin if new.title = 'BOOM' then raise exception 'boom'; end if; return new; end $$;
      create trigger qa_boom before insert on public.work_inbox for each row execute function public.qa_boom();`).simple();
    try {
      const e: any = await add(a, U1, H1, 'm4', 'BOOM').catch((x) => x);
      expect(String(e.message)).toContain('boom');
      expect(await count(`select count(*)::int as n from public.gmail_inbox_claims where message_id = 'm4'`)).toBe(0);
      expect(await count(`select count(*)::int as n from public.work_inbox where title = 'BOOM'`)).toBe(0);
      expect((await add(a, U1, H1, 'm4', '다시')).status).toBe('added'); // 실패 뒤 다시 넣기 가능
    } finally {
      await su.unsafe(`drop trigger qa_boom on public.work_inbox; drop function public.qa_boom();`).simple();
    }
  });
  it('받은 업무를 지우는 거래가 진행 중일 때 같은 메일 넣기 → 지우기 커밋 뒤 새로 added(새 번호), 클레임은 새 번호를 가리킴', async () => {
    const old = await add(a, U1, H1, 'm5');
    const t1 = a.begin(async (tx) => {
      await tx`delete from public.work_inbox where id = ${old.inbox_id}`;
      await tx`select pg_sleep(0.4)`;
    });
    await new Promise((r) => setTimeout(r, 100));
    const again = await add(b, U1, H1, 'm5');
    await t1;
    expect(again.status).toBe('added');
    expect(again.inbox_id).not.toBe(old.inbox_id);
    expect((await su`select inbox_id from public.gmail_inbox_claims where user_id = ${U1} and account_hash = ${H1} and message_id = 'm5'`).map((r) => r.inbox_id)).toEqual([again.inbox_id]);
  });
  it('지우는 거래가 되돌려지면 → existing·원래 번호', async () => {
    const old = await add(a, U1, H1, 'm6');
    const t1 = a.begin(async (tx) => {
      await tx`delete from public.work_inbox where id = ${old.inbox_id}`;
      await tx`select pg_sleep(0.3)`;
      throw new Error('rollback on purpose');
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 100));
    const again = await add(b, U1, H1, 'm6');
    await t1;
    expect(again).toEqual({ status: 'existing', inbox_id: old.inbox_id });
  });
  it('보관 경계: 받은 업무 줄을 지우면 클레임도 함께 지워짐(중복 방지 = 그 업무가 있는 동안)', async () => {
    const r = await add(a, U1, H1, 'm7');
    await su`delete from public.work_inbox where id = ${r.inbox_id}`;
    expect(await count(`select count(*)::int as n from public.gmail_inbox_claims where message_id = 'm7'`)).toBe(0);
    expect((await add(a, U1, H1, 'm7')).status).toBe('added');
  });
});

describe('서버의 rpc 결과 해석(모의 — 실제 PostgREST 미검증)', () => {
  const input = { userId: U1, accountHash: H1, messageId: 'm1', title: 't', sourceUrl: link('m1') };
  it('함수 이름·인자 이름, 배열 결과 → added/existing', async () => {
    const store = (await import('../../src/server/gmailInbox.ts')).gmailDefaultStoreForTests();
    rpcMock.calls.length = 0;
    rpcMock.reply = { data: [{ status: 'existing', inbox_id: 'x-1' }], error: null };
    expect(await store.addToInbox(input)).toEqual({ status: 'existing', inboxId: 'x-1' });
    expect(rpcMock.calls[0]).toEqual({ name: 'gmail_inbox_add', args: { p_user: U1, p_account_hash: H1, p_message_id: 'm1', p_title: 't', p_source_url: link('m1') } });
  });
  it.each([
    ['40001(그사이 바뀜)', { data: null, error: { code: '40001', message: 'gmail_inbox_add: claim changed, retry' } }, 'conflict'],
    ['그 밖 오류(원문 노출 0)', { data: null, error: { code: '22023', message: 'gmail_inbox_add: invalid source url' } }, 'server'],
    ['결과 모양 이상', { data: [{ status: 'weird', inbox_id: 1 }], error: null }, 'server'],
    ['결과 없음', { data: [], error: null }, 'server'],
  ])('%s → %s', async (_n, reply, code) => {
    const store = (await import('../../src/server/gmailInbox.ts')).gmailDefaultStoreForTests();
    rpcMock.reply = reply as any;
    const e: any = await store.addToInbox(input).catch((x) => x);
    expect(e.code).toBe(code);
    expect(e.message).not.toContain('gmail_inbox_add');
  });
});
