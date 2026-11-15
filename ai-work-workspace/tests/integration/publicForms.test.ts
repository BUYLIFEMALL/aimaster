// 2026-11-15 공개 폼(공개 페이지 2단계): 로그인 없는 방문자가 「누구나(공개)」 폼을 열고 응답한다.
// 1. 공개 폼만 열림(공개 아님·없는 폼은 닫힘), 동의 문구(받는 곳·항목·목적·보관 기간)가 붙고 응답 사본 메일은 꺼짐
// 2. 동의 없이 제출하면 거절, 동의하면 주인 표에 행이 생김
// 3. 응답자당 1분 5번, 관리자 내리기·주인 이용 기간 종료 시 닫힘, 신고가 관리자 목록에 보임
// 4. 다른 회원이 로그인 입구로 남의 공개 폼에 응답해도 같은 동의 규칙
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let pub: typeof import('../../src/server/publicPages');
let forms: typeof import('../../src/server/publicForms');
let seed: typeof import('../../src/litpage/server/seed.ts');
let db: typeof import('../../src/litpage/server/db.ts');
const owner = { id: 'f1111111-1111-4111-8111-111111111111', email: 'form-owner@example.com', name: '폼주인' };
const other = { id: 'f2222222-2222-4222-8222-222222222222', email: 'form-other@example.com', name: '다른 회원' };
let ownerAllowed = true;
let space = '';
let fblock = '';
let fcol = '';
let fview = '';
let closedView = '';

const uuid = () => crypto.randomUUID();
const rowsOf = () => db.withRequestCache(() => db.childrenOf<any>('block', fcol).filter((b: any) => b.alive !== false && !b.is_template));

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  pub = await import('../../src/server/publicPages');
  forms = await import('../../src/server/publicForms');
  seed = await import('../../src/litpage/server/seed.ts');
  db = await import('../../src/litpage/server/db.ts');
  pub.setPublicOwnerCheckForTests(async () => ownerAllowed);
  space = ((await runtime.runRpc('createWorkspace', { name: '폼 팀' }, owner)).body as any).spaceId;
  await runtime.runRpc('createWorkspace', { name: '다른 팀' }, other);
  db.withRequestCache(() => {
    const page = seed.createPage({ spaceId: space, userId: owner.id, parentId: space, parentTable: 'space', title: '신청 받기' }).id;
    fblock = uuid(); fcol = uuid(); fview = uuid(); closedView = uuid();
    db.putRecord('block', { id: fblock, version: 1, type: 'collection_view', collection_id: fcol, view_ids: [fview, closedView], parent_id: page, parent_table: 'block', alive: true, space_id: space, created_by_id: owner.id } as any);
    db.putRecord('collection', { id: fcol, version: 1, schema: { title: { name: '이름', type: 'title' }, ph: { name: '연락처', type: 'text' } }, parent_id: fblock, parent_table: 'block', alive: true, space_id: space } as any);
    const q = [{ id: 'q1', config: { propertyId: 'title', isRequired: true } }, { id: 'q2', config: { propertyId: 'ph', isRequired: false } }];
    db.putRecord('collection_view', { id: fview, version: 1, type: 'form', name: '신청', format: { form_config: { version: 1, title: '행사 신청', permission: 'public', anonymous: true, ownerId: owner.id, questions: q, submitScreen: { allowEmailResponse: true } } }, parent_id: fblock, parent_table: 'block', alive: true, space_id: space } as any);
    db.putRecord('collection_view', { id: closedView, version: 1, type: 'form', name: '내부', format: { form_config: { version: 1, title: '내부', permission: 'space', ownerId: owner.id, questions: q } }, parent_id: fblock, parent_table: 'block', alive: true, space_id: space } as any);
  });
});

describe('공개 폼 — 방문자', () => {
  it('공개 폼만 열리고 동의 문구가 붙으며 응답 사본 메일은 꺼짐', async () => {
    const r = await pub.handlePublicRpc('getPublicForm', { viewId: fview }, '198.51.100.1');
    expect(r.status).toBe(200);
    const form = (r.body as any).form;
    expect(form.awwConsent).toMatchObject({ collector: '폼 팀', items: ['이름', '연락처'] });
    expect(form.awwConsent.purpose).toMatch(/행사 신청/);
    expect(form.submitScreen.allowEmailResponse).toBe(false);
    expect(((await pub.handlePublicRpc('getPublicForm', { viewId: closedView }, '198.51.100.1')).body as any).status).toBe('closed');
    expect(((await pub.handlePublicRpc('getPublicForm', { viewId: uuid() }, '198.51.100.1')).body as any).status).toBe('closed');
    expect((await pub.handlePublicRpc('emailFormResponse', { viewId: fview }, '198.51.100.1')).status).toBe(404);
  });

  it('동의 없으면 거절, 동의하면 주인 표에 행', async () => {
    const before = rowsOf().length;
    const no = await pub.handlePublicRpc('submitFormResponse', { viewId: fview, answers: { q1: '홍길동' } }, '198.51.100.2');
    expect(no.status).toBe(429);
    expect((no.body as any).message).toMatch(/동의/);
    const ok = await pub.handlePublicRpc('submitFormResponse', { viewId: fview, answers: { q1: '홍길동', q2: '010-0000-0000' }, consent: true }, '198.51.100.2');
    expect(ok.status).toBe(200);
    expect((ok.body as any).pageId).toBeTruthy();
    expect(rowsOf().length).toBe(before + 1);
  });

  it('응답자당 1분 5번', async () => {
    const ip = '198.51.100.3';
    for (let i = 0; i < 5; i++) expect((await pub.handlePublicRpc('submitFormResponse', { viewId: fview, answers: { q1: `사람${i}` }, consent: true }, ip)).status).toBe(200);
    const sixth = await pub.handlePublicRpc('submitFormResponse', { viewId: fview, answers: { q1: '여섯' }, consent: true }, ip);
    expect(sixth.status).toBe(429);
    expect((sixth.body as any).message).toMatch(/1분에 5번/);
    expect(forms.formUsedToday(fview)).toBeGreaterThanOrEqual(6);
  });

  it('관리자 내리기·주인 이용 기간 종료 시 닫히고, 신고는 관리자 목록에', async () => {
    pub.adminSetTakedown(fview, true, 'admin');
    expect(((await pub.handlePublicRpc('getPublicForm', { viewId: fview }, '198.51.100.4')).body as any).status).toBe('closed');
    expect((await pub.handlePublicRpc('submitFormResponse', { viewId: fview, answers: { q1: 'x' }, consent: true }, '198.51.100.4')).status).toBe(404);
    pub.adminSetTakedown(fview, false, 'admin');
    ownerAllowed = false;
    pub.setPublicOwnerCheckForTests(async () => ownerAllowed);
    expect(((await pub.handlePublicRpc('getPublicForm', { viewId: fview }, '198.51.100.4')).body as any).status).toBe('closed');
    ownerAllowed = true;
    pub.setPublicOwnerCheckForTests(async () => ownerAllowed);
    expect((await pub.handlePublicRpc('awwReportPublicForm', { viewId: fview, reason: '광고 같아요' }, '198.51.100.5')).status).toBe(200);
    const row = pub.adminListPublicPages().find((r) => r.pageId === fview);
    expect(row?.title).toMatch(/폼: 행사 신청/);
    expect(row?.reports[0]?.reason).toMatch(/광고/);
  });
});

describe('공개 폼 — 로그인한 다른 회원', () => {
  it('남의 공개 폼에 응답할 때도 동의가 필요', async () => {
    const no = await runtime.runRpc('submitFormResponse', { viewId: fview, answers: { q1: '다른이' } }, other);
    expect(no.status).toBe(429);
    const ok = await runtime.runRpc('submitFormResponse', { viewId: fview, answers: { q1: '다른이' }, consent: true }, other);
    expect(ok.status).toBe(200);
  });
});
