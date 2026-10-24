// 이식판 연결부 시험: AIMaster 회원 → 원본 서버 명령 실행 경로(src/server/runtime.ts)와 1단계 정책.
// 로컬 Docker Postgres(aww-pg-test)만 쓴다. 실행: npx vitest run --config tests/vitest.config.mjs
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });
// 운영자 키가 있는 환경을 흉내 낸다 — 이식판은 이 키를 절대 쓰면 안 된다
process.env.OPENAI_API_KEY = 'sk-operator-should-never-be-used-000000';
process.env.ANTHROPIC_API_KEY = 'sk-ant-operator-should-never-be-used-0000';

let runtime: typeof import('../../src/server/runtime');
let seed: typeof import('../../src/litpage/server/seed.ts');
let db: typeof import('../../src/litpage/server/db.ts');
let config: typeof import('../../src/litpage/server/ai/providers/config.ts');

const alice = { id: '11111111-1111-4111-8111-111111111111', email: 'Alice@Example.com', name: '앨리스' };
const bob = { id: '22222222-2222-4222-8222-222222222222', email: 'bob@example.com', name: '밥' };
let aliceSpace = '';
let alicePage = '';

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  seed = await import('../../src/litpage/server/seed.ts');
  db = await import('../../src/litpage/server/db.ts');
  config = await import('../../src/litpage/server/ai/providers/config.ts');
});

describe('처음 들어온 회원', () => {
  it('원본 사용자 레코드가 자동으로 만들어지고, 워크스페이스가 없으면 첫 설정 상태가 된다', async () => {
    const r = await runtime.runRpc('loadAccountData', {}, alice);
    expect(r.status).toBe(200);
    const rm = (r.body as any).recordMap;
    expect(Object.keys(rm.user_root ?? {})).toEqual([alice.id]);
    expect(rm.space ?? {}).toEqual({});
    expect(db.getRecord<any>('lit_user', alice.id)?.email).toBe('alice@example.com');
    const settings = db.getRecord<any>('user_settings', alice.id)?.settings;
    expect(settings?.locale).toBe('ko-KR');
    expect(settings?.time_zone).toBe('Asia/Seoul');
  });

  it('워크스페이스를 만들면 다음 불러오기에 보인다', async () => {
    const r = await runtime.runRpc('createWorkspace', { name: '앨리스 팀' }, alice);
    expect(r.status).toBe(200);
    aliceSpace = (r.body as any).spaceId;
    const again = await runtime.runRpc('loadAccountData', {}, alice);
    expect(Object.keys((again.body as any).recordMap.space)).toContain(aliceSpace);
  });

  it('AIMaster 이메일이 바뀌면 원본 사용자 이메일도 맞춘다', async () => {
    await runtime.runRpc('loadAccountData', {}, { ...alice, email: 'alice.new@example.com' });
    expect(db.getRecord<any>('lit_user', alice.id)?.email).toBe('alice.new@example.com');
    await runtime.runRpc('loadAccountData', {}, alice);
  });
});

describe('회원 간 데이터 격리', () => {
  beforeAll(() => {
    db.withRequestCache(() => {
      const page = seed.createPage({ spaceId: aliceSpace, userId: alice.id, parentId: aliceSpace, parentTable: 'space', title: '앨리스 비밀 문서' });
      alicePage = page.id;
    });
  });

  it('주인은 자기 페이지를 연다', async () => {
    const r = await runtime.runRpc('loadPage', { pageId: alicePage }, alice);
    expect(r.status).toBe(200);
    expect((r.body as any).recordMap.block?.[alicePage]).toBeTruthy();
  });

  it('다른 회원은 페이지 id를 알아도 내용을 받지 못한다', async () => {
    const r = await runtime.runRpc('loadPage', { pageId: alicePage }, bob);
    const block = (r.body as any)?.recordMap?.block?.[alicePage];
    expect(block).toBeUndefined();
  });

  it('다른 회원은 남의 워크스페이스 검색 결과를 받지 못한다', async () => {
    const r = await runtime.runRpc('searchWorkspace', { spaceId: aliceSpace, query: '비밀' }, bob);
    const hits = JSON.stringify(r.body);
    expect(hits).not.toContain('앨리스 비밀 문서');
  });

  it('다른 회원은 남의 페이지를 고칠 수 없다', async () => {
    const r = await runtime.runRpc('applyChanges', {
      transactions: [{ id: crypto.randomUUID(), spaceId: aliceSpace, operations: [{ pointer: { table: 'block', id: alicePage, spaceId: aliceSpace }, path: ['properties', 'title'], command: 'set', args: [['해킹']] }] }],
    }, bob);
    expect(r.status).toBe(403);
    expect(db.getRecord<any>('block', alicePage)?.properties?.title).toEqual([['앨리스 비밀 문서']]);
  });
});

describe('1단계 정책', () => {
  it('다른 사람 초대·공유는 아직 닫혀 있다', async () => {
    const r = await runtime.runRpc('inviteMembers', { spaceId: aliceSpace, emails: ['bob@example.com'], role: 'editor' }, alice);
    expect(r.status).toBe(403);
    expect((r.body as any).message).toContain('준비 중');
  });

  it('계정 설정(비밀번호 등)은 AIMaster에서 관리한다고 안내한다', async () => {
    const r = await runtime.runRpc('changePassword', { password: 'x' }, alice);
    expect(r.status).toBe(403);
    expect((r.body as any).message).toContain('AIMaster');
  });

  // U3(2026-10-24): AI 명령은 열렸다. 외부 연결·MCP·채팅 공유·AI 그림은 계속 닫혀 있다.
  it('U3 이후에도 외부 연결·채팅 공유·AI 그림 명령은 닫혀 있다', async () => {
    for (const name of ['aiListConnections', 'aiShareThread', 'aiGenerateImage']) {
      const r = await runtime.runRpc(name, {}, alice);
      expect(r.status, name).toBe(403);
    }
  });

  it('열린 AI 명령도 회원 키가 없으면 AI는 꺼진 상태로 응답한다', async () => {
    const r = await runtime.runRpc('aiStatus', {}, alice);
    expect(r.status).not.toBe(403);
    expect(JSON.stringify(r.body)).not.toContain('sk-');
  });

  it('없는 명령은 404', async () => {
    const r = await runtime.runRpc('noSuchCommand', {}, alice);
    expect(r.status).toBe(404);
  });
});

describe('운영자 AI 키 차단(최상위 규칙)', () => {
  it('서버 환경변수에 키가 있어도 AI 공급자는 꺼져 있다', () => {
    expect(config.providerId()).toBe('none');
    expect(config.openaiConfig()).toBeNull();
    expect(config.anthropicKey()).toBeNull();
  });

  it('회원 본인 키를 넣은 요청에서만 그 키를 쓴다', () => {
    const seen = config.withMemberAiKeys({ provider: 'openai', openaiKey: 'sk-member-own-key-123456' }, () => [config.providerId(), config.openaiConfig()?.apiKey]);
    expect(seen).toEqual(['openai', 'sk-member-own-key-123456']);
    expect(config.providerId()).toBe('none');
  });
});
