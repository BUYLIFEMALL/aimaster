// 신규 원고 준비 모드: 실제 API 저장·복구·설정 경로를 메모리 DB로 검증. 유료/외부 호출 없음.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const prefix = fs.readFileSync(path.join(__dirname, 'test-post-review.cjs'), 'utf8').split("test('manual review")[0];
const make = new Function('require', '__dirname', prefix + ';return harness;')(require, __dirname);
const ID = '00000000-0000-4000-8000-000000000001';
const raw = body => ({ url: 'https://test/api', json: async () => body });
const create = () => ({ id: ID, create: true, save_request_id: crypto.randomUUID(), blog_id: 'myblog', title: '방문 후기', content: '회원이 제공한 경험', tags: [], images: [] });
const revisionBody = (h, row, patch) => ({ id: row.id, expected_revision: h.load('lib/postSaveProtocol.ts').postSaveRevision(row), save_request_id: crypto.randomUUID(), ...patch });

test('생성 API가 새 원고에 준비 모드를 저장하고 AI 검수 지문을 보존한다', async () => {
  const h = make(), route = h.load('app/api/generate/route.ts');
  const result = await route.POST(raw({ blogId: 'myblog', category: '여행', engine: { provider: 'openai', model: 'mock' } }));
  assert.equal(result.status, 200);
  assert.equal(result.body.saved, true);
  assert.equal(h.db.nba_posts.length, 1);
  const row = h.db.nba_posts[0];
  assert.equal(row.user_id, 'owner');
  assert.equal(row.status, 'draft');
  assert.equal(h.load('lib/naverPublishing.ts').readNaverExecutionMode(row.research_summary, 'myblog'), 'prepare');
  assert.equal(row.research_summary.review.fingerprint, h.review.reviewFingerprint(row));
  assert.equal(row.research_summary.review.status, h.generated.reviewStatus);
});

test('생성 실패 후 최초 저장 복구도 준비 모드이며 같은 요청 재시도는 원고를 복제하지 않는다', async () => {
  const h = make(), route = h.load('app/api/posts/route.ts'), payload = create();
  assert.equal((await route.POST(raw(payload))).status, 200);
  const before = JSON.stringify(h.db.nba_posts[0]);
  const retry = await route.POST(raw(payload));
  assert.equal(retry.status, 200);
  assert.equal(retry.body.replayed, true);
  assert.equal(h.db.nba_posts.length, 1);
  assert.equal(JSON.stringify(h.db.nba_posts[0]), before);
  const settings = await h.load('app/api/posts/[id]/publishing/route.ts').GET({}, h.context);
  assert.equal(settings.status, 200);
  assert.equal(settings.body.executionMode, 'prepare');
});

test('기존 원고의 명시적 publish/prepare와 설정 없는 옛 동작은 수정 저장 시 유지된다', async () => {
  for (const mode of ['publish', 'prepare', undefined]) {
    const h = make(), row = h.seed('draft', 'PASS'), publishing = h.load('lib/naverPublishing.ts');
    if (mode) row.research_summary = publishing.withNaverCategory(row.research_summary, 'myblog', { id: '12', name: '여행' }, mode);
    const route = h.load('app/api/posts/route.ts');
    assert.equal((await route.PUT(raw(revisionBody(h, row, { title: '편집 후 제목' })))).status, 200);
    assert.equal(publishing.readNaverExecutionMode(row.research_summary, 'myblog'), mode || 'publish');
    assert.equal(row.research_summary.review.status, 'PASS');
    if (mode) assert.equal(row.research_summary.naver_publishing.category.id, '12');
    // POST의 기존 원고 수정 경로도 최초 생성으로 오인하지 않는다.
    assert.equal((await route.POST(raw(revisionBody(h, row, { content: '추가 수정' })))).status, 200);
    assert.equal(publishing.readNaverExecutionMode(row.research_summary, 'myblog'), mode || 'publish');
  }
});

test('새 원고도 회원이 이후 자동 발행을 명시적으로 저장할 수 있고 재저장이 덮어쓰지 않는다', async () => {
  const h = make(), posts = h.load('app/api/posts/route.ts');
  await posts.POST(raw(create()));
  const row = h.db.nba_posts[0];
  const settings = h.load('app/api/posts/[id]/publishing/route.ts');
  const change = await settings.PUT(raw(revisionBody(h, row, { category: null, tags: [], executionMode: 'publish' })), h.context);
  assert.equal(change.status, 200);
  assert.equal((await settings.GET({}, h.context)).body.executionMode, 'publish');
  assert.equal((await posts.PUT(raw(revisionBody(h, row, { content: '검수 후 수정' })))).status, 200);
  assert.equal((await settings.GET({}, h.context)).body.executionMode, 'publish');
});

test('다른 회원 원고와 충돌하는 최초 저장은 설정·본문을 바꾸지 못한다', async () => {
  const h = make(), row = h.seed();
  row.user_id = 'another-member';
  const before = JSON.stringify(row);
  const result = await h.load('app/api/posts/route.ts').POST(raw(create()));
  assert.equal(result.status, 409);
  assert.equal(JSON.stringify(row), before);
});

test('미로그인 생성/저장은 차단하고 본인 블로그가 없으면 AI와 저장을 실행하지 않는다', async () => {
  const h = make();
  h.deny();
  assert.equal((await h.load('app/api/generate/route.ts').POST(raw({ blogId: 'myblog', category: '여행' }))).status, 401);
  assert.equal((await h.load('app/api/posts/route.ts').POST(raw(create()))).status, 401);
  assert.equal(h.writes.length, 0);
  const unlinked = make();
  unlinked.db.nba_accounts.length = 0;
  assert.equal((await unlinked.load('app/api/generate/route.ts').POST(raw({ blogId: 'myblog', category: '여행' }))).status, 400);
  assert.equal(unlinked.input, null);
  assert.equal(unlinked.writes.length, 0);
});
