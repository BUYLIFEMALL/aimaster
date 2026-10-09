// 권한 검사: 비로그인 차단, 이용 권한, 관리자 전용, 본인 키만 사용(타인 키 폴백 없음). 실제 DB·네트워크 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// ---- 메모리 DB (supabase 조회 체인 흉내) ----
const db = {
  profiles: [
    { id: 'admin-1', is_admin: true, is_suspended: false, grade: { sort_order: 9 } },
    { id: 'member-free', is_admin: false, is_suspended: false, grade: null },
    { id: 'member-bad', is_admin: false, is_suspended: true, grade: null },
    { id: 'member-none', is_admin: false, is_suspended: false, grade: { sort_order: 1 } },
  ],
  programs: [{ id: 'prog-1', slug: 'ai-image-studio', is_active: true, badges: ['free'], required_grade_id: null, required_grade: null }],
  subscriptions: [],
  user_program_access: [],
  user_api_keys: [
    { user_id: 'member-free', provider: 'openai', api_key: 'KEY-OF-MEMBER-FREE' },
    { user_id: 'other-member', provider: 'replicate', api_key: 'KEY-OF-SOMEONE-ELSE' },
  ],
};
function table(name) {
  const filters = [];
  const api = {
    select() { return api; },
    eq(col, val) { filters.push([col, val]); return api; },
    maybeSingle: async () => ({ data: db[name].find((r) => filters.every(([c, v]) => r[c] === v)) || null }),
  };
  return api;
}
const admin = { from: (n) => table(n) };

let sessionUser = null;
let pathnameHeader = null;
const cache = new Map();
function loadTS(rel) {
  const filename = path.join(root, rel);
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mockRequire = (id) => {
    if (id === 'next/navigation') return { redirect: (url) => { const e = new Error('NEXT_REDIRECT'); e.redirectUrl = url; throw e; } };
    if (id === 'next/headers') return { headers: () => ({ get: (k) => (k === 'x-pathname' ? pathnameHeader : null) }) };
    if (id === '@/lib/supabase/server') return {
      createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }) } }),
      createAdminClient: () => admin,
    };
    if (id === './access/checkProgramAccess') return loadTS('lib/access/checkProgramAccess.ts');
    throw new Error('Unexpected import: ' + id);
  };
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`, { filename })(mockRequire, module, module.exports);
  cache.set(filename, module.exports);
  return module.exports;
}

(async () => {
  const access = loadTS('lib/access.ts');
  const body = async (res) => res.json();

  // 1) 비로그인: 401, 사용자 없음 — 어떤 회원으로도 대체하지 않는다
  sessionUser = null;
  let r = await access.checkProgramAccessApi();
  assert.equal(r.user, null);
  assert.equal(r.errorResponse.status, 401);
  assert.match((await body(r.errorResponse)).error, /로그인/);
  r = await access.checkAdminApi();
  assert.equal(r.errorResponse.status, 401);

  // 2) FREE 배지 프로그램은 가입한 회원이면 통과
  sessionUser = { id: 'member-free' };
  r = await access.checkProgramAccessApi();
  assert.equal(r.errorResponse, null);
  assert.equal(r.user.id, 'member-free');

  // 3) 정지 계정은 403
  sessionUser = { id: 'member-bad' };
  r = await access.checkProgramAccessApi();
  assert.equal(r.errorResponse.status, 403);
  assert.match((await body(r.errorResponse)).error, /정지/);

  // 4) 유료 전환 시(FREE 배지 없음·최소 등급 있음) 구독·부여 없는 회원은 403
  db.programs[0].badges = [];
  db.programs[0].required_grade_id = 'grade-1';
  db.programs[0].required_grade = { sort_order: 2 };
  sessionUser = { id: 'member-none' };
  r = await access.checkProgramAccessApi();
  assert.equal(r.errorResponse.status, 403);
  // 관리자는 통과
  sessionUser = { id: 'admin-1' };
  r = await access.checkProgramAccessApi();
  assert.equal(r.errorResponse, null);
  db.programs[0].badges = ['free'];
  db.programs[0].required_grade_id = null;
  db.programs[0].required_grade = null;

  // 5) 공유 데이터 쓰기는 관리자만: 일반 회원 403, 관리자 통과
  sessionUser = { id: 'member-free' };
  r = await access.checkAdminApi();
  assert.equal(r.errorResponse.status, 403);
  assert.match((await body(r.errorResponse)).error, /관리자/);
  sessionUser = { id: 'admin-1' };
  r = await access.checkAdminApi();
  assert.equal(r.errorResponse, null);
  assert.equal(r.access.reason, 'admin');

  // 6) API 키: 본인 키만. 본인 키가 없으면 다른 회원 키가 있어도 null
  assert.equal(await access.getUserApiKey('member-free', 'openai'), 'KEY-OF-MEMBER-FREE');
  assert.equal(await access.getUserApiKey('member-free', 'replicate'), null, '타인 키 폴백 금지');
  assert.equal(await access.getUserApiKey('member-none', 'replicate'), null, '타인 키 폴백 금지');
  assert.equal(await access.getUserApiKey('member-none', 'openai'), null);

  // 7) 페이지: 비로그인은 로그인 화면으로(원래 경로 보존), 권한 없으면 메인 사이트 상품 페이지로
  sessionUser = null;
  pathnameHeader = '/gallery?tab=1';
  await assert.rejects(access.requireProgramAccess(), (e) => e.redirectUrl === '/login?redirect=' + encodeURIComponent('/gallery?tab=1'));
  pathnameHeader = null;
  await assert.rejects(access.requireUser(), (e) => e.redirectUrl === '/login?redirect=%2Fdashboard');
  db.programs[0].badges = [];
  db.programs[0].required_grade_id = 'grade-1';
  db.programs[0].required_grade = { sort_order: 2 };
  sessionUser = { id: 'member-none' };
  await assert.rejects(access.requireProgramAccess(), (e) => /\/programs\/ai-image-studio$/.test(e.redirectUrl));
  sessionUser = { id: 'member-bad' };
  await assert.rejects(access.requireProgramAccess(), (e) => /error=suspended$/.test(e.redirectUrl));

  // 8) 소스에 게스트 우회·타인 키 폴백이 다시 생기지 않았는지
  const src = fs.readFileSync(path.join(root, 'lib/access.ts'), 'utf8');
  assert.equal(/GUEST|guest|no_restriction as const, programId: null/.test(src), false, '게스트 우회 금지');
  assert.equal(/limit\(1\)/.test(src), false, '키 폴백(limit(1)) 금지');

  console.log('access ok');
})().catch((e) => { console.error(e); process.exit(1); });
