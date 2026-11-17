// WS-20261117-25 E4 F03 — 「회원당 Gmail 연결 1개」 부분 고유 인덱스(루트 supabase/migrations/0074) 실제 DB 시험.
// 대상: Docker aww-pg-test(127.0.0.1:55432) 안의 **전용 DB qa_gmail_f03**(이 시험이 만들고 끝에 지움). aww·aww_dev는 건드리지 않음.
// 실제 0039(공용 연결 표·카탈로그·외래 키·고유 조건) 원문과 0074 원문을 그대로 적용하고, **서로 독립된 연결 2개**로 실제 upsert를 보낸다.
// PostgREST(Supabase API)는 없음 — 기본 저장 경로(공용 saveMemberAccount)는 요청 모양·오류 문구 대응만 모의로 확인(실제 PostgREST 동작은 미검증).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';

const upserts = vi.hoisted(() => ({ calls: [] as { table: string; payload: any; opts: any }[], nextError: null as null | { message: string } }));
vi.mock('@/lib/supabase/admin', () => {
  // 공용 saveMemberAccount가 부르는 모양만 흉내(select … maybeSingle → upsert)
  const chain = (table: string) => {
    const q: any = {
      select: () => q, eq: () => q, order: () => q, limit: () => q,
      maybeSingle: async () => ({ data: null, error: null }),
      upsert: async (payload: any, opts: any) => { upserts.calls.push({ table, payload, opts }); return { error: upserts.nextError }; },
    };
    return q;
  };
  return { createAdminClient: () => ({ from: (t: string) => chain(t) }) };
});

const ADMIN = 'postgres://postgres:awwlocal@127.0.0.1:55432/aww';
const DB = 'qa_gmail_f03';
const URL_DB = `postgres://postgres:awwlocal@127.0.0.1:55432/${DB}`;
const find = (rel: string) => ['.', '..', '../..'].map((d) => resolve(process.cwd(), d, rel)).find((f) => existsSync(f))!;
const M0039 = readFileSync(find('supabase/migrations/0039_member_integrations.sql'), 'utf8');
const M0074 = readFileSync(find('supabase/migrations/0074_gmail_catalog_one_account.sql'), 'utf8');
const EXPECTED_DEF = `CREATE UNIQUE INDEX member_platform_accounts_gmail_one ON public.member_platform_accounts USING btree (user_id) WHERE (platform = 'google_gmail'::text)`;
const U1 = 'c1111111-1111-4111-8111-111111111111';
const U2 = 'c2222222-2222-4222-8222-222222222222';

let a: postgres.Sql; // 연결 1
let b: postgres.Sql; // 연결 2(독립)
let gm: typeof import('../../src/server/gmailInbox.ts');
const evidence: Record<string, unknown> = {};

/** 공용 saveMemberAccount의 upsert와 같은 SQL(onConflict user_id,platform,external_id) */
const upsertSql = (db: postgres.Sql, user: string, platform: string, sub: string, token: string, refresh: string | null = 'r1') => db`
  insert into public.member_platform_accounts (user_id, platform, external_id, username, access_token, refresh_token, granted_scopes, auth_method, app_ref, extra, needs_reconnect, connected_via, updated_at)
  values (${user}, ${platform}, ${sub}, null, ${token}, ${refresh}, ${['https://www.googleapis.com/auth/gmail.metadata']}, 'oauth', 'client-1', '{}'::jsonb, false, 'ai-work-workspace', now())
  on conflict (user_id, platform, external_id) do update set
    access_token = excluded.access_token, refresh_token = excluded.refresh_token, granted_scopes = excluded.granted_scopes,
    app_ref = excluded.app_ref, needs_reconnect = false, updated_at = now()`;
const apply0074 = async () => {
  try {
    await a.unsafe(M0074).simple();
    return null;
  } catch (e: any) {
    await a.unsafe('rollback').simple().catch(() => {});
    return String(e?.message ?? e);
  }
};
const indexDef = async () => (await a`select indexdef from pg_indexes where schemaname = 'public' and indexname = 'member_platform_accounts_gmail_one'`)[0]?.indexdef ?? null;
const catalogRow = async () => (await a`select key, label from public.integration_catalog where key = 'google_gmail'`)[0] ?? null;
const gmailRows = async (user: string) => a`select external_id, access_token, refresh_token from public.member_platform_accounts where user_id = ${user} and platform = 'google_gmail' order by external_id`;

beforeAll(async () => {
  const admin = postgres(ADMIN, { max: 1, onnotice: () => {} });
  await admin.unsafe(`drop database if exists ${DB}`);
  await admin.unsafe(`create database ${DB}`);
  await admin.end();
  a = postgres(URL_DB, { max: 1, onnotice: () => {} });
  b = postgres(URL_DB, { max: 1, onnotice: () => {} });
  // Supabase가 주는 auth 스키마 최소 흉내(0039가 참조하는 것만)
  await a.unsafe(`create schema if not exists auth;
    create table if not exists auth.users (id uuid primary key);
    create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`).simple();
  await a.unsafe(M0039).simple();
  await a`insert into auth.users (id) values (${U1}), (${U2})`;
  gm = await import('../../src/server/gmailInbox.ts');
}, 60_000);
afterAll(async () => {
  await a?.end();
  await b?.end();
  const admin = postgres(ADMIN, { max: 1, onnotice: () => {} });
  await admin.unsafe(`drop database if exists ${DB} with (force)`);
  await admin.end();
});

describe('0074 적용 전 — 실제 0039 제약 그대로', () => {
  it('카탈로그에 google_gmail이 없으면 Gmail 연결 저장은 외래 키로 거절(23503)', async () => {
    const e: any = await upsertSql(a, U1, 'google_gmail', 'sub-A', 't').catch((x) => x);
    expect(e.code).toBe('23503');
    expect(e.constraint_name).toBe('member_platform_accounts_platform_fkey');
    expect(gm.isGmailOneAccountViolation(e.message)).toBe(false);
  });
});

describe('0074 멈춤 조건 — 지우지 않고 전체 되돌림', () => {
  it('카탈로그 google_gmail이 있는데 내용이 다르면 멈춤(인덱스도 안 생김)', async () => {
    await a`insert into public.integration_catalog (key, kind, label) values ('google_gmail', 'oauth_account', '다른 이름')`;
    const err = await apply0074();
    expect(err).toContain('different content');
    expect(await indexDef()).toBeNull();
    expect((await catalogRow())?.label).toBe('다른 이름'); // 바꾸지 않음
    await a`delete from public.integration_catalog where key = 'google_gmail'`; // 이 시험이 넣은 줄만 정리
  });
  it('같은 이름 인덱스가 다른 정의면 멈춤(카탈로그 삽입도 되돌림)', async () => {
    await a.unsafe(`create unique index member_platform_accounts_gmail_one on public.member_platform_accounts (user_id) where platform = 'youtube'`);
    const err = await apply0074();
    expect(err).toContain('index definition mismatch');
    expect(await catalogRow()).toBeNull();
    await a.unsafe('drop index public.member_platform_accounts_gmail_one');
  });
  it('이미 한 회원에 google_gmail 줄이 2개 → 멈춤, 줄 그대로(삭제 0), 인덱스 없음', async () => {
    await a`insert into public.integration_catalog (key, kind, label, description, key_names, scope_sets, connect_program_url, sort_order, is_active)
      values ('google_gmail', 'oauth_account', 'Gmail(받은 편지함 목록)', '본인 Google 앱으로 연결한 Gmail의 받은 편지함 최근 메일 제목·보낸 사람·날짜 보기(본문 읽기 없음).',
        ${['google_client_id', 'google_client_secret']}, ${a.json({ metadata: ['https://www.googleapis.com/auth/gmail.metadata'] })}, 'https://ai-work-workspace.buylife.xyz/inbox', 63, true)`;
    await upsertSql(a, U1, 'google_gmail', 'sub-A', 't-a');
    await upsertSql(a, U1, 'google_gmail', 'sub-B', 't-b');
    const err = await apply0074();
    expect(err).toContain('2+ google_gmail rows');
    expect((await gmailRows(U1)).length).toBe(2);
    expect(await indexDef()).toBeNull();
    await a`delete from public.member_platform_accounts where user_id = ${U1} and platform = 'google_gmail'`; // 이 시험이 넣은 줄만 정리
  });
});

describe('0074 적용 — 정의 검증·다시 실행', () => {
  it('적용 성공, 인덱스 정의가 기대와 정확히 같음, 두 번 실행해도 통과(같은 내용)', async () => {
    expect(await apply0074()).toBeNull();
    expect(await indexDef()).toBe(EXPECTED_DEF);
    expect((await catalogRow())?.label).toBe('Gmail(받은 편지함 목록)');
    expect(await apply0074()).toBeNull();
    evidence.indexdef = await indexDef();
  });
});

describe('F03 — 독립 연결 2개, 실제 upsert', () => {
  it('서로 다른 계정 동시 저장: 하나만 성공, 다른 하나 23505(정확한 인덱스 이름), 먼저 저장된 토큰은 그대로', async () => {
    // 연결 1이 거래 안에서 sub-A를 넣고 커밋 전 대기 → 연결 2의 sub-B 저장은 인덱스에서 기다렸다가 23505
    const t1 = a.begin(async (tx) => {
      await upsertSql(tx as any, U2, 'google_gmail', 'sub-A', 'token-A');
      await tx`select pg_sleep(0.4)`;
    });
    await new Promise((r) => setTimeout(r, 100));
    const e: any = await upsertSql(b, U2, 'google_gmail', 'sub-B', 'token-B').catch((x) => x);
    await t1;
    expect(e.code).toBe('23505');
    expect(e.constraint_name).toBe('member_platform_accounts_gmail_one');
    expect(gm.isGmailOneAccountViolation(e.message)).toBe(true);
    evidence.message = e.message;
    expect((await gmailRows(U2)).map((r) => [r.external_id, r.access_token])).toEqual([['sub-A', 'token-A']]);
  });
  it('반대 순서(이미 연결된 뒤 다른 계정)도 23505·기존 토큰 그대로', async () => {
    const e: any = await upsertSql(b, U2, 'google_gmail', 'sub-C', 'token-C').catch((x) => x);
    expect(e.code).toBe('23505');
    expect((await gmailRows(U2)).map((r) => r.access_token)).toEqual(['token-A']);
  });
  it('같은 계정 다시 연결: 같은 줄 갱신(줄 1개), refresh_token은 넘긴 값(공용 함수가 같은 앱이면 기존 값을 넘김)으로 유지', async () => {
    await upsertSql(b, U2, 'google_gmail', 'sub-A', 'token-A2', 'r1');
    const rows = await gmailRows(U2);
    expect(rows.map((r) => [r.external_id, r.access_token, r.refresh_token])).toEqual([['sub-A', 'token-A2', 'r1']]);
  });
  it('다른 플랫폼은 그대로 한 회원 여러 계정 가능(데이터·동작 영향 0)', async () => {
    await upsertSql(a, U2, 'youtube', 'yt-1', 'y1');
    await upsertSql(b, U2, 'youtube', 'yt-2', 'y2');
    expect((await a`select count(*)::int as n from public.member_platform_accounts where user_id = ${U2} and platform = 'youtube'`)[0].n).toBe(2);
  });
  it('다른 회원은 각자 Gmail 1개씩 가능', async () => {
    await upsertSql(a, U1, 'google_gmail', 'sub-Z', 'token-Z');
    expect((await gmailRows(U1)).length).toBe(1);
  });
});

describe('기본 저장 경로(공용 saveMemberAccount) — 요청 모양·오류 대응(모의, 실제 PostgREST 미검증)', () => {
  const input = { userId: U1, externalId: 'sub-Q', username: null, accessToken: 'x', refreshToken: null, tokenExpiresAt: new Date().toISOString(), grantedScopes: [], appRef: 'c' };
  it('upsert: member_platform_accounts·onConflict user_id,platform,external_id·platform google_gmail / 위 실제 DB 23505 문구 → otherAccount', async () => {
    const store = gm.gmailDefaultStoreForTests();
    upserts.calls.length = 0;
    upserts.nextError = { message: String(evidence.message) };
    const r = await store.save(input);
    expect(r).toEqual({ error: String(evidence.message), otherAccount: true });
    expect(upserts.calls[0]).toMatchObject({ table: 'member_platform_accounts', opts: { onConflict: 'user_id,platform,external_id' } });
    expect(upserts.calls[0].payload).toMatchObject({ platform: 'google_gmail', external_id: 'sub-Q', auth_method: 'oauth', connected_via: 'ai-work-workspace' });
  });
  it('외래 키·다른 고유 조건 오류 → otherAccount 아님', async () => {
    const store = gm.gmailDefaultStoreForTests();
    for (const message of ['insert or update on table "member_platform_accounts" violates foreign key constraint "member_platform_accounts_platform_fkey"', 'duplicate key value violates unique constraint "member_platform_accounts_unique"']) {
      upserts.nextError = { message };
      expect((await store.save(input)).otherAccount).toBe(false);
    }
    upserts.nextError = null;
    expect(await store.save(input)).toEqual({ error: null, otherAccount: false });
  });
});

describe('되돌리기 SQL(문서의 수동 절차) — 격리 DB에서만 실행 확인', () => {
  it('Gmail 연결이 남아 있으면 인덱스만 지우고 카탈로그는 남김 → 연결 정리 뒤엔 카탈로그도 지움 → 다시 적용 가능', async () => {
    await a.unsafe(`drop index if exists public.member_platform_accounts_gmail_one;
      delete from public.integration_catalog c where c.key = 'google_gmail' and not exists (select 1 from public.member_platform_accounts x where x.platform = 'google_gmail');`).simple();
    expect(await indexDef()).toBeNull();
    expect(await catalogRow()).not.toBeNull();
    await a`delete from public.member_platform_accounts where platform = 'google_gmail'`; // 격리 DB의 시험 줄
    await a.unsafe(`delete from public.integration_catalog c where c.key = 'google_gmail' and not exists (select 1 from public.member_platform_accounts x where x.platform = 'google_gmail');`).simple();
    expect(await catalogRow()).toBeNull();
    expect(await apply0074()).toBeNull();
    expect(await indexDef()).toBe(EXPECTED_DEF);
  });
});
