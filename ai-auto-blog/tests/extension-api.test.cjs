const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// 실제 route 코드를 격리된 메모리 DB로 실행한다. 운영 DB·유료 API 호출 없음.
const MINUTE = 60 * 1000;
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();

function loadTs(file, mockRequire, sandbox = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { exports: module.exports, module, console: { error() {} }, require: mockRequire, Headers, Date, Promise, globalThis: { crypto: require('node:crypto').webcrypto }, ...sandbox });
  return module.exports;
}

function harness(route, { user = { userId: 'member-a', email: 'a@test', name: 'A' }, posts, failOn = null, throwOn = null, beforeWrite = null, access = { allowed: true } } = {}) {
  const rows = { blog_posts: posts ?? [] };
  const calls = { reads: 0, writes: [] };
  const client = {
    from(table) {
      const filters = [];
      let op = 'select', values = null, limitN = null, orderBy = null;
      const q = {
        select() { return q; },
        eq(key, value) { filters.push((row) => row[key] === value); return q; },
        in(key, list) { filters.push((row) => list.includes(row[key] ?? null)); return q; },
        is(key, value) { filters.push((row) => (row[key] ?? null) === value); return q; },
        gte(key, value) { filters.push((row) => row[key] != null && row[key] >= value); return q; },
        not(key, operator, value) { assert.equal(operator, 'is'); filters.push((row) => (row[key] ?? null) !== value); return q; },
        order(key, { ascending }) { orderBy = [key, ascending]; return q; },
        limit(n) { limitN = n; return q; },
        update(data) { op = 'update'; values = data; return q; },
        maybeSingle() { return finish(true); },
        then(resolve, reject) { return finish(false).then(resolve, reject); },
      };
      async function finish(single) {
        if (throwOn === op) throw new Error('SECRET_THROWN_DETAIL');
        if (failOn === op) return { data: null, error: { message: 'SECRET_DATABASE_DETAIL' } };
        let matched = rows[table].filter((row) => filters.every((fn) => fn(row)));
        if (orderBy) matched = [...matched].sort((a, b) => (a[orderBy[0]] < b[orderBy[0]] ? -1 : 1) * (orderBy[1] ? 1 : -1));
        if (limitN != null) matched = matched.slice(0, limitN);
        if (op === 'update') {
          beforeWrite?.(rows);
          matched = rows[table].filter((row) => filters.every((fn) => fn(row))).slice(0, limitN ?? Infinity);
          matched.forEach((row) => Object.assign(row, values));
          calls.writes.push({ table, values, matched: matched.length });
        } else calls.reads += 1;
        const picked = matched.map((row) => ({ ...row }));
        return { data: single ? picked[0] ?? null : picked, error: null };
      }
      return q;
    },
  };
  const privateModule = loadTs('utils/privateResponse.ts', (name) => {
    if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    throw Error(`Unexpected import: ${name}`);
  });
  const taskModule = loadTs('utils/extensionTask.ts', () => { throw Error('no imports expected'); });
  const categoryModule = loadTs('utils/naverCategory.ts', () => { throw Error('no imports expected'); });
  const mockRequire = (name) => {
    if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    if (name.endsWith('/extensionAuth')) return { verifyExtensionToken: async () => user };
    if (name.endsWith('/supabase/admin')) return { createAdminClient: () => client };
    if (name.endsWith('/extensionContent')) return { htmlToInputBlocks: (html) => ({ blocks: [{ type: 'text', text: String(html) }], tags: ['태그'] }) };
    if (name.endsWith('/extensionTask')) return taskModule;
    if (name.endsWith('/naverCategory')) return categoryModule;
    if (name.endsWith('/utils/version')) return { APP_VERSION: 'v0.00' };
    if (name.endsWith('/privateResponse')) return privateModule;
    if (name.endsWith('/access')) return { checkProgramAccessApi: async () => (access.allowed ? { allowed: true, user: { id: 'member-a' } } : access) };
    throw Error(`Unexpected import: ${name}`);
  };
  return { handlers: loadTs(route, mockRequire), rows, calls };
}

const taskRoute = 'app/api/extension/task/route.ts';
const resultRoute = 'app/api/extension/posts/[id]/input-result/route.ts';
const handoffRoute = 'app/api/posts/[id]/extension-handoff/route.ts';
const heartbeatRoute = 'app/api/extension/posts/[id]/heartbeat/route.ts';
const categoryDefaultRoute = 'app/api/posts/naver-category-default/route.ts';
const startRoute = 'app/api/extension/posts/[id]/start/route.ts';
const RUN_A = '11111111-1111-4111-8111-111111111111';
const RUN_B = '22222222-2222-4222-8222-222222222222';
const future = (ms) => new Date(Date.now() + ms).toISOString();
const post = (extra = {}) => ({ id: 1, user_id: 'member-a', title: 'T', content: 'C', extension_handoff_at: iso(2 * MINUTE), naver_input_status: null, naver_input_completed_at: null, naver_input_error: null, ...extra });
const req = (body) => new Request('https://test.invalid/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
const ctx = (id) => ({ params: Promise.resolve({ id: String(id) }) });

// ---------- 작업 가져가기 ----------
test('task: invalid token never opens the database', async () => {
  const h = harness(taskRoute, { user: null, posts: [post()] });
  const r = await h.handlers.POST(req());
  assert.equal(r.status, 401); assert.equal(h.calls.reads + h.calls.writes.length, 0);
});
test('task: claims a fresh handed-off post, marks it in_progress and returns blocks', async () => {
  const h = harness(taskRoute, { posts: [post()] });
  const r = await h.handlers.POST(req()); const body = await r.json();
  assert.equal(r.status, 200); assert.equal(body.task.id, 1); assert.equal(body.task.blocks.length, 1); assert.deepEqual(body.task.tags, ['태그']);
  assert.equal(h.rows.blog_posts[0].naver_input_status, 'in_progress');
  assert.equal(r.headers.get('Cache-Control'), 'private, no-store, max-age=0');
});
test('task: takes the oldest waiting post first', async () => {
  const h = harness(taskRoute, { posts: [post({ id: 1, extension_handoff_at: iso(1 * MINUTE) }), post({ id: 2, extension_handoff_at: iso(9 * MINUTE) })] });
  assert.equal((await (await h.handlers.POST(req())).json()).task.id, 2);
});
test('task: never auto-starts old, running, finished or foreign posts', async () => {
  const h = harness(taskRoute, { posts: [
    post({ id: 1, extension_handoff_at: iso(31 * MINUTE) }),
    post({ id: 2, naver_input_status: 'in_progress' }),
    post({ id: 3, naver_input_status: 'publish_ready' }),
    post({ id: 4, naver_input_status: 'failed' }),
    post({ id: 5, user_id: 'member-b' }),
    post({ id: 6, extension_handoff_at: null }),
  ] });
  const body = await (await h.handlers.POST(req())).json();
  assert.equal(body.task, null); assert.equal(h.calls.writes.length, 0);
});
test('task: two extensions cannot claim the same post', async () => {
  const h = harness(taskRoute, { posts: [post()] });
  const [a, b] = await Promise.all([h.handlers.POST(req()), h.handlers.POST(req())]);
  const tasks = [(await a.json()).task, (await b.json()).task].filter(Boolean);
  assert.equal(tasks.length, 1);
});
test('task: losing the claim race returns no task instead of a duplicate', async () => {
  const h = harness(taskRoute, { posts: [post()], beforeWrite: (rows) => { rows.blog_posts[0].naver_input_status = 'in_progress'; } });
  const body = await (await h.handlers.POST(req())).json();
  assert.equal(body.task, null);
});
test('task: database failure is 503 and hides details', async () => {
  for (const failOn of ['select', 'update']) {
    const h = harness(taskRoute, { posts: [post()], failOn });
    const r = await h.handlers.POST(req()); const text = await r.text();
    assert.equal(r.status, 503); assert.ok(!text.includes('SECRET'));
  }
});
test('task: thrown error is 503 and hides details', async () => {
  const h = harness(taskRoute, { posts: [post()], throwOn: 'select' });
  const r = await h.handlers.POST(req()); assert.equal(r.status, 503); assert.ok(!(await r.text()).includes('SECRET'));
});

// ---------- 입력 결과 보고 ----------
test('input-result: invalid ids and statuses are rejected before the database', async () => {
  for (const id of ['0', '-1', '1.5', 'abc']) {
    const h = harness(resultRoute, { posts: [post({ naver_input_status: 'in_progress' })] });
    assert.equal((await h.handlers.POST(req({ status: 'completed' }), ctx(id))).status, 400); assert.equal(h.calls.reads, 0);
  }
  const h = harness(resultRoute, { posts: [post()] });
  assert.equal((await h.handlers.POST(req({ status: 'published' }), ctx(1))).status, 400);
});
test('input-result: DB read error, write error and exception are never reported as success', async () => {
  for (const [failOn, throwOn] of [['select', null], ['update', null], [null, 'select'], [null, 'update']]) {
    const h = harness(resultRoute, { posts: [post({ naver_input_status: 'in_progress' })], failOn, throwOn });
    const r = await h.handlers.POST(req({ status: 'completed' }), ctx(1)); const text = await r.text();
    assert.equal(r.status, 503, `${failOn}/${throwOn}`); assert.ok(!text.includes('SECRET')); assert.ok(!text.includes('"success":true'));
    assert.equal(h.rows.blog_posts[0].naver_input_status, 'in_progress');
  }
});
test('input-result: foreign or never-sent posts are 404 without mutation', async () => {
  for (const extra of [{ user_id: 'member-b' }, { extension_handoff_at: null }]) {
    const h = harness(resultRoute, { posts: [post({ naver_input_status: 'in_progress', ...extra })] });
    assert.equal((await h.handlers.POST(req({ status: 'completed' }), ctx(1))).status, 404); assert.equal(h.calls.writes.length, 0);
  }
});
test('input-result: a late report cannot overwrite a re-sent post (409)', async () => {
  const h = harness(resultRoute, { posts: [post({ naver_input_status: null })] });
  const r = await h.handlers.POST(req({ status: 'completed' }), ctx(1));
  assert.equal(r.status, 409); assert.equal(h.rows.blog_posts[0].naver_input_status, null);
});
test('input-result: status changing between read and write is not overwritten (409)', async () => {
  const h = harness(resultRoute, { posts: [post({ naver_input_status: 'in_progress' })], beforeWrite: (rows) => { rows.blog_posts[0].naver_input_status = null; } });
  const r = await h.handlers.POST(req({ status: 'completed' }), ctx(1));
  assert.equal(r.status, 409); assert.equal(h.rows.blog_posts[0].naver_input_status, null);
});
test('input-result: normal flow in_progress -> completed -> publish_ready with explicit acknowledgement', async () => {
  const h = harness(resultRoute, { posts: [post({ naver_input_status: 'in_progress' })] });
  for (const status of ['completed', 'publish_ready']) {
    const r = await h.handlers.POST(req({ status }), ctx(1)); const body = await r.json();
    assert.equal(r.status, 200); assert.equal(body.success, true); assert.equal(body.persisted, true); assert.equal(body.status, status); assert.equal(body.postId, 1);
  }
  assert.equal(h.rows.blog_posts[0].naver_input_status, 'publish_ready'); assert.ok(h.rows.blog_posts[0].naver_input_completed_at);
});
test('input-result: repeating the same result is idempotent and keeps the first timestamp', async () => {
  const h = harness(resultRoute, { posts: [post({ naver_input_status: 'completed', naver_input_completed_at: '2026-10-10T00:00:00.000Z' })] });
  const body = await (await h.handlers.POST(req({ status: 'completed' }), ctx(1))).json();
  assert.equal(body.persisted, true); assert.equal(body.unchanged, true);
  assert.equal(h.rows.blog_posts[0].naver_input_completed_at, '2026-10-10T00:00:00.000Z'); assert.equal(h.calls.writes.length, 0);
});
test('input-result: failure stores a trimmed error; success clears it; manual restart from failed is allowed', async () => {
  const h = harness(resultRoute, { posts: [post({ naver_input_status: 'in_progress' })] });
  await h.handlers.POST(req({ status: 'failed', error: 'x'.repeat(900) }), ctx(1));
  assert.equal(h.rows.blog_posts[0].naver_input_error.length, 500);
  assert.equal((await h.handlers.POST(req({ status: 'in_progress' }), ctx(1))).status, 200);
  assert.equal(h.rows.blog_posts[0].naver_input_error, null);
});

// ---------- 보내기 ----------
test('handoff: running post is not overwritten, stale running post can be re-sent', async () => {
  const running = harness(handoffRoute, { posts: [post({ naver_input_status: 'in_progress', extension_handoff_at: iso(10 * MINUTE) })] });
  assert.equal((await running.handlers.POST(req(), ctx(1))).status, 409); assert.equal(running.calls.writes.length, 0);
  const stale = harness(handoffRoute, { posts: [post({ naver_input_status: 'in_progress', extension_handoff_at: iso(200 * MINUTE) })] });
  const r = await stale.handlers.POST(req(), ctx(1)); const body = await r.json();
  assert.equal(r.status, 200); assert.equal(body.ok, true); assert.equal(body.success, true); assert.equal(stale.rows.blog_posts[0].naver_input_status, null);
});
test('handoff: only the owner can send and a send makes the post waiting for auto start', async () => {
  const foreign = harness(handoffRoute, { posts: [post({ user_id: 'member-b' })] });
  assert.equal((await foreign.handlers.POST(req(), ctx(1))).status, 403); assert.equal(foreign.calls.writes.length, 0);
  const own = harness(handoffRoute, { posts: [post({ naver_input_status: 'publish_ready', extension_handoff_at: iso(5 * 60 * MINUTE) })] });
  const body = await (await own.handlers.POST(req(), ctx(1))).json();
  assert.equal(body.autoStartMinutes, 30); assert.equal(own.rows.blog_posts[0].naver_input_status, null);
  assert.ok(Date.now() - new Date(own.rows.blog_posts[0].extension_handoff_at).getTime() < 5000);
});
test('handoff: access denied never opens the database', async () => {
  const h = harness(handoffRoute, { posts: [post()], access: { allowed: false, status: 403, error: 'Denied' } });
  assert.equal((await h.handlers.POST(req(), ctx(1))).status, 403); assert.equal(h.calls.reads + h.calls.writes.length, 0);
});

// ---------- 실행 번호·임대 (v1.43) ----------
test('task: claim creates a run id and a lease, and returns them', async () => {
  const h = harness(taskRoute, { posts: [post()] });
  const body = await (await h.handlers.POST(req())).json();
  assert.match(body.task.runId, /^[0-9a-f-]{36}$/); assert.equal(body.task.leaseSeconds, 180);
  assert.equal(h.rows.blog_posts[0].naver_run_id, body.task.runId);
  assert.ok(new Date(h.rows.blog_posts[0].naver_lease_expires_at).getTime() > Date.now() + 100000);
});
test('task: two claims on the same post produce only one run id', async () => {
  const h = harness(taskRoute, { posts: [post()] });
  const [a, b] = await Promise.all([h.handlers.POST(req()), h.handlers.POST(req())]);
  const tasks = [(await a.json()).task, (await b.json()).task].filter(Boolean);
  assert.equal(tasks.length, 1); assert.equal(h.rows.blog_posts[0].naver_run_id, tasks[0].runId);
});

test('input-result: a report from a superseded run is refused and cannot change the new run', async () => {
  const h = harness(resultRoute, { posts: [post({ naver_input_status: 'in_progress', naver_run_id: RUN_B, naver_lease_expires_at: future(100000) })] });
  const r = await h.handlers.POST(req({ status: 'completed', runId: RUN_A }), ctx(1));
  assert.equal(r.status, 409); assert.equal((await r.json()).superseded, true);
  assert.equal(h.rows.blog_posts[0].naver_input_status, 'in_progress'); assert.equal(h.calls.writes.length, 0);
});
test('input-result: the current run reports normally; lease continues after completed and ends at publish_ready or failed', async () => {
  const h = harness(resultRoute, { posts: [post({ naver_input_status: 'in_progress', naver_run_id: RUN_A, naver_lease_expires_at: future(1000) })] });
  const completed = await (await h.handlers.POST(req({ status: 'completed', runId: RUN_A }), ctx(1))).json();
  assert.equal(completed.persisted, true); assert.equal(completed.runId, RUN_A);
  assert.ok(new Date(h.rows.blog_posts[0].naver_lease_expires_at).getTime() > Date.now() + 100000);
  await h.handlers.POST(req({ status: 'publish_ready', runId: RUN_A }), ctx(1));
  assert.equal(h.rows.blog_posts[0].naver_lease_expires_at, null);
  const failed = harness(resultRoute, { posts: [post({ naver_input_status: 'in_progress', naver_run_id: RUN_A, naver_lease_expires_at: future(1000) })] });
  await failed.handlers.POST(req({ status: 'failed', runId: RUN_A, error: 'x' }), ctx(1));
  assert.equal(failed.rows.blog_posts[0].naver_lease_expires_at, null); assert.equal(failed.rows.blog_posts[0].naver_input_status, 'failed');
});
test('input-result: a run id from a post that was re-sent (run id cleared) is refused', async () => {
  const h = harness(resultRoute, { posts: [post({ naver_input_status: null, naver_run_id: null })] });
  assert.equal((await h.handlers.POST(req({ status: 'completed', runId: RUN_A }), ctx(1))).status, 409);
});
test('input-result: legacy reports without a run id still follow the old rules and a legacy start clears the run id', async () => {
  const h = harness(resultRoute, { posts: [post({ naver_input_status: 'failed', naver_run_id: RUN_A })] });
  const r = await h.handlers.POST(req({ status: 'in_progress' }), ctx(1));
  assert.equal(r.status, 200); assert.equal(h.rows.blog_posts[0].naver_run_id, null);
  assert.equal((await h.handlers.POST(req({ status: 'completed' }), ctx(1))).status, 200);
});

test('heartbeat: only the current run extends the lease', async () => {
  const h = harness(heartbeatRoute, { posts: [post({ naver_input_status: 'in_progress', naver_run_id: RUN_A, naver_lease_expires_at: future(5000) })] });
  const ok = await h.handlers.POST(req({ runId: RUN_A }), ctx(1));
  assert.equal(ok.status, 200); assert.ok(new Date(h.rows.blog_posts[0].naver_lease_expires_at).getTime() > Date.now() + 100000);
  const old = await h.handlers.POST(req({ runId: RUN_B }), ctx(1));
  assert.equal(old.status, 409); assert.equal((await old.json()).superseded, true);
});
test('heartbeat: finished, foreign, missing run id and database errors', async () => {
  const done = harness(heartbeatRoute, { posts: [post({ naver_input_status: 'publish_ready', naver_run_id: RUN_A })] });
  assert.equal((await done.handlers.POST(req({ runId: RUN_A }), ctx(1))).status, 409);
  const foreign = harness(heartbeatRoute, { posts: [post({ user_id: 'member-b', naver_input_status: 'in_progress', naver_run_id: RUN_A })] });
  assert.equal((await foreign.handlers.POST(req({ runId: RUN_A }), ctx(1))).status, 409);
  const none = harness(heartbeatRoute, { posts: [post({ naver_input_status: 'in_progress', naver_run_id: RUN_A })] });
  assert.equal((await none.handlers.POST(req({}), ctx(1))).status, 400);
  const broken = harness(heartbeatRoute, { posts: [post({ naver_input_status: 'in_progress', naver_run_id: RUN_A })], failOn: 'update' });
  const r = await broken.handlers.POST(req({ runId: RUN_A }), ctx(1));
  assert.equal(r.status, 503); assert.ok(!(await r.text()).includes('SECRET'));
});

test('start: creates a run for a waiting, failed or finished post and refuses a live run', async () => {
  for (const status of [null, 'failed', 'completed', 'publish_ready']) {
    const h = harness(startRoute, { posts: [post({ naver_input_status: status, extension_handoff_at: iso(300 * MINUTE) })] });
    const body = await (await h.handlers.POST(req(), ctx(1))).json();
    assert.equal(body.persisted, true, String(status)); assert.equal(h.rows.blog_posts[0].naver_input_status, 'in_progress'); assert.equal(h.rows.blog_posts[0].naver_run_id, body.runId);
  }
  const live = harness(startRoute, { posts: [post({ naver_input_status: 'in_progress', naver_run_id: RUN_A, naver_lease_expires_at: future(60000) })] });
  assert.equal((await live.handlers.POST(req(), ctx(1))).status, 409); assert.equal(live.calls.writes.length, 0);
});
test('start: a run whose lease expired can be restarted with a new run id', async () => {
  const h = harness(startRoute, { posts: [post({ naver_input_status: 'in_progress', naver_run_id: RUN_A, naver_lease_expires_at: iso(60000) })] });
  const body = await (await h.handlers.POST(req(), ctx(1))).json();
  assert.notEqual(body.runId, RUN_A); assert.equal(h.rows.blog_posts[0].naver_run_id, body.runId);
});
test('start: foreign or never-sent post is 404, concurrent change is 409, database errors are 503', async () => {
  for (const extra of [{ user_id: 'member-b' }, { extension_handoff_at: null }]) {
    const h = harness(startRoute, { posts: [post(extra)] });
    assert.equal((await h.handlers.POST(req(), ctx(1))).status, 404); assert.equal(h.calls.writes.length, 0);
  }
  const race = harness(startRoute, { posts: [post()], beforeWrite: (rows) => { rows.blog_posts[0].naver_input_status = 'in_progress'; rows.blog_posts[0].naver_run_id = RUN_B; } });
  assert.equal((await race.handlers.POST(req(), ctx(1))).status, 409);
  const two = harness(startRoute, { posts: [post()], failOn: 'select' });
  const three = harness(startRoute, { posts: [post()], failOn: 'update' });
  assert.equal((await two.handlers.POST(req(), ctx(1))).status, 503); assert.equal((await three.handlers.POST(req(), ctx(1))).status, 503);
});
test('start: two simultaneous starts give only one run', async () => {
  const h = harness(startRoute, { posts: [post()] });
  const results = await Promise.all([h.handlers.POST(req(), ctx(1)), h.handlers.POST(req(), ctx(1))]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
});

test('handoff: a live lease blocks re-sending, an expired lease allows it and clears the run', async () => {
  const live = harness(handoffRoute, { posts: [post({ naver_input_status: 'in_progress', naver_run_id: RUN_A, naver_lease_expires_at: future(60000), extension_handoff_at: iso(300 * MINUTE) })] });
  assert.equal((await live.handlers.POST(req(), ctx(1))).status, 409);
  const expired = harness(handoffRoute, { posts: [post({ naver_input_status: 'in_progress', naver_run_id: RUN_A, naver_lease_expires_at: iso(60000), extension_handoff_at: iso(5 * MINUTE) })] });
  assert.equal((await expired.handlers.POST(req(), ctx(1))).status, 200);
  assert.equal(expired.rows.blog_posts[0].naver_run_id, null); assert.equal(expired.rows.blog_posts[0].naver_lease_expires_at, null);
});


// ---------- 관리자 전용 구조 분석: 서버가 관리자 여부를 알려 준다 ----------
test('whoami tells the extension whether the connected account is an admin (display only)', async () => {
  for (const isAdmin of [true, false]) {
    const h = harness('app/api/extension/whoami/route.ts', { user: { userId: 'member-a', email: 'a@test', name: 'A', isAdmin } });
    const body = await (await h.handlers.GET(new Request('https://test.invalid/api'))).json();
    assert.equal(body.isAdmin, isAdmin); assert.equal(body.email, 'a@test');
  }
});

test('verifyExtensionToken reads is_admin from the profile and treats anything but true as not admin', async () => {
  const tables = {
    personal_access_tokens: [{ id: 1, user_id: 'u1', token_hash: require('node:crypto').createHash('sha256').update('pat_x').digest('hex'), program_slug: 'ai-auto-blog', revoked_at: null }],
    profiles: [{ id: 'u1', email: 'a@test', name: 'A', is_admin: true }, { id: 'u2', email: 'b@test', name: 'B', is_admin: null }],
  };
  const makeClient = () => ({ from(table) {
    const filters = []; let op = 'select';
    const q = { select() { return q; }, eq(k, v) { filters.push((r) => r[k] === v); return q; }, is(k, v) { filters.push((r) => (r[k] ?? null) === v); return q; }, update() { op = 'update'; return q; },
      maybeSingle: async () => ({ data: tables[table].find((row) => filters.every((fn) => fn(row))) ?? null, error: null }),
      then(resolve) { resolve({ data: null, error: null }); } };
    return q;
  } });
  const load = (userId) => {
    tables.personal_access_tokens[0].user_id = userId;
    return loadTs('utils/extensionAuth.ts', (name) => {
      if (name === 'server-only') return {};
      if (name === 'node:crypto') return { ...require('node:crypto'), default: require('node:crypto') };
      if (name.endsWith('/supabase/admin')) return { createAdminClient: makeClient };
      if (name.endsWith('/checkProgramAccess')) return { checkProgramAccess: async () => ({ allowed: true }) };
      throw Error(`Unexpected import: ${name}`);
    });
  };
  const request = new Request('https://test.invalid', { headers: { authorization: 'Bearer pat_x' } });
  assert.equal((await load('u1').verifyExtensionToken(request)).isAdmin, true);
  assert.equal((await load('u2').verifyExtensionToken(request)).isAdmin, false);
});

// ---------- 네이버 카테고리(v1.57) ----------
const jsonReq = (body) => new Request('https://test.invalid', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
test('handoff: the chosen Naver category is saved with the post, null clears it, and a send without it keeps the old choice', async () => {
  const h = harness(handoffRoute, { posts: [post()] });
  assert.equal((await h.handlers.POST(jsonReq({ category: { id: '12', name: '경제 이야기' } }), ctx(1))).status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(h.rows.blog_posts[0].naver_category)), { id: '12', name: '경제 이야기' });
  assert.equal((await h.handlers.POST(req(), ctx(1))).status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(h.rows.blog_posts[0].naver_category)), { id: '12', name: '경제 이야기' }, 'no category key keeps the choice');
  assert.equal((await h.handlers.POST(jsonReq({ category: null }), ctx(1))).status, 200);
  assert.equal(h.rows.blog_posts[0].naver_category, null);
});
test('handoff: an invalid category is refused before anything is written', async () => {
  for (const category of ['경제', { id: 'abc', name: 'x' }, { id: '12', name: '' }, { id: '12', name: 'x'.repeat(121) }, { id: '1234567890123', name: 'x' }]) {
    const h = harness(handoffRoute, { posts: [post()] });
    const r = await h.handlers.POST(jsonReq({ category }), ctx(1));
    assert.equal(r.status, 400); assert.equal(h.calls.writes.length, 0);
  }
});
test('task: the claimed task carries the chosen category (null when none)', async () => {
  const withCategory = harness(taskRoute, { posts: [post({ naver_category: { id: '7', name: '일상' } })] });
  assert.deepEqual(JSON.parse(JSON.stringify((await (await withCategory.handlers.POST(req())).json()).task.category)), { id: '7', name: '일상' });
  const none = harness(taskRoute, { posts: [post()] });
  assert.equal((await (await none.handlers.POST(req())).json()).task.category, null);
  const broken = harness(taskRoute, { posts: [post({ naver_category: { id: 'x' } })] });
  assert.equal((await (await broken.handlers.POST(req())).json()).task.category, null, 'a damaged stored value is treated as no category');
});
test('category default: the most recently sent post with a category, own posts only, access required', async () => {
  const h = harness(categoryDefaultRoute, { posts: [
    post({ id: 1, extension_handoff_at: iso(50 * MINUTE), naver_category: { id: '1', name: '옛 카테고리' } }),
    post({ id: 2, extension_handoff_at: iso(5 * MINUTE), naver_category: { id: '2', name: '최근 카테고리' } }),
    post({ id: 3, extension_handoff_at: iso(1 * MINUTE), naver_category: null }),
    post({ id: 4, user_id: 'member-b', extension_handoff_at: iso(1 * MINUTE), naver_category: { id: '9', name: '남의 카테고리' } }),
  ] });
  assert.deepEqual(JSON.parse(JSON.stringify((await (await h.handlers.GET()).json()).category)), { id: '2', name: '최근 카테고리' });
  const denied = harness(categoryDefaultRoute, { posts: [post()], access: { allowed: false, status: 403, error: 'Denied' } });
  assert.equal((await denied.handlers.GET()).status, 403); assert.equal(denied.calls.reads, 0);
});
