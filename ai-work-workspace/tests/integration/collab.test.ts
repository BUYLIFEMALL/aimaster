// U13 협업(2026-11-11): 초대는 AIMaster 회원 + 이용 권한 있는 회원만, 회원 id로 이어짐, 화면 변경으로 바깥 사람·공개 링크 공유 불가.
// 로컬 Docker Postgres(aww-pg-test)만 쓴다. 회원 찾기는 가짜(setInviteeLookup)로 바꾼다.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let collab: typeof import('../../src/server/collab');
let seed: typeof import('../../src/litpage/server/seed.ts');
let db: typeof import('../../src/litpage/server/db.ts');
let inbox: typeof import('../../src/server/workInbox');

const owner = { id: 'a1111111-1111-4111-8111-111111111111', email: 'owner@example.com', name: '주인' };
const friend = { id: 'b2222222-2222-4222-8222-222222222222', email: 'friend@example.com', name: '동료' };
const noAccess = { id: 'c3333333-3333-4333-8333-333333333333', email: 'noaccess@example.com', name: '권한없음' };
const stranger = { id: 'd4444444-4444-4444-8444-444444444444', email: 'stranger@example.com', name: '모르는 사람' };
const profiles = [owner, friend, noAccess, stranger];
const allowed = new Set([owner.id, friend.id, stranger.id]);
let space = '';
let page = '';
let friendSpace = '';

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  collab = await import('../../src/server/collab');
  seed = await import('../../src/litpage/server/seed.ts');
  db = await import('../../src/litpage/server/db.ts');
  inbox = await import('../../src/server/workInbox');
  collab.setInviteeLookup({
    async find(emails, ids) {
      return profiles.filter((p) => emails.includes(p.email) || ids.includes(p.id)).map((p) => ({ id: p.id, email: p.email, name: p.name }));
    },
    async allowed(id) {
      return allowed.has(id);
    },
  });
  space = ((await runtime.runRpc('createWorkspace', { name: '주인 팀' }, owner)).body as any).spaceId;
  friendSpace = ((await runtime.runRpc('createWorkspace', { name: '동료 팀' }, friend)).body as any).spaceId;
  db.withRequestCache(() => {
    page = seed.createPage({ spaceId: space, userId: owner.id, parentId: space, parentTable: 'space', title: '함께 볼 문서' }).id;
  });
});

afterAll(() => collab.setInviteeLookup(null));

describe('초대 대상 확인', () => {
  it('AIMaster 회원이 아니면 초대하지 않는다', async () => {
    const r = await runtime.runRpc('inviteMembers', { spaceId: space, emails: ['nobody@example.com'], role: 'editor' }, owner);
    expect(r.status).toBe(400);
    expect((r.body as any).message).toContain('AIMaster 회원만');
  });

  it('이용 권한이 없는 회원은 초대하지 않는다', async () => {
    const r = await runtime.runRpc('inviteMembers', { spaceId: space, emails: [noAccess.email], role: 'editor' }, owner);
    expect(r.status).toBe(403);
    expect((r.body as any).message).toContain('이용 권한');
  });

  it('권한 있는 회원을 초대하면 그 회원 id로 멤버가 된다(임의 id 아님)', async () => {
    const r = await runtime.runRpc('inviteMembers', { spaceId: space, emails: [friend.email.toUpperCase()], role: 'editor' }, owner);
    expect(r.status).toBe(200);
    expect((r.body as any).userIds).toEqual([friend.id]);
    const sp = db.getRecord<any>('space', space);
    expect(sp.permissions.some((p: any) => p.user_id === friend.id && p.role === 'editor')).toBe(true);
    const seen = await runtime.runRpc('loadPage', { pageId: page }, friend);
    expect((seen.body as any).recordMap.block?.[page]).toBeTruthy();
  });

  it('초대받은 회원의 「내 워크스페이스」는 본인 소유 워크스페이스다', () => {
    db.withRequestCache(() => expect(inbox.memberSpace(friend.id).id).toBe(friendSpace));
  });

  it('내보내면 다시 읽지 못한다', async () => {
    const r = await runtime.runRpc('removeMember', { spaceId: space, userId: friend.id }, owner);
    expect(r.status).toBe(200);
    const seen = await runtime.runRpc('loadPage', { pageId: page }, friend);
    expect((seen.body as any)?.recordMap?.block?.[page]).toBeUndefined();
  });
});

describe('페이지 공유', () => {
  it('권한 있는 회원과 페이지만 공유하면 그 페이지를 읽는다', async () => {
    const r = await runtime.runRpc('invitePagePermissions', { pageId: page, emails: [stranger.email], role: 'reader' }, owner);
    expect(r.status).toBe(200);
    const seen = await runtime.runRpc('loadPage', { pageId: page }, stranger);
    expect((seen.body as any).recordMap.block?.[page]).toBeTruthy();
  });

  it('사용자 id로 공유할 때도 권한을 확인한다', async () => {
    const r = await runtime.runRpc('invitePagePermissions', { pageId: page, userIds: [noAccess.id], role: 'reader' }, owner);
    expect(r.status).toBe(403);
  });

  it('공유한 뒤에도 주인은 전체 권한을 가진다', async () => {
    const records = await import('../../src/litpage/server/records.ts');
    const role = db.withRequestCache(() => records.blockRole(page, owner.id));
    expect(['editor', 'owner', 'full_access']).toContain(role);
  });

  it('화면 변경으로 바깥 사람을 페이지에 넣을 수 없다', async () => {
    db.withRequestCache(() => {
      if (!db.getRecord('lit_user', noAccess.id)) seed.createUser(noAccess.id, noAccess.email, noAccess.name);
    });
    const perms = [...(db.getRecord<any>('block', page).permissions ?? []), { type: 'user_permission', user_id: noAccess.id, role: 'editor' }];
    const r = await runtime.runRpc('applyChanges', {
      transactions: [{ id: crypto.randomUUID(), spaceId: space, operations: [{ pointer: { table: 'block', id: page, spaceId: space }, path: ['permissions'], command: 'set', args: perms }] }],
    }, owner);
    expect(r.status).toBe(403);
    expect((r.body as any).message).toContain('초대로만');
  });

  it('화면 변경으로 공개 링크를 켤 수 없다', async () => {
    const perms = [...(db.getRecord<any>('block', page).permissions ?? []), { type: 'public_permission', role: 'reader' }];
    const r = await runtime.runRpc('applyChanges', {
      transactions: [{ id: crypto.randomUUID(), spaceId: space, operations: [{ pointer: { table: 'block', id: page, spaceId: space }, path: ['permissions'], command: 'set', args: perms }] }],
    }, owner);
    expect(r.status).toBe(403);
  });

  it('초대 링크로 들어오기는 닫혀 있다', async () => {
    const r = await runtime.runRpc('joinSpaceByInviteLink', { code: 'x' }, stranger);
    expect(r.status).toBe(403);
  });
});

describe('공유받은 페이지의 첨부 파일', () => {
  it('페이지를 공유받은 사람은 그 페이지에 붙은 파일을 받고, 다른 회원은 받지 못한다', async () => {
    const filesMod = await import('../../src/litpage/server/content/files.ts');
    const dl = await import('../../src/server/files');
    let fileId = '';
    db.withRequestCache(() => {
      const f = filesMod.storeFile('계약서.txt', '내용', owner.id, space, 'text/plain');
      fileId = f.id;
      seed.createPage({ spaceId: space, userId: owner.id, parentId: page, parentTable: 'block', title: '첨부', content: [{ type: 'file', props: { source: [[f.url]] } } as any] });
    });
    expect(dl.downloadFile(stranger.id, fileId, false).status).toBe(200);
    expect(dl.downloadFile(noAccess.id, fileId, false).status).toBe(404);
  });
});

describe('다른 사용자 프로필 공개 범위', () => {
  it('관계없는 회원의 프로필은 보이지 않고, 함께 공유된 페이지 사람은 보인다', async () => {
    const recs = await import('../../src/litpage/server/records.ts');
    db.withRequestCache(() => {
      if (!db.getRecord('lit_user', noAccess.id)) seed.createUser(noAccess.id, noAccess.email, noAccess.name);
      const ownerRec = db.getRecord<any>('lit_user', owner.id);
      expect(recs.recordRole('lit_user', ownerRec, noAccess.id)).toBe('none');
      expect(recs.recordRole('lit_user', ownerRec, stranger.id)).toBe('reader');
    });
  });
});

describe('실시간 확인(collabPoll)', () => {
  it('공유된 페이지면 shared, 상대가 바꾼 내용을 다음 확인 때 받고, 권한 없는 사람은 못 부른다', async () => {
    const first = await runtime.runRpc('collabPoll', { pageId: page, lsn: 0 }, stranger);
    expect(first.status).toBe(200);
    const b = first.body as any;
    expect(b.shared).toBe(true);
    expect(b.viewers.some((v: any) => v.userId === stranger.id)).toBe(true);
    await runtime.runRpc('applyChanges', {
      transactions: [{ id: crypto.randomUUID(), spaceId: space, operations: [{ pointer: { table: 'block', id: page, spaceId: space }, path: ['properties', 'title'], command: 'set', args: [['함께 고친 제목']] }] }],
    }, owner);
    const next = await runtime.runRpc('collabPoll', { pageId: page, lsn: b.lsn }, stranger);
    expect((next.body as any).recordMap.block?.[page]?.value?.value?.properties?.title).toEqual([['함께 고친 제목']]);
    expect((next.body as any).lsn).toBeGreaterThan(b.lsn);
    const denied = await runtime.runRpc('collabPoll', { pageId: page, lsn: 0 }, noAccess);
    expect(denied.status).toBe(404);
  });

  it('혼자 쓰는 페이지는 shared가 아니다', async () => {
    let solo = '';
    db.withRequestCache(() => {
      solo = seed.createPage({ spaceId: friendSpace, userId: friend.id, parentId: friendSpace, parentTable: 'space', title: '혼자 문서' }).id;
    });
    const r = await runtime.runRpc('collabPoll', { pageId: solo, lsn: 0 }, friend);
    expect((r.body as any).shared).toBe(false);
  });
});
