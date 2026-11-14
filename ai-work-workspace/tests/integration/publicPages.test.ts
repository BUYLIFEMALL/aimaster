// 공개 페이지 1단계(2026-11-14, 플랜 docs/PLAN_20261114_STORAGE_AND_PUBLIC.md B) — 로컬 Docker Postgres(aww-pg-test)만 쓴다.
// 1. 화면 저장으로는 「웹에 게시」(읽기 전용·복제 끔)만 켤 수 있다 — 게시 아닌 링크 공유·복제 허용은 거절.
// 2. 로그인 없는 방문자: 허용 명령만, 게시된 페이지와 그 아래만, 복제는 꺼진 채로 보인다.
// 3. 관리자가 내리면 닫히고 다시 열면 열린다. 게시한 회원 이용 기간이 끝나면 닫힌다.
// 4. 신고는 게시 페이지에만 쌓이고 관리자 목록에 보인다. 검색엔진 색인은 기본 꺼짐.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let pub: typeof import('../../src/server/publicPages');
let seed: typeof import('../../src/litpage/server/seed.ts');
let db: typeof import('../../src/litpage/server/db.ts');
const owner = { id: 'e5555555-5555-4555-8555-555555555555', email: 'pub-owner@example.com', name: '게시자' };
let ownerAllowed = true;
let space = '';
let page = '';
let child = '';
let secret = '';
const IP = '203.0.113.7';

const setPerms = (id: string, perms: unknown[]) =>
  runtime.runRpc('applyChanges', {
    transactions: [{ id: crypto.randomUUID(), spaceId: space, operations: [{ pointer: { table: 'block', id, spaceId: space }, path: ['permissions'], command: 'set', args: perms }] }],
  }, owner);
const published = (extra: Record<string, unknown> = {}) => ({ type: 'public_permission', role: 'reader', published: true, published_time: Date.now(), published_by_id: owner.id, added_timestamp: Date.now(), allow_duplicate: false, allow_search_engine_indexing: false, ...extra });

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  pub = await import('../../src/server/publicPages');
  seed = await import('../../src/litpage/server/seed.ts');
  db = await import('../../src/litpage/server/db.ts');
  pub.setPublicOwnerCheckForTests(async () => ownerAllowed);
  space = ((await runtime.runRpc('createWorkspace', { name: '게시 팀' }, owner)).body as any).spaceId;
  db.withRequestCache(() => {
    page = seed.createPage({ spaceId: space, userId: owner.id, parentId: space, parentTable: 'space', title: '공개 안내문' }).id;
    child = seed.createPage({ spaceId: space, userId: owner.id, parentId: page, parentTable: 'block', title: '하위 문서' }).id;
    secret = seed.createPage({ spaceId: space, userId: owner.id, parentId: space, parentTable: 'space', title: '비밀 문서' }).id;
  });
});

afterAll(() => pub.setPublicOwnerCheckForTests(async () => false));

const base = () => (db.getRecord<any>('block', page).permissions ?? []).filter((p: any) => p.type !== 'public_permission');

describe('화면 저장으로 게시 켜기', () => {
  it('게시 아닌 링크 공유·편집 권한·복제 허용은 거절', async () => {
    expect((await setPerms(page, [...base(), { type: 'public_permission', role: 'reader' }])).status).toBe(403);
    expect((await setPerms(page, [...base(), published({ role: 'read_and_write' })])).status).toBe(403);
    expect((await setPerms(page, [...base(), published({ allow_duplicate: true })])).status).toBe(403);
  });
  it('「웹에 게시」(읽기 전용·복제 끔)는 된다', async () => {
    expect((await setPerms(page, [...base(), published()])).status).toBe(200);
  });
});

describe('로그인 없는 방문자', () => {
  it('게시 페이지·하위 페이지는 보이고 복제는 꺼져 있다', async () => {
    const r = await pub.handlePublicRpc('getPublishedPage', { pageId: page }, IP);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ pageId: page, published: true, allowDuplicate: false, loggedIn: false });
    const c = await pub.handlePublicRpc('loadPage', { pageId: child.replace(/-/g, '') }, IP);
    expect(c.status).toBe(200);
    expect((c.body as any).recordMap.block[child]).toBeTruthy();
    expect((await pub.handlePublicRpc('getSite', { slugOrId: page }, IP)).status).toBe(200);
  });
  it('게시 안 한 페이지·허용 안 된 명령·사이트 별칭은 404', async () => {
    expect((await pub.handlePublicRpc('loadPage', { pageId: secret }, IP)).status).toBe(404);
    expect((await pub.handlePublicRpc('loadAccountData', {}, IP)).status).toBe(404);
    expect((await pub.handlePublicRpc('applyChanges', { pageId: page }, IP)).status).toBe(404);
    expect((await pub.handlePublicRpc('getSite', { slugOrId: 'my-site' }, IP)).status).toBe(404);
  });
  it('검색엔진 색인은 기본 꺼짐', async () => {
    expect(await pub.publicIndexing(page)).toMatchObject({ open: true, index: false, title: '공개 안내문' });
  });
});

describe('관리자 내리기·이용 기간', () => {
  it('내리면 닫히고(하위 포함) 다시 열면 열린다', async () => {
    pub.adminSetTakedown(page, true, 'admin');
    expect((await pub.handlePublicRpc('getPublishedPage', { pageId: page }, IP)).status).toBe(404);
    expect((await pub.handlePublicRpc('loadPage', { pageId: child }, IP)).status).toBe(404);
    expect(pub.adminListPublicPages().find((r) => r.pageId === page)?.takenDown).toBe(true);
    pub.adminSetTakedown(page, false, 'admin');
    expect((await pub.handlePublicRpc('getPublishedPage', { pageId: page }, IP)).status).toBe(200);
  });
  it('게시한 회원 이용 기간이 끝나면 닫힌다', async () => {
    ownerAllowed = false;
    pub.setPublicOwnerCheckForTests(async () => ownerAllowed);
    expect((await pub.handlePublicRpc('loadPage', { pageId: page }, IP)).status).toBe(404);
    ownerAllowed = true;
    pub.setPublicOwnerCheckForTests(async () => ownerAllowed);
    expect((await pub.handlePublicRpc('loadPage', { pageId: page }, IP)).status).toBe(200);
  });
});

describe('신고', () => {
  it('게시 페이지 신고는 관리자 목록에 보이고, 게시 안 한 페이지 신고는 404', async () => {
    expect((await pub.handlePublicRpc('awwReportPublicPage', { pageId: child, reason: '사칭 의심' }, IP)).status).toBe(200);
    expect((await pub.handlePublicRpc('awwReportPublicPage', { pageId: secret, reason: 'x' }, IP)).status).toBe(404);
    expect((await pub.handlePublicRpc('awwReportPublicPage', { pageId: page, reason: '' }, IP)).status).toBe(400);
    const row = pub.adminListPublicPages().find((r) => r.pageId === page);
    expect(row?.reports.map((x) => x.reason)).toContain('사칭 의심'); // 하위 페이지 신고는 게시 맨 위 페이지로 모임
  });
});
