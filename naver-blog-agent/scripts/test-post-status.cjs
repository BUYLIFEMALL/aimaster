// 임시보관 저장이 대기·발행 상태를 되돌리지 않는지 검사: 규칙 함수 + POST /api/posts 경로(메모리 DB). 네트워크 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..', 'src');

const cache = new Map();
let currentUser = 'user-a';
const db = { nba_posts: [] };
let upserts = [];

function table(name) {
  const filters = {};
  let op = 'select';
  let payload;
  const api = {
    select() { return api; },
    limit() { return api; },
    eq(col, val) { filters[col] = val; return api; },
    upsert(row) { op = 'upsert'; payload = row; return api; },
    maybeSingle: async () => ({ data: db[name].find((r) => Object.entries(filters).every(([k, v]) => r[k] === v)) || null }),
    single: async () => {
      if (op === 'upsert') {
        upserts.push({ ...payload });
        const i = db[name].findIndex((r) => r.id === payload.id);
        const merged = i >= 0 ? Object.assign(db[name][i], payload) : (db[name].push({ id: payload.id || 'new-uuid-1', ...payload }), db[name][db[name].length - 1]);
        return { data: merged, error: null };
      }
      return { data: null, error: null };
    },
    then(resolve) { return resolve({ data: db[name].filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v)), error: null }); },
  };
  return api;
}
const admin = { from: (n) => table(n) };

function loadTS(rel) {
  const filename = path.join(root, rel);
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mockRequire = (id) => {
    if (id === 'next/server') return { NextResponse: { json: (body, init) => ({ status: (init && init.status) || 200, body }) } };
    if (id === '@/lib/access') return { checkProgramAccessApi: async () => ({ allowed: true, userId: currentUser }) };
    if (id === '@/lib/supabase/admin') return { createAdminClient: () => admin };
    if (id === '@/lib/postStatus') return loadTS('lib/postStatus.ts');
    throw new Error('Unexpected import: ' + id);
  };
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`, { filename })(mockRequire, module, module.exports);
  cache.set(filename, module.exports);
  return module.exports;
}

const { resolveSaveStatus } = loadTS('lib/postStatus.ts');
// 규칙: 임시보관 저장은 대기·발행 중인 상태를 되돌리지 않는다
assert.equal(resolveSaveStatus('queued', 'draft'), 'queued');
assert.equal(resolveSaveStatus('publishing', 'draft'), 'publishing');
assert.equal(resolveSaveStatus('published', 'draft'), 'published');
assert.equal(resolveSaveStatus('published', undefined), 'published', '요청 상태가 없으면 임시보관 요청으로 본다');
assert.equal(resolveSaveStatus('draft', 'draft'), 'draft');
assert.equal(resolveSaveStatus('failed', 'draft'), 'draft', '실패한 글은 임시보관으로 되돌려도 된다');
assert.equal(resolveSaveStatus(null, 'draft'), 'draft', '새 글');
assert.equal(resolveSaveStatus('draft', 'queued'), 'queued', '발행 큐 등록은 그대로 허용');
assert.equal(resolveSaveStatus('published', 'queued'), 'queued', '명시적 큐 등록 요청은 이 규칙이 막지 않는다');

(async () => {
  const posts = loadTS('app/api/posts/route.ts');
  const A = '11111111-1111-4111-8111-111111111111';
  const B = '22222222-2222-4222-8222-222222222222';
  const C = '33333333-3333-4333-8333-333333333333';
  db.nba_posts.push(
    { id: A, user_id: 'user-a', status: 'published', title: '발행됨', post_url: 'https://blog.naver.com/x' },
    { id: B, user_id: 'user-a', status: 'queued', title: '대기' },
    { id: C, user_id: 'user-b', status: 'published', title: '남의 글' },
  );
  const post = (body) => posts.POST({ json: async () => body });

  // 발행된 글을 "보관함 저장"(draft)해도 상태 유지, 내용은 갱신
  let res = await post({ id: A, title: '수정된 제목', content: '본문', status: 'draft' });
  assert.equal(res.status, 200);
  assert.equal(upserts.at(-1).status, 'published');
  assert.equal(db.nba_posts.find((r) => r.id === A).status, 'published');
  assert.equal(db.nba_posts.find((r) => r.id === A).title, '수정된 제목');
  assert.equal('post_url' in upserts.at(-1), false, '발행 주소는 건드리지 않음');

  // 대기 중인 글도 유지, 상태 없이 저장해도 유지
  await post({ id: B, title: '대기', content: '본문', status: 'draft' });
  assert.equal(db.nba_posts.find((r) => r.id === B).status, 'queued');
  await post({ id: B, title: '대기', content: '본문' });
  assert.equal(db.nba_posts.find((r) => r.id === B).status, 'queued');

  // 다른 회원의 글 ID로 저장 요청이 와도 그 글을 덮어쓰지 않는다 → 내 새 글로 저장(그 ID는 쓰지 않음)
  const before = db.nba_posts.length;
  await post({ id: C, title: '내 글처럼', content: '본문', status: 'draft' });
  assert.equal(upserts.at(-1).status, 'draft');
  assert.equal('id' in upserts.at(-1), false, '남의 글 ID를 그대로 쓰면 안 됨');
  const foreign = db.nba_posts.find((r) => r.id === C);
  assert.deepEqual([foreign.user_id, foreign.status, foreign.title], ['user-b', 'published', '남의 글'], '남의 글은 그대로');
  assert.equal(db.nba_posts.length, before + 1, '내 새 글이 따로 생김');

  // 새 글(임시 ID)은 draft, 큐 등록 요청은 queued
  await post({ id: 'post-1791513869817', title: '새 글', content: '본문', status: 'draft' });
  assert.equal(upserts.at(-1).status, 'draft');
  await post({ id: 'post-1791513869818', title: '새 글2', content: '본문', status: 'queued' });
  assert.equal(upserts.at(-1).status, 'queued');

  console.log('post status ok');
})().catch((e) => { console.error(e); process.exit(1); });
