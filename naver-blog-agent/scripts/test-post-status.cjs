// 임시보관 저장이 대기·발행 상태를 되돌리지 않는지 검사: 규칙 함수 + POST /api/posts 경로(메모리 DB). 네트워크 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const crypto=require('node:crypto');
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
    insert(row) { op = 'insert'; payload = row; return api; },
    update(row) { op = 'update'; payload = row; return api; },
    maybeSingle: async () => op==='select'?({ data: db[name].find((r) => Object.entries(filters).every(([k, v]) => r[k] === v)) || null }):api.single(),
    single: async () => {
      if(op==='update'){
        upserts.push({...payload});
        const row=db[name].find(r=>Object.entries(filters).every(([k,v])=>r[k]===v));
        return row?{data:Object.assign(row,payload),error:null}:{data:null,error:{message:'not found'}};
      }
      if (op === 'insert' && db[name].some(row=>row.id===payload.id))return {data:null,error:{code:'23505'}};
      if (op === 'upsert' || op === 'insert') {
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
    if (id === 'server-only') return {}; // 2026-10-23: 서버 전용 표시는 시험에서 빈 값(v2.04~ privatePhotoPost가 쓰기 시작)
    if (id === '@/lib/executionRuns') return loadTS('lib/executionRuns.ts');
    if (id === '@/lib/postStatus') return loadTS('lib/postStatus.ts');
    if (id === '@/lib/postReview') return loadTS('lib/postReview.ts');
    if (id === './postReviewSnapshot') return loadTS('lib/postReviewSnapshot.ts');
    if(id.startsWith('@/'))return loadTS(id.slice(2)+'.ts');
    if(id.startsWith('.'))return loadTS(path.relative(root,path.resolve(path.dirname(filename),id))+'.ts');
    return require(id);
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
    { id: B, user_id: 'user-a', blog_id:'myblog_sample', status: 'queued', title: '대기',content:'본문',images:[],tags:[] },
    { id: C, user_id: 'user-b', status: 'published', title: '남의 글' },
  );
  const review=loadTS('lib/postReview.ts'),queued=db.nba_posts.find(row=>row.id===B);
  queued.research_summary=review.withPostReview(null,{status:'PASS',source:'ai',fingerprint:review.reviewFingerprint(queued),note:'검수',checkedAt:'now'});
  for(const row of db.nba_posts)row.updated_at='2026-10-11T00:00:00Z';
  const request=body=>({json:async()=>({save_request_id:crypto.randomUUID(),expected_revision:db.nba_posts.find(row=>row.id===body.id)?loadTS('lib/postSaveProtocol.ts').postSaveRevision(db.nba_posts.find(row=>row.id===body.id)):undefined,...body})});
  const post = body => posts.POST(request(body));

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

  // Foreign IDs are rejected without creating duplicate personal copies.
  const before=db.nba_posts.length,writesBefore=upserts.length;
  assert.equal((await post({id:C,create:true,title:'copy',content:'body',status:'draft'})).status,409);
  const foreign=db.nba_posts.find(row=>row.id===C);
  assert.deepEqual([foreign.user_id,foreign.status,foreign.title],['user-b','published','남의 글']);
  assert.equal(db.nba_posts.length,before);assert.equal(upserts.length,writesBefore);
  assert.equal((await post({id:'post-1791513869817',title:'legacy',content:'body'})).status,409);
  const D='44444444-4444-4444-8444-444444444444',E='55555555-5555-4555-8555-555555555555';
  assert.equal((await post({id:D,create:true,title:'new',content:'body',status:'draft'})).status,200);
  assert.equal(upserts.at(-1).status,'draft');
  assert.equal((await post({id:E,create:true,title:'unreviewed',content:'body',status:'queued'})).status,422);
  assert.equal(upserts.at(-1).status,'draft');

  db.nba_posts.find(r=>r.id===B).status='prepared';
  let edited=await posts.PUT(request({id:B,title:'준비 후 수정'}));
  assert.equal(edited.status,200);assert.equal(db.nba_posts.find(r=>r.id===B).status,'draft');
  db.nba_posts.find(r=>r.id===B).status='prepared';
  await post({id:B,title:'준비 후 저장',status:'draft'});
  assert.equal(db.nba_posts.find(r=>r.id===B).status,'draft');
  assert.equal((await post({id:B,title:'허위 준비',status:'prepared'})).status,400);
  assert.equal((await posts.PUT(request({id:B,status:'prepared'}))).status,400);
  assert.equal(db.nba_posts.find(r=>r.id===B).status,'draft');

  console.log('post status ok');
})().catch((e) => { console.error(e); process.exit(1); });
