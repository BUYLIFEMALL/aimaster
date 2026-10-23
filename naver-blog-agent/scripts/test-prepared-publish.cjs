// v2.15: 준비 모드 원고의 회원 직접 발행 기록(src/lib/preparedPublish.ts)을 가짜 DB로 실행한다. 실제 DB 쓰기 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
const load = (file, deps = {}) => {
  const m = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', js)(n => deps[n] || require(n), m, m.exports);
  return m.exports;
};
const runs = load('executionRuns.ts');
const lib = load('preparedPublish.ts', { './executionRuns': runs, './naverPublishing': load('naverPublishing.ts') });
const ID = 'ee52e188-1111-2222-3333-444455556666';
const summary = (mode = 'prepare') => ({ naver_publishing: { blog_id: 'myblog', execution_mode: mode },
  naver_execution: { runId: 'r1', owner: 'o', stage: 'prepared', message: '발행 전 준비 완료', done: 1, total: 1, startedAt: 'x', updatedAt: 'x', leaseExpiresAt: '2026-10-23T00:00:00Z' } });
function db(rowPatch = {}, opts = {}) {
  const row = { id: ID, user_id: 'me', blog_id: 'myblog', status: 'prepared', post_url: null, published_at: null, updated_at: '2026-10-23T01:00:00.000Z', research_summary: summary(), ...rowPatch };
  const writes = [];
  const admin = { from() { const f = []; let patch; const c = {
    select() { return c; }, eq(k, v) { f.push([k, v]); return c; }, update(p) { patch = p; return c; },
    async maybeSingle() {
      if (patch && opts.updateError) return { data: null, error: { message: 'x' } };
      const hit = f.every(([k, v]) => row[k] === v);
      if (patch && hit && !opts.loseUpdate) { writes.push(patch); Object.assign(row, patch); }
      if (patch && opts.loseUpdate) { Object.assign(row, patch); return { data: null, error: null }; }
      return { data: hit ? { ...row } : null, error: null };
    } }; return c; } };
  return { admin, row, writes, send: (url, user = 'me', source = 'member') => lib.recordPreparedPublish(admin, user, ID, url, source, Date.parse('2026-10-23T02:00:00Z')) };
}

test('normalizeNaverPostUrl accepts only this blog post URLs', () => {
  const n = lib.normalizeNaverPostUrl;
  assert.equal(n('https://blog.naver.com/myblog/224451486747', 'myblog'), 'https://blog.naver.com/myblog/224451486747');
  assert.equal(n(' https://m.blog.naver.com/myblog/123/ ', 'myblog'), 'https://blog.naver.com/myblog/123');
  assert.equal(n('https://blog.naver.com/PostView.naver?blogId=myblog&logNo=55', 'myblog'), 'https://blog.naver.com/myblog/55');
  for (const bad of ['https://blog.naver.com/other/1', 'http://blog.naver.com/myblog/1', 'https://evil.com/myblog/1', 'https://blog.naver.com/myblog', 'https://blog.naver.com/myblog/postwrite', 'https://blog.naver.com/PostView.naver?blogId=other&logNo=1', 'javascript:alert(1)', '', 42, null])
    assert.equal(n(bad, 'myblog'), null, String(bad));
});
test('prepared post becomes published with canonical URL and run stage', async () => {
  const h = db(); const r = await h.send('https://blog.naver.com/PostView.naver?blogId=myblog&logNo=99', 'me', 'extension');
  assert.equal(r.status, 200); assert.equal(r.body.success, true); assert.equal(r.body.status, 'published');
  assert.equal(h.row.status, 'published'); assert.equal(h.row.post_url, 'https://blog.naver.com/myblog/99');
  assert.equal(h.row.research_summary.naver_execution.stage, 'published'); assert.match(h.row.research_summary.naver_execution.message, /확장/);
  assert.ok(h.row.published_at); assert.equal(h.writes.length, 1);
});
test('same URL again is acknowledged without a second write; different URL is 409', async () => {
  const h = db(); await h.send('https://blog.naver.com/myblog/99');
  assert.equal((await h.send('https://blog.naver.com/myblog/99')).status, 200); assert.equal(h.writes.length, 1);
  assert.equal((await h.send('https://blog.naver.com/myblog/100')).status, 409); assert.equal(h.row.post_url, 'https://blog.naver.com/myblog/99');
});
test('only prepare-mode prepared posts of the owner can be recorded', async () => {
  for (const [patch, status] of [[{ status: 'draft' }, 409], [{ status: 'publishing' }, 409], [{ status: 'failed' }, 409], [{ research_summary: summary('publish') }, 409]]) {
    const h = db(patch); assert.equal((await h.send('https://blog.naver.com/myblog/1')).status, status); assert.equal(h.writes.length, 0);
  }
  const h = db(); assert.equal((await h.send('https://blog.naver.com/myblog/1', 'someone-else')).status, 404); assert.equal(h.writes.length, 0);
  assert.equal((await h.send('https://blog.naver.com/other/1')).status, 400); assert.equal(h.writes.length, 0);
});
test('save error is retryable; lost response with same URL is acknowledged', async () => {
  assert.equal((await db({}, { updateError: true }).send('https://blog.naver.com/myblog/1')).status, 503);
  assert.equal((await db({}, { loseUpdate: true }).send('https://blog.naver.com/myblog/1')).status, 200);
});
