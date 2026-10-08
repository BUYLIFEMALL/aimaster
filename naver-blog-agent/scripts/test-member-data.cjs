// 회원별 DB 이관 검사: 계정/분류 API의 회원 간 격리·입력 검증·목록 전체 저장, 계정 동기화 훅. 실제 DB/네트워크 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..', 'src');

// ---- 메모리 DB (supabase 체인 흉내) ----
const db = { nba_accounts: [], nba_content_categories: [] };
let seq = 0;
function table(name) {
  const filters = [];
  let op = 'select';
  let payload;
  let orderBy = null;
  let upsertKeys = null;
  const match = (row) => filters.every((f) => f(row));
  const api = {
    select() { return api; },
    eq(col, val) { filters.push((r) => r[col] === val); return api; },
    in(col, vals) { filters.push((r) => vals.includes(r[col])); return api; },
    order(col) { orderBy = col; return api; },
    upsert(rows, opts) { op = 'upsert'; payload = rows; upsertKeys = String(opts.onConflict).split(','); return api; },
    delete() { op = 'delete'; return api; },
    then(resolve) {
      const rows = db[name];
      if (op === 'upsert') {
        for (const row of payload) {
          const existing = rows.find((r) => upsertKeys.every((k) => r[k] === row[k]));
          if (existing) Object.assign(existing, row);
          else rows.push({ id: row.id || `uuid-${++seq}`, ...row });
        }
        return resolve({ data: null, error: null });
      }
      if (op === 'delete') {
        db[name] = rows.filter((r) => !match(r));
        return resolve({ data: null, error: null });
      }
      let out = rows.filter(match).map((r) => ({ ...r }));
      if (orderBy) out = out.sort((a, b) => (a[orderBy] > b[orderBy] ? 1 : -1));
      return resolve({ data: out, error: null });
    },
  };
  return api;
}
const admin = { from: (name) => table(name) };

let currentUser = 'user-a';
let allowed = true;
const cache = new Map();
function loadTS(rel, extra = {}) {
  const filename = path.join(root, rel);
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mockRequire = (id) => {
    if (id === 'next/server') return { NextResponse: { json: (body, init) => ({ status: (init && init.status) || 200, body }) } };
    if (id === '@/lib/access') return { checkProgramAccessApi: async () => (allowed ? { allowed: true, userId: currentUser } : { allowed: false, error: '로그인이 필요합니다.', status: 401 }) };
    if (id === '@/lib/supabase/admin') return { createAdminClient: () => admin };
    if (id in extra) return extra[id];
    if (id === '@/lib/serverSync') return loadTS('lib/serverSync.ts', { __fetch: null });
    throw new Error('Unexpected import: ' + id);
  };
  vm.runInThisContext(`(function(require,module,exports,fetch){${js}\n})`, { filename })(mockRequire, module, module.exports, extra.__fetch === undefined ? undefined : extra.__fetch);
  cache.set(filename, module.exports);
  return module.exports;
}

const req = (body, url = 'http://x/api') => ({ json: async () => body, url });

(async () => {
  const accounts = loadTS('app/api/accounts/route.ts');
  const cats = loadTS('app/api/content-categories/route.ts');

  // 권한 없음 → 401, DB 접근 없음
  allowed = false;
  assert.equal((await accounts.GET()).status, 401);
  assert.equal((await accounts.PUT(req({ accounts: [] }))).status, 401);
  assert.equal((await cats.GET()).status, 401);
  assert.equal((await cats.PUT(req({ categories: [] }))).status, 401);
  assert.equal(db.nba_accounts.length + db.nba_content_categories.length, 0);
  allowed = true;

  // 계정: 검증
  for (const bad of [{ accounts: 'x' }, { accounts: [{ blog_id: 'a', label: '짧은 ID' }] }, { accounts: [{ blog_id: 'ok_id', label: '' }] }, { accounts: [{ blog_id: 'bad id!', label: 'x' }] }, { accounts: [{ blog_id: 'dup1', label: 'a' }, { blog_id: 'dup1', label: 'b' }] }]) {
    assert.equal((await accounts.PUT(req(bad))).status, 400, JSON.stringify(bad));
  }
  assert.equal(db.nba_accounts.length, 0, 'invalid input writes nothing');

  // 계정: 저장 → 조회, 회원 간 격리, 목록 전체 저장(삭제 포함)
  assert.equal((await accounts.PUT(req({ accounts: [{ blog_id: 'blog_a1', label: 'A 메인' }, { blog_id: 'blog_a2', label: 'A 보조' }] }))).status, 200);
  currentUser = 'user-b';
  assert.equal((await accounts.PUT(req({ accounts: [{ blog_id: 'blog_b1', label: 'B 메인' }] }))).status, 200);
  assert.deepEqual((await accounts.GET()).body.accounts.map((a) => a.blog_id), ['blog_b1'], 'B sees only B');
  currentUser = 'user-a';
  assert.deepEqual((await accounts.GET()).body.accounts.map((a) => a.blog_id).sort(), ['blog_a1', 'blog_a2']);
  await accounts.PUT(req({ accounts: [{ blog_id: 'blog_a1', label: 'A 메인(수정)' }] }));
  const afterA = (await accounts.GET()).body.accounts;
  assert.deepEqual(afterA.map((a) => [a.blog_id, a.label]), [['blog_a1', 'A 메인(수정)']], 'A list replaced: rename + removal');
  assert.equal(db.nba_accounts.filter((r) => r.user_id === 'user-b').length, 1, "A's save never touches B");

  // 분류: 검증, 격리, 순서/이름 변경/삭제
  for (const bad of [{ categories: 'x' }, { categories: [{ id: '', name: 'n' }] }, { categories: [{ id: 'a', name: '' }] }, { categories: [{ id: 'a', name: 'x' }, { id: 'a', name: 'y' }] }]) {
    assert.equal((await cats.PUT(req(bad))).status, 400, JSON.stringify(bad));
  }
  await cats.PUT(req({ categories: [{ id: 'c1', name: '첫째', slug: 's1', sort_order: 2 }, { id: 'c2', name: '둘째', slug: 's2', sort_order: 1 }] }));
  currentUser = 'user-b';
  await cats.PUT(req({ categories: [{ id: 'c1', name: 'B의 분류', sort_order: 1 }] }));
  assert.deepEqual((await cats.GET()).body.categories.map((c) => c.name), ['B의 분류'], 'same id for different members stays separate');
  currentUser = 'user-a';
  assert.deepEqual((await cats.GET()).body.categories.map((c) => c.name), ['둘째', '첫째'], 'sorted by sort_order');
  await cats.PUT(req({ categories: [{ id: 'c1', name: '첫째(이름변경)', sort_order: 1 }] }));
  assert.deepEqual((await cats.GET()).body.categories.map((c) => c.name), ['첫째(이름변경)'], 'rename + removal');
  await cats.PUT(req({ categories: [] }));
  assert.equal((await cats.GET()).body.categories.length, 0, 'explicit empty list is allowed');
  currentUser = 'user-b';
  assert.equal((await cats.GET()).body.categories.length, 1, "A emptying the list never touches B");

  // 동기화 도우미: 견본 계정은 올리지 않고 부가 필드는 보존
  const calls = [];
  const fetchStub = async (url, init) => { calls.push({ url, body: init && init.body ? JSON.parse(init.body) : null }); return { ok: true, json: async () => ({ accounts: [] }) }; };
  const syncWithFetch = loadTS('lib/serverSync.ts', { __fetch: fetchStub });
  await syncWithFetch.pushAccounts([{ blog_id: 'myblog_sample', label: '견본' }, { blog_id: 'real_blog', label: '진짜' }, { blog_id: 'real2', label: '둘' }]);
  assert.deepEqual(calls[0].body.accounts.map((a) => a.blog_id), ['real_blog', 'real2'], 'sample account is never uploaded');
  const merged = syncWithFetch.mergeAccounts([{ id: 's1', blog_id: 'real_blog', label: '서버 별칭' }], [{ id: 'acc-1', blog_id: 'real_blog', label: '옛 별칭', categories: [{ id: 'legacy' }] }, { id: 'acc-2', blog_id: 'only_local', label: '로컬만' }, { id: 'acc-3', blog_id: 'myblog_sample', label: '견본' }], true);
  assert.deepEqual(merged.merged.map((a) => [a.blog_id, a.label]), [['real_blog', '서버 별칭'], ['only_local', '로컬만']]);
  assert.equal(merged.merged[0].id, 'acc-1', 'keeps local id');
  assert.deepEqual(merged.merged[0].categories, [{ id: 'legacy' }], 'keeps legacy fields');
  assert.deepEqual(syncWithFetch.mergeAccounts([{ id: 's1', blog_id: 'x1', label: 'S' }], [{ id: 'l', blog_id: 'y1', label: 'L' }], false).merged.map((a) => a.blog_id), ['x1'], 'after first connect the server wins');
  cache.delete(path.join(root, 'lib/serverSync.ts'));
  const noFetch = loadTS('lib/serverSync.ts', { __fetch: null });
  assert.equal(await noFetch.pullAccounts(), null, 'no fetch available → null, screen keeps local data');

  console.log('member data ok');
})().catch((e) => { console.error(e); process.exit(1); });
